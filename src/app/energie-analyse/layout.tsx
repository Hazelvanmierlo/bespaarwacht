import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Energie Analyse — DeVerzekeringsAgent",
  description:
    "Upload je energierapport en krijg direct een vergelijking met alle leveranciers en persoonlijk besparingsadvies. Gratis en volledig privé.",
};

export default function EnergieAnalyseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
