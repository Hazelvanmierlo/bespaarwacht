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

export const metadata: Metadata = {
  title: "DeVerzekeringsAgent — Vergelijk verzekeringen & energie, bespaar en wij bewaken 24/7",
  description:
    "Vergelijk verzekeringen en energie op prijs, dekking en voorwaarden. Stap over met één klik. DeVerzekeringsAgent monitort de markt 24/7 zodat jij nooit meer te veel betaalt.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.svg",
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
