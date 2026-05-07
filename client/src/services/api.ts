import type { Book, BookInfo, ChatRequest, ChatResponse } from '../types';

export const getBooks = async (): Promise<Book[]> => {
  const response = await fetch('/api/books');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getBookDetails = async (filename: string): Promise<BookInfo> => {
  const response = await fetch(`/api/files/${filename}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const uploadBook = async (file: File): Promise<{ message: string; file: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const getChapterContent = async (filename: string, chapterId: string): Promise<string> => {
  const response = await fetch(`/api/epub/${filename}/chapter/${chapterId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.text();
};

export const submitChatQuery = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};
