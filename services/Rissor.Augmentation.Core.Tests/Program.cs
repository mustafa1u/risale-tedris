using Rissor.Augmentation.Core;

var tests = new (string Name, Action Run)[]
{
    ("exact redistribution thresholds", ExactThresholds),
    ("redistribution uses source question position order", PositionOrderRedistribution),
    ("part order survives redistribution", PartOrder),
    ("dependency blocks stay together", DependencyBlocksStayTogether),
    ("dependency identities are rewritten", DependencyRewrite),
    ("export requests enforce limits", RequestLimits)
};

var failures = new List<string>();
foreach (var test in tests)
{
    try
    {
        test.Run();
        Console.WriteLine($"PASS {test.Name}");
    }
    catch (Exception error)
    {
        failures.Add($"FAIL {test.Name}: {error.Message}");
        Console.Error.WriteLine(failures[^1]);
    }
}
return failures.Count == 0 ? 0 : 1;

static void ExactThresholds()
{
    var expected = new Dictionary<int, int>
    {
        [0] = 6, [1] = 6, [59] = 6, [60] = 6, [61] = 7, [69] = 7, [70] = 8, [79] = 8, [80] = 9
    };
    foreach (var pair in expected)
        Assert(AugmentationEngine.TargetSetCount(pair.Key) == pair.Value, $"{pair.Key} should map to {pair.Value}");
}

static void PartOrder()
{
    var parts = new[] { Part("p07", 7), Part("p08", 8), Part("p09", 9) };
    var sources = parts.ToDictionary(
        part => part.Key,
        part => Source(part, Enumerable.Repeat(3, 6).ToArray()));
    var result = new AugmentationEngine().AugmentGrade(parts[1].Key, "5-sinif", parts, sources);
    foreach (var set in result.SelectedSets)
    {
        var order = set.Questions.Select(question => question.SourcePartOrder).ToList();
        Assert(order.SequenceEqual(order.OrderBy(value => value)), "Part order changed inside a target set.");
    }
}

static void PositionOrderRedistribution()
{
    var part = Part("p01", 1);
    var source = Source(part, [3, 3]);
    var result = new AugmentationEngine().AugmentGrade(part.Key, "5-sinif", [part],
        new Dictionary<string, PartGradeSource> { [part.Key] = source });
    var idsBySet = result.SelectedSets
        .Select(set => set.Questions.Select(question => question.SourceQuestionId).ToArray())
        .ToArray();

    Assert(SequenceEqual(idsBySet[0], ["S1Q1"]), "Set 1 should receive S1Q1.");
    Assert(SequenceEqual(idsBySet[1], ["S2Q1"]), "Set 2 should receive S2Q1.");
    Assert(SequenceEqual(idsBySet[2], ["S1Q2"]), "Set 3 should receive S1Q2.");
    Assert(SequenceEqual(idsBySet[3], ["S2Q2"]), "Set 4 should receive S2Q2.");
    Assert(SequenceEqual(idsBySet[4], ["S1Q3"]), "Set 5 should receive S1Q3.");
    Assert(SequenceEqual(idsBySet[5], ["S2Q3"]), "Set 6 should receive S2Q3.");
}

static void DependencyBlocksStayTogether()
{
    var part = Part("p01", 1);
    var source = Source(part, [2]);
    source.Sets[0].Questions[1].DependsOn.Add(source.Sets[0].Questions[0].CanonicalId);

    var result = new AugmentationEngine().AugmentGrade(part.Key, "5-sinif", [part],
        new Dictionary<string, PartGradeSource> { [part.Key] = source });
    var selected = result.SelectedSets.SelectMany(set => set.Questions).ToList();
    var parent = selected.Single(question => question.SourceQuestionId == "S1Q1");
    var child = selected.Single(question => question.SourceQuestionId == "S1Q2");

    Assert(parent.SelectedSetNumber == child.SelectedSetNumber, "Dependency block was split across target sets.");
    Assert(child.FinalDependsOn.SequenceEqual([parent.FinalQuestionId]), "Dependency was not rewritten to the same selected set.");
    Assert(result.Warnings.Count == 0, "A valid selected dependency produced warnings.");
}

static void DependencyRewrite()
{
    var part = Part("p01", 1);
    var source = Source(part, [12, 12, 12, 12, 12, 12]);
    source.Sets[0].Questions[1].DependsOn.Add(source.Sets[0].Questions[0].CanonicalId);
    var result = new AugmentationEngine().AugmentGrade(part.Key, "5-sinif", [part],
        new Dictionary<string, PartGradeSource> { [part.Key] = source });
    var child = result.SelectedSets.SelectMany(set => set.Questions)
        .Single(question => question.CanonicalId == source.Sets[0].Questions[1].CanonicalId);
    Assert(child.FinalDependsOn.All(id => id.StartsWith('S') && id.Contains('Q')), "Dependency was not rewritten.");
}

static void RequestLimits()
{
    var validator = new ExportRequestValidator();
    var valid = new ExportCreateRequest(1, "revision", "id", "title", "book", "book:p01",
        ["book:p01", "book:p02"], ["5-sinif"]);
    Assert(validator.Validate(valid).Count == 0, "Valid request was rejected.");
    var invalid = valid with
    {
        HomeBookSlug = "",
        BasePartKey = "",
        OrderedPartKeys = ["book:p01", "book:p01"],
        GradeSlugs = ["5-sinif", "5-sinif"]
    };
    var codes = validator.Validate(invalid).Select(error => error.Code).ToHashSet();
    Assert(codes.Contains("parts-duplicate"), "Duplicate parts were accepted.");
    Assert(codes.Contains("grades-duplicate"), "Duplicate grades were accepted.");
    Assert(codes.Contains("home-book") && codes.Contains("base-part"), "Missing recipe identity was accepted.");
}

static PartRef Part(string partNo, int number) =>
    new($"book:{partNo}", "book", "Book", 0, partNo, number, partNo);

static PartGradeSource Source(PartRef part, IReadOnlyList<int> setSizes)
{
    var source = new PartGradeSource
    {
        SchemaVersion = 1,
        BookSlug = part.BookSlug,
        BookTitle = part.BookTitle,
        GradeSlug = "5-sinif",
        PartNo = part.PartNo,
        PartNumber = part.PartNumber,
        Title = part.Title,
        SourceRevision = "revision"
    };
    for (var setIndex = 0; setIndex < setSizes.Count; setIndex++)
    {
        var set = new SourceSet { SetNumber = setIndex + 1 };
        for (var questionIndex = 0; questionIndex < setSizes[setIndex]; questionIndex++)
        {
            var sourceId = $"S{setIndex + 1}Q{questionIndex + 1}";
            set.Questions.Add(new SourceQuestion
            {
                CanonicalId = $"{part.Key}:5-sinif:{sourceId}",
                SourceQuestionId = sourceId,
                SourceSetNumber = setIndex + 1,
                SourceQuestionNumber = questionIndex + 1,
                Question = $"{part.PartNo} question {sourceId}",
                Answer = "answer"
            });
        }
        source.Sets.Add(set);
    }
    source.SetCount = source.Sets.Count;
    source.QuestionCount = source.Sets.Sum(set => set.Questions.Count);
    return source;
}

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

static bool SequenceEqual<T>(IEnumerable<T> actual, IEnumerable<T> expected) =>
    actual.SequenceEqual(expected);
