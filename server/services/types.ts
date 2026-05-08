// Re-export shared API types for server-side consumers.
// The canonical definitions live in shared/api.ts.
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
} from "../../shared/api";
