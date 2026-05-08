"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import MetadataPreview from "@/components/MetadataPreview";

export default function PreviewPage({
  params,
}: {
  params: Promise<{ filename: string }>;
}) {
  const { filename: encoded } = use(params);
  const filename = decodeURIComponent(encoded);
  const router = useRouter();

  return (
    <main>
      <MetadataPreview
        book={{ filename }}
        onOpenBook={() => router.push(`/read/${encodeURIComponent(filename)}`)}
        onBackToLibrary={() => router.push("/")}
      />
    </main>
  );
}
