import type { Metadata } from "next";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/constants/event";
import "./globals.css";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} · ${EVENT_NAME}`,
  description: PRODUCT_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-nyx text-cloud font-sans">{children}</body>
    </html>
  );
}
