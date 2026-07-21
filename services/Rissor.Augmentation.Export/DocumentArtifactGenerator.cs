using System.Diagnostics;
using System.IO.Compression;
using System.Text;
using QAGeneratorLib.Models;
using QAGeneratorLib.Services;
using Rissor.Augmentation.Core;

namespace Rissor.Augmentation.Export;

public sealed class DocumentArtifactGenerator
{
    private const string TurkishWordCountLabel = "kelime";

    private static readonly IReadOnlyDictionary<string, string> Themes =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["2-sinif"] = "Laser Sky",
            ["5-sinif"] = "Laser Mint",
            ["8-sinif"] = "Laser Lavender",
            ["11-sinif"] = "Laser Peach",
            ["lisans"] = "Laser Coral"
        };

    private readonly string _soffice;

    public string SofficePath => _soffice;

    public DocumentArtifactGenerator(IConfiguration configuration)
    {
        _soffice = configuration["Augmentation:SofficePath"]
            ?? Environment.GetEnvironmentVariable("SOFFICE_PATH")
            ?? (OperatingSystem.IsWindows()
                ? @"C:\Program Files\LibreOffice\program\soffice.exe"
                : "soffice");
    }

    public async Task<IReadOnlyList<ExportArtifact>> GenerateAsync(
        ExportJob job,
        PreparedExportInput input,
        CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(job.DirectoryPath);
        var engine = new AugmentationEngine();
        var artifacts = new List<ExportArtifact>();
        var safeTitle = SafeFileToken(input.Request.Title);

        foreach (var gradeSlug in input.Request.GradeSlugs)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var result = engine.AugmentGrade(
                input.Request.BasePartKey,
                gradeSlug,
                input.OrderedParts,
                input.SourcesByGrade[gradeSlug]);
            var code = gradeSlug.Replace("-", "", StringComparison.Ordinal);
            var baseName = $"{code}_personal-{safeTitle}-{job.Id[..8]}";
            var paths = new GeneratedPaths(job.DirectoryPath, baseName);

            GenerateQuestionSheet(paths.QuestionSheetDocx, result, input.Request.Title, mobile: false);
            GenerateQuestionSheet(paths.MobileQuestionSheetDocx, result, input.Request.Title, mobile: true);
            GenerateFlashcards(paths.FlashcardDocx, result, input.Request.Title, gradeSlug, mobile: false);
            GenerateFlashcards(paths.MobileFlashcardDocx, result, input.Request.Title, gradeSlug, mobile: true);

            await ConvertToPdfAsync([
                paths.QuestionSheetDocx,
                paths.MobileQuestionSheetDocx,
                paths.FlashcardDocx,
                paths.MobileFlashcardDocx
            ], job.DirectoryPath, cancellationToken);

            artifacts.Add(CreateArtifact(job, paths.QuestionSheetDocx, gradeSlug, "SK", "docx"));
            artifacts.Add(CreateArtifact(job, Path.ChangeExtension(paths.QuestionSheetDocx, ".pdf"), gradeSlug, "SK", "pdf"));
            artifacts.Add(CreateArtifact(job, Path.ChangeExtension(paths.MobileQuestionSheetDocx, ".pdf"), gradeSlug, "SK", "mobile-pdf"));
            artifacts.Add(CreateArtifact(job, paths.FlashcardDocx, gradeSlug, "BK", "docx"));
            artifacts.Add(CreateArtifact(job, Path.ChangeExtension(paths.FlashcardDocx, ".pdf"), gradeSlug, "BK", "pdf"));
            artifacts.Add(CreateArtifact(job, Path.ChangeExtension(paths.MobileFlashcardDocx, ".pdf"), gradeSlug, "BK", "mobile-pdf"));

            File.Delete(paths.MobileQuestionSheetDocx);
            File.Delete(paths.MobileFlashcardDocx);
        }
        return artifacts;
    }

    private static void GenerateQuestionSheet(
        string outputPath,
        GradeAugmentationResult result,
        string title,
        bool mobile)
    {
        var sets = result.SelectedSets.Select(set => set.Questions.Select(MapQuestion).ToList()).ToList();
        var service = new QAGenServ2
        {
            GenerateQADoc = true,
            MakeFlashCards = false,
            GenerateAnswers = true,
            EnableMarkdown = true,
            OutputQADocFilePath = outputPath,
            NumberOfSheets = sets.Count,
            WordForWords = TurkishWordCountLabel,
            WordForAnswers = "CEVAPLAR",
            AnswersSectionTitle = "CEVAP ANAHTARI",
            AnswersOfSheets = "AfterAllSheets",
            SetOfQuestions = true,
            SetString = "Set - "
        };
        service.GenerateAllDocuments(
            sets,
            title,
            qaPageSize: mobile ? "A5" : null,
            qaOrientation: mobile ? "Portrait" : null,
            qaMarginPreset: mobile ? "Narrow" : null,
            qaFontSizePt: mobile ? 12 : null,
            qaHeading1FontSizePt: mobile ? 14 : null,
            qaHeading2FontSizePt: mobile ? 14 : null);
        ValidateDocx(outputPath);
    }

    private static void GenerateFlashcards(
        string outputPath,
        GradeAugmentationResult result,
        string title,
        string gradeSlug,
        bool mobile)
    {
        var questions = result.StudyQuestions.Select(MapQuestion).ToList();
        var service = new QAGenServ2
        {
            GenerateQADoc = false,
            MakeFlashCards = true,
            GenerateAnswers = false,
            EnableMarkdown = true,
            OutputFlashFilePath = outputPath,
            NumberOfFlashcards = questions.Count,
            RowsPerPage = mobile ? 1 : 3,
            ColsPerRow = mobile ? 1 : 4,
            WordForWords = TurkishWordCountLabel,
            WordForFlashcardAnswer = "Cevap",
            FlashcardColorTheme = Themes[gradeSlug],
            FlashcardLabelFontSizePt = mobile ? 8 : 7,
            SetOfQuestions = true
        };
        service.GenerateAllDocuments(
            questions,
            title,
            flashcardPageSize: mobile ? "A7" : null,
            flashcardOrientation: mobile ? "Landscape" : null,
            flashcardMarginPreset: mobile ? "Narrow" : null,
            flashcardHeaderFontSizePt: mobile ? 15 : null,
            flashcardBodyFontSizePt: mobile ? 15 : null,
            flashcardLabelFontSizePt: mobile ? 8 : 7,
            flashcardColorTheme: Themes[gradeSlug]);
        ValidateDocx(outputPath);
    }

    private static QuestionAnswer MapQuestion(AugmentedQuestion question) => new()
    {
        Question = question.DisplayQuestion,
        Answer = question.Answer,
        WordCount = question.WordCount,
        Hint = question.Hint,
        SourceSetNumber = question.SelectedSetNumber,
        SourceQuestionNumber = question.SelectedQuestionNumber,
        SourceQuestionId = question.FinalQuestionId
    };

    private async Task ConvertToPdfAsync(
        IReadOnlyList<string> inputPaths,
        string outputDirectory,
        CancellationToken cancellationToken)
    {
        if (Path.IsPathFullyQualified(_soffice) && !File.Exists(_soffice))
            throw new FileNotFoundException("LibreOffice executable was not found.", _soffice);
        var profilePath = Path.Combine(outputDirectory, $".libreoffice-{Guid.NewGuid():N}");
        var profileUri = new Uri(profilePath + Path.DirectorySeparatorChar).AbsoluteUri;
        var start = new ProcessStartInfo
        {
            FileName = _soffice,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            WorkingDirectory = outputDirectory
        };
        foreach (var argument in new[]
        {
            $"-env:UserInstallation={profileUri}",
            "--headless", "--nologo", "--nodefault", "--nofirststartwizard",
            "--convert-to", "pdf", "--outdir", outputDirectory
        }) start.ArgumentList.Add(argument);
        foreach (var inputPath in inputPaths) start.ArgumentList.Add(inputPath);
        using var process = Process.Start(start)
            ?? throw new InvalidOperationException("LibreOffice could not be started.");
        var standardError = process.StandardError.ReadToEndAsync(cancellationToken);
        var standardOutput = process.StandardOutput.ReadToEndAsync(cancellationToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromMinutes(2));
        try
        {
            await process.WaitForExitAsync(timeout.Token);
            if (process.ExitCode != 0)
                throw new InvalidOperationException($"LibreOffice failed with exit code {process.ExitCode}: {await standardError}");
            _ = await standardOutput;
            foreach (var inputPath in inputPaths) ValidatePdf(Path.ChangeExtension(inputPath, ".pdf"));
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            try { process.Kill(entireProcessTree: true); } catch { }
            throw new TimeoutException("LibreOffice conversion exceeded two minutes.");
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(entireProcessTree: true); } catch { }
            throw;
        }
        finally
        {
            try { if (Directory.Exists(profilePath)) Directory.Delete(profilePath, recursive: true); } catch { }
        }
    }

    private static ExportArtifact CreateArtifact(
        ExportJob job,
        string path,
        string gradeSlug,
        string documentType,
        string format)
    {
        var info = new FileInfo(path);
        if (!info.Exists || info.Length == 0) throw new InvalidOperationException($"Generated artifact is empty: {path}");
        return new ExportArtifact(
            info.Name,
            gradeSlug,
            documentType,
            format,
            info.Length,
            $"/api/augmentation/exports/{job.Id}/artifacts/{Uri.EscapeDataString(info.Name)}");
    }

    private static void ValidateDocx(string path)
    {
        var info = new FileInfo(path);
        if (!info.Exists || info.Length < 1000) throw new InvalidOperationException($"DOCX generation failed: {path}");
        using var archive = ZipFile.OpenRead(path);
        if (archive.GetEntry("[Content_Types].xml") == null || archive.GetEntry("word/document.xml") == null)
            throw new InvalidOperationException($"DOCX package is invalid: {path}");
    }

    private static void ValidatePdf(string path)
    {
        var info = new FileInfo(path);
        if (!info.Exists || info.Length < 100) throw new InvalidOperationException($"PDF generation failed: {path}");
        using var stream = File.OpenRead(path);
        Span<byte> header = stackalloc byte[5];
        if (stream.Read(header) != 5 || Encoding.ASCII.GetString(header) != "%PDF-")
            throw new InvalidOperationException($"PDF header is invalid: {path}");
    }

    private static string SafeFileToken(string title)
    {
        var normalized = new string(title.Normalize()
            .Select(character => char.IsAsciiLetterOrDigit(character) ? char.ToLowerInvariant(character) : '-')
            .ToArray());
        while (normalized.Contains("--", StringComparison.Ordinal)) normalized = normalized.Replace("--", "-", StringComparison.Ordinal);
        normalized = normalized.Trim('-');
        if (normalized.Length > 60) normalized = normalized[..60].TrimEnd('-');
        return string.IsNullOrWhiteSpace(normalized) ? "augmentation" : normalized;
    }

    private sealed class GeneratedPaths(string root, string baseName)
    {
        public string QuestionSheetDocx { get; } = Path.Combine(root, $"SK_{baseName}.docx");
        public string MobileQuestionSheetDocx { get; } = Path.Combine(root, $"SK6_{baseName}.docx");
        public string FlashcardDocx { get; } = Path.Combine(root, $"BK_{baseName}.docx");
        public string MobileFlashcardDocx { get; } = Path.Combine(root, $"BK6_{baseName}.docx");
    }
}
