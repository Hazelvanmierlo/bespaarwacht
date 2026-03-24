export const metadata = {
  title: "Klachtenregeling — DeVerzekeringsAgent",
  description: "Hoe je een klacht kunt indienen bij DeVerzekeringsAgent (Fraction B.V.) en hoe wij deze behandelen.",
};

export default function KlachtenPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 pb-20">
      <h1 className="font-heading text-[32px] font-bold text-bw-deep mb-2">Klachtenregeling</h1>
      <p className="text-[15px] text-bw-text-mid mb-8">
        Bij DeVerzekeringsAgent (Fraction B.V.) nemen we klachten serieus. Mocht je ontevreden zijn, dan behandelen wij je klacht zo snel en zorgvuldig mogelijk.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">1. Wat is een klacht?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Een klacht is elke uiting van ontevredenheid over onze dienstverlening, de werking van het Platform, de vergelijkingsresultaten of de manier waarop wij met je gegevens omgaan.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">2. Hoe dien je een klacht in?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Je kunt je klacht op de volgende manieren bij ons indienen:
          </p>
          <div className="bg-bw-bg rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-bw-blue text-white flex items-center justify-center text-sm font-bold shrink-0">@</div>
              <div>
                <div className="text-sm font-semibold text-bw-deep">E-mail</div>
                <p className="text-sm text-bw-text-mid">info@deverzkeringsagent.nl</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-bw-deep">WhatsApp</div>
                <p className="text-sm text-bw-text-mid">Via onze WhatsApp-dienst</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-bw-text-mid leading-relaxed mt-3">
            Vermeld in je klacht zo duidelijk mogelijk:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-1 list-disc pl-5 mt-1">
            <li>Je naam en contactgegevens</li>
            <li>Een omschrijving van je klacht</li>
            <li>Eventuele documentatie of screenshots</li>
            <li>Wat je verwacht als oplossing</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">3. Behandelprocedure</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Ontvangstbevestiging", desc: "Wij bevestigen de ontvangst van je klacht binnen 2 werkdagen.", color: "bg-bw-blue" },
              { step: "2", title: "Onderzoek", desc: "Wij onderzoeken je klacht zorgvuldig en nemen indien nodig contact met je op voor aanvullende informatie.", color: "bg-bw-blue" },
              { step: "3", title: "Oplossing", desc: "Je klacht wordt binnen 14 werkdagen inhoudelijk behandeld en je ontvangt een oplossing.", color: "bg-bw-green" },
              { step: "4", title: "Terugkoppeling", desc: "Je ontvangt een schriftelijke reactie per e-mail met onze bevindingen en eventuele maatregelen.", color: "bg-bw-green" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-lg ${item.color} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                  {item.step}
                </div>
                <div>
                  <div className="text-sm font-semibold text-bw-deep">{item.title}</div>
                  <p className="text-sm text-bw-text-mid">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">4. Niet tevreden met de uitkomst?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Mocht je niet tevreden zijn met de afhandeling van je klacht, dan kun je je wenden tot:
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-2 list-disc pl-5">
            <li>
              <strong>Autoriteit Persoonsgegevens</strong> — voor klachten over de verwerking van persoonsgegevens.
              <br />
              <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">autoriteitpersoonsgegevens.nl</a>
            </li>
            <li>
              <strong>ConsuWijzer (ACM)</strong> — voor klachten over oneerlijke handelspraktijken of misleidende informatie.
              <br />
              <a href="https://www.consuwijzer.nl" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">consuwijzer.nl</a>
            </li>
            <li>
              <strong>Europees ODR-platform</strong> — voor online geschillenbeslechting.
              <br />
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">ec.europa.eu/consumers/odr</a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">5. Registratie en verbetering</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Alle klachten worden geregistreerd en geanalyseerd om onze dienstverlening continu te verbeteren. Klachtgegevens worden bewaard voor een periode van 2 jaar na afhandeling en vervolgens verwijderd.
          </p>
        </section>
      </div>

      <div className="mt-10 p-5 bg-bw-bg rounded-xl">
        <p className="text-sm text-bw-text-mid">
          <strong className="text-bw-deep">Fraction B.V.</strong> (h/o DeVerzekeringsAgent)<br />
          KvK: 91544467<br />
          E-mail: info@deverzkeringsagent.nl
        </p>
      </div>

      <div className="mt-6 text-xs text-bw-text-light">
        Laatst bijgewerkt: maart 2026
      </div>
    </div>
  );
}
