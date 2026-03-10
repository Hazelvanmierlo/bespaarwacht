export const metadata = {
  title: "Cookieverklaring — DeVerzekeringsAgent",
  description: "Welke cookies DeVerzekeringsAgent (Fraction B.V.) gebruikt en waarom.",
};

export default function CookiesPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 pb-20">
      <h1 className="font-heading text-[32px] font-bold text-bw-deep mb-2">Cookieverklaring</h1>
      <p className="text-[15px] text-bw-text-mid mb-8">
        DeVerzekeringsAgent (Fraction B.V.) gebruikt cookies op deze website. Hieronder leggen wij uit welke cookies wij gebruiken, waarom en hoe je je voorkeuren kunt beheren.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">1. Wat zijn cookies?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Cookies zijn kleine tekstbestanden die door een website op je apparaat (computer, tablet, smartphone) worden opgeslagen wanneer je de website bezoekt. Ze helpen de website om je apparaat te herkennen en informatie over je bezoek te onthouden, zoals je voorkeursinstellingen.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">2. Welke cookies gebruiken wij?</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-bw-text-mid border-collapse mb-4">
              <thead>
                <tr className="border-b-2 border-bw-border">
                  <th className="text-left py-2.5 pr-4 font-semibold text-bw-deep">Type</th>
                  <th className="text-left py-2.5 pr-4 font-semibold text-bw-deep">Doel</th>
                  <th className="text-left py-2.5 font-semibold text-bw-deep">Bewaartermijn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bw-border">
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Strikt noodzakelijk</td>
                  <td className="py-2.5 pr-4">Zorgen dat de website correct functioneert (sessiebeheer, beveiliging, inlogstatus).</td>
                  <td className="py-2.5">Sessie of max. 24 uur</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Functioneel</td>
                  <td className="py-2.5 pr-4">Onthouden van je voorkeuren, zoals gekozen categorie (verzekering of energie) en taalinstelling.</td>
                  <td className="py-2.5">Max. 12 maanden</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Analytisch</td>
                  <td className="py-2.5 pr-4">Inzicht krijgen in websitegebruik om de dienst te verbeteren (geanonimiseerd, zonder persoonsgegevens).</td>
                  <td className="py-2.5">Max. 26 maanden</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-bw-green-bg rounded-xl text-sm text-bw-green-dark">
            <strong>Geen marketing- of trackingcookies:</strong> wij plaatsen geen cookies van derden voor reclame- of trackingdoeleinden. Wij volgen je niet op andere websites.
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">3. Cookies van derden</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Onze website kan links bevatten naar websites van Aanbieders (verzekeraars, energieleveranciers). Wanneer je doorklikt naar een Aanbieder, kan die partij eigen cookies plaatsen. Wij hebben geen controle over deze cookies. Raadpleeg het cookiebeleid van de betreffende Aanbieder voor meer informatie.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">4. Cookies beheren of verwijderen</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Je kunt cookies op elk moment beheren of verwijderen via de instellingen van je browser:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-1 list-disc pl-5">
            <li><strong>Chrome:</strong> Instellingen → Privacy en beveiliging → Cookies en andere sitegegevens</li>
            <li><strong>Firefox:</strong> Instellingen → Privacy &amp; beveiliging → Cookies en sitegegevens</li>
            <li><strong>Safari:</strong> Voorkeuren → Privacy → Beheer websitegegevens</li>
            <li><strong>Edge:</strong> Instellingen → Cookies en sitemachtigingen</li>
          </ul>
          <p className="text-sm text-bw-text-mid leading-relaxed mt-3">
            Let op: het blokkeren van cookies kan de werking van onze website beïnvloeden. Strikt noodzakelijke cookies zijn vereist voor het correct functioneren van het Platform.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">5. Wettelijke grondslag</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Strikt noodzakelijke cookies plaatsen wij op grond van ons gerechtvaardigd belang (de website laten functioneren). Voor alle overige cookies vragen wij je toestemming conform de Nederlandse Telecommunicatiewet (art. 11.7a) en de ePrivacy-richtlijn.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">6. Wijzigingen</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Wij kunnen deze cookieverklaring van tijd tot tijd aanpassen. De meest actuele versie is altijd beschikbaar op deze pagina.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">7. Contact</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Heb je vragen over ons cookiebeleid? Neem contact op via privacy@deverzkeringsagent.nl.
          </p>
        </section>
      </div>

      <div className="mt-10 text-xs text-bw-text-light">
        Laatst bijgewerkt: maart 2026
      </div>
    </div>
  );
}
