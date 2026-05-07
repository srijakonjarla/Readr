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
    // Ensure a 'main' thread exists for this book
    const targetBook = book ?? currentBook;
    if (targetBook) {
      setThreads((prev) => {
        if (prev[targetBook.filename]?.length) return prev;
        return {
          ...prev,
          [targetBook.filename]: [
            {
              id: "main",
              title: "General",
              anchor: null,
              chapterIndex: null,
              messages: [],
            },
          ],
        };
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
    setHighlights((prev) => ({
      ...prev,
      [currentBook.filename]: [
        ...(prev[currentBook.filename] ?? []),
        { ...h, kind: "thread" },
      ],
    }));
    setThreads((prev) => ({
      ...prev,
      [currentBook.filename]: [...(prev[currentBook.filename] ?? []), thread],
    }));
    setActiveThreadId(h.id);
    setChatOpen(true);
    if (suggestedPrompt) setPendingPrompt(suggestedPrompt);
    void chapterTitle;
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
            onStartThread={startThreadFromSelection}
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
          pendingPrompt={pendingPrompt}
          clearPendingPrompt={() => setPendingPrompt(null)}
          currentChapterIndex={readerChapterIndex}
        />
      )}
    </div>
  );
}

export default App;
