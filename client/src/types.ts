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

export type Provider = 'openai' | 'claude';

export type ActiveSection = 'upload' | 'library' | 'preview' | 'reader';

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

export type HighlightKind = 'highlight' | 'thread';

export interface Highlight {
  id: string;
  kind: HighlightKind;
  chapterId: string;
  chapterIndex: number;
  text: string;
  threadCount?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
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
