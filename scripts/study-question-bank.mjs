import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SET_HEADER_PATTERN = /^Set\s*-\s*(\d+)\s*$/i;
const ONE_LINE_QA_PATTERN = /^(\d+)\.\s*(?:\t\s*)?S:\s*(.*?)(?:\t|\s{2,})C:\s*(.*)$/i;
const QUESTION_LINE_PATTERN = /^(\d+)\.\s*(?:\t\s*)?S:\s*(.*)$/i;
const ANSWER_LINE_PATTERN = /^C:\s*(.*)$/i;
const WORD_COUNT_SUFFIX_PATTERN = /\s*\(\s*\d+\s+(?:kelime|words?)\s*\)\s*$/i;

function removeWordCountSuffix(value) {
  return value.replace(WORD_COUNT_SUFFIX_PATTERN, "").trim();
}

function countWords(value) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}

function createQuestion(setNumber, questionNumber, question, answer) {
  const normalizedAnswer = removeWordCountSuffix(answer);

  return {
    id: `S${setNumber}Q${questionNumber}`,
    setNumber,
    questionNumber,
    question: question.trim(),
    answer: normalizedAnswer,
    wordCount: countWords(normalizedAnswer)
  };
}

function ensureCurrentSet(sets, setNumber) {
  let currentSet = sets.at(-1);
  if (!currentSet || currentSet.setNumber !== setNumber) {
    currentSet = {
      setNumber,
      questions: []
    };
    sets.push(currentSet);
  }

  return currentSet;
}

export function parseQuestionBankText(text) {
  if (typeof text !== "string") {
    throw new TypeError("Question-bank text must be a string.");
  }

  const sets = [];
  let currentSet = null;
  let pendingQuestion = null;

  const flushPendingQuestion = () => {
    pendingQuestion = null;
  };

  for (const rawLine of text.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const setMatch = line.match(SET_HEADER_PATTERN);
    if (setMatch) {
      flushPendingQuestion();
      currentSet = ensureCurrentSet(sets, Number(setMatch[1]));
      continue;
    }

    if (!currentSet) {
      continue;
    }

    const oneLineMatch = line.match(ONE_LINE_QA_PATTERN);
    if (oneLineMatch) {
      flushPendingQuestion();
      currentSet.questions.push(
        createQuestion(
          currentSet.setNumber,
          Number(oneLineMatch[1]),
          oneLineMatch[2],
          oneLineMatch[3]
        )
      );
      continue;
    }

    const questionMatch = line.match(QUESTION_LINE_PATTERN);
    if (questionMatch) {
      pendingQuestion = {
        questionNumber: Number(questionMatch[1]),
        question: questionMatch[2].trim()
      };
      continue;
    }

    const answerMatch = line.match(ANSWER_LINE_PATTERN);
    if (answerMatch && pendingQuestion) {
      currentSet.questions.push(
        createQuestion(
          currentSet.setNumber,
          pendingQuestion.questionNumber,
          pendingQuestion.question,
          answerMatch[1]
        )
      );
      flushPendingQuestion();
    }
  }

  return {
    sets: sets.filter((set) => set.questions.length > 0)
  };
}

export function buildStudyDeck({ bookSlug, partNo, gradeSlug, sourcePath, text, title }) {
  const bank = parseQuestionBankText(text);
  const cardCount = bank.sets.reduce((total, set) => total + set.questions.length, 0);

  const deck = {
    schemaVersion: 1,
    bookSlug,
    partNo,
    gradeSlug,
    sourcePath,
    cardCount,
    sets: bank.sets
  };

  if (title) {
    deck.title = title;
  }

  return deck;
}

function readSelectionQuestions(selectionJson) {
  const sheetQuestions = selectionJson?.questionSheet?.questions;
  const flashcardQuestions = selectionJson?.flashcards?.questions;

  if (!Array.isArray(sheetQuestions) || !Array.isArray(flashcardQuestions)) {
    throw new Error("Selection JSON must contain questionSheet.questions and flashcards.questions arrays.");
  }

  const bySheetIndex = new Map(
    sheetQuestions.map((question) => [Number(question.sheetQuestionIndex), question])
  );
  const bySourceId = new Map(
    sheetQuestions.map((question) => [question.sourceQuestionId, question])
  );

  return [...flashcardQuestions]
    .sort((a, b) => Number(a.flashcardIndex) - Number(b.flashcardIndex))
    .map((flashcard) => {
      const sheetIndex = Number(flashcard.sheetQuestionIndex ?? flashcard.questionSheetIndex);
      const sheetQuestion =
        bySheetIndex.get(sheetIndex) ?? bySourceId.get(flashcard.sourceQuestionId);

      if (!sheetQuestion) {
        throw new Error(
          `Selection flashcard ${flashcard.flashcardIndex ?? "unknown"} does not match a question-sheet item.`
        );
      }

      const sourceSetNumber = Number(sheetQuestion.sourceSetNumber);
      const sourceQuestionNumber = Number(sheetQuestion.sourceQuestionNumber);
      const answer = String(sheetQuestion.answer ?? "").trim();

      return {
        id: sheetQuestion.sourceQuestionId ?? `S${sourceSetNumber}Q${sourceQuestionNumber}`,
        setNumber: Number.isFinite(sourceSetNumber) ? sourceSetNumber : 1,
        questionNumber: Number.isFinite(sourceQuestionNumber)
          ? sourceQuestionNumber
          : Number(flashcard.flashcardIndex),
        question: String(sheetQuestion.question ?? "").trim(),
        answer,
        wordCount: countWords(answer),
        selectedSetNumber: sheetQuestion.selectedSetNumber,
        selectedQuestionNumber: sheetQuestion.selectedQuestionNumber,
        sheetQuestionIndex: sheetQuestion.sheetQuestionIndex,
        flashcardIndex: flashcard.flashcardIndex
      };
    });
}

function createFlashcardSelectionSets(questions) {
  return [
    {
      setNumber: 1,
      questions
    }
  ];
}

export function buildStudyDeckFromSelectionJson({
  bookSlug,
  partNo,
  gradeSlug,
  sourcePath,
  selectionJson,
  title
}) {
  const questions = readSelectionQuestions(selectionJson);
  const deck = {
    schemaVersion: 1,
    bookSlug,
    partNo,
    gradeSlug,
    sourcePath,
    cardCount: questions.length,
    selection: {
      source: "SEL",
      requestedCount: selectionJson?.counts?.flashcardQuestions ?? questions.length,
      rule: selectionJson?.flashcards?.selectionRule
    },
    sets: createFlashcardSelectionSets(questions)
  };

  if (title) {
    deck.title = title;
  }

  return deck;
}

export function flattenStudyDeckCards(deck) {
  return deck.sets.flatMap((set) =>
    set.questions.map((question) => ({
      id: question.id,
      sourceSetNumber: question.setNumber,
      sourceQuestionNumber: question.questionNumber,
      question: question.question,
      answer: question.answer
    }))
  );
}

export async function writeStudyDeckJson(deck, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(deck, null, 2)}\n`, "utf8");
}

export function defaultStudyDeckOutPath({
  assetsRoot = "assets",
  bookSlug,
  gradeSlug,
  partNo
}) {
  return join(assetsRoot, bookSlug, "question-bank", gradeSlug, `${partNo}.json`);
}

export function parseStudyQuestionBankCliArgs(args) {
  const options = {};
  const optionMap = new Map([
    ["--source", "sourcePath"],
    ["--book", "bookSlug"],
    ["--grade", "gradeSlug"],
    ["--part", "partNo"],
    ["--title", "title"],
    ["--out", "outPath"]
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const key = optionMap.get(flag);

    if (!key) {
      throw new Error(`Unknown option: ${flag}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`);
    }

    options[key] = value;
    index += 1;
  }

  for (const requiredKey of ["sourcePath", "bookSlug", "gradeSlug", "partNo"]) {
    if (!options[requiredKey]) {
      throw new Error(`Missing required option: ${requiredKey}`);
    }
  }

  return options;
}

export async function importStudyQuestionBank({
  sourcePath,
  bookSlug,
  partNo,
  gradeSlug,
  title,
  outPath
}) {
  const text = await readFile(sourcePath, "utf8");
  const deck = buildStudyDeck({
    bookSlug,
    partNo,
    gradeSlug,
    sourcePath,
    text,
    title
  });
  const resolvedOutPath =
    outPath ?? defaultStudyDeckOutPath({ bookSlug, gradeSlug, partNo });

  await writeStudyDeckJson(deck, resolvedOutPath);

  return {
    deck,
    outPath: resolvedOutPath
  };
}

export async function runStudyQuestionBankCli(args, logger = console.log) {
  const options = parseStudyQuestionBankCliArgs(args);
  const result = await importStudyQuestionBank(options);
  logger(`Imported ${result.deck.cardCount} study cards -> ${result.outPath}`);
  return result;
}

const isDirectCliRun =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectCliRun) {
  runStudyQuestionBankCli(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
