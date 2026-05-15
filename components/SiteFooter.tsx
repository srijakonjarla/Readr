"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteFooter({ authed = false }: { authed?: boolean }) {
  const pathname = usePathname();

  const hide =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/read/") ||
    // On `/` when not signed in, the login form is shown — it already links
    // to terms/privacy in its own footnote, so this site-wide footer is hidden.
    (!authed && pathname === "/");

  if (hide) return null;

  return (
    <footer className="mx-auto mt-12 flex max-w-page items-center justify-between px-14 pb-10 text-kicker text-ink-3">
      <span>© Readr</span>
      <nav className="flex items-center gap-5">
        <Link href="/privacy" className="hover:text-ink-2">
          privacy
        </Link>
        <Link href="/terms" className="hover:text-ink-2">
          terms
        </Link>
      </nav>
    </footer>
  );
}
