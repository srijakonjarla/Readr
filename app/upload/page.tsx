"use client";

import { useRouter } from "next/navigation";
import UploadSection from "@/components/UploadSection";

export default function UploadPage() {
  const router = useRouter();
  return (
    <main>
      <UploadSection
        onUploadSuccess={() => {
          router.push("/");
          router.refresh();
        }}
      />
    </main>
  );
}
