import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Skills Comment Writer",
  description:
    "Turn rough notes into polished, parent-friendly Ontario report card learning-skills comments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
