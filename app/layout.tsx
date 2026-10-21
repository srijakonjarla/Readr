import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import ChromeHeader from "@/components/ChromeHeader";
import SiteFooter from "@/components/SiteFooter";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Readr — a quiet reading companion",
  description:
    "Readr is an EPUB reader for the books you own, with highlights and a spoiler-safe AI companion that only reads the chapters you've reached.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          {authed && <ChromeHeader />}
          {children}
          <SiteFooter authed={authed} />
        </ThemeProvider>
      </body>
    </html>
  );
}
