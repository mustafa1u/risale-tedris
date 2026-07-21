export type GradeSlug = "2-sinif" | "5-sinif" | "8-sinif" | "11-sinif" | "lisans";

export type DocumentType = "BK" | "SK";

export type DownloadAsset = {
  fileName: string;
  sourcePath: string;
  url: string;
};

export type DocumentVariant = {
  docx?: DownloadAsset;
  pdfNormal?: DownloadAsset;
  pdfMobile?: DownloadAsset;
};

export type PartDownloads = Partial<Record<GradeSlug, Partial<Record<DocumentType, DocumentVariant>>>>;

export type LibraryPart = {
  partNo: string;
  partNumber: number;
  labelSlug: string;
  title: string;
  textFileName: string;
  textSourcePath: string;
  textUrl: string;
  downloads: PartDownloads;
};

export type LibraryGrade = {
  slug: GradeSlug;
  label: string;
  docxCount: number;
  pdfNormalCount: number;
  pdfMobileCount: number;
};

export type StudyDeckAsset = {
  key: string;
  fileName: string;
  sourcePath: string;
  url: string;
  gradeSlug: GradeSlug;
  partNo: string;
  title: string;
  cardCount: number;
};

export type LibraryBook = {
  slug: string;
  title: string;
  sourcePath: string;
  grades: LibraryGrade[];
  parts: LibraryPart[];
  studyDecks: StudyDeckAsset[];
};

export type LibraryBookPartRoute = Pick<LibraryPart, "partNo" | "partNumber" | "labelSlug" | "title">;

export type LibraryStudyDeckRoute = Pick<StudyDeckAsset, "gradeSlug" | "partNo" | "title" | "cardCount" | "url"> & {
  sourceTitle?: string;
  sourceTextUrl?: string;
};

export type LibrarySearchBookReference = {
  slug: string;
  title: string;
  shardUrl: string;
  contentHash: string;
  recordCount: number;
  rawBytes: number;
};

export type LibrarySearchIndexReference = {
  schemaVersion: 1;
  manifestUrl: string;
  manifestContentHash: string;
  totalRawBytes: number;
};

export type LibraryBookSummary = {
  slug: string;
  title: string;
  sourcePath: string;
  grades: LibraryGrade[];
  partCount: number;
  studyDeckCount: number;
  partRoutes: LibraryBookPartRoute[];
  studyDeckRoutes: LibraryStudyDeckRoute[];
  search: LibrarySearchBookReference;
};

export type LibraryManifest = {
  generatedAt: string;
  stats: {
    bookCount: number;
    partCount: number;
    studyDeckCount: number;
    docxCount: number;
    pdfNormalCount: number;
    pdfMobileCount: number;
    missingPdfNormalCount: number;
    missingPdfMobileCount: number;
  };
  books: LibraryBook[];
};

export type LibraryIndex = Omit<LibraryManifest, "books"> & {
  books: LibraryBookSummary[];
  search: LibrarySearchIndexReference;
};
