// Client-side types re-export the shared API contract from shared/api.ts and
// add local-only state shapes (Highlight, Thread, ChatMessage, ActiveSection).
export type {
  BookMetadata,
  Book,
  TocItem,
  BookInfo,
  BookChapter,
  BookJsonData,
  Provider,
  ChatRequest,
  ChatResponse,
} from "./shared/api";

export type ActiveSection = "upload" | "library" | "preview" | "reader";

export type HighlightKind = "highlight" | "thread";

export interface Highlight {
  id: string;
  kind: HighlightKind;
  chapterId: string;
  chapterIndex: number;
  text: string;
  threadCount?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  anchor?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  anchor: { text: string } | null;
  chapterIndex: number | null;
  messages: ChatMessage[];
}
