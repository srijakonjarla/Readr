import React, { useRef, useState, useMemo } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { Book } from '../types';
import MiniCover from './MiniCover';
import { bookGradient, bookHue, chipHueColor } from '../util/hue';

interface LibrarySectionProps {
  books: Book[];
  onBookSelect: (book: Book) => void;
  onOpenBook: (book: Book) => void;
  onUploadSuccess: () => void;
}

const greetings = (): string => {
  const h = new Date().getHours();
  if (h < 5) return 'Good night.';
  if (h < 12) return 'Good morning.';
  if (h < 18) return 'Good afternoon.';
  return 'Good evening.';
};

const lastBookKey = 'readr:lastBookFilename';

const LibrarySection: React.FC<LibrarySectionProps> = ({
  books,
  onBookSelect,
  onOpenBook,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'finished'>('all');

  const heroBook = useMemo<Book | null>(() => {
    if (books.length === 0) return null;
    const remembered = window.localStorage.getItem(lastBookKey);
    return books.find((b) => b.filename === remembered) ?? books[0];
  }, [books]);

  const otherBooks = useMemo(
    () => books.filter((b) => b.filename !== heroBook?.filename),
    [books, heroBook]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      await response.json();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error uploading file:', error);
      alert(`Error uploading file: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenHero = (book: Book): void => {
    window.localStorage.setItem(lastBookKey, book.filename);
    onOpenBook(book);
  };

  return (
    <section className="mx-auto max-w-page px-14 pb-32">
      {/* Greeting block — no colored band, sits on the page background */}
      <div className="mb-14">
        <div className="status-pill">
          <span className="status-dot animate-pulse2" />
          Reading session active
        </div>
        <h1
          className="mt-4 text-ink"
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            textWrap: 'balance',
          }}
        >
          {greetings()}
        </h1>
        <p
          className="mt-4 text-ink-2"
          style={{
            fontSize: 19,
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          {books.length === 0 ? (
            'Your shelf is empty. Upload an EPUB and settle in.'
          ) : (
            <>
              You have <strong className="font-semibold text-ink">{books.length}</strong>{' '}
              book{books.length === 1 ? '' : 's'} on the shelf. Pick up where you left off.
            </>
          )}
        </p>
      </div>

      {/* Hero card */}
      {heroBook && (
        <div
          className="card-hero mb-[72px] cursor-pointer"
          onClick={() => handleOpenHero(heroBook)}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr' }}
        >
          {/* Left: gradient cover */}
          <div
            style={{
              padding: 40,
              minHeight: 380,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: bookGradient(bookHue(heroBook.filename)),
            }}
          >
            <span
              className="self-start"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 11px',
                borderRadius: 999,
                background: 'rgba(255,255,255,.12)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,.92)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 3, background: '#fff' }} />
              Currently reading
            </span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: chipHueColor(bookHue(heroBook.filename)),
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  marginBottom: 14,
                }}
              >
                Your shelf
              </div>
              <div
                style={{
                  fontFamily: '"Source Serif 4", Georgia, serif',
                  fontSize: 36,
                  fontWeight: 600,
                  color: '#fff',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  textWrap: 'balance',
                  maxWidth: 320,
                }}
              >
                {heroBook.metadata?.title || heroBook.filename}
              </div>
              {heroBook.metadata?.creator && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,.7)',
                    marginTop: 10,
                  }}
                >
                  {heroBook.metadata.creator}
                </div>
              )}
            </div>
          </div>

          {/* Right: meta + resume */}
          <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column' }}>
            <div className="kicker mb-[18px]">Continue reading</div>
            <p
              style={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontSize: 18,
                fontStyle: 'italic',
                color: 'var(--ink-2)',
                lineHeight: 1.55,
                margin: 0,
                marginBottom: 28,
                maxWidth: 460,
                textWrap: 'pretty',
              }}
            >
              {heroBook.metadata?.description ||
                `“A book on your shelf, waiting. Tap to step back in.”`}
            </p>
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
                paddingTop: 28,
                borderTop: '1px solid var(--rule-2)',
              }}
            >
              <Stat label="Author" value={heroBook.metadata?.creator?.split(' ')[0] ?? '—'} />
              <Stat label="Publisher" value={heroBook.metadata?.publisher ?? '—'} />
              <Stat label="Format" value="EPUB" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--bg-2)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: '100%', width: '0%', background: 'var(--accent)' }} />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenHero(heroBook);
                }}
                className="btn-ink"
              >
                Resume <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library list */}
      {books.length > 0 && (
        <div>
          <div className="mb-7 flex items-baseline justify-between">
            <h2
              className="text-ink"
              style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}
            >
              Your library
            </h2>
            <div className="flex gap-2">
              {(['all', 'in-progress', 'finished'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="nav-chip"
                  aria-selected={filter === f}
                  style={{
                    fontSize: 12,
                    padding: '7px 13px',
                    border: '1px solid var(--rule-2)',
                  }}
                >
                  {f === 'all' ? 'All' : f === 'in-progress' ? 'In progress' : 'Finished'}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 16,
            }}
          >
            {otherBooks.map((book) => {
              const cardHue = bookHue(book.filename);
              return (
              <button
                key={book.filename}
                onClick={() => onBookSelect(book)}
                className="card group flex w-full items-stretch gap-[18px] p-[18px] text-left transition-all hover:-translate-y-0.5"
                style={{
                  ['--card-hue' as string]: String(cardHue),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-soft)';
                  e.currentTarget.style.borderColor =
                    'color-mix(in oklab, var(--accent) 35%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.borderColor = '';
                }}
              >
                <MiniCover
                  hue={cardHue}
                  title={book.metadata?.title}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div
                    className="truncate text-ink"
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                      marginBottom: 4,
                    }}
                  >
                    {book.metadata?.title || book.filename}
                  </div>
                  <div className="text-ink-3" style={{ fontSize: 13, marginBottom: 12 }}>
                    {book.metadata?.creator || 'Unknown author'}
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-ink-3 inline-flex items-center gap-1.5"
                      style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' }}
                    >
                      <BookOpen size={12} /> EPUB
                    </span>
                    {book.metadata?.publisher && (
                      <span
                        className="text-ink-3 truncate"
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: 'var(--bg)',
                          border: '1px solid var(--rule-2)',
                          maxWidth: 140,
                        }}
                      >
                        {book.metadata.publisher}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept=".epub"
        className="sr-only"
        onChange={handleFileChange}
      />
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div
      className="text-ink-3"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        marginBottom: 6,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
    <div
      className="truncate text-ink"
      style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}
    >
      {value}
    </div>
  </div>
);

export default LibrarySection;
