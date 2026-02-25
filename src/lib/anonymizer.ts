import type { AnonResult, PolisData } from "./types";

export function anonymize(data: PolisData): AnonResult {
  const id = `BW-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
  return {
    klantId: id,
    fields: [
      { veld: "Volledige naam", origineel: data.naam, anon: `Klant ${id}`, status: "verwijderd" },
      { veld: "Adres", origineel: data.adres, anon: "[Adres verwijderd]", status: "verwijderd" },
      { veld: "Postcode", origineel: data.postcode, anon: data.postcode.slice(0, 4) + "**", status: "deels" },
      { veld: "Woonplaats", origineel: data.woonplaats, anon: data.woonplaats, status: "bewaard" },
      { veld: "Polisnummer", origineel: data.polisnummer, anon: "XXXX-XXX-XXX", status: "verwijderd" },
    ],
  };
}
