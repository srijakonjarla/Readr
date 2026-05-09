"use client";

import { useState } from "react";
import type { Book, ChatMessage, Provider, Thread } from "../../types";

interface UseChatStreamArgs {
  book: Book;
  activeThread: Thread | undefined;
  currentChapterIndex: number;
  onAppendMessage: (threadId: string, msg: ChatMessage) => void;
  onAppendStreamingMessage: (threadId: string, msg: ChatMessage) => void;
  onUpdateStreamingText: (threadId: string, fullText: string) => void;
  onCommitStreamingMessage: (threadId: string, msg: ChatMessage) => void;
  onRemoveLastMessage: (threadId: string) => void;
}

interface SubmitOptions {
  skipUserAppend?: boolean;
}

/**
 * Streaming chat send-and-receive hook.
 * Owns: provider selection, "sending" flag, the fetch-streaming loop, and the
 * regenerate-last action. Emits state updates via the persistence callbacks
 * passed by ChatPanel.
 */
export function useChatStream({
  book,
  activeThread,
  currentChapterIndex,
  onAppendMessage,
  onAppendStreamingMessage,
  onUpdateStreamingText,
  onCommitStreamingMessage,
  onRemoveLastMessage,
}: UseChatStreamArgs) {
  const [provider, setProvider] = useState<Provider>("openai");
  const [sending, setSending] = useState<boolean>(false);

  const submit = async (
    text: string,
    options?: SubmitOptions,
  ): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || !activeThread) return;
    if (!options?.skipUserAppend) {
      onAppendMessage(activeThread.id, { role: "user", text: trimmed });
    }
    setSending(true);

    // Spoiler cutoff: anchored thread captures its chapter at creation
    // time; for the General thread, fall back to the reader's current
    // chapter so we don't accidentally send the rest of the book.
    const cutoffIdx = activeThread.chapterIndex ?? currentChapterIndex;
    const body = {
      query: trimmed,
      context: activeThread.anchor?.text ?? "",
      filename: book.filename,
      currentChapterIndex: cutoffIdx >= 0 ? cutoffIdx : undefined,
      provider,
    };

    const anchored = !!activeThread.anchor;
    onAppendStreamingMessage(activeThread.id, {
      role: "assistant",
      text: "",
      anchor: anchored,
    });

    let accumulated = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(
          (errPayload as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          accumulated += decoder.decode(value, { stream: true });
          onUpdateStreamingText(activeThread.id, accumulated);
        }
      }
      const tail = decoder.decode();
      if (tail) {
        accumulated += tail;
        onUpdateStreamingText(activeThread.id, accumulated);
      }

      onCommitStreamingMessage(activeThread.id, {
        role: "assistant",
        text: accumulated,
        anchor: anchored,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorText = accumulated
        ? `${accumulated}\n\n[Error: ${message}]`
        : `Error: ${message}`;
      onUpdateStreamingText(activeThread.id, errorText);
      onCommitStreamingMessage(activeThread.id, {
        role: "assistant",
        text: errorText,
        anchor: anchored,
      });
    } finally {
      setSending(false);
    }
  };

  const regenerateLast = (): void => {
    if (!activeThread || sending) return;
    const last = activeThread.messages[activeThread.messages.length - 1];
    const prev = activeThread.messages[activeThread.messages.length - 2];
    if (!last || last.role !== "assistant" || !prev || prev.role !== "user") {
      return;
    }
    onRemoveLastMessage(activeThread.id);
    void submit(prev.text, { skipUserAppend: true });
  };

  return { provider, setProvider, sending, submit, regenerateLast };
}
