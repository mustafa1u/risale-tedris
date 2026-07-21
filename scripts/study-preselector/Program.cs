using System.Text.Json;
using System.Text.Json.Serialization;
using QAGeneratorLib.Models;
using QAGeneratorLib.Services;

var options = ParseArgs(args);
if (!options.TryGetValue("--jobs", out var jobsPath) || string.IsNullOrWhiteSpace(jobsPath))
{
    Console.Error.WriteLine("Missing required option: --jobs");
    return 1;
}

var jobsPayload = JsonSerializer.Deserialize<PreselectionJobsPayload>(
    File.ReadAllText(jobsPath),
    JsonOptions());

if (jobsPayload?.Jobs == null)
{
    Console.Error.WriteLine($"Could not read jobs from '{jobsPath}'.");
    return 1;
}

var report = new PreselectionReport();

foreach (var job in jobsPayload.Jobs)
{
    try
    {
        if (job.Deck == null || string.IsNullOrWhiteSpace(job.OutPath))
        {
            report.Failed++;
            report.Failures.Add(new PreselectionFailure(job.OutPath ?? "", "Job deck or output path is missing."));
            continue;
        }

        var selectedDeck = SelectDeck(job);
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(job.OutPath))!);
        File.WriteAllText(
            job.OutPath,
            JsonSerializer.Serialize(selectedDeck, JsonOptions()) + Environment.NewLine);
        report.Written++;
    }
    catch (Exception ex)
    {
        report.Failed++;
        report.Failures.Add(new PreselectionFailure(job.OutPath ?? "", ex.Message));
    }
}

if (options.TryGetValue("--report", out var reportPath) && !string.IsNullOrWhiteSpace(reportPath))
{
    Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(reportPath))!);
    File.WriteAllText(reportPath, JsonSerializer.Serialize(report, JsonOptions()) + Environment.NewLine);
}

Console.WriteLine($"Study preselection: {report.Written}/{jobsPayload.Jobs.Count} decks written, {report.Failed} failed.");
return report.Failed == 0 ? 0 : 1;

static StudyDeck SelectDeck(PreselectionJob job)
{
    var deck = job.Deck!;
    var sets = deck.Sets ?? new List<StudySet>();
    var qaSets = sets
        .Select(set => (set.Questions ?? new List<StudyQuestion>())
            .Select(question => new QuestionAnswer
            {
                Question = question.Question ?? "",
                Answer = question.Answer ?? "",
                WordCount = question.WordCount,
                SourceSetNumber = question.SetNumber,
                SourceQuestionNumber = question.QuestionNumber,
                SourceQuestionId = question.Id ?? ""
            })
            .ToList())
        .ToList();

    var service = new QAGenServ2
    {
        InputFilePath = ResolveSourcePath(deck.SourcePath),
        MakeFlashCards = false,
        GenerateQADoc = false
    };
    service.SetQuestionDataSets(qaSets);

    var requestedCount = job.Count <= 0 ? 24 : job.Count;
    var selected = service.SelectFlashcardQuestionAnswers(
        requestedCount,
        rng: new Random(job.Seed));

    return new StudyDeck
    {
        SchemaVersion = deck.SchemaVersion,
        BookSlug = deck.BookSlug,
        PartNo = deck.PartNo,
        GradeSlug = deck.GradeSlug,
        SourcePath = deck.SourcePath,
        Title = deck.Title,
        CardCount = selected.Count,
        Selection = new StudySelection
        {
            Source = "QAGeneratorLib",
            RequestedCount = requestedCount,
            Seed = job.Seed
        },
        Sets = new List<StudySet>
        {
            new()
            {
                SetNumber = 1,
                Questions = selected.Select(MapQuestion).ToList()
            }
        }
    };
}

static StudyQuestion MapQuestion(QuestionAnswer question)
{
    return new StudyQuestion
    {
        Id = question.SourceQuestionId,
        SetNumber = question.SourceSetNumber ?? 0,
        QuestionNumber = question.SourceQuestionNumber ?? 0,
        Question = question.Question,
        Answer = question.Answer,
        WordCount = question.WordCount
    };
}

static string ResolveSourcePath(string? sourcePath)
{
    if (string.IsNullOrWhiteSpace(sourcePath))
    {
        return "";
    }

    return Path.GetFullPath(sourcePath);
}

static Dictionary<string, string> ParseArgs(string[] args)
{
    var result = new Dictionary<string, string>(StringComparer.Ordinal);
    for (var index = 0; index < args.Length; index++)
    {
        var key = args[index];
        if (!key.StartsWith("--", StringComparison.Ordinal))
        {
            throw new ArgumentException($"Unknown argument: {key}");
        }

        if (index + 1 >= args.Length || args[index + 1].StartsWith("--", StringComparison.Ordinal))
        {
            throw new ArgumentException($"Missing value for {key}");
        }

        result[key] = args[index + 1];
        index++;
    }

    return result;
}

static JsonSerializerOptions JsonOptions()
{
    return new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}

sealed class PreselectionJobsPayload
{
    public List<PreselectionJob> Jobs { get; set; } = new();
}

sealed class PreselectionJob
{
    public StudyDeck? Deck { get; set; }
    public string? OutPath { get; set; }
    public int Count { get; set; }
    public int Seed { get; set; }
}

sealed class PreselectionReport
{
    public int Written { get; set; }
    public int Failed { get; set; }
    public List<PreselectionFailure> Failures { get; set; } = new();
}

sealed record PreselectionFailure(string OutPath, string Message);

sealed class StudyDeck
{
    public int SchemaVersion { get; set; }
    public string? BookSlug { get; set; }
    public string? PartNo { get; set; }
    public string? GradeSlug { get; set; }
    public string? SourcePath { get; set; }
    public string? Title { get; set; }
    public int CardCount { get; set; }
    public StudySelection? Selection { get; set; }
    public List<StudySet>? Sets { get; set; }
}

sealed class StudySelection
{
    public string? Source { get; set; }
    public int RequestedCount { get; set; }
    public int Seed { get; set; }
}

sealed class StudySet
{
    public int SetNumber { get; set; }
    public List<StudyQuestion>? Questions { get; set; }
}

sealed class StudyQuestion
{
    public string? Id { get; set; }
    public int SetNumber { get; set; }
    public int QuestionNumber { get; set; }
    public string? Question { get; set; }
    public string? Answer { get; set; }
    public int WordCount { get; set; }
}
