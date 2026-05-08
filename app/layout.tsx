import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import ChromeHeader from "@/components/ChromeHeader";

export const metadata: Metadata = {
  title: "Readr — a quiet reading companion",
  description: "Read EPUBs alongside an AI companion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <ChromeHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
