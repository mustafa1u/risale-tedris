namespace Rissor.Augmentation.Core;

public sealed class ExportRequestValidator
{
    private static readonly HashSet<string> Grades =
    ["2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans"];

    public IReadOnlyList<ExportValidationError> Validate(ExportCreateRequest? request)
    {
        var errors = new List<ExportValidationError>();
        if (request == null)
            return [new("request-required", "An export request is required.")];
        if (request.SchemaVersion != 1) errors.Add(new("schema", "Unsupported export request schema."));
        if (string.IsNullOrWhiteSpace(request.CatalogRevision) || request.CatalogRevision.Length > 128)
            errors.Add(new("catalog-revision", "Catalog revision is invalid."));
        if (string.IsNullOrWhiteSpace(request.ProjectId) || request.ProjectId.Length > 100) errors.Add(new("project-id", "Project id is invalid."));
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 160) errors.Add(new("title", "Title must be between 1 and 160 characters."));
        if (string.IsNullOrWhiteSpace(request.HomeBookSlug) || request.HomeBookSlug.Length > 80)
            errors.Add(new("home-book", "Home book is invalid."));
        if (string.IsNullOrWhiteSpace(request.BasePartKey) || request.BasePartKey.Length > 160)
            errors.Add(new("base-part", "Base part is invalid."));
        if (request.OrderedPartKeys == null || request.OrderedPartKeys.Count is < 2 or > 100)
            errors.Add(new("parts", "Between 2 and 100 ordered parts are required."));
        else
        {
            if (request.OrderedPartKeys.Any(key => string.IsNullOrWhiteSpace(key) || key.Length > 160))
                errors.Add(new("part-key", "An ordered part key is invalid."));
            if (request.OrderedPartKeys.Distinct(StringComparer.Ordinal).Count() != request.OrderedPartKeys.Count)
                errors.Add(new("parts-duplicate", "Ordered parts must not contain duplicates."));
        }
        if (request.OrderedPartKeys?.Contains(request.BasePartKey, StringComparer.Ordinal) != true)
            errors.Add(new("base-part", "The base part must remain in the ordered parts."));
        if (request.GradeSlugs == null || request.GradeSlugs.Count is < 1 or > 5)
            errors.Add(new("grades", "Between 1 and 5 grades are required."));
        else
        {
            if (request.GradeSlugs.Distinct(StringComparer.Ordinal).Count() != request.GradeSlugs.Count)
                errors.Add(new("grades-duplicate", "Grades must not contain duplicates."));
            if (request.GradeSlugs.Any(grade => !Grades.Contains(grade)))
                errors.Add(new("grade-unknown", "An unknown grade was requested."));
        }
        return errors;
    }
}
