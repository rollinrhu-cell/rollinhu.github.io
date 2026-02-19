import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YouTube Transcript Extractor",
  description:
    "Paste a YouTube URL and get a clean, readable transcript powered by Claude AI",
};

export default function TranscriptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
