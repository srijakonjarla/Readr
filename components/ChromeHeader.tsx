"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ChromeHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, cycleTheme } = useTheme();

  const isLibrary = pathname === "/";
  const isReader = pathname.startsWith("/read/");
  const isChromeFree =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/privacy" ||
    pathname === "/terms";

  if (isChromeFree) return null;

  return (
    <header className="mx-auto flex max-w-page items-center justify-between px-14 pb-8 pt-10">
      <Link href="/" aria-label="Readr — home" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            theme === "dark"
              ? "/brand/readr-logo-dark.svg"
              : "/brand/readr-logo-horizontal.svg"
          }
          alt="Readr"
          width={101}
          height={32}
          className="h-8 w-auto"
        />
      </Link>

      <div className="flex items-center gap-2">
        {!isLibrary && (
          <button onClick={() => router.push("/")} className="btn-soft">
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
        {!isReader && (
          <Link href="/upload" className="btn-cta">
            <Plus size={14} strokeWidth={2.4} /> Add EPUB
          </Link>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="pill-btn"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
