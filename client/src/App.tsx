import React, { useState, useEffect, useCallback } from "react";
import { Plus, Moon, Sun, ArrowLeft } from "lucide-react";
import UploadSection from "./components/UploadSection";
import LibrarySection from "./components/LibrarySection";
import MetadataPreview from "./components/MetadataPreview";
import ReaderSection from "./components/ReaderSection";
import ChatPanel from "./components/ChatPanel";
import type {
  ActiveSection,
  Book,
  Highlight,
  Thread,
  ChatMessage,
} from "./types";
import {
  fetchBookState,
  persistClearMessages,
  persistHighlight,
  persistMessage,
  persistRemoveHighlight,
  persistRemoveLastMessage,
  persistThread,
} from "./services/persistence";
import "./App.css";

type Theme = "cream" | "sepia" | "dark";

function App(): React.ReactElement {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("library");
  const [theme, setTheme] = useState<Theme>("cream");

  // Reader-coupled state
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [highlights, setHighlights] = useState<Record<string, Highlight[]>>({});
  const [threads, setThreads] = useState<Record<string, Thread[]>>({});
  const [activeThreadId, setActiveThreadId] = useState<string>("main");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [readerChapterIndex, setReaderChapterIndex] = useState<number>(-1);

  const fetchBooks = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/books");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Book[] = await response.json();
      setBooks(data);

      if (data.length === 0) {
        setActiveSection("upload");
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      setActiveSection("upload");
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "cream") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // (per-book accent injection removed — accent is constant across the app)

  const cycleTheme = (): void => {
    setTheme((prev) =>
      prev === "cream" ? "dark" : prev === "dark" ? "sepia" : "cream",
    );
  };

  const handleUploadSuccess = (): void => {
    fetchBooks();
    setActiveSection("library");
  };

  const handleBookSelect = (book: Book): void => {
    setCurrentBook(book);
    setActiveSection("preview");
  };

  const handleOpenBook = (book?: Book): void => {
    if (book) setCurrentBook(book);
    setActiveSection("reader");
    const targetBook = book ?? currentBook;
    if (targetBook) {
      // Load persisted highlights + threads for this book.
      void fetchBookState(targetBook.filename)
        .then((state) => {
          setHighlights((prev) => ({
            ...prev,
            [targetBook.filename]: state.highlights,
          }));
          // Always ensure a 'main' thread exists at the front.
          const hasMain = state.threads.some((t) => t.id === "main");
          const mainThread: Thread = {
            id: "main",
            title: "General",
            anchor: null,
            chapterIndex: null,
            messages: [],
          };
          const merged = hasMain ? state.threads : [mainThread, ...state.threads];
          if (!hasMain) {
            persistThread(targetBook.filename, mainThread);
          }
          setThreads((prev) => ({ ...prev, [targetBook.filename]: merged }));
        })
        .catch((err) => {
          console.warn("Failed to load persisted state:", err);
          setThreads((prev) => {
            if (prev[targetBook.filename]?.length) return prev;
            const mainThread: Thread = {
              id: "main",
              title: "General",
              anchor: null,
              chapterIndex: null,
              messages: [],
            };
            persistThread(targetBook.filename, mainThread);
            return { ...prev, [targetBook.filename]: [mainThread] };
          });
        });
    }
    setActiveThreadId("main");
  };

  const handleBackToLibrary = (): void => {
    setActiveSection("library");
    setCurrentBook(null);
    setChatOpen(false);
    setReaderChapterIndex(-1);
  };

  // ─── Highlight / thread mutations (called from ReaderSection) ───
  const addHighlight = (h: Highlight): void => {
    if (!currentBook) return;
    setHighlights((prev) => ({
      ...prev,
      [currentBook.filename]: [...(prev[currentBook.filename] ?? []), h],
    }));
    persistHighlight(currentBook.filename, h);
  };

  const removeHighlight = (highlightId: string): void => {
    if (!currentBook) return;
    setHighlights((prev) => ({
      ...prev,
      [currentBook.filename]: (prev[currentBook.filename] ?? []).filter(
        (h) => h.id !== highlightId,
      ),
    }));
    persistRemoveHighlight(highlightId);
  };

  const focusThread = (highlightId: string): void => {
    setActiveThreadId(highlightId);
    setChatOpen(true);
  };

  const startThreadFromSelection = (
    h: Highlight,
    chapterTitle: string,
    suggestedPrompt?: string,
  ): void => {
    if (!currentBook) return;
    const thread: Thread = {
      id: h.id,
      title:
        'on "' + h.text.slice(0, 22) + (h.text.length > 22 ? "…" : "") + '"',
      anchor: { text: h.text },
      chapterIndex: h.chapterIndex,
      messages: [],
    };
    const promotedHighlight: Highlight = { ...h, kind: "thread" };
    setHighlights((prev) => ({
      ...prev,
      [currentBook.filename]: [
        ...(prev[currentBook.filename] ?? []),
        promotedHighlight,
      ],
    }));
    setThreads((prev) => ({
      ...prev,
      [currentBook.filename]: [...(prev[currentBook.filename] ?? []), thread],
    }));
    persistHighlight(currentBook.filename, promotedHighlight);
    persistThread(currentBook.filename, thread);
    setActiveThreadId(h.id);
    setChatOpen(true);
    if (suggestedPrompt) setPendingPrompt(suggestedPrompt);
    void chapterTitle;
  };

  const clearThread = (threadId: string): void => {
    if (!currentBook) return;
    setThreads((prev) => {
      const existing = prev[currentBook.filename] ?? [];
      return {
        ...prev,
        [currentBook.filename]: existing.map((t) =>
          t.id === threadId ? { ...t, messages: [] } : t,
        ),
      };
    });
    persistClearMessages(threadId);
  };

  const removeLastMessage = (threadId: string): void => {
    if (!currentBook) return;
    setThreads((prev) => {
      const existing = prev[currentBook.filename] ?? [];
      return {
        ...prev,
        [currentBook.filename]: existing.map((t) =>
          t.id === threadId ? { ...t, messages: t.messages.slice(0, -1) } : t,
        ),
      };
    });
    persistRemoveLastMessage(threadId);
  };

  const appendMessage = (threadId: string, msg: ChatMessage): void => {
    if (!currentBook) return;
    setThreads((prev) => {
      const existing = prev[currentBook.filename] ?? [];
      return {
        ...prev,
        [currentBook.filename]: existing.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t,
        ),
      };
    });
    persistMessage(threadId, msg);
  };

  // Streaming helpers — used while a token-by-token response arrives.
  // appendStreamingMessage adds an empty assistant placeholder; updateStreamingText
  // overwrites the last message's text in-place (UI only); commitStreamingMessage
  // persists the final text once streaming completes.
  const appendStreamingMessage = (threadId: string, msg: ChatMessage): void => {
    if (!currentBook) return;
    setThreads((prev) => {
      const existing = prev[currentBook.filename] ?? [];
      return {
        ...prev,
        [currentBook.filename]: existing.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t,
        ),
      };
    });
  };

  const updateStreamingText = (threadId: string, fullText: string): void => {
    if (!currentBook) return;
    setThreads((prev) => {
      const existing = prev[currentBook.filename] ?? [];
      return {
        ...prev,
        [currentBook.filename]: existing.map((t) => {
          if (t.id !== threadId) return t;
          if (t.messages.length === 0) return t;
          const next = [...t.messages];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, text: fullText };
          return { ...t, messages: next };
        }),
      };
    });
  };

  const commitStreamingMessage = (threadId: string, msg: ChatMessage): void => {
    persistMessage(threadId, msg);
  };

  const bookHighlights = currentBook
    ? (highlights[currentBook.filename] ?? [])
    : [];
  const bookThreads = currentBook ? (threads[currentBook.filename] ?? []) : [];

  return (
    <div
      data-theme={theme === "cream" ? undefined : theme}
      className="min-h-screen"
    >
      <header className="mx-auto flex max-w-page items-center justify-between px-14 pb-8 pt-10">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setActiveSection("library")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: "var(--accent)" }}
            aria-label="Home"
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: "-0.02em",
              }}
            >
              R
            </span>
          </button>
          <button
            onClick={() => setActiveSection("library")}
            className="text-[17px] font-bold tracking-tight text-ink"
            style={{ letterSpacing: "-0.01em" }}
          >
            Readr
          </button>
        </div>

        {/* {activeSection === 'library' && (
          <nav className="flex items-center gap-1">
            <button className="nav-chip" aria-selected="true">Library</button>
            <button className="nav-chip" aria-selected="false">Highlights</button>
            <button className="nav-chip" aria-selected="false">Threads</button>
            <button className="nav-chip" aria-selected="false">Stats</button>
          </nav>
        )} */}

        <div className="flex items-center gap-2">
          {activeSection !== "library" && (
            <button onClick={handleBackToLibrary} className="btn-soft">
              <ArrowLeft size={14} /> Library
            </button>
          )}
          <button
            onClick={cycleTheme}
            className="pill-btn"
            aria-label="Toggle theme"
            title={`Theme: ${theme}`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {activeSection !== "reader" && (
            <button
              className="btn-cta"
              onClick={() => setActiveSection("upload")}
            >
              <Plus size={14} strokeWidth={2.4} /> Add EPUB
            </button>
          )}
        </div>
      </header>

      <main
        style={{
          marginRight: chatOpen && activeSection === "reader" ? 420 : 0,
          transition: "margin-right .25s ease",
        }}
      >
        {activeSection === "upload" && (
          <UploadSection onUploadSuccess={handleUploadSuccess} />
        )}

        {activeSection === "library" && (
          <LibrarySection
            books={books}
            onBookSelect={handleBookSelect}
            onOpenBook={handleOpenBook}
            onUploadSuccess={handleUploadSuccess}
          />
        )}

        {activeSection === "preview" && currentBook && (
          <MetadataPreview
            book={currentBook}
            onOpenBook={() => handleOpenBook(currentBook)}
            onBackToLibrary={handleBackToLibrary}
          />
        )}

        {activeSection === "reader" && currentBook && (
          <ReaderSection
            book={currentBook}
            onBackToLibrary={handleBackToLibrary}
            highlights={bookHighlights}
            onAddHighlight={addHighlight}
            onRemoveHighlight={removeHighlight}
            onStartThread={startThreadFromSelection}
            onFocusThread={focusThread}
            onOpenChat={() => setChatOpen(true)}
            chatOpen={chatOpen}
            onChapterChange={setReaderChapterIndex}
          />
        )}
      </main>

      {activeSection === "reader" && currentBook && (
        <ChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          book={currentBook}
          threads={bookThreads}
          activeThreadId={activeThreadId}
          onSwitchThread={setActiveThreadId}
          onAppendMessage={appendMessage}
          onAppendStreamingMessage={appendStreamingMessage}
          onUpdateStreamingText={updateStreamingText}
          onCommitStreamingMessage={commitStreamingMessage}
          onClearThread={clearThread}
          onRemoveLastMessage={removeLastMessage}
          pendingPrompt={pendingPrompt}
          clearPendingPrompt={() => setPendingPrompt(null)}
          currentChapterIndex={readerChapterIndex}
        />
      )}
    </div>
  );
}

export default App;
