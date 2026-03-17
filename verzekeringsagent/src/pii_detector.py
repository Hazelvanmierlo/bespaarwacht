"""
Module 2: PII detection using Presidio with Dutch custom recognizers.
Detects: names, BSN, IBAN, addresses, postcodes, cities, phone numbers,
email, dates, policy numbers, customer numbers, EAN codes, meter numbers.
"""

import re
from typing import List, Optional

from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
from presidio_analyzer.nlp_engine import NlpEngineProvider


# ─── Custom Recognizers ───────────────────────────────────────────────────────

class DutchBSNRecognizer(PatternRecognizer):
    """Dutch BSN (Burger Service Nummer) — 9 digits with 11-proof validation."""

    def __init__(self):
        patterns = [
            Pattern("bsn_label", r"\b(?:BSN|burgerservicenummer)[:\s]*(\d{9})\b", 0.95),
            Pattern("bsn_standalone", r"\b\d{9}\b", 0.20),
        ]
        super().__init__(
            supported_entity="BSN",
            patterns=patterns,
            supported_language="nl",
            name="Dutch BSN Recognizer",
        )

    def validate_result(self, pattern_text: str) -> Optional[bool]:
        digits = re.sub(r"\D", "", pattern_text)
        if len(digits) != 9:
            return False
        total = sum(int(d) * (9 - i) for i, d in enumerate(digits[:8]))
        total -= int(digits[8])
        return total % 11 == 0 and total > 0


class DutchIBANRecognizer(PatternRecognizer):
    """Dutch IBAN numbers."""

    def __init__(self):
        patterns = [
            Pattern("iban_full", r"\bNL\d{2}\s?[A-Z]{4}\s?\d{4}\s?\d{4}\s?\d{2}\b", 0.95),
            Pattern("iban_compact", r"\bNL\d{2}[A-Z]{4}\d{10}\b", 0.95),
            Pattern("iban_masked", r"\bIBAN\s+\*{5,}[\d]{1,4}\b", 0.85),
            Pattern("iban_label", r"\bIBAN[:\s]+NL[\d\s\w]{10,22}\b", 0.90),
        ]
        super().__init__(
            supported_entity="IBAN",
            patterns=patterns,
            supported_language="nl",
            name="Dutch IBAN Recognizer",
        )


class DutchPostcodeRecognizer(PatternRecognizer):
    """Dutch postcodes (4 digits + 2 uppercase letters)."""

    def __init__(self):
        patterns = [
            Pattern("postcode", r"\b[1-9]\d{3}\s?[A-Z]{2}\b", 0.85),
        ]
        super().__init__(
            supported_entity="POSTCODE",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Postcode Recognizer",
        )


class DutchAddressRecognizer(PatternRecognizer):
    """Dutch street addresses."""

    STREET_SUFFIXES = (
        "straat|laan|weg|plein|gracht|kade|singel|dijk|dreef|hof|park|pad|steeg|baan|ring"
    )

    def __init__(self):
        sfx = self.STREET_SUFFIXES
        patterns = [
            # Capitalized street + number: Keizersgracht 123a
            Pattern("address_full", rf"\b[A-Z][a-zéèëïöüá]+(?:{sfx})\s+\d{{1,5}}\s?[a-zA-Z]?\d?\b", 0.85),
            # With direction: Amsteldijk Zuid 107
            Pattern("address_direction", rf"\b[A-Z][a-z]+(?:dijk|weg|laan|straat)\s+(?:Zuid|Noord|Oost|West)\s+\d{{1,5}}\b", 0.85),
            # ALL CAPS: AMSTELDIJK ZUID 183
            Pattern("address_caps", rf"\b[A-Z]{{2,}}(?:{sfx.upper()})\s+(?:ZUID|NOORD|OOST|WEST)?\s*\d{{1,5}}\b", 0.80),
        ]
        super().__init__(
            supported_entity="ADRES",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Address Recognizer",
        )


class DutchCityRecognizer(PatternRecognizer):
    """Dutch cities — especially after postcodes."""

    CITIES = [
        "amsterdam", "rotterdam", "den haag", "'s-gravenhage", "utrecht",
        "eindhoven", "groningen", "tilburg", "almere", "breda",
        "nijmegen", "apeldoorn", "haarlem", "arnhem", "enschede",
        "amersfoort", "zaanstad", "haarlemmermeer", "den bosch",
        "'s-hertogenbosch", "zoetermeer", "zwolle", "leiden", "maastricht",
        "dordrecht", "ede", "emmen", "delft", "deventer",
        "leeuwarden", "alkmaar", "venlo", "hilversum", "amstelveen",
        "heerlen", "oss", "roosendaal", "purmerend", "schiedam",
        "vlaardingen", "almelo", "gouda", "zaandam", "hoorn",
        "bergen op zoom", "veenendaal", "zeist", "nieuwegein",
        "harderwijk", "woerden", "diemen", "aalsmeer", "uithoorn",
    ]

    def __init__(self):
        city_alts = "|".join(re.escape(c) for c in self.CITIES)
        patterns = [
            # After postcode: 1186VH AMSTELVEEN
            Pattern("city_after_postcode", r"(?:\d{4}\s?[A-Z]{2})\s+(" + city_alts + r")\b", 0.90),
            # ALL CAPS city standalone
            Pattern("city_caps", r"\b(" + "|".join(re.escape(c.upper()) for c in self.CITIES) + r")\b", 0.75),
        ]
        super().__init__(
            supported_entity="WOONPLAATS",
            patterns=patterns,
            supported_language="nl",
            name="Dutch City Recognizer",
            context=["woonplaats", "plaats", "stad", "gemeente", "adres", "postcode"],
        )


class DutchPhoneRecognizer(PatternRecognizer):
    """Dutch phone numbers (mobile + landline)."""

    def __init__(self):
        patterns = [
            Pattern("mobile", r"\b(?:\+31|0031|0)[ -]?6[ -]?\d{2}[ -]?\d{2}[ -]?\d{2}[ -]?\d{2}\b", 0.90),
            Pattern("mobile_compact", r"\b(?:\+31|0)6\d{8}\b", 0.95),
            Pattern("intl", r"\+31\d{9}\b", 0.95),
            Pattern("landline", r"\b0\d{2}[ -]\d{3}[ -]?\d{2}[ -]?\d{2}\b", 0.70),
        ]
        super().__init__(
            supported_entity="TELEFOON",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Phone Recognizer",
        )


class DutchDateRecognizer(PatternRecognizer):
    """Dutch dates (DD-MM-YYYY) with valid ranges. Birthdates scored higher."""

    def __init__(self):
        date_pat = r"\b(?:0[1-9]|[12]\d|3[01])[-/](?:0[1-9]|1[0-2])[-/](?:19|20)\d{2}\b"
        patterns = [
            Pattern("date_strict", date_pat, 0.70),
            Pattern("birthdate", r"(?:Geb\.|geboortedatum|geboren)[:\s]*(?:0[1-9]|[12]\d|3[01])[-/](?:0[1-9]|1[0-2])[-/](?:19|20)\d{2}", 0.95),
        ]
        super().__init__(
            supported_entity="DATUM",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Date Recognizer",
        )


class DutchPolisnummerRecognizer(PatternRecognizer):
    """Insurance policy numbers."""

    def __init__(self):
        patterns = [
            Pattern("polis_dash", r"\b\d{5,10}[-/]\d{2,4}[-/]\d{2,4}\b", 0.70),
            Pattern("polis_label", r"(?i)(?:polisnummer|polis\s*nr)[:\s]*\d{6,12}\b", 0.90),
            Pattern("polis_alpha", r"\b[A-Z]{2}\d{6,12}\b", 0.75),
        ]
        super().__init__(
            supported_entity="POLISNUMMER",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Polisnummer Recognizer",
        )


class DutchCustomerNumberRecognizer(PatternRecognizer):
    """Customer/contract/invoice/machtiging numbers."""

    def __init__(self):
        patterns = [
            Pattern("klantnr", r"(?i)(?:klantnummer|contractnummer|contract|factuurnummer|relatienummer)[:\s]*\d{5,15}", 0.90),
            Pattern("machtiging", r"(?i)(?:machtiging|mandaat)[:\s]*\d{5,12}", 0.85),
        ]
        super().__init__(
            supported_entity="KLANTNUMMER",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Customer Number Recognizer",
        )


class DutchEANRecognizer(PatternRecognizer):
    """EAN codes for energy connections (18 digits starting with 8716)."""

    def __init__(self):
        patterns = [
            Pattern("ean", r"\b8716\d{14}\b", 0.95),
            Pattern("ean_label", r"(?i)EAN[:\s]*8716\d{14}\b", 0.95),
        ]
        super().__init__(
            supported_entity="EAN_CODE",
            patterns=patterns,
            supported_language="nl",
            name="Dutch EAN Recognizer",
        )


class DutchMeterRecognizer(PatternRecognizer):
    """Energy meter numbers."""

    def __init__(self):
        patterns = [
            Pattern("meter_e", r"\bE\d{15}\b", 0.85),
            Pattern("meter_g", r"\bG\d{15}\b", 0.85),
            Pattern("meter_label", r"(?i)(?:meternummer|meternr)[:\s]*[EG]?\d{10,16}\b", 0.90),
        ]
        super().__init__(
            supported_entity="METERNUMMER",
            patterns=patterns,
            supported_language="nl",
            name="Dutch Meter Number Recognizer",
        )


class DutchKvKRecognizer(PatternRecognizer):
    """KvK (Chamber of Commerce) numbers."""

    def __init__(self):
        patterns = [
            Pattern("kvk", r"(?i)\bKvK[:\s-]*(?:nr\.?\s*)?\d{8}\b", 0.95),
        ]
        super().__init__(
            supported_entity="KVK_NUMMER",
            patterns=patterns,
            supported_language="nl",
            name="Dutch KvK Recognizer",
        )


class DutchBTWRecognizer(PatternRecognizer):
    """Dutch BTW (VAT) numbers."""

    def __init__(self):
        patterns = [
            Pattern("btw", r"\bNL\d{9}B\d{2}\b", 0.95),
            Pattern("btw_label", r"(?i)\b(?:BTW)\s*(?:nr|nummer)?[:\s]*NL\d{9}B\d{2}\b", 0.95),
        ]
        super().__init__(
            supported_entity="BTW_NUMMER",
            patterns=patterns,
            supported_language="nl",
            name="Dutch BTW Recognizer",
        )


class DutchInitialsNameRecognizer(PatternRecognizer):
    """Dutch names with initials: C.J.J. Gobel, T. Pex, A.B. van der Berg."""

    def __init__(self):
        patterns = [
            Pattern(
                "initials_surname",
                r"\b[A-Z]\.(?:\s?[A-Z]\.)*\s+(?:van\s+(?:de[rn]?\s+)?|de\s+)?[A-Z][a-zéèëïöüá]+\b",
                0.90,
            ),
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


# ─── False Positive Filter ───────────────────────────────────────────────────

# Built-in Presidio entities that cause false positives on Dutch documents
BLOCKED_ENTITIES = {
    "DATE_TIME",     # English date detector fires on amounts/postcodes
    "PHONE_NUMBER",  # Built-in too loose; our TELEFOON is better
    "NRP",           # Nationality — irrelevant
    "IN_PAN",        # Indian PAN card
    "SG_NRIC_FIN",   # Singapore ID
    "CREDIT_CARD",   # Fires on long numbers that are EANs/policy numbers
}

# Words that spaCy wrongly tags as PERSON
FALSE_PERSON_NAMES = {
    "btw", "btw nr", "leveringskosten", "inboedelverzekering polis",
    "netbeheer", "energiebelasting", "vaste leveringskosten",
    "totaal elektriciteit", "totaal gas", "belaste", "contractgegevens",
    "correctiefactoren", "premiebetaling",
}


def is_false_positive(entity_type: str, value: str) -> bool:
    """Return True if this detection is a known false positive."""
    stripped = value.strip()
    lower = stripped.lower()

    if entity_type in BLOCKED_ENTITIES:
        return True
    if entity_type.startswith(("AU_", "US_", "UK_", "SG_", "IN_")):
        return True

    if entity_type == "PERSON":
        if lower in FALSE_PERSON_NAMES:
            return True
        if re.match(r"^(BTW\s+)?NL\d{9}B\d{2}$", stripped):
            return True
        if len(stripped) <= 2:
            return True
        if re.match(r"^[\d\s.,€-]+$", stripped):
            return True

    if entity_type in ("ORGANIZATION", "ORG"):
        if re.match(r"^[€\d\s.,+-]+$", stripped):
            return True
        if len(stripped) <= 1:
            return True

    if entity_type == "URL":
        if not (stripped.startswith("www.") or stripped.startswith("http") or "/" in stripped):
            return True

    return False


# ─── Analyzer Factory ─────────────────────────────────────────────────────────

_analyzer_instance: Optional[AnalyzerEngine] = None


def get_analyzer() -> AnalyzerEngine:
    """Create or return cached Presidio analyzer with Dutch NLP + custom recognizers."""
    global _analyzer_instance
    if _analyzer_instance is not None:
        return _analyzer_instance

    provider = NlpEngineProvider(nlp_configuration={
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "nl", "model_name": "nl_core_news_lg"}],
    })
    nlp_engine = provider.create_engine()

    analyzer = AnalyzerEngine(
        nlp_engine=nlp_engine,
        supported_languages=["nl"],
    )

    for recognizer in [
        DutchBSNRecognizer(),
        DutchIBANRecognizer(),
        DutchPostcodeRecognizer(),
        DutchAddressRecognizer(),
        DutchCityRecognizer(),
        DutchPhoneRecognizer(),
        DutchDateRecognizer(),
        DutchPolisnummerRecognizer(),
        DutchCustomerNumberRecognizer(),
        DutchEANRecognizer(),
        DutchMeterRecognizer(),
        DutchKvKRecognizer(),
        DutchBTWRecognizer(),
        DutchInitialsNameRecognizer(),
    ]:
        analyzer.registry.add_recognizer(recognizer)

    _analyzer_instance = analyzer
    return analyzer


def detect_pii(text: str, score_threshold: float = 0.50) -> List[dict]:
    """
    Detect PII in Dutch text. Returns list of dicts with:
    entity_type, value, score, start, end.
    """
    analyzer = get_analyzer()
    results = analyzer.analyze(text=text, language="nl", score_threshold=score_threshold)

    detections = []
    for r in sorted(results, key=lambda x: x.start):
        value = text[r.start:r.end]
        if is_false_positive(r.entity_type, value):
            continue
        detections.append({
            "entity_type": r.entity_type,
            "value": value,
            "score": round(r.score, 2),
            "start": r.start,
            "end": r.end,
        })

    return detections
