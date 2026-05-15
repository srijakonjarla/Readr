"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const next = params.get("next") ?? "/";
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
      ? "that email isn't on the invite list. ask the host if you think it should be."
      : error === "oauth_failed"
        ? "google sign-in didn't complete. try again?"
        : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-32 h-[480px] w-[480px] rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full bg-[#2d5039]/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-page items-center justify-center px-6">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden flex-col gap-8 lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/readr-logo-horizontal.svg"
              alt="Readr"
              width={127}
              height={40}
              className="h-10 w-auto"
            />

            <div className="space-y-5">
              <p className="text-kicker font-semibold uppercase tracking-[0.18em] text-ink-3">
                a quiet reading companion
              </p>
              <h1 className="font-serif text-chapter font-semibold leading-[1.02] tracking-[-0.02em] text-ink">
                read closely.
                <br />
                <span className="text-accent italic">think out loud.</span>
              </h1>
              <p className="max-w-md text-prose text-ink-2">
                Readr pairs your EPUBs with a thoughtful AI companion —
                annotate, ask, and let the margins fill themselves in.
              </p>
            </div>

            <ul className="space-y-3 text-prose text-ink-2">
              {[
                "your shelf, your notes — nothing public",
                "chapter-aware chat that remembers where you are",
                "highlight, ask, return — the book stays in focus",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="card-hero p-8 sm:p-10">
              <div className="lg:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/readr-logo-horizontal.svg"
                  alt="Readr"
                  width={114}
                  height={36}
                  className="h-9 w-auto"
                />
              </div>

              <div className="mt-6 lg:mt-0">
                <p className="text-kicker font-semibold uppercase tracking-[0.18em] text-ink-3">
                  invite only
                </p>
                <h2 className="mt-2 font-serif text-h2 font-semibold tracking-[-0.01em] text-ink">
                  come back in.
                </h2>
                <p className="my-3 text-prose text-ink-2">
                  Sign in with the Google account that was added to the invite
                  list.
                </p>
              </div>

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
                {pending ? "opening Google…" : "continue with Google"}
              </button>

              <div className="mt-8 border-t border-rule-2 pt-5">
                <p className="text-kicker text-ink-3">
                  no account creation here. access is granted by invitation only
                  — reach out to the host if you'd like in.
                </p>
                <p className="mt-3 text-kicker text-ink-3">
                  by signing in you agree to the{" "}
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
            </div>
          </section>
        </div>
      </div>
    </main>
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

export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
