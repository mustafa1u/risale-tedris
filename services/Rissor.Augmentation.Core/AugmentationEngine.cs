namespace Rissor.Augmentation.Core;

public sealed class AugmentationEngine
{
    public GradeAugmentationResult AugmentGrade(
        string basePartKey,
        string gradeSlug,
        IReadOnlyList<PartRef> orderedParts,
        IReadOnlyDictionary<string, PartGradeSource> sources)
    {
        if (orderedParts.Count == 0 || orderedParts.All(part => part.Key != basePartKey))
            throw new InvalidOperationException("The locked base part must remain in the composition.");
        if (!sources.TryGetValue(basePartKey, out var baseSource) || baseSource.Sets.Count == 0)
            throw new InvalidOperationException($"Base part data is unavailable for grade '{gradeSlug}'.");

        var baseSetCount = baseSource.Sets.Count;
        var includeBookName = orderedParts.Select(part => part.BookSlug).Distinct(StringComparer.OrdinalIgnoreCase).Count() > 1;
        var merged = Enumerable.Range(1, baseSetCount)
            .Select(number => new AugmentedSet { SetNumber = number })
            .ToList();

        for (var partOrder = 0; partOrder < orderedParts.Count; partOrder++)
        {
            var part = orderedParts[partOrder];
            if (!sources.TryGetValue(part.Key, out var source))
                throw new InvalidOperationException($"Part data is unavailable for grade '{gradeSlug}': {part.Key}");
            var normalized = Normalize(source, baseSetCount);
            for (var setIndex = 0; setIndex < baseSetCount; setIndex++)
            {
                merged[setIndex].Questions.AddRange(normalized[setIndex].Questions.Select(question =>
                    Decorate(question, part, partOrder, includeBookName)));
            }
        }

        var redistributed = Redistribute(merged);
        redistributed.GradeSlug = gradeSlug;
        redistributed.BaseSetCount = baseSetCount;
        redistributed.StudyQuestions = SelectStudyQuestions(
            redistributed.SelectedSets.SelectMany(set => set.Questions).ToList(), 24);
        return redistributed;
    }

    public static int TargetSetCount(int totalQuestions)
        => totalQuestions <= 60 ? 6 : (totalQuestions / 10) + 1;

    private static List<SourceSet> Normalize(PartGradeSource source, int targetCount)
    {
        if (source.Sets.Count == targetCount)
            return source.Sets.Select((set, index) => new SourceSet
            {
                SetNumber = index + 1,
                Questions = set.Questions.Select(CloneSource).ToList()
            }).ToList();

        var result = Enumerable.Range(1, targetCount)
            .Select(number => new SourceSet { SetNumber = number })
            .ToList();
        var flat = source.Sets.SelectMany(set => set.Questions).Select(CloneSource).ToList();
        for (var index = 0; index < flat.Count; index++)
            result[index % targetCount].Questions.Add(flat[index]);
        return result;
    }

    private static AugmentedQuestion Decorate(SourceQuestion question, PartRef part, int partOrder, bool includeBookName)
    {
        var label = includeBookName ? $"{part.BookTitle} {part.PartNo}" : part.PartNo;
        return new AugmentedQuestion
        {
            CanonicalId = question.CanonicalId,
            SourceQuestionId = question.SourceQuestionId,
            SourceSetNumber = question.SourceSetNumber,
            SourceQuestionNumber = question.SourceQuestionNumber,
            Question = question.Question,
            Answer = question.Answer,
            WordCount = question.WordCount,
            Hint = question.Hint,
            DependsOn = [.. question.DependsOn],
            SourcePartKey = part.Key,
            SourceBookSlug = part.BookSlug,
            SourceBookTitle = part.BookTitle,
            SourcePartNo = part.PartNo,
            SourcePartTitle = part.Title,
            SourcePartOrder = partOrder,
            DisplayLabel = label,
            DisplayQuestion = $"({label}) {question.Question}"
        };
    }

    private sealed class QuestionBlock
    {
        public List<AugmentedQuestion> Questions { get; init; } = [];
    }

    private sealed class DependencyGraph
    {
        public bool HasDependencies { get; init; }
        public HashSet<string> QuestionIds { get; init; } = new(StringComparer.Ordinal);
        public Dictionary<string, HashSet<string>> ParentsByQuestion { get; init; } = new(StringComparer.Ordinal);
        public Dictionary<string, HashSet<string>> DependentsByQuestion { get; init; } = new(StringComparer.Ordinal);
    }

    private static GradeAugmentationResult Redistribute(IReadOnlyList<AugmentedSet> sourceSets)
    {
        var normalizedSourceSets = sourceSets.Select(set => new AugmentedSet
        {
            SetNumber = set.SetNumber,
            Questions = set.Questions.Select(CloneAugmented).ToList()
        }).ToList();
        var questions = FlattenByQuestionPosition(normalizedSourceSets);
        var duplicate = questions.GroupBy(question => question.CanonicalId, StringComparer.Ordinal)
            .FirstOrDefault(group => group.Count() > 1);
        if (duplicate != null)
            throw new InvalidOperationException($"Duplicate canonical question id: {duplicate.Key}");

        var targetCount = TargetSetCount(questions.Count);
        var graph = BuildDependencyGraph(normalizedSourceSets);
        var blocks = BuildBlocksByQuestionPosition(normalizedSourceSets, graph);
        var allSets = RedistributeBlocksBalanced(blocks, targetCount);

        var selectedSets = allSets.Take(6).Select(set => new AugmentedSet
        {
            SetNumber = set.SetNumber,
            Questions = set.Questions.Select(CloneAugmented).ToList()
        }).ToList();

        var finalIds = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var set in selectedSets)
        {
            for (var questionIndex = 0; questionIndex < set.Questions.Count; questionIndex++)
            {
                var question = set.Questions[questionIndex];
                question.SelectedSetNumber = set.SetNumber;
                question.SelectedQuestionNumber = questionIndex + 1;
                question.FinalQuestionId = $"S{set.SetNumber}Q{questionIndex + 1}";
                finalIds[question.CanonicalId] = question.FinalQuestionId;
            }
        }

        var warnings = new List<AugmentationWarning>();
        foreach (var question in selectedSets.SelectMany(set => set.Questions))
        {
            foreach (var dependencyId in question.DependsOn)
            {
                if (finalIds.TryGetValue(dependencyId, out var finalDependency))
                {
                    question.FinalDependsOn.Add(finalDependency);
                    question.FinalDependsOnCanonicalIds.Add(dependencyId);
                }
                else
                {
                    warnings.Add(new AugmentationWarning(
                        "missing-selected-dependency",
                        question.CanonicalId,
                        dependencyId));
                }
            }
        }

        return new GradeAugmentationResult
        {
            TotalQuestions = questions.Count,
            RedistributedSetCount = targetCount,
            SelectedQuestionCount = selectedSets.Sum(set => set.Questions.Count),
            SelectedSets = selectedSets,
            Warnings = warnings
        };
    }

    private static List<AugmentedQuestion> FlattenByQuestionPosition(IReadOnlyList<AugmentedSet> sourceSets)
    {
        var result = new List<AugmentedQuestion>();
        var maxCount = sourceSets.Count == 0 ? 0 : sourceSets.Max(set => set.Questions.Count);
        for (var questionIndex = 0; questionIndex < maxCount; questionIndex++)
        {
            foreach (var set in sourceSets)
            {
                if (questionIndex < set.Questions.Count)
                    result.Add(CloneAugmented(set.Questions[questionIndex]));
            }
        }
        return result;
    }

    private static string QuestionIdentity(AugmentedQuestion question) => question.CanonicalId?.Trim() ?? "";

    private static void EnsureGraphEntry(Dictionary<string, HashSet<string>> map, string id)
    {
        if (!map.ContainsKey(id))
            map[id] = new HashSet<string>(StringComparer.Ordinal);
    }

    private static DependencyGraph BuildDependencyGraph(IReadOnlyList<AugmentedSet> sourceSets)
    {
        var graph = new DependencyGraph();
        var hasDependencies = false;

        foreach (var question in sourceSets.SelectMany(set => set.Questions))
        {
            var id = QuestionIdentity(question);
            if (string.IsNullOrWhiteSpace(id)) continue;
            graph.QuestionIds.Add(id);
            EnsureGraphEntry(graph.ParentsByQuestion, id);
            EnsureGraphEntry(graph.DependentsByQuestion, id);
        }

        foreach (var question in sourceSets.SelectMany(set => set.Questions))
        {
            var childId = QuestionIdentity(question);
            if (string.IsNullOrWhiteSpace(childId)) continue;
            foreach (var parentId in question.DependsOn.Select(value => value?.Trim()).Where(value => !string.IsNullOrWhiteSpace(value)))
            {
                hasDependencies = true;
                EnsureGraphEntry(graph.ParentsByQuestion, childId);
                EnsureGraphEntry(graph.DependentsByQuestion, parentId!);
                EnsureGraphEntry(graph.ParentsByQuestion, parentId!);
                EnsureGraphEntry(graph.DependentsByQuestion, childId);
                graph.QuestionIds.Add(parentId!);
                graph.ParentsByQuestion[childId].Add(parentId!);
                graph.DependentsByQuestion[parentId!].Add(childId);
            }
        }

        return new DependencyGraph
        {
            HasDependencies = hasDependencies,
            QuestionIds = graph.QuestionIds,
            ParentsByQuestion = graph.ParentsByQuestion,
            DependentsByQuestion = graph.DependentsByQuestion
        };
    }

    private static IEnumerable<string> GraphNeighbors(
        IReadOnlyDictionary<string, HashSet<string>> adjacency,
        string questionId,
        ISet<string>? allowedIds)
    {
        if (!adjacency.TryGetValue(questionId, out var neighbors))
            yield break;
        foreach (var neighbor in neighbors)
            if (allowedIds == null || allowedIds.Contains(neighbor))
                yield return neighbor;
    }

    private static HashSet<string> GetConnectedComponentIncludingSelf(
        string questionId,
        ISet<string> allowedIds,
        DependencyGraph graph)
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(questionId) || !allowedIds.Contains(questionId))
            return result;

        var stack = new Stack<string>();
        stack.Push(questionId);
        while (stack.Count > 0)
        {
            var current = stack.Pop();
            if (!result.Add(current)) continue;
            foreach (var parent in GraphNeighbors(graph.ParentsByQuestion, current, allowedIds)) stack.Push(parent);
            foreach (var dependent in GraphNeighbors(graph.DependentsByQuestion, current, allowedIds)) stack.Push(dependent);
        }
        return result;
    }

    private static List<QuestionBlock> BuildBlocksByQuestionPosition(
        IReadOnlyList<AugmentedSet> sourceSets,
        DependencyGraph graph)
    {
        if (!graph.HasDependencies)
            return FlattenByQuestionPosition(sourceSets)
                .Select(question => new QuestionBlock { Questions = [question] })
                .ToList();

        var blocks = new List<QuestionBlock>();
        var visitedIds = new HashSet<string>(StringComparer.Ordinal);
        var idsBySet = sourceSets
            .Select(set => set.Questions.Select(QuestionIdentity).Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet(StringComparer.Ordinal))
            .ToList();
        var maxCount = sourceSets.Count == 0 ? 0 : sourceSets.Max(set => set.Questions.Count);

        for (var questionIndex = 0; questionIndex < maxCount; questionIndex++)
        {
            for (var setIndex = 0; setIndex < sourceSets.Count; setIndex++)
            {
                var questions = sourceSets[setIndex].Questions;
                if (questionIndex >= questions.Count) continue;

                var question = questions[questionIndex];
                var id = QuestionIdentity(question);
                if (string.IsNullOrWhiteSpace(id))
                {
                    blocks.Add(new QuestionBlock { Questions = [CloneAugmented(question)] });
                    continue;
                }
                if (visitedIds.Contains(id)) continue;

                var allowedIds = idsBySet[setIndex];
                var componentIds = graph.QuestionIds.Contains(id)
                    ? GetConnectedComponentIncludingSelf(id, allowedIds, graph)
                    : new HashSet<string>(StringComparer.Ordinal) { id };
                if (componentIds.Count == 0) componentIds.Add(id);
                foreach (var componentId in componentIds) visitedIds.Add(componentId);

                blocks.Add(new QuestionBlock
                {
                    Questions = questions
                        .Where(candidate => componentIds.Contains(QuestionIdentity(candidate)))
                        .Select(CloneAugmented)
                        .ToList()
                });
            }
        }

        return blocks;
    }

    private static int GetNextBalancedTargetIndex(IReadOnlyList<AugmentedSet> result, int nextTargetIndex)
    {
        var minimumCount = result.Min(set => set.Questions.Count);
        for (var offset = 0; offset < result.Count; offset++)
        {
            var candidateIndex = (nextTargetIndex + offset) % result.Count;
            if (result[candidateIndex].Questions.Count == minimumCount)
                return candidateIndex;
        }
        return nextTargetIndex;
    }

    private static List<AugmentedSet> RedistributeBlocksBalanced(IReadOnlyList<QuestionBlock> blocks, int targetSetCount)
    {
        var result = Enumerable.Range(1, targetSetCount)
            .Select(number => new AugmentedSet { SetNumber = number })
            .ToList();
        var nextTargetIndex = 0;

        foreach (var block in blocks)
        {
            if (block.Questions.Count == 0) continue;
            var targetIndex = GetNextBalancedTargetIndex(result, nextTargetIndex);
            result[targetIndex].Questions.AddRange(block.Questions.Select(CloneAugmented));
            nextTargetIndex = (targetIndex + 1) % targetSetCount;
        }

        return result;
    }

    private static List<AugmentedQuestion> SelectStudyQuestions(
        IReadOnlyList<AugmentedQuestion> questions,
        int maximum)
    {
        var byId = questions.ToDictionary(question => question.CanonicalId, StringComparer.Ordinal);
        var selected = new List<AugmentedQuestion>();
        var selectedIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var candidate in questions)
        {
            if (selected.Count >= maximum) break;
            var closure = new List<AugmentedQuestion>();
            CollectClosure(candidate, byId, selectedIds, new HashSet<string>(StringComparer.Ordinal), closure);
            var missing = closure.Where(question => !selectedIds.Contains(question.CanonicalId)).ToList();
            if (selected.Count + missing.Count > maximum) continue;
            foreach (var question in missing)
            {
                selected.Add(CloneAugmented(question));
                selectedIds.Add(question.CanonicalId);
            }
        }
        return selected;
    }

    private static void CollectClosure(
        AugmentedQuestion question,
        IReadOnlyDictionary<string, AugmentedQuestion> byId,
        ISet<string> selected,
        ISet<string> visiting,
        List<AugmentedQuestion> closure)
    {
        if (selected.Contains(question.CanonicalId) || closure.Any(item => item.CanonicalId == question.CanonicalId)) return;
        if (!visiting.Add(question.CanonicalId)) return;
        foreach (var dependency in question.FinalDependsOnCanonicalIds)
            if (byId.TryGetValue(dependency, out var parent)) CollectClosure(parent, byId, selected, visiting, closure);
        visiting.Remove(question.CanonicalId);
        closure.Add(question);
    }

    private static SourceQuestion CloneSource(SourceQuestion source) => new()
    {
        CanonicalId = source.CanonicalId,
        SourceQuestionId = source.SourceQuestionId,
        SourceSetNumber = source.SourceSetNumber,
        SourceQuestionNumber = source.SourceQuestionNumber,
        Question = source.Question,
        Answer = source.Answer,
        WordCount = source.WordCount,
        Hint = source.Hint,
        DependsOn = [.. source.DependsOn]
    };

    private static AugmentedQuestion CloneAugmented(AugmentedQuestion source) => new()
    {
        CanonicalId = source.CanonicalId,
        SourceQuestionId = source.SourceQuestionId,
        SourceSetNumber = source.SourceSetNumber,
        SourceQuestionNumber = source.SourceQuestionNumber,
        Question = source.Question,
        Answer = source.Answer,
        WordCount = source.WordCount,
        Hint = source.Hint,
        DependsOn = [.. source.DependsOn],
        SourcePartKey = source.SourcePartKey,
        SourceBookSlug = source.SourceBookSlug,
        SourceBookTitle = source.SourceBookTitle,
        SourcePartNo = source.SourcePartNo,
        SourcePartTitle = source.SourcePartTitle,
        SourcePartOrder = source.SourcePartOrder,
        DisplayLabel = source.DisplayLabel,
        DisplayQuestion = source.DisplayQuestion,
        SelectedSetNumber = source.SelectedSetNumber,
        SelectedQuestionNumber = source.SelectedQuestionNumber,
        FinalQuestionId = source.FinalQuestionId,
        FinalDependsOn = [.. source.FinalDependsOn],
        FinalDependsOnCanonicalIds = [.. source.FinalDependsOnCanonicalIds]
    };
}
