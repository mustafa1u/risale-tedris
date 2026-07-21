using System.Text.Json;
using Rissor.Augmentation.Core;

namespace Rissor.Augmentation.Export;

public sealed class CatalogRepository
{
    private readonly string _assetsRoot;
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public string AssetsRoot => _assetsRoot;

    public CatalogRepository(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configuredRoot = configuration["Augmentation:AssetsRoot"];
        _assetsRoot = Path.GetFullPath(string.IsNullOrWhiteSpace(configuredRoot)
            ? Path.Combine(environment.ContentRootPath, "..", "..", "assets")
            : Path.IsPathFullyQualified(configuredRoot)
                ? configuredRoot
                : Path.Combine(environment.ContentRootPath, configuredRoot));
    }

    public async Task<PreparedExportInput> LoadAsync(
        ExportCreateRequest request,
        CancellationToken cancellationToken)
    {
        var catalogPath = Path.Combine(_assetsRoot, "augmentation-catalog.json");
        var catalog = await ReadAsync<AugmentationCatalog>(catalogPath, cancellationToken)
            ?? throw new InvalidOperationException("Augmentation catalog could not be read.");
        if (!string.Equals(catalog.CatalogRevision, request.CatalogRevision, StringComparison.Ordinal))
            throw new InvalidOperationException("The project catalog revision is stale. Refresh the project before exporting.");

        var partLookup = catalog.Books
            .SelectMany(book => book.Parts.Select(part => (Book: book, Part: part)))
            .ToDictionary(item => item.Part.Key, StringComparer.Ordinal);
        var orderedParts = new List<PartRef>();
        foreach (var key in request.OrderedPartKeys)
        {
            if (!partLookup.TryGetValue(key, out var context))
                throw new InvalidOperationException($"Unknown augmentation part: {key}");
            orderedParts.Add(new PartRef(
                context.Part.Key,
                context.Book.Slug,
                context.Book.Title,
                context.Book.BookOrder,
                context.Part.PartNo,
                context.Part.PartNumber,
                context.Part.Title));
        }
        if (!orderedParts.Any(part => part.Key == request.BasePartKey))
            throw new InvalidOperationException("The base part is not present in the ordered composition.");
        if (!string.Equals(orderedParts.First(part => part.Key == request.BasePartKey).BookSlug, request.HomeBookSlug, StringComparison.Ordinal))
            throw new InvalidOperationException("The home book does not match the base part.");

        var grades = new Dictionary<string, IReadOnlyDictionary<string, PartGradeSource>>(StringComparer.Ordinal);
        foreach (var gradeSlug in request.GradeSlugs)
        {
            var sources = new Dictionary<string, PartGradeSource>(StringComparer.Ordinal);
            var totalQuestions = 0;
            foreach (var part in orderedParts)
            {
                var catalogPart = partLookup[part.Key].Part;
                if (!catalogPart.Grades.TryGetValue(gradeSlug, out var catalogGrade))
                    throw new InvalidOperationException($"Grade '{gradeSlug}' is unavailable for {part.Key}.");
                var sourcePath = SafeSourcePath(part.BookSlug, gradeSlug, part.PartNo);
                var source = await ReadAsync<PartGradeSource>(sourcePath, cancellationToken)
                    ?? throw new InvalidOperationException($"Question source could not be read: {part.Key}:{gradeSlug}");
                if (source.SchemaVersion != 1 || !string.Equals(source.SourceRevision, catalogGrade.SourceRevision, StringComparison.Ordinal))
                    throw new InvalidOperationException($"Question source revision mismatch: {part.Key}:{gradeSlug}");
                totalQuestions += source.QuestionCount;
                if (totalQuestions > 20_000)
                    throw new InvalidOperationException("The export exceeds the 20,000-question safety limit.");
                sources[part.Key] = source;
            }
            grades[gradeSlug] = sources;
        }

        return new PreparedExportInput(request, orderedParts, grades);
    }

    private string SafeSourcePath(string bookSlug, string gradeSlug, string partNo)
    {
        static bool SafeToken(string value) => value.Length is > 0 and <= 80
            && value.All(character => char.IsAsciiLetterOrDigit(character) || character is '-');
        if (!SafeToken(bookSlug) || !SafeToken(gradeSlug) || !SafeToken(partNo))
            throw new InvalidOperationException("Catalog contains an unsafe source path token.");
        var path = Path.GetFullPath(Path.Combine(
            _assetsRoot,
            bookSlug,
            "augmentation-bank",
            gradeSlug,
            $"{partNo}.json"));
        if (!path.StartsWith(_assetsRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Resolved question source escaped the configured assets root.");
        return path;
    }

    private async Task<T?> ReadAsync<T>(string path, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, _json, cancellationToken);
    }
}

public sealed record PreparedExportInput(
    ExportCreateRequest Request,
    IReadOnlyList<PartRef> OrderedParts,
    IReadOnlyDictionary<string, IReadOnlyDictionary<string, PartGradeSource>> SourcesByGrade);

public sealed class AugmentationCatalog
{
    public int SchemaVersion { get; set; }
    public int CatalogVersion { get; set; }
    public string CatalogRevision { get; set; } = "";
    public List<CatalogBook> Books { get; set; } = [];
}

public sealed class CatalogBook
{
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public int BookOrder { get; set; }
    public List<CatalogPart> Parts { get; set; } = [];
}

public sealed class CatalogPart
{
    public string Key { get; set; } = "";
    public string PartNo { get; set; } = "";
    public int PartNumber { get; set; }
    public string Title { get; set; } = "";
    public Dictionary<string, CatalogGrade> Grades { get; set; } = new(StringComparer.Ordinal);
}

public sealed class CatalogGrade
{
    public string Url { get; set; } = "";
    public string SourceRevision { get; set; } = "";
    public int SetCount { get; set; }
    public int QuestionCount { get; set; }
}
