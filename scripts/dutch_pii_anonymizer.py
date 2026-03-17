"""
Dutch PII Anonymizer for insurance & energy documents.
Detects and anonymizes all personal data found in Dutch polis/energy PDFs.

Usage:
    python dutch_pii_anonymizer.py <pdf_path>
    python dutch_pii_anonymizer.py --test   # run on sample text
"""

import re
import sys
from typing import List, Optional

import spacy
from presidio_analyzer import (
    AnalyzerEngine,
    Pattern,
    PatternRecognizer,
    RecognizerResult,
)
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig


# ─── Custom Recognizers for Dutch Documents ───────────────────────────────────

class DutchIBANRecognizer(PatternRecognizer):
    """Detects Dutch IBAN numbers (NL + 2 digits + 4 letters + 10 digits)."""
    def __init__(self):
        patterns = [
            Pattern("IBAN_full", r"\bNL\d{2}\s?[A-Z]{4}\s?\d{4}\s?\d{4}\s?\d{2}\b", 0.95),
            Pattern("IBAN_masked", r"\bIBAN\s+\*{5,}[\d]{1,4}\b", 0.85),
            Pattern("IBAN_label", r"\bIBAN[:\s]+NL[\d\s\w]{10,22}\b", 0.90),
        ]
        super().__init__(
            supported_entity="IBAN_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch IBAN Recognizer",
        )


class DutchPostcodeRecognizer(PatternRecognizer):
    """Detects Dutch postcodes (4 digits + 2 letters)."""
    def __init__(self):
        patterns = [
            Pattern("postcode", r"\b[1-9]\d{3}\s?[A-Z]{2}\b", 0.85),
        ]
        super().__init__(
            supported_entity="POSTCODE_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Postcode Recognizer",
        )


class DutchBSNRecognizer(PatternRecognizer):
    """Detects Dutch BSN (Burger Service Nummer) — 9 digits with 11-check."""
    def __init__(self):
        patterns = [
            Pattern("bsn_label", r"\b(?:BSN|burgerservicenummer)[:\s]*(\d{9})\b", 0.95),
            Pattern("bsn_standalone", r"\b\d{9}\b", 0.15),  # low score, needs context
        ]
        super().__init__(
            supported_entity="BSN_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch BSN Recognizer",
        )

    def validate_result(self, pattern_text: str) -> Optional[bool]:
        """Validate BSN using 11-proof check."""
        digits = re.sub(r"\D", "", pattern_text)
        if len(digits) != 9:
            return False
        total = sum(int(d) * (9 - i) for i, d in enumerate(digits[:8]))
        total -= int(digits[8])
        return total % 11 == 0


class DutchAddressRecognizer(PatternRecognizer):
    """Detects Dutch street addresses (street + number + optional suffix)."""
    def __init__(self):
        patterns = [
            # Street + number + optional suffix + optional postcode
            Pattern(
                "address_full",
                r"\b[A-Z][a-zéèëïöüá]+(?:straat|laan|weg|plein|gracht|kade|singel|dijk|dreef|hof|park|pad|steeg|baan|ring)\s+\d{1,5}\s?[a-zA-Z]?\d?\b",
                0.85,
            ),
            # Common Dutch street patterns
            Pattern(
                "address_generic",
                r"\b[A-Z][a-z]+(?:straat|laan|weg|plein|gracht|kade|singel|dijk|dreef)\s+\d{1,5}\b",
                0.80,
            ),
            # Address with "Zuid", "Noord", etc.
            Pattern(
                "address_direction",
                r"\b[A-Z][a-z]+(?:dijk|weg|laan|straat)\s+(?:Zuid|Noord|Oost|West)\s+\d{1,5}\b",
                0.85,
            ),
        ]
        super().__init__(
            supported_entity="ADDRESS_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Address Recognizer",
        )


class DutchPhoneRecognizer(PatternRecognizer):
    """Detects Dutch phone numbers."""
    def __init__(self):
        patterns = [
            # Mobile: 06-12345678, 06 1234 5678 (digits on SAME line, no \n)
            Pattern("mobile", r"\b(?:\+31|0031|0)[ -]?6[ -]?\d{2}[ -]?\d{2}[ -]?\d{2}[ -]?\d{2}\b", 0.90),
            Pattern("mobile_compact", r"\b(?:\+31|0)6\d{8}\b", 0.95),
            # Landline: 020-1234567, 026-4004040 (same line only)
            Pattern("landline", r"\b(?:\+31|0)[ ]?\d{2,3}[ -]\d{3}[ -]?\d{2}[ -]?\d{2}\b", 0.70),
            # General +31 format
            Pattern("intl", r"\+31\d{9}\b", 0.95),
        ]
        super().__init__(
            supported_entity="PHONE_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Phone Recognizer",
        )


class DutchKvKRecognizer(PatternRecognizer):
    """Detects Dutch KvK (Chamber of Commerce) numbers — 8 digits."""
    def __init__(self):
        patterns = [
            Pattern("kvk_label", r"\b(?:KvK|K\.v\.K\.|Kvk)[:\s-]*(?:nr\.?\s*)?(\d{8})\b", 0.95),
            Pattern("kvk_nr", r"\bKvK-?nr\.?\s*\d{8}\b", 0.95),
        ]
        super().__init__(
            supported_entity="KVK_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch KvK Recognizer",
        )


class DutchBTWRecognizer(PatternRecognizer):
    """Detects Dutch BTW (VAT) numbers — NL + 9 digits + B + 2 digits."""
    def __init__(self):
        patterns = [
            Pattern("btw", r"\bNL\d{9}B\d{2}\b", 0.95),
            Pattern("btw_label", r"\b(?:BTW|Btw)\s*(?:nr|nummer)?[:\s]*NL\d{9}B\d{2}\b", 0.95),
        ]
        super().__init__(
            supported_entity="BTW_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch BTW Recognizer",
        )


class DutchPolisnummerRecognizer(PatternRecognizer):
    """Detects insurance policy numbers."""
    def __init__(self):
        patterns = [
            # OHRA style: 6494572-315-400
            Pattern("polis_dash", r"\b\d{5,10}[-/]\d{2,4}[-/]\d{2,4}\b", 0.70),
            # ASR style: 711642537 (after label)
            Pattern("polis_label", r"(?:Polisnummer|Polis\s*nr)[:\s]*(\d{6,12})\b", 0.90),
            # Generic policy ref
            Pattern("polis_ref", r"(?:polisnummer|contractnummer|klantnummer|factuurnummer)[:\s]*\d{5,15}\b", 0.85),
        ]
        super().__init__(
            supported_entity="POLISNUMMER",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Polisnummer Recognizer",
        )


class DutchEANRecognizer(PatternRecognizer):
    """Detects EAN codes for energy connections (18 digits starting with 8716)."""
    def __init__(self):
        patterns = [
            Pattern("ean", r"\b8716\d{14}\b", 0.95),
            Pattern("ean_label", r"(?:EAN)[:\s]*8716\d{14}\b", 0.95),
        ]
        super().__init__(
            supported_entity="EAN_CODE",
            patterns=patterns,
            supported_language="nl",
            name="Dutch EAN Recognizer",
        )


class DutchMeterRecognizer(PatternRecognizer):
    """Detects meter numbers (energy meters)."""
    def __init__(self):
        patterns = [
            Pattern("meter_e", r"\bE\d{15}\b", 0.85),
            Pattern("meter_g", r"\bG\d{15}\b", 0.85),
            Pattern("meter_label", r"(?:Meternummer|meternr)[:\s]*[EG]?\d{10,16}\b", 0.90),
        ]
        super().__init__(
            supported_entity="METER_NR",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Meter Number Recognizer",
        )


class DutchDateRecognizer(PatternRecognizer):
    """Detects dates in Dutch format (DD-MM-YYYY) with valid day/month ranges."""
    def __init__(self):
        # DD: 01-31, MM: 01-12, YYYY: 1900-2099
        date_pattern = r"\b(?:0[1-9]|[12]\d|3[01])[-/](?:0[1-9]|1[0-2])[-/](?:19|20)\d{2}\b"
        patterns = [
            Pattern("date_strict", date_pattern, 0.70),
            # "Geb. 05-04-1991" — birthdate context = high score
            Pattern("birthdate", r"(?:Geb\.|geboortedatum|geboren)[:\s]*(?:0[1-9]|[12]\d|3[01])[-/](?:0[1-9]|1[0-2])[-/](?:19|20)\d{2}", 0.95),
        ]
        super().__init__(
            supported_entity="DATE_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Date Recognizer",
        )


class DutchCustomerNumberRecognizer(PatternRecognizer):
    """Detects customer/contract/invoice numbers."""
    def __init__(self):
        patterns = [
            Pattern("klantnr", r"(?:Klantnummer|Contractnummer|Contract|Factuurnummer|Relatienummer)[:\s]*\d{5,15}", 0.90),
            Pattern("machtiging", r"(?:machtiging|mandaat)[:\s]*\d{5,12}", 0.85),
        ]
        super().__init__(
            supported_entity="CUSTOMER_NR",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Customer Number Recognizer",
        )


class DutchCityRecognizer(PatternRecognizer):
    """Detects Dutch cities, especially in ALL CAPS after postcodes."""
    # Top 50 Dutch cities + common variants
    CITIES = [
        "amsterdam", "rotterdam", "den haag", "'s-gravenhage", "utrecht",
        "eindhoven", "groningen", "tilburg", "almere", "breda",
        "nijmegen", "apeldoorn", "haarlem", "arnhem", "enschede",
        "amersfoort", "zaanstad", "haarlemmermeer", "den bosch",
        "'s-hertogenbosch", "zoetermeer", "zwolle", "leiden", "maastricht",
        "dordrecht", "ede", "emmen", "westland", "delft", "deventer",
        "leeuwarden", "alkmaar", "venlo", "hilversum", "amstelveen",
        "heerlen", "oss", "roosendaal", "purmerend", "schiedam",
        "spijkenisse", "vlaardingen", "almelo", "gouda", "zaandam",
        "hoorn", "bergen op zoom", "capelle aan den ijssel", "veenendaal",
        "leidschendam", "voorburg", "zeist", "nieuwegein", "harderwijk",
        "woerden", "baarn", "bussum", "naarden", "huizen", "weesp",
        "diemen", "ouder-amstel", "aalsmeer", "uithoorn", "mijdrecht",
    ]

    def __init__(self):
        # Build regex: match city names (case-insensitive) that appear after a postcode
        # or on their own line in ALL CAPS
        city_alts = "|".join(re.escape(c) for c in self.CITIES)
        patterns = [
            # After postcode: "1186VH AMSTELVEEN" or "1186 VH Amstelveen"
            Pattern(
                "city_after_postcode",
                r"(?:\d{4}\s?[A-Z]{2})\s+(" + city_alts + r")\b",
                0.90,
            ),
            # Standalone ALL CAPS city on a line
            Pattern(
                "city_caps",
                r"\b(" + "|".join(re.escape(c.upper()) for c in self.CITIES) + r")\b",
                0.75,
            ),
        ]
        super().__init__(
            supported_entity="CITY_NL",
            patterns=patterns,
            supported_language="nl",
            name="Dutch City Recognizer",
            context=["woonplaats", "plaats", "stad", "gemeente", "adres", "postcode"],
        )


class DutchInitialsNameRecognizer(PatternRecognizer):
    """Detects Dutch names with initials like C.J.J. Gobel, T. Pex."""
    def __init__(self):
        patterns = [
            # "C.J.J. Gobel", "T. Pex", "A.B. van der Berg"
            Pattern(
                "initials_surname",
                r"\b[A-Z]\.(?:\s?[A-Z]\.)*\s+(?:van\s+(?:de[rn]?\s+)?|de\s+)?[A-Z][a-zéèëïöüá]+\b",
                0.90,
            ),
            # "De heer T. Pex", "Mevrouw A.B. Jansen"
            Pattern(
                "titled_name",
                r"(?:De\s+heer|Mevrouw|Mevr\.|Dhr\.)\s+[A-Z]\.(?:\s?[A-Z]\.)*\s+(?:van\s+(?:de[rn]?\s+)?|de\s+)?[A-Z][a-zéèëïöüá]+",
                0.95,
            ),
        ]
        super().__init__(
            supported_entity="PERSON",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Initials+Name Recognizer",
        )


# ─── Build Analyzer ──────────────────────────────────────────────────────────

def create_analyzer() -> AnalyzerEngine:
    """Create Presidio analyzer with Dutch NLP + custom recognizers."""
    provider = NlpEngineProvider(nlp_configuration={
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "nl", "model_name": "nl_core_news_lg"}],
    })
    nlp_engine = provider.create_engine()

    analyzer = AnalyzerEngine(
        nlp_engine=nlp_engine,
        supported_languages=["nl"],
    )

    # Register all custom recognizers
    custom_recognizers = [
        DutchIBANRecognizer(),
        DutchPostcodeRecognizer(),
        DutchBSNRecognizer(),
        DutchAddressRecognizer(),
        DutchPhoneRecognizer(),
        DutchKvKRecognizer(),
        DutchBTWRecognizer(),
        DutchPolisnummerRecognizer(),
        DutchEANRecognizer(),
        DutchMeterRecognizer(),
        DutchDateRecognizer(),
        DutchCustomerNumberRecognizer(),
        DutchCityRecognizer(),
        DutchInitialsNameRecognizer(),
    ]
    for rec in custom_recognizers:
        analyzer.registry.add_recognizer(rec)

    return analyzer


def create_anonymizer() -> AnonymizerEngine:
    """Create Presidio anonymizer."""
    return AnonymizerEngine()


# ─── Anonymize Text ──────────────────────────────────────────────────────────

# Entity labels in Dutch for the anonymized output
ENTITY_LABELS = {
    "PERSON": "PERSOON",
    "IBAN_NL": "IBAN",
    "IBAN_CODE": "IBAN",
    "POSTCODE_NL": "POSTCODE",
    "BSN_NL": "BSN",
    "ADDRESS_NL": "ADRES",
    "PHONE_NL": "TELEFOON",
    "KVK_NL": "KVK_NUMMER",
    "BTW_NL": "BTW_NUMMER",
    "POLISNUMMER": "POLISNUMMER",
    "EAN_CODE": "EAN_CODE",
    "METER_NR": "METERNUMMER",
    "DATE_NL": "DATUM",
    "CUSTOMER_NR": "KLANTNUMMER",
    "EMAIL_ADDRESS": "EMAIL",
    "URL": "URL",
    "LOCATION": "LOCATIE",
    "GPE": "PLAATS",
    "CITY_NL": "WOONPLAATS",
    "ORGANIZATION": "ORGANISATIE",
}


def _is_false_positive(entity_type: str, value: str, text: str, start: int, end: int) -> bool:
    """Filter out known false positive patterns."""

    stripped = value.strip()

    # ── Block noisy built-in recognizers entirely ──
    # DATE_TIME: Presidio's English date detector fires on amounts, postcodes, numbers
    if entity_type == "DATE_TIME":
        return True
    # PHONE_NUMBER: built-in is too loose; our PHONE_NL is better
    if entity_type == "PHONE_NUMBER":
        return True
    # NRP (nationality/religious/political): irrelevant for our use case
    if entity_type == "NRP":
        return True
    # IN_PAN (Indian PAN card): not relevant in NL
    if entity_type == "IN_PAN":
        return True
    # SG_NRIC_FIN (Singapore ID): not relevant in NL
    if entity_type == "SG_NRIC_FIN":
        return True
    # AU_ABN, AU_ACN, AU_TFN, AU_MEDICARE: Australian IDs
    if entity_type.startswith("AU_"):
        return True
    # US_* recognizers
    if entity_type.startswith("US_"):
        return True

    # ── PERSON false positives ──
    if entity_type == "PERSON":
        # "Btw nr", "Leveringskosten", single letters, common Dutch words
        false_names = {"btw", "btw nr", "leveringskosten", "inboedelverzekering polis",
                       "netbeheer", "energiebelasting", "vaste leveringskosten",
                       "totaal elektriciteit", "totaal gas", "belaste"}
        if stripped.lower() in false_names:
            return True
        # BTW numbers detected as persons
        if re.match(r"^(BTW\s+)?NL\d{9}B\d{2}$", stripped):
            return True
        # Single character or too short
        if len(stripped) <= 2:
            return True
        # All digits or starts with digit
        if re.match(r"^[\d\s.,€-]+$", stripped):
            return True

    # ── ORGANIZATION false positives ──
    if entity_type in ("ORGANIZATION", "ORG"):
        # Amounts, single letters, numbers
        if re.match(r"^[€\d\s.,+-]+$", stripped):
            return True
        if len(stripped) <= 1:
            return True
        # Common non-org words
        false_orgs = {"k", "m", "n", "s", "eindnota", "belaste"}
        if stripped.lower() in false_orgs:
            return True

    # ── URL: keep only real URLs, not domain fragments ──
    if entity_type == "URL":
        # Keep URLs that start with www. or http or have a path
        if not (stripped.startswith("www.") or stripped.startswith("http") or "/" in stripped):
            # Domain-only like "live.nl" or "email.nl" — already caught by EMAIL
            return True

    # ── POLISNUMMER: don't double-detect what CUSTOMER_NR already catches ──
    if entity_type == "POLISNUMMER":
        lower = stripped.lower()
        if lower.startswith("klantnummer") or lower.startswith("factuurnummer"):
            return True

    return False


def anonymize_text(
    text: str,
    analyzer: AnalyzerEngine,
    anonymizer: AnonymizerEngine,
    score_threshold: float = 0.50,
) -> dict:
    """
    Analyze and anonymize Dutch text.
    Returns dict with anonymized text, detected entities, and entity summary.
    """
    # Analyze
    results = analyzer.analyze(
        text=text,
        language="nl",
        score_threshold=score_threshold,
    )

    # Filter out false positives
    results = [
        r for r in results
        if not _is_false_positive(r.entity_type, text[r.start:r.end], text, r.start, r.end)
    ]

    # Sort by position for readable output
    results = sorted(results, key=lambda x: x.start)

    # Build entity list with original values
    entities = []
    for r in results:
        original = text[r.start:r.end]
        label = ENTITY_LABELS.get(r.entity_type, r.entity_type)
        entities.append({
            "type": r.entity_type,
            "label_nl": label,
            "value": original,
            "score": round(r.score, 2),
            "start": r.start,
            "end": r.end,
        })

    # Anonymize with Dutch labels
    operators = {}
    for entity_type, nl_label in ENTITY_LABELS.items():
        operators[entity_type] = OperatorConfig("replace", {"new_value": f"<{nl_label}>"})

    anon_result = anonymizer.anonymize(
        text=text,
        analyzer_results=results,
        operators=operators,
    )

    # Summary: group by type
    summary = {}
    for e in entities:
        t = e["label_nl"]
        if t not in summary:
            summary[t] = []
        if e["value"] not in summary[t]:
            summary[t].append(e["value"])

    return {
        "original_text": text,
        "anonymized_text": anon_result.text,
        "entities_found": len(entities),
        "entities": entities,
        "summary": summary,
    }


# ─── PDF Processing ─────────────────────────────────────────────────────────

def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    import fitz
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text


def process_pdf(pdf_path: str, score_threshold: float = 0.40) -> dict:
    """Full pipeline: PDF → text extraction → PII detection → anonymization."""
    print(f"Processing: {pdf_path}")

    # Extract text
    text = extract_pdf_text(pdf_path)
    print(f"  Extracted {len(text)} characters from PDF")

    # Analyze & anonymize
    analyzer = create_analyzer()
    anonymizer = create_anonymizer()
    result = anonymize_text(text, analyzer, anonymizer, score_threshold)

    print(f"  Found {result['entities_found']} PII entities:")
    for label, values in result["summary"].items():
        print(f"    {label}: {', '.join(values[:3])}{'...' if len(values) > 3 else ''}")

    return result


# ─── Main ────────────────────────────────────────────────────────────────────

SAMPLE_TEXTS = {
    "polis_ohra": """Inboedelverzekering Polis
Datum: 01-08-2024
Polisnummer: 6494572-315-400
Volledige naam: C.J.J. Gobel
Adres: Amsteldijk Zuid 107
Postcode en woonplaats: 1186VH AMSTELVEEN
Gezinssamenstelling: Gezin / samenwonend
IBAN NL98 INGB 0002 7125 10 BIC INGBNL2A
Dekking: Extra uitgebreid € 173,88""",

    "polis_asr": """Aansprakelijkheidsverzekering
Polisnummer: 711642537
De heer T. Pex
Linnaeusstraat 12 1
1092 CK AMSTERDAM
Geb. 05-04-1991
+31639133180
pex1@live.nl
Betalen: bankrekeningnummer NL04 ABNA 0506 8918 36.
ASR Schadeverzekering N.V. KvK-nr 30031823 Utrecht, BTW NL001028182B01""",

    "energie_budget": """EINDNOTA
C. Gobel
AMSTELDIJK ZUID 183
1188VN AMSTELVEEN
Klantnummer: 5924551
Factuurnummer: 1000060356885
IBAN ***************132 machtiging 7541199
EAN: 871685900003016958
Netbeheerder: Liander
KvK: 34297646
Btw nr: NL819182813B01
IBAN: NL86ABNA0511919131""",

    "energie_coolblue": """Dit Overzicht Energieverbruik van januari is voor:
C. J. J. Gobel
Amsteldijk Zuid 107
1186VH Amstelveen
Contract 01144315""",

    "meter_rapport": """Statusrapportage aansluiting
EAN: 871687400001234567
Meternummer: E004500388412345
Netbeheerder: Stedin
info@meterbeheer.nl
Meterbeheer BV
Danzigerkade 15 A6
1013 AP Amsterdam""",
}


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Run on all sample texts
        analyzer = create_analyzer()
        anonymizer = create_anonymizer()

        for name, text in SAMPLE_TEXTS.items():
            print(f"\n{'='*60}")
            print(f"  TEST: {name}")
            print(f"{'='*60}")
            result = anonymize_text(text, analyzer, anonymizer)

            print(f"\n  ORIGINEEL:")
            print(f"  {text[:200]}...")
            print(f"\n  GEANONIMISEERD:")
            print(f"  {result['anonymized_text'][:200]}...")
            print(f"\n  GEVONDEN ({result['entities_found']} entities):")
            for label, values in result["summary"].items():
                print(f"    {label}: {values}")

    elif len(sys.argv) > 1:
        # Process PDF file
        import json
        result = process_pdf(sys.argv[1])
        # Save result
        out_path = sys.argv[1].rsplit(".", 1)[0] + "_anonymized.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n  Result saved to: {out_path}")
        print(f"\n  ANONYMIZED TEXT (first 500 chars):")
        print(f"  {result['anonymized_text'][:500]}")

    else:
        print("Usage:")
        print("  python dutch_pii_anonymizer.py --test          # Test with sample data")
        print("  python dutch_pii_anonymizer.py <pdf_path>      # Process a PDF")
