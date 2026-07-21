using System.IO.Compression;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Rissor.Augmentation.Core;
using Rissor.Augmentation.Export;

var repositoryRoot = FindRepositoryRoot(Environment.CurrentDirectory);
var temporaryRoot = Path.Combine(Path.GetTempPath(), $"rissor-augmentation-tests-{Guid.NewGuid():N}");
Directory.CreateDirectory(temporaryRoot);

var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Augmentation:AssetsRoot"] = Path.Combine(repositoryRoot, "assets"),
    ["Augmentation:JobRoot"] = temporaryRoot
}).Build();
var environment = new TestEnvironment(repositoryRoot);

var tests = new (string Name, Func<Task> Run)[]
{
    ("catalog sources are loaded authoritatively", CatalogSources),
    ("question sheets print Turkish word-count labels", QuestionSheetWordCountLabel),
    ("stale catalog revisions are rejected", StaleRevision),
    ("job creation is idempotent and cancellation is terminal", JobLifecycle),
    ("expired jobs and files are cleaned", ExpiryCleanup),
    ("orphaned restart files are cleaned", RestartCleanup)
};

var failures = new List<string>();
try
{
    foreach (var test in tests)
    {
        try
        {
            await test.Run();
            Console.WriteLine($"PASS {test.Name}");
        }
        catch (Exception error)
        {
            failures.Add($"FAIL {test.Name}: {error.Message}");
            Console.Error.WriteLine(failures[^1]);
        }
    }
}
finally
{
    try { Directory.Delete(temporaryRoot, recursive: true); } catch { }
}
return failures.Count == 0 ? 0 : 1;

async Task CatalogSources()
{
    var request = await ValidRequest();
    var prepared = await new CatalogRepository(configuration, environment).LoadAsync(request, CancellationToken.None);
    Assert(prepared.OrderedParts.Select(part => part.Key).SequenceEqual(request.OrderedPartKeys), "Part order changed.");
    Assert(prepared.SourcesByGrade["5-sinif"].Count == 2, "Expected both source banks.");
    Assert(prepared.SourcesByGrade["5-sinif"].Values.All(source => source.QuestionCount > 0), "An empty source was loaded.");
}

async Task StaleRevision()
{
    var request = (await ValidRequest()) with { CatalogRevision = "stale" };
    await AssertThrows<InvalidOperationException>(
        () => new CatalogRepository(configuration, environment).LoadAsync(request, CancellationToken.None),
        "A stale catalog revision was accepted.");
}

Task QuestionSheetWordCountLabel()
{
    var outputPath = Path.Combine(temporaryRoot, $"word-count-{Guid.NewGuid():N}.docx");
    var result = new GradeAugmentationResult
    {
        GradeSlug = "5-sinif",
        SelectedSets =
        [
            new AugmentedSet
            {
                SetNumber = 1,
                Questions =
                [
                    new AugmentedQuestion
                    {
                        DisplayQuestion = "(p38) Bu parçada ilhamın boş ve faydasız olmadığı nasıl anlatılıyor?",
                        Answer = "Hikmeti ve güzel sonuçları olduğu anlatılıyor.",
                        WordCount = 6,
                        SelectedSetNumber = 1,
                        SelectedQuestionNumber = 3,
                        FinalQuestionId = "S1Q3"
                    }
                ]
            }
        ]
    };

    var method = typeof(DocumentArtifactGenerator).GetMethod(
        "GenerateQuestionSheet",
        BindingFlags.NonPublic | BindingFlags.Static)
        ?? throw new InvalidOperationException("GenerateQuestionSheet method was not found.");
    method.Invoke(null, [outputPath, result, "Word Count Label Test", false]);

    using var archive = ZipFile.OpenRead(outputPath);
    using var stream = archive.GetEntry("word/document.xml")?.Open()
        ?? throw new InvalidOperationException("Generated DOCX has no word/document.xml entry.");
    using var reader = new StreamReader(stream);
    var documentXml = reader.ReadToEnd();
    Assert(documentXml.Contains("6 kelime", StringComparison.Ordinal), "Expected the question sheet to print '(6 kelime)'.");
    Assert(!documentXml.Contains("(6 )", StringComparison.Ordinal), "The bare word-count marker '(6 )' remained in the document.");
    return Task.CompletedTask;
}

async Task JobLifecycle()
{
    var store = new ExportJobStore(configuration, environment);
    var request = await ValidRequest();
    var first = await store.CreateAsync(request, CancellationToken.None);
    var second = await store.CreateAsync(request, CancellationToken.None);
    Assert(first.Id == second.Id, "Identical active recipes created duplicate jobs.");
    Assert(first.Id.Length == 32 && first.Id.All(Uri.IsHexDigit), "Job id is not an unguessable token.");
    Assert(store.Cancel(first.Id), "Queued job could not be cancelled.");
    Assert(first.Snapshot().Status == "cancelled", "Cancellation was not recorded.");
    Assert(!store.Cancel(first.Id), "A terminal job was cancelled twice.");
}

async Task ExpiryCleanup()
{
    var store = new ExportJobStore(configuration, environment);
    var job = await store.CreateAsync((await ValidRequest()) with { ProjectId = "expiry" }, CancellationToken.None);
    Directory.CreateDirectory(job.DirectoryPath);
    await File.WriteAllTextAsync(Path.Combine(job.DirectoryPath, "marker.txt"), "test");
    job.ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(-1);
    store.CleanupExpired();
    Assert(store.Get(job.Id) == null, "Expired job remained addressable.");
    Assert(!Directory.Exists(job.DirectoryPath), "Expired job files remained on disk.");
}

Task RestartCleanup()
{
    var orphan = Path.Combine(temporaryRoot, Guid.NewGuid().ToString("N"));
    Directory.CreateDirectory(orphan);
    File.WriteAllText(Path.Combine(orphan, "marker.txt"), "test");
    _ = new ExportJobStore(configuration, environment);
    Assert(!Directory.Exists(orphan), "Files from an interrupted process survived worker restart.");
    return Task.CompletedTask;
}

async Task<ExportCreateRequest> ValidRequest()
{
    await using var stream = File.OpenRead(Path.Combine(repositoryRoot, "assets", "augmentation-catalog.json"));
    using var catalog = await JsonDocument.ParseAsync(stream);
    var revision = catalog.RootElement.GetProperty("catalogRevision").GetString()!;
    return new ExportCreateRequest(
        1,
        revision,
        "service-test",
        "P08 + P09",
        "kucuk-sozler",
        "kucuk-sozler:p08",
        ["kucuk-sozler:p08", "kucuk-sozler:p09"],
        ["5-sinif"]);
}

static async Task AssertThrows<T>(Func<Task> action, string message) where T : Exception
{
    try { await action(); }
    catch (T) { return; }
    throw new InvalidOperationException(message);
}

static string FindRepositoryRoot(string start)
{
    var directory = new DirectoryInfo(start);
    while (directory != null && !File.Exists(Path.Combine(directory.FullName, "package.json")))
        directory = directory.Parent;
    return directory?.FullName ?? throw new InvalidOperationException("Repository root was not found.");
}

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

sealed class TestEnvironment(string contentRoot) : IWebHostEnvironment
{
    public string ApplicationName { get; set; } = "Rissor.Augmentation.Export.Tests";
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string WebRootPath { get; set; } = contentRoot;
    public string EnvironmentName { get; set; } = Environments.Development;
    public string ContentRootPath { get; set; } = contentRoot;
    public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(contentRoot);
}
