import { CheckIcon, LockIcon } from "@/components/icons";

export default function PrivacyPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 pb-20">
      <h1 className="font-heading text-[32px] font-bold text-bw-deep mb-2">Privacyverklaring</h1>
      <p className="text-[15px] text-bw-text-mid mb-8">
        BespaarWacht hecht groot belang aan de bescherming van je persoonsgegevens. In deze privacyverklaring leggen wij uit hoe wij omgaan met je gegevens.
      </p>

      {/* Key principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="p-5 bg-bw-green-bg rounded-xl border-l-[3px] border-bw-green">
          <div className="flex items-center gap-2 mb-3">
            <LockIcon className="w-4 h-4 text-bw-green" />
            <div className="text-sm font-bold text-bw-green-strong">Wat wij WÉL opslaan</div>
          </div>
          <ul className="text-[13px] text-bw-green-dark leading-relaxed space-y-1.5">
            <li>Type verzekering (bv. inboedelverzekering)</li>
            <li>Dekkingsvorm (bv. All Risk)</li>
            <li>Premie-informatie</li>
            <li>Woningtype en regio (postcode 4 cijfers)</li>
            <li>Gezinssamenstelling</li>
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
            <li>Je polisnummer</li>
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
            BespaarWacht B.V. is een Nederlandse vergelijkingsservice voor verzekeringen. Wij helpen consumenten om de beste verzekering te vinden tegen de laagste prijs. Wij zijn geregistreerd bij de Kamer van Koophandel onder nummer 87654321.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">2. Hoe verwerken wij je gegevens?</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Wanneer je een polisblad (PDF) uploadt, doorloopt dit het volgende proces:
          </p>
          <ol className="text-sm text-bw-text-mid leading-relaxed space-y-2 list-decimal pl-5">
            <li><strong>Extractie:</strong> Wij lezen de verzekeringsdata uit je PDF.</li>
            <li><strong>Anonimisering:</strong> Je naam, adres, polisnummer en andere persoonsgegevens worden direct verwijderd.</li>
            <li><strong>Analyse:</strong> Wij vergelijken de geanonimiseerde data met actuele marktaanbiedingen.</li>
            <li><strong>Verwijdering:</strong> Je PDF wordt direct na analyse permanent verwijderd van onze servers.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">3. Grondslag verwerking</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Wij verwerken gegevens op basis van de volgende grondslagen uit de Algemene Verordening Gegevensbescherming (AVG):
          </p>
          <ul className="text-sm text-bw-text-mid leading-relaxed space-y-1.5 mt-2">
            <li><strong>Art. 6 lid 1b AVG</strong> — Uitvoering van de overeenkomst (het leveren van de vergelijkingsservice)</li>
            <li><strong>Art. 6 lid 1f AVG</strong> — Gerechtvaardigd belang (het verbeteren van onze dienstverlening)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">4. Dataminimalisatie</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Dataminimalisatie (art. 5 lid 1c AVG) is ons uitgangspunt. Wij verzamelen en bewaren uitsluitend gegevens die strikt noodzakelijk zijn voor het leveren van onze dienst. Alle persoonsgegevens worden direct bij verwerking verwijderd — wij bewaren alleen geanonimiseerde verzekeringsdata.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">5. Jouw rechten</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed mb-3">
            Op grond van de AVG heb je de volgende rechten:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              ["Recht op inzage (art. 15 AVG)", "Je kunt altijd opvragen welke gegevens wij van je bewaren."],
              ["Recht op rectificatie (art. 16 AVG)", "Je kunt onjuiste gegevens laten corrigeren."],
              ["Recht op vergetelheid (art. 17 AVG)", "Je kunt je gegevens op elk moment laten verwijderen."],
              ["Recht op overdraagbaarheid (art. 20 AVG)", "Je kunt je gegevens downloaden als bestand."],
              ["Recht op bezwaar (art. 21 AVG)", "Je kunt bezwaar maken tegen de verwerking van je gegevens."],
              ["Recht op beperking (art. 18 AVG)", "Je kunt de verwerking van je gegevens laten beperken."],
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
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">6. Inkomsten en transparantie</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            BespaarWacht is voor consumenten volledig gratis. Wij ontvangen een vergoeding (provisie) van de verzekeraar wanneer je via onze links een verzekering afsluit. Dit kost jou niets extra. De vergoeding heeft geen invloed op de vergelijkingsresultaten — de goedkoopste optie staat altijd bovenaan.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">7. Cookies</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Wij gebruiken uitsluitend functionele cookies die noodzakelijk zijn voor het functioneren van de website. Wij gebruiken geen tracking cookies of cookies van derden voor marketingdoeleinden.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-bw-deep mb-3">8. Contact en klachten</h2>
          <p className="text-sm text-bw-text-mid leading-relaxed">
            Heb je vragen over je privacy of wil je gebruik maken van je rechten? Neem contact met ons op via privacy@bespaarwacht.nl. Mocht je ontevreden zijn over de verwerking van je gegevens, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).
          </p>
        </section>
      </div>

      <div className="mt-10 text-xs text-bw-text-light">
        Laatst bijgewerkt: februari 2026
      </div>
    </div>
  );
}
