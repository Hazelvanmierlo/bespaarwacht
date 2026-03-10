export const metadata = {
  title: "Dienstenwijzer — DeVerzekeringsAgent",
  description: "Wat je van DeVerzekeringsAgent (Fraction B.V.) kunt verwachten: onze diensten, werkwijze en beloning.",
};

export default function DienstwijzerPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 pb-20">
      <h1 className="font-heading text-[32px] font-bold text-bw-deep mb-2">Dienstenwijzer</h1>
      <p className="text-[15px] text-bw-text-mid mb-8">
        In dit document informeren wij je over wie wij zijn, welke diensten wij aanbieden en hoe wij worden beloond. Zo weet je wat je van ons kunt verwachten.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">1. Wie zijn wij?</h2>
          <div className="bg-bw-bg rounded-xl p-5">
            <table className="text-sm text-bw-text-mid w-full">
              <tbody className="divide-y divide-bw-border">
                <tr><td className="py-2 pr-4 font-semibold text-bw-deep w-[160px]">Handelsnaam</td><td className="py-2">DeVerzekeringsAgent</td></tr>
                <tr><td className="py-2 pr-4 font-semibold text-bw-deep">Statutaire naam</td><td className="py-2">Fraction B.V.</td></tr>
                <tr><td className="py-2 pr-4 font-semibold text-bw-deep">KvK-nummer</td><td className="py-2">91544467</td></tr>
                <tr><td className="py-2 pr-4 font-semibold text-bw-deep">E-mail</td><td className="py-2">info@deverzkeringsagent.nl</td></tr>
                <tr><td className="py-2 pr-4 font-semibold text-bw-deep">Website</td><td className="py-2">deverzkeringsagent.nl</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">2. Wat doen wij?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            DeVerzekeringsAgent is een <strong>onafhankelijk vergelijkingsplatform</strong> voor verzekeringen en energie. Wij bieden de volgende diensten aan:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Vergelijken", desc: "Wij vergelijken verzekeringen en energiecontracten van diverse aanbieders op prijs, dekking en voorwaarden." },
              { title: "Analyseren", desc: "Je kunt je huidige polis of energierekening uploaden. Wij analyseren het document en tonen waar je kunt besparen." },
              { title: "Doorverwijzen", desc: "Wanneer je een geschikte aanbieder hebt gevonden, leiden wij je door naar de website van die aanbieder." },
              { title: "Informeren", desc: "Wij geven persoonlijke tips en advies op basis van je verbruiksprofiel of verzekeringsgegevens." },
            ].map((item) => (
              <div key={item.title} className="p-4 bg-bw-bg rounded-xl">
                <div className="text-sm font-semibold text-bw-deep mb-1">{item.title}</div>
                <p className="text-[13px] text-bw-text-mid leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">3. Wat doen wij niet?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Het is belangrijk om te weten wat wij <strong>niet</strong> doen:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-2 list-disc pl-5">
            <li><strong>Wij geven geen financieel advies.</strong> Onze vergelijking is informatief van aard. Wij adviseren niet welk product het beste bij je past — die keuze maak je zelf.</li>
            <li><strong>Wij bemiddelen niet.</strong> Wij zijn geen tussenpersoon en sluiten geen verzekeringen of contracten namens je af. De overeenkomst komt tot stand tussen jou en de aanbieder.</li>
            <li><strong>Wij zijn geen gevolmachtigd agent.</strong> Wij treden niet op namens verzekeraars.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">4. Hoe worden wij beloond?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Het gebruik van DeVerzekeringsAgent is voor jou als consument <strong>volledig gratis</strong>. Wij verdienen onze inkomsten als volgt:
          </p>
          <div className="bg-bw-blue-light rounded-xl p-5 space-y-3">
            <div>
              <div className="text-sm font-semibold text-bw-deep">Provisie (commissie)</div>
              <p className="text-[13px] text-bw-text-mid leading-relaxed">
                Wanneer je via ons platform doorklikt naar een aanbieder en daar een product afsluit, ontvangen wij een vergoeding van die aanbieder. Dit is een standaard commissiemodel in de vergelijkingsmarkt.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-bw-deep">Affiliate-vergoedingen</div>
              <p className="text-[13px] text-bw-text-mid leading-relaxed">
                Voor bepaalde aanbieders ontvangen wij een vergoeding per klik of per afgesloten product via affiliate-netwerken (zoals Daisycon).
              </p>
            </div>
          </div>
          <p className="text-sm text-bw-text-mid leading-relaxed mt-3">
            <strong>Belangrijk:</strong> onze vergoeding heeft geen invloed op de vergelijkingsresultaten. De goedkoopste optie voor jou staat altijd bovenaan. Wij zijn transparant over dit verdienmodel.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">5. Hoe gaan wij om met je gegevens?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Wij hechten groot belang aan je privacy. Geüploade documenten worden direct na analyse verwijderd. Persoonsgegevens worden geanonimiseerd. Wij slaan geen namen, adressen of IBAN-nummers op. Lees ons volledige <a href="/privacy" className="text-bw-blue hover:underline">privacybeleid</a> voor meer informatie.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">6. Klachten</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Niet tevreden? Wij behandelen klachten zorgvuldig en binnen 14 werkdagen. Zie onze volledige <a href="/klachten" className="text-bw-blue hover:underline">klachtenregeling</a> voor de procedure. Je kunt ook terecht bij de <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">Autoriteit Persoonsgegevens</a> of <a href="https://www.consuwijzer.nl" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">ConsuWijzer</a>.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">7. Aansprakelijkheid</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            DeVerzekeringsAgent spant zich in om correcte en actuele informatie te tonen, maar kan niet garanderen dat alle getoonde informatie te allen tijde volledig juist is. Wij zijn niet aansprakelijk voor de inhoud of uitvoering van producten van aanbieders. Zie onze <a href="/voorwaarden" className="text-bw-blue hover:underline">algemene voorwaarden</a> voor de volledige aansprakelijkheidsregeling.
          </p>
        </section>
      </div>

      <div className="mt-10 p-5 bg-bw-bg rounded-xl">
        <p className="text-sm text-bw-text-mid">
          <strong className="text-bw-deep">Fraction B.V.</strong> (h/o DeVerzekeringsAgent)<br />
          KvK: 91544467<br />
          E-mail: info@deverzkeringsagent.nl<br />
          Website: deverzkeringsagent.nl
        </p>
      </div>

      <div className="mt-6 text-xs text-bw-text-light">
        Laatst bijgewerkt: maart 2026
      </div>
    </div>
  );
}
