"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ChromeHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, cycleTheme } = useTheme();

  const isLibrary = pathname === "/";
  const isReader = pathname.startsWith("/read/");

  return (
    <header className="mx-auto flex max-w-page items-center justify-between px-14 pb-8 pt-10">
      <div className="flex items-center gap-3.5">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white"
          aria-label="Home"
        >
          <span className="text-base font-extrabold tracking-[-0.02em]">R</span>
        </Link>
        <Link
          href="/"
          className="text-[17px] font-bold tracking-[-0.01em] text-ink"
        >
          Readr
        </Link>
      </div>

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
      </div>
    </header>
  );
}
