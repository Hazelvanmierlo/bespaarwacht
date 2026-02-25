import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import Providers from "@/components/providers";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BespaarWacht — Vergelijk, bespaar en wij bewaken je vaste lasten 24/7",
  description:
    "Vergelijk verzekeringen op prijs, dekking en voorwaarden. Stap over met één klik. BespaarWacht monitort de markt 24/7 zodat jij nooit meer te veel betaalt.",
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
      <body className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
        <Providers>
          <Nav />
          <main className="pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
