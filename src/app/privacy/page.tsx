import { CheckIcon, LockIcon } from "@/components/icons";

export const metadata = {
  title: "Privacyverklaring — DeVerzekeringsAgent",
  description: "Hoe DeVerzekeringsAgent (Fraction B.V.) omgaat met je persoonsgegevens conform de AVG/GDPR.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 pb-20">
      <h1 className="font-heading text-[32px] font-bold text-bw-deep mb-2">Privacyverklaring</h1>
      <p className="text-[15px] text-bw-text-mid mb-8">
        DeVerzekeringsAgent (onderdeel van Fraction B.V.) hecht groot belang aan de bescherming van je persoonsgegevens. In deze privacyverklaring leggen wij uit welke gegevens wij verzamelen, waarom, op welke grondslag en hoe lang wij deze bewaren.
      </p>

      {/* Key principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="p-5 bg-bw-green-bg rounded-xl border-l-[3px] border-bw-green">
          <div className="flex items-center gap-2 mb-3">
            <LockIcon className="w-4 h-4 text-bw-green" />
            <div className="text-sm font-bold text-bw-green-strong">Wat wij WÉL opslaan</div>
          </div>
          <ul className="text-[13px] text-bw-green-dark leading-relaxed space-y-1.5">
            <li>Type verzekering of energiecontract</li>
            <li>Dekkingsvorm / contractsoort</li>
            <li>Premie- of tariefinformatie</li>
            <li>Verbruiksgegevens (stroom/gas)</li>
            <li>Woningtype en regio (postcode 4 cijfers)</li>
          </ul>
        </div>
        <div className="p-5 bg-bw-red-bg rounded-xl border-l-[3px] border-bw-red">
          <div className="flex items-center gap-2 mb-3">
            <LockIcon className="w-4 h-4 text-bw-red" />
            <div className="text-sm font-bold text-bw-red">Wat wij NOOIT opslaan</div>
          </div>
          <ul className="text-[13px] text-[#991B1B] leading-relaxed space-y-1.5">
            <li>Je naam of geboortedatum</li>
            <li>Je adres (wordt direct verwijderd)</li>
            <li>Je polisnummer of klantnummer</li>
            <li>Je IBAN of bankgegevens</li>
            <li>Je BSN of andere ID-nummers</li>
          </ul>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">1. Wie zijn wij?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            DeVerzekeringsAgent is een handelsnaam van <strong>Fraction B.V.</strong>, gevestigd te Nederland.
            Wij zijn een vergelijkingsservice voor verzekeringen en energie en helpen consumenten de beste polis of het voordeligste energiecontract te vinden.
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed mt-2 space-y-1">
            <li><strong>KvK-nummer:</strong> 91544467</li>
            <li><strong>E-mail:</strong> privacy@deverzkeringsagent.nl</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">2. Welke gegevens verwerken wij?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Wij verwerken persoonsgegevens afhankelijk van hoe je onze dienst gebruikt:
          </p>

          <h3 className="text-sm font-bold text-bw-deep mt-4 mb-2">a. Websitebezoek</h3>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            IP-adres (geanonimiseerd), browsertype, besturingssysteem, bezochte pagina&apos;s en verwijzende URL.
            Doel: website laten functioneren en verbeteren. Grondslag: gerechtvaardigd belang (art. 6 lid 1f AVG).
            Bewaartermijn: maximaal 26 maanden (geanonimiseerd).
          </p>

          <h3 className="text-sm font-bold text-bw-deep mt-4 mb-2">b. Documenten uploaden (polis / energierekening)</h3>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Wanneer je een document uploadt, doorloopt dit het volgende proces:
          </p>
          <ol className="text-sm text-bw-text-mid leading-relaxed space-y-2 list-decimal pl-5 mt-2">
            <li><strong>Extractie:</strong> Wij lezen relevante data uit je document (type polis, dekking, premie, verbruik, tarief).</li>
            <li><strong>Anonimisering:</strong> Persoonsgegevens (naam, adres, polisnummer, IBAN) worden direct verwijderd.</li>
            <li><strong>Analyse:</strong> De geanonimiseerde data wordt vergeleken met actuele marktaanbiedingen.</li>
            <li><strong>Verwijdering:</strong> Je document wordt direct na analyse permanent verwijderd. Wij slaan het origineel niet op.</li>
          </ol>
          <p className="text-sm text-bw-text-mid leading-relaxed mt-2">
            Grondslag: uitvoering van de overeenkomst (art. 6 lid 1b AVG). Bewaartermijn origineel document: 0 — wordt direct verwijderd.
          </p>

          <h3 className="text-sm font-bold text-bw-deep mt-4 mb-2">c. Vergelijking uitvoeren</h3>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Type verzekering of energiecontract, dekkingsgegevens, premie, verbruikscijfers (kWh/m³), woningtype, regio (eerste 4 cijfers postcode).
            Doel: persoonlijke vergelijking tonen. Grondslag: uitvoering van de overeenkomst (art. 6 lid 1b AVG).
            Bewaartermijn: maximaal 12 maanden (geanonimiseerd).
          </p>

          <h3 className="text-sm font-bold text-bw-deep mt-4 mb-2">d. WhatsApp-dienst</h3>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Telefoonnummer en berichtinhoud. Doel: het leveren van de vergelijkingsservice via WhatsApp.
            Grondslag: toestemming (art. 6 lid 1a AVG). Bewaartermijn: maximaal 30 dagen na laatste interactie, waarna het gesprek wordt verwijderd.
          </p>

          <h3 className="text-sm font-bold text-bw-deep mt-4 mb-2">e. Overstapservice</h3>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Wanneer je via ons overstapt naar een nieuwe aanbieder, worden de voor die overstap benodigde gegevens (naam, adres, e-mail, IBAN) direct aan de betreffende aanbieder doorgegeven.
            Wij bewaren deze gegevens niet zelf. Grondslag: uitvoering van de overeenkomst (art. 6 lid 1b AVG).
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">3. Grondslagen verwerking</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Wij verwerken gegevens op basis van de volgende grondslagen uit de AVG:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-2">
            <li><strong>Art. 6 lid 1a — Toestemming:</strong> voor de WhatsApp-dienst en optionele nieuwsbrieven.</li>
            <li><strong>Art. 6 lid 1b — Uitvoering overeenkomst:</strong> voor het leveren van de vergelijkings- en overstapservice.</li>
            <li><strong>Art. 6 lid 1f — Gerechtvaardigd belang:</strong> voor websiteanalyse, fraudepreventie en het verbeteren van onze dienstverlening.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">4. Dataminimalisatie en beveiliging</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Dataminimalisatie (art. 5 lid 1c AVG) is ons uitgangspunt. Wij verzamelen en bewaren uitsluitend gegevens die strikt noodzakelijk zijn voor het leveren van onze dienst. Persoonsgegevens uit geüploade documenten worden direct bij verwerking verwijderd.
          </p>
          <p className="text-sm text-bw-text-mid leading-relaxed mt-2">
            Wij nemen passende technische en organisatorische maatregelen om je gegevens te beschermen, waaronder:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-1 mt-2 list-disc pl-5">
            <li>Versleutelde verbindingen (TLS/HTTPS) voor alle dataoverdracht</li>
            <li>Versleutelde opslag van gegevens at rest</li>
            <li>Toegangscontrole op basis van need-to-know</li>
            <li>Regelmatige beveiligingsaudits</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">5. Delen met derden</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-2">
            Wij delen je gegevens alleen met derden wanneer dit noodzakelijk is voor onze dienstverlening:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-1 list-disc pl-5">
            <li><strong>Verzekeraars / energieleveranciers:</strong> alleen wanneer je actief kiest om over te stappen via ons platform.</li>
            <li><strong>Hostingproviders:</strong> voor het draaien van onze servers (verwerker, binnen de EER).</li>
            <li><strong>AI-verwerking:</strong> documenten worden verwerkt via Anthropic (Claude) voor het uitlezen van polisdata. Er worden geen persoonsgegevens bewaard door deze verwerker.</li>
          </ul>
          <p className="text-sm text-bw-text-mid leading-relaxed mt-2">
            Wij verkopen nooit persoonsgegevens aan derden. Gegevens worden niet buiten de Europese Economische Ruimte (EER) verwerkt, tenzij er passende waarborgen zijn getroffen (adequaatheidsbesluit of standaard contractbepalingen).
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">6. Bewaartermijnen</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-bw-text-mid border-collapse">
              <thead>
                <tr className="border-b border-bw-border">
                  <th className="text-left py-2 pr-4 font-semibold text-bw-deep">Gegevens</th>
                  <th className="text-left py-2 font-semibold text-bw-deep">Bewaartermijn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bw-border">
                <tr><td className="py-2 pr-4">Geüploade documenten</td><td className="py-2">Direct verwijderd na analyse</td></tr>
                <tr><td className="py-2 pr-4">Geanonimiseerde vergelijkingsdata</td><td className="py-2">Maximaal 12 maanden</td></tr>
                <tr><td className="py-2 pr-4">Website-analytics (geanonimiseerd)</td><td className="py-2">Maximaal 26 maanden</td></tr>
                <tr><td className="py-2 pr-4">WhatsApp-gesprekken</td><td className="py-2">30 dagen na laatste interactie</td></tr>
                <tr><td className="py-2 pr-4">Overstapgegevens</td><td className="py-2">Direct doorgestuurd, niet bewaard</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">7. Jouw rechten</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Op grond van de AVG heb je de volgende rechten. Je kunt deze uitoefenen door contact op te nemen via privacy@deverzkeringsagent.nl. Wij reageren binnen 1 maand, verlengbaar met maximaal 2 maanden bij complexe verzoeken.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              ["Recht op inzage (art. 15)", "Opvragen welke gegevens wij van je verwerken."],
              ["Recht op rectificatie (art. 16)", "Onjuiste gegevens laten corrigeren."],
              ["Recht op vergetelheid (art. 17)", "Je gegevens laten verwijderen."],
              ["Recht op beperking (art. 18)", "Verwerking van je gegevens beperken."],
              ["Recht op overdraagbaarheid (art. 20)", "Je gegevens ontvangen in een gangbaar formaat."],
              ["Recht op bezwaar (art. 21)", "Bezwaar maken tegen verwerking op basis van gerechtvaardigd belang."],
              ["Toestemming intrekken", "Eerder gegeven toestemming op elk moment intrekken."],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2 p-3 bg-bw-bg rounded-lg">
                <span className="text-bw-green shrink-0 mt-0.5"><CheckIcon className="w-3.5 h-3.5" /></span>
                <div>
                  <div className="text-[13px] font-semibold text-bw-deep">{title}</div>
                  <div className="text-xs text-bw-text-mid">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">8. Cookies</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Voor ons volledige cookiebeleid verwijzen wij naar onze <a href="/cookies" className="text-bw-blue hover:underline">Cookieverklaring</a>.
            Wij gebruiken uitsluitend functionele en analytische cookies. Wij plaatsen geen tracking- of marketingcookies zonder je uitdrukkelijke toestemming.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">9. Inkomsten en transparantie</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            DeVerzekeringsAgent is voor consumenten volledig gratis. Wij ontvangen een vergoeding (provisie) van de verzekeraar of energieleverancier wanneer je via ons platform een product afsluit. Dit kost jou niets extra. De vergoeding heeft geen invloed op de vergelijkingsresultaten — de goedkoopste optie staat altijd bovenaan.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">10. Wijzigingen</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Wij kunnen deze privacyverklaring van tijd tot tijd aanpassen. De meest actuele versie is altijd beschikbaar op deze pagina. Bij substantiële wijzigingen informeren wij je via onze website.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">11. Contact en klachten</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Heb je vragen over je privacy of wil je gebruik maken van je rechten? Neem contact met ons op:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed mt-2 space-y-1 list-disc pl-5">
            <li>E-mail: privacy@deverzkeringsagent.nl</li>
            <li>Fraction B.V., KvK 91544467</li>
          </ul>
          <p className="text-sm text-bw-text-mid leading-relaxed mt-3">
            Mocht je ontevreden zijn over de verwerking van je gegevens, dan heb je het recht een klacht in te dienen bij de <strong>Autoriteit Persoonsgegevens</strong> via <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">autoriteitpersoonsgegevens.nl</a>.
          </p>
        </section>
      </div>

      <div className="mt-10 text-xs text-bw-text-light">
        Laatst bijgewerkt: maart 2026
      </div>
    </div>
  );
}
