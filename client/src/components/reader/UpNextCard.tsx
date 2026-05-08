import { ArrowRight } from "lucide-react";

interface UpNextCardProps {
  title: string;
  chapterNumber: number;
  onContinue: () => void;
}

/**
 * The "Up next" card shown at the bottom of each chapter.
 */
function UpNextCard({ title, chapterNumber, onContinue }: UpNextCardProps) {
  return (
    <div
      className="mt-20 grid items-center gap-6"
      style={{
        padding: 28,
        borderRadius: 16,
        background: "var(--paper)",
        border: "1px solid var(--rule-2)",
        gridTemplateColumns: "1fr auto",
      }}
    >
      <div>
        <div className="kicker mb-2">Up next</div>
        <div
          className="text-ink"
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        <div className="text-ink-3 mt-1" style={{ fontSize: 14 }}>
          Chapter {chapterNumber}
        </div>
      </div>
      <button onClick={onContinue} className="btn-ink">
        Continue <ArrowRight size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export default UpNextCard;
