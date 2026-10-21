"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Highlighter,
  ShieldCheck,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Public homepage for signed-out visitors. It doubles as the page Google's
// OAuth review reads, so it has to say plainly what Readr is, what it does,
// and what it does with a Google account — at every screen width.

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Upload,
    title: "Upload your own EPUBs",
    body: "Add DRM-free EPUB books you own. Each file is stored privately and only you can open it.",
  },
  {
    icon: BookOpen,
    title: "Read in the browser",
    body: "A clean chapter-by-chapter reader with a table of contents, full-text search, progress tracking, and light, sepia, and dark themes.",
  },
  {
    icon: Highlighter,
    title: "Highlight passages",
    body: "Select text to highlight it. Highlights are saved to your account and come back every time you open the book.",
  },
  {
    icon: Sparkles,
    title: "Ask a spoiler-safe AI companion",
    body: "Ask questions about characters, plot, or a passage. The companion only reads the chapters you've reached, so it can't spoil what's ahead.",
  },
];

const GOOGLE_DATA: string[] = [
  "Readr uses Google Sign-In only to identify you. It receives your name, email address, and profile picture — nothing else.",
  "Readr does not request access to Gmail, Google Drive, Contacts, Calendar, or any other Google service.",
  "Your email is checked against the invite list, then used to keep your library and notes private to you.",
  "Your Google data is never sold, shared for advertising, or used to train AI models.",
];

function Homepage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-32 h-120 w-120 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute top-160 -right-24 h-105 w-105 rounded-full bg-[color-mix(in_oklab,var(--accent-2)_10%,transparent)] blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="mx-auto flex max-w-page items-center justify-between px-6 py-6 sm:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/readr-logo-horizontal.svg"
          alt="Readr"
          width={114}
          height={36}
          className="h-9 w-auto"
        />
        <nav className="flex items-center gap-5 text-sm text-ink-2">
          <a href="#how-it-works" className="hidden hover:text-ink sm:inline">
            How it works
          </a>
          <a href="/privacy" className="hover:text-ink">
            Privacy
          </a>
          <a href="/terms" className="hover:text-ink">
            Terms
          </a>
        </nav>
      </header>

      {/* Hero + sign-in */}
      <div className="mx-auto grid max-w-page items-center gap-12 px-6 pb-20 pt-8 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-14">
        <section className="flex flex-col gap-6">
          <p className="text-kicker font-semibold uppercase tracking-[0.18em] text-accent">
            Readr · EPUB reader with an AI reading companion
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-chapter">
            Read your EPUBs with a companion that{" "}
            <span className="italic text-accent">won't spoil the ending.</span>
          </h1>
          <p className="max-w-xl text-h4 font-normal leading-[1.55] text-ink-2">
            Readr is a web app for reading the EPUB books you own. Upload a
            book, read it chapter by chapter, highlight passages, and ask an AI
            companion about what you've read so far. The companion only sees the
            chapters you've reached, so its answers never give away what comes
            next.
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {[
              "Private library",
              "Spoiler-safe answers",
              "No ads or tracking",
            ].map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-accent/25 bg-accent/8 px-3 py-1 font-medium text-accent"
              >
                {chip}
              </li>
            ))}
          </ul>
        </section>

        <Suspense fallback={<SignInCard error={null} next="/" />}>
          <SignInCardFromParams />
        </Suspense>
      </div>

      {/* Features */}
      <section
        id="how-it-works"
        className="mx-auto max-w-page scroll-mt-6 px-6 pb-20 sm:px-10"
      >
        <p className="kicker mb-3">How it works</p>
        <h2 className="mb-8 font-serif text-h2 font-semibold tracking-[-0.01em] text-ink">
          What you can do with Readr
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="card flex flex-col gap-3 p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-cta">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="font-mono text-tiny text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="text-h4 font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h3>
              <p className="text-prose leading-[1.55] text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Google account data */}
      <section className="mx-auto max-w-page px-6 pb-20 sm:px-10">
        <div className="card-hero grid gap-8 p-8 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent-2) text-white">
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <h2 className="font-serif text-h2 font-semibold tracking-[-0.01em] text-ink">
              How Readr uses your Google account
            </h2>
            <p className="mt-3 text-prose text-ink-2">
              Signing in with Google is how Readr knows which library is yours.
              Full details are in the{" "}
              <a
                href="/privacy"
                className="font-medium text-accent underline underline-offset-4"
              >
                privacy policy
              </a>
              .
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {GOOGLE_DATA.map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 text-prose leading-[1.55] text-ink-2"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-2)" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 border-t border-rule-2 px-6 py-8 text-sm text-ink-3 sm:px-10">
        <span>© Readr — an EPUB reader with an AI reading companion</span>
        <nav className="flex items-center gap-5">
          <a href="/privacy" className="hover:text-ink-2">
            Privacy policy
          </a>
          <a href="/terms" className="hover:text-ink-2">
            Terms of service
          </a>
          <a href="mailto:srijakonjarla@gmail.com" className="hover:text-ink-2">
            Contact
          </a>
        </nav>
      </footer>
    </main>
  );
}

function SignInCardFromParams() {
  const params = useSearchParams();
  return (
    <SignInCard error={params.get("error")} next={params.get("next") ?? "/"} />
  );
}

function SignInCard({ error, next }: { error: string | null; next: string }) {
  const [pending, setPending] = useState(false);

  const handleGoogle = async () => {
    setPending(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      console.error(oauthError);
      setPending(false);
    }
  };

  const errorCopy =
    error === "not_invited"
      ? "That email isn't on the invite list. Ask the host if you think it should be."
      : error === "oauth_failed"
        ? "Google sign-in didn't complete. Try again?"
        : null;

  return (
    <section className="card-hero p-8 sm:p-10">
      <p className="text-kicker font-semibold uppercase tracking-[0.18em] text-ink-3">
        Invite only
      </p>
      <h2 className="mt-2 font-serif text-h2 font-semibold tracking-[-0.01em] text-ink">
        Sign in to your library
      </h2>
      <p className="my-3 text-prose text-ink-2">
        Readr is currently invite-only. Sign in with the Google account that was
        added to the invite list.
      </p>

      {errorCopy && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-accent/30 bg-accent/8 px-4 py-3 text-prose text-accent"
        >
          {errorCopy}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={pending}
        className="btn-ink mt-6 w-full justify-center text-prose"
      >
        <GoogleMark />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>

      <div className="mt-8 border-t border-rule-2 pt-5">
        <p className="text-kicker text-ink-3">
          There's no public sign-up. Access is granted by invitation — reach out
          to the host if you'd like in.
        </p>
        <p className="mt-3 text-kicker text-ink-3">
          By signing in you agree to the{" "}
          <a
            href="/terms"
            className="text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            terms of service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            privacy policy
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.95l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default Homepage;
