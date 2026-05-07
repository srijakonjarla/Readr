import type { Metadata } from 'epub';

export interface BookChapter {
  id: string;
  title: string;
  content: string | null;
  truncated?: boolean;
  error?: string;
}

export interface BookJsonData {
  metadata: Metadata | null;
  chapters: BookChapter[];
}

export interface ChatResponse {
  response: string;
}
