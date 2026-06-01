import type { Metadata } from "next";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/constants/event";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ariadne-runway.vercel.app"),
  title: `${PRODUCT_NAME} · ${EVENT_NAME}`,
  description: `${PRODUCT_TAGLINE}, a phone-first game for ${EVENT_NAME}.`,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon.png", type: "image/png" }],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: `${PRODUCT_NAME} · ${EVENT_NAME}`,
    description: PRODUCT_TAGLINE,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRODUCT_NAME} · ${EVENT_NAME}`,
    description: PRODUCT_TAGLINE,
  },
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
