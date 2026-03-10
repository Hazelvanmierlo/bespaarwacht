import { NextResponse } from "next/server";
import { auth } from "@/auth";

interface OpzegbriefInput {
  naam: string;
  adres: string;
  postcode: string;
  woonplaats: string;
  leverancier: string;
  klantnummer: string;
  einddatum: string;
  datum: string;
  type: "energie" | "verzekering" | "overig";
}

function generateOpzegbrief(data: OpzegbriefInput): string {
  const typeLabel =
    data.type === "energie"
      ? "energiecontract"
      : data.type === "verzekering"
      ? "verzekering"
      : "contract/abonnement";

  const parts: string[] = [
    `${data.naam}`,
    `${data.adres}`,
    `${data.postcode} ${data.woonplaats}`,
    ``,
    ``,
    data.leverancier,
    ``,
    ``,
    `${data.datum}`,
    ``,
    ``,
    `Betreft: Opzegging ${typeLabel}${data.klantnummer ? ` – klantnummer ${data.klantnummer}` : ""}`,
    ``,
    ``,
    `Geachte heer/mevrouw,`,
    ``,
    `Hierbij zeg ik, ${data.naam}, mijn ${typeLabel} bij uw organisatie op.`,
    ``,
    data.klantnummer
      ? `Mijn klantnummer bij u is: ${data.klantnummer}.`
      : "",
    ``,
    data.einddatum
      ? `Ik verzoek u het contract te beëindigen per ${data.einddatum}, conform de geldende opzegtermijn.`
      : `Ik verzoek u het contract zo spoedig mogelijk te beëindigen, met inachtneming van de contractueel vastgelegde opzegtermijn.`,
    ``,
    `Ik verzoek u:`,
    `- Mij een schriftelijke bevestiging van deze opzegging te sturen;`,
    `- Alle eventuele automatische incasso's te staken per einddatum;`,
    `- Mij een eindafrekening te sturen indien van toepassing.`,
    ``,
    `Indien u nog openstaande vragen heeft, kunt u mij bereiken via bovenstaand adres.`,
    ``,
    `Ik vertrouw erop dat u mijn opzegging in goede orde ontvangt en bevestigt.`,
    ``,
    ``,
    `Met vriendelijke groet,`,
    ``,
    ``,
    `${data.naam}`,
  ];

  return parts.filter((l) => l !== undefined).join("\n");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body: OpzegbriefInput = await req.json();

  const required = ["naam", "adres", "postcode", "woonplaats", "leverancier", "datum"] as const;
  for (const field of required) {
    if (!body[field]?.trim()) {
      return NextResponse.json(
        { error: `Veld '${field}' is verplicht` },
        { status: 400 }
      );
    }
  }

  const brief = generateOpzegbrief(body);

  return NextResponse.json({ brief });
}
