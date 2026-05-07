import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Book, BookInfo } from "../types";
import { bookGradient, bookHue, chipHueColor } from "../util/hue";

interface MetadataPreviewProps {
  book: Book;
  onOpenBook: () => void;
  onBackToLibrary: () => void;
}

const MetadataPreview: React.FC<MetadataPreviewProps> = ({
  book,
  onOpenBook,
  onBackToLibrary,
}) => {
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBookDetails = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/files/${book.filename}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: BookInfo = await response.json();
        setBookInfo(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching book details:", error);
        alert(`Error fetching book details: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [book]);

  const hue = bookHue(book.filename);

  if (loading) {
    return (
      <section className="mx-auto max-w-page px-6 pb-32">
        <div className="card flex items-center justify-center p-16 text-ink-3">
          Loading book details…
        </div>
      </section>
    );
  }

  if (!bookInfo) {
    return (
      <section className="mx-auto max-w-page px-6 pb-32">
        <div className="card flex flex-col items-center gap-4 p-16 text-center">
          <p className="text-ink-2">Failed to load book details.</p>
          <button onClick={onBackToLibrary} className="btn-soft">
            <ArrowLeft size={14} /> Back to Library
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-page px-6 pb-32">
      <div
        className="card-hero"
        style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr" }}
      >
        {/* Left: gradient cover */}
        <div
          style={{
            padding: 40,
            minHeight: 380,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            background: bookGradient(hue),
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: chipHueColor(hue),
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              marginBottom: 14,
            }}
          >
            {bookInfo.toc?.length || 0} chapter
            {bookInfo.toc?.length === 1 ? "" : "s"}
          </div>
          <div
            style={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 36,
              fontWeight: 600,
              color: "#fff",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              textWrap: "balance",
              maxWidth: 320,
            }}
          >
            {bookInfo.metadata?.title || "Untitled"}
          </div>
          {bookInfo.metadata?.creator && (
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "rgba(255,255,255,.7)",
                marginTop: 10,
              }}
            >
              {bookInfo.metadata.creator}
            </div>
          )}
        </div>

        {/* Right: meta + CTA */}
        <div
          style={{
            padding: "40px 44px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div className="kicker">About this book</div>
          {bookInfo.metadata?.description ? (
            <div
              className="reading-body"
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                color: "var(--ink-2)",
              }}
              dangerouslySetInnerHTML={{
                __html: bookInfo.metadata.description,
              }}
            />
          ) : (
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-3)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              No description provided.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--rule-2)",
            }}
          >
            <Stat
              label="Publisher"
              value={bookInfo.metadata?.publisher ?? "—"}
            />
            <Stat label="Language" value={bookInfo.metadata?.language ?? "—"} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={onOpenBook} className="btn-ink">
              Start reading <ArrowRight size={15} strokeWidth={2.2} />
            </button>
            <button onClick={onBackToLibrary} className="btn-soft">
              <ArrowLeft size={14} /> Library
            </button>
          </div>
        </div>
      </div>
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
        letterSpacing: "0.04em",
        marginBottom: 6,
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
    <div
      className="truncate text-ink"
      style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}
    >
      {value}
    </div>
  </div>
);

export default MetadataPreview;
