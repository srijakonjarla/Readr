// Shared API types — used by both server (Express) and client (React).
// The client reaches this file via a symlink at client/src/shared so that
// CRA's ModuleScopePlugin doesn't reject imports outside src/.

export interface BookMetadata {
  title?: string;
  creator?: string;
  publisher?: string;
  language?: string;
  date?: string;
  description?: string;
}

export interface Book {
  filename: string;
  metadata?: BookMetadata;
}

export interface TocItem {
  id: string;
  href?: string;
  title: string;
}

export interface BookInfo {
  filename: string;
  metadata?: BookMetadata;
  toc: TocItem[];
}

export interface BookChapter {
  id: string;
  title: string;
  content: string | null;
  truncated?: boolean;
  error?: string;
}

export interface BookJsonData {
  metadata: BookMetadata | null;
  chapters: BookChapter[];
}

export type Provider = "openai" | "claude";

export interface ChatRequest {
  query: string;
  context?: string;
  filename: string;
  currentChapterIndex?: number;
  provider: Provider;
}

export interface ChatResponse {
  response: string;
}
