import type { Metadata } from "next";
import { AUTHOR_GITHUB, AUTHOR_NAME, SITE_URL } from "@/constants/author";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/constants/event";
import { NavConsole } from "@/components/nav-console";
import { StructuredData } from "@/components/structured-data";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: PRODUCT_NAME,
  title: `${PRODUCT_NAME} · ${EVENT_NAME}`,
  description: `${PRODUCT_TAGLINE}, a phone-first game for ${EVENT_NAME}.`,
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_GITHUB }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  keywords: [PRODUCT_NAME, EVENT_NAME, AUTHOR_NAME, "phone-first event", "agent over SMS", "iMessage", "Dedalus"],
  alternates: { canonical: "/" },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: `${PRODUCT_NAME} · ${EVENT_NAME}`,
    description: PRODUCT_TAGLINE,
    type: "website",
    url: SITE_URL,
    siteName: PRODUCT_NAME,
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
      <body className="min-h-full flex flex-col bg-nyx text-cloud font-sans">
        <StructuredData />
        {children}
        <NavConsole />
      </body>
    </html>
  );
}
