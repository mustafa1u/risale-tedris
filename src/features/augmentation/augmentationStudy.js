import { splitPartText } from "../library/partText.js";

function evidenceUrlForPart({ bookSlug, gradeSlug, partNo }) {
  if (!bookSlug || !gradeSlug || !partNo) return "";
  return `/assets/${encodeURIComponent(bookSlug)}/question-bank/${encodeURIComponent(gradeSlug)}/${encodeURIComponent(partNo)}.evidence.json`;
}

function buildEvidenceSources(project, gradeSlug) {
  const sections = String(project?.sourceText ?? "").split(/\n\n---\n\n/gu);
  let paragraphCursor = 0;

  return (project?.orderedParts ?? []).map((part, index) => {
    const sectionParagraphs = splitPartText(sections[index] ?? "");
    const hasSourceParagraphs = sectionParagraphs.length > 1;
    const source = {
      bookSlug: part?.bookSlug,
      gradeSlug,
      partNo: part?.partNo,
      evidenceUrl: evidenceUrlForPart({
        bookSlug: part?.bookSlug,
        gradeSlug,
        partNo: part?.partNo
      }),
      // Each augmented section begins with a heading. Between sections the
      // combined source adds a standalone `---` paragraph.
      paragraphOffset: hasSourceParagraphs ? paragraphCursor + 1 : null
    };

    paragraphCursor += sectionParagraphs.length;
    if (index < (project?.orderedParts?.length ?? 0) - 1 && hasSourceParagraphs) {
      paragraphCursor += 1;
    }
    return source;
  }).filter((source) => source.evidenceUrl && Number.isInteger(source.paragraphOffset));
}

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
        evidenceSources: buildEvidenceSources(project, gradeSlug),
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
