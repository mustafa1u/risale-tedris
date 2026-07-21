export function parseLocalStudyParams(searchParams) {
  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(searchParams ?? "");
  const projectId = params.get("augmentation");
  const gradeSlug = params.get("grade");
  return projectId && gradeSlug ? { projectId, gradeSlug } : null;
}

export function buildLocalStudySelection(project, gradeSlug) {
  const result = project?.gradeResults?.[gradeSlug];
  if (!project || result?.status !== "ready" || !Array.isArray(result.studyQuestions)) {
    return null;
  }
  const bookTitle = project.orderedParts?.find((part) => part.bookSlug === project.homeBookSlug)?.bookTitle
    ?? project.homeBookSlug;
  const questions = result.studyQuestions.map((question, index) => ({
    id: question.canonicalId,
    setNumber: question.selectedSetNumber ?? 1,
    questionNumber: question.selectedQuestionNumber ?? index + 1,
    question: question.displayQuestion ?? question.question ?? "",
    answer: question.answer ?? ""
  }));
  return {
    book: {
      slug: project.homeBookSlug,
      title: bookTitle
    },
    deck: {
      local: true,
      gradeSlug,
      partNo: project.basePartKey?.split(":").at(-1) ?? "",
      title: project.title,
      sourceTitle: project.title,
      sourceTextUrl: "",
      sourceText: project.sourceText ?? "",
      cardCount: questions.length,
      data: {
        schemaVersion: 1,
        bookSlug: project.homeBookSlug,
        gradeSlug,
        partNo: project.basePartKey?.split(":").at(-1) ?? "",
        title: project.title,
        cardCount: questions.length,
        sets: [{ setNumber: 1, questions }]
      }
    }
  };
}

export async function resolveLocalStudySelection({ storage, searchParams }) {
  const params = parseLocalStudyParams(searchParams);
  if (!params) {
    return null;
  }
  const project = await storage.getProject(params.projectId);
  return buildLocalStudySelection(project, params.gradeSlug);
}
