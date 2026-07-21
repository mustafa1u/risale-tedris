namespace Rissor.Augmentation.Core;

public sealed record PartRef(
    string Key,
    string BookSlug,
    string BookTitle,
    int BookOrder,
    string PartNo,
    int PartNumber,
    string Title);

public class SourceQuestion
{
    public string CanonicalId { get; set; } = "";
    public string SourceQuestionId { get; set; } = "";
    public int SourceSetNumber { get; set; }
    public int SourceQuestionNumber { get; set; }
    public string Question { get; set; } = "";
    public string Answer { get; set; } = "";
    public int WordCount { get; set; }
    public string Hint { get; set; } = "";
    public List<string> DependsOn { get; set; } = [];
}

public sealed class SourceSet
{
    public int SetNumber { get; set; }
    public List<SourceQuestion> Questions { get; set; } = [];
}

public sealed class PartGradeSource
{
    public int SchemaVersion { get; set; }
    public int CatalogVersion { get; set; }
    public string Key { get; set; } = "";
    public string BookSlug { get; set; } = "";
    public string BookTitle { get; set; } = "";
    public int BookOrder { get; set; }
    public string GradeSlug { get; set; } = "";
    public string PartNo { get; set; } = "";
    public int PartNumber { get; set; }
    public string Title { get; set; } = "";
    public string SourcePath { get; set; } = "";
    public string SourceRevision { get; set; } = "";
    public int SetCount { get; set; }
    public int QuestionCount { get; set; }
    public List<SourceSet> Sets { get; set; } = [];
}

public sealed class AugmentedQuestion : SourceQuestion
{
    public string SourcePartKey { get; set; } = "";
    public string SourceBookSlug { get; set; } = "";
    public string SourceBookTitle { get; set; } = "";
    public string SourcePartNo { get; set; } = "";
    public string SourcePartTitle { get; set; } = "";
    public int SourcePartOrder { get; set; }
    public string DisplayLabel { get; set; } = "";
    public string DisplayQuestion { get; set; } = "";
    public int SelectedSetNumber { get; set; }
    public int SelectedQuestionNumber { get; set; }
    public string FinalQuestionId { get; set; } = "";
    public List<string> FinalDependsOn { get; set; } = [];
    public List<string> FinalDependsOnCanonicalIds { get; set; } = [];
}

public sealed record AugmentationWarning(string Code, string QuestionId, string DependencyId);

public sealed class AugmentedSet
{
    public int SetNumber { get; set; }
    public List<AugmentedQuestion> Questions { get; set; } = [];
}

public sealed class GradeAugmentationResult
{
    public string GradeSlug { get; set; } = "";
    public int BaseSetCount { get; set; }
    public int TotalQuestions { get; set; }
    public int RedistributedSetCount { get; set; }
    public int SelectedQuestionCount { get; set; }
    public List<AugmentedSet> SelectedSets { get; set; } = [];
    public List<AugmentedQuestion> StudyQuestions { get; set; } = [];
    public List<AugmentationWarning> Warnings { get; set; } = [];
}

public sealed record ExportCreateRequest(
    int SchemaVersion,
    string CatalogRevision,
    string ProjectId,
    string Title,
    string HomeBookSlug,
    string BasePartKey,
    IReadOnlyList<string> OrderedPartKeys,
    IReadOnlyList<string> GradeSlugs);

public sealed record ExportValidationError(string Code, string Message);
