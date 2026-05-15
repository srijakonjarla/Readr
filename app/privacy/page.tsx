import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Readr",
  description:
    "What Readr collects, where it lives, and how to ask for it back.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-ink">
      <header className="mb-10 border-b border-rule-2 pb-8">
        <p className="text-kicker font-semibold uppercase tracking-[0.18em] text-ink-3">
          privacy
        </p>
        <h1 className="mt-2 font-serif text-h2 font-semibold tracking-[-0.01em]">
          how Readr handles your reading.
        </h1>
        <p className="mt-3 text-prose text-ink-2">
          Last updated May 15, 2026. Readr is a small, invite-only reading app
          run by a single person. This page describes what is collected, where
          it's stored, and how to get it removed.
        </p>
      </header>

      <article className="space-y-10 text-prose text-ink-2 leading-relaxed">
        <Section title="what Readr collects">
          <p>
            When you sign in with Google, Readr receives your email address,
            name, and avatar URL from Google's OAuth response. These identify
            you across sessions.
          </p>
          <p>
            When you upload an EPUB, the file is stored privately so that only
            you can read it. Reading state (which chapter you're on, your
            highlights, your chat threads with the AI companion) is saved so
            that it's there when you come back.
          </p>
          <p>
            When you chat with the AI companion, the message you send — along
            with the relevant chapter context — is forwarded to a third-party
            language model provider so it can respond.
          </p>
        </Section>

        <Section title="where it lives">
          <ul className="space-y-2 [&_li]:flex [&_li]:items-start [&_li]:gap-3">
            <li>
              <Bullet />
              <span>
                Account, reading state, highlights, and threads: Supabase
                Postgres (Supabase, Inc.).
              </span>
            </li>
            <li>
              <Bullet />
              <span>
                EPUB files and parsed assets: Vercel Blob (Vercel Inc.).
              </span>
            </li>
            <li>
              <Bullet />
              <span>
                Authentication and session cookies: Supabase Auth (Supabase,
                Inc.).
              </span>
            </li>
            <li>
              <Bullet />
              <span>
                AI companion responses: Anthropic, PBC and OpenAI, LLC are sent
                the prompt + relevant chapter excerpts when you chat. See their
                respective privacy policies for how they handle that data.
              </span>
            </li>
          </ul>
        </Section>

        <Section title="what Readr does not do">
          <p>
            No analytics scripts, no advertising, no third-party trackers. Your
            reading data isn't sold or shared with anyone outside the
            sub-processors named above (which are required to run the app).
          </p>
        </Section>

        <Section title="cookies">
          <p>
            Readr only uses cookies that are necessary to keep you signed in.
            These are set by Supabase Auth and are removed when you sign out.
          </p>
        </Section>

        <Section title="deletion">
          <p>
            To delete your account and everything associated with it (uploads,
            highlights, threads, reading state), email{" "}
            <a
              className="text-accent underline underline-offset-4 hover:no-underline"
              href="mailto:srijakonjarla@gmail.com"
            >
              srijakonjarla@gmail.com
            </a>
            . Deletion is processed manually and usually completes within a few
            days.
          </p>
        </Section>

        <Section title="changes">
          <p>
            If this policy changes in a material way, you'll see a note on this
            page with a new "last updated" date.
          </p>
        </Section>

        <Section title="contact">
          <p>
            Questions, requests, or concerns:{" "}
            <a
              className="text-accent underline underline-offset-4 hover:no-underline"
              href="mailto:srijakonjarla@gmail.com"
            >
              srijakonjarla@gmail.com
            </a>
            .
          </p>
        </Section>
      </article>

      <footer className="mt-16 flex items-center justify-between border-t border-rule-2 pt-6 text-kicker text-ink-3">
        <Link href="/" className="hover:text-ink">
          ← back
        </Link>
        <Link href="/terms" className="hover:text-ink">
          terms of service →
        </Link>
      </footer>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-h4 font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullet() {
  return (
    <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
  );
}
