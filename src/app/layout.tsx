import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/providers";
import LayoutShell from "@/components/LayoutShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://deverzekeringsagent.nl";

export const metadata: Metadata = {
  title: "DeVerzekeringsAgent — Vergelijk verzekeringen & energie, bespaar en wij bewaken 24/7",
  description:
    "Vergelijk verzekeringen en energie op prijs, dekking en voorwaarden. Stap over met één klik. DeVerzekeringsAgent monitort de markt 24/7 zodat jij nooit meer te veel betaalt.",
  robots: {
    index: false,
    follow: false,
  },
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: SITE_URL,
    siteName: "DeVerzekeringsAgent",
    title: "DeVerzekeringsAgent — Vergelijk & bespaar op verzekeringen en energie",
    description: "Upload je polis of energierekening. Wij vergelijken direct alle aanbieders en bewaken je premie 24/7.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DeVerzekeringsAgent — Vergelijk, bespaar en wij bewaken 24/7",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeVerzekeringsAgent — Vergelijk & bespaar",
    description: "Upload je polis. Wij vergelijken direct alle aanbieders en bewaken je premie 24/7.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
