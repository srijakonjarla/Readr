"use client";

import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";

interface UploadSectionProps {
  onUploadSuccess: () => void;
}

function UploadSection({ onUploadSuccess }: UploadSectionProps) {
  const [uploading, setUploading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    const fileInput = fileInputRef.current;
    const file = fileInput?.files?.[0];
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      await response.json();

      if (fileInput) {
        fileInput.value = "";
      }
      setFileName("");

      onUploadSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error uploading file:", error);
      alert(`Error uploading file: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl px-6 pb-32">
      <div className="card p-10">
        <h2 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-ink">
          Add a book
        </h2>
        <p className="mt-1 text-[15px] text-ink-2">
          Upload an EPUB to start reading.
        </p>

        <form onSubmit={handleUpload} className="mt-6 space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-rule bg-bg-2 px-6 py-12 text-center transition-colors">
            <Upload size={32} className="text-accent" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-ink">
              {fileName || "Click to choose an EPUB"}
            </span>
            <span className="text-xs text-ink-3">.epub files only</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".epub"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </label>

          <button
            type="submit"
            disabled={uploading || !fileName}
            className="btn-cta w-full justify-center"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default UploadSection;
