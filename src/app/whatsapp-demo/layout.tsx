import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WhatsApp Energie-assistent — BespaarWacht",
  description:
    "Stuur je energierekening via WhatsApp en ontvang binnen 10 seconden een vergelijking van 18 leveranciers. Overstappen? Alleen IBAN + e-mail.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
