"""
Module 3: Document anonymization.
Replaces PII with tokens ([NAAM_1], [BSN_1], etc.) and maintains mapping.
"""

import re
from typing import List, Tuple

from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

from .pii_detector import detect_pii


# Map internal entity types to readable Dutch token prefixes
ENTITY_TOKEN_PREFIX = {
    "PERSON": "NAAM",
    "BSN": "BSN",
    "IBAN": "IBAN",
    "ADRES": "ADRES",
    "POSTCODE": "POSTCODE",
    "WOONPLAATS": "WOONPLAATS",
    "TELEFOON": "TELEFOON",
    "EMAIL_ADDRESS": "EMAIL",
    "DATUM": "DATUM",
    "POLISNUMMER": "POLISNUMMER",
    "KLANTNUMMER": "KLANTNUMMER",
    "EAN_CODE": "EAN",
    "METERNUMMER": "METERNUMMER",
    "KVK_NUMMER": "KVK",
    "BTW_NUMMER": "BTW",
    "LOCATION": "LOCATIE",
    "GPE": "PLAATS",
    "ORGANIZATION": "ORGANISATIE",
    "URL": "URL",
}

# PII types that are actual personal data (stored in klantprofiel)
PERSONAL_PII_TYPES = {
    "PERSON", "BSN", "IBAN", "ADRES", "POSTCODE", "WOONPLAATS",
    "TELEFOON", "EMAIL_ADDRESS", "DATUM",
}

# PII types that are document-specific identifiers
DOCUMENT_PII_TYPES = {
    "POLISNUMMER", "KLANTNUMMER", "EAN_CODE", "METERNUMMER",
}


def anonymize_document(text: str, score_threshold: float = 0.50) -> dict:
    """
    Anonymize a document by replacing PII with tokens.

    Returns:
        {
            "anonymized_text": str,
            "pii_mapping": [{"token": "[NAAM_1]", "value": "Jan de Vries", "entity_type": "PERSON"}, ...],
            "personal_data": {"naam": "Jan de Vries", "adres": "...", ...},
            "pii_count": int,
        }
    """
    detections = detect_pii(text, score_threshold)

    if not detections:
        return {
            "anonymized_text": text,
            "pii_mapping": [],
            "personal_data": {},
            "pii_count": 0,
        }

    # Build token mapping: deduplicate same values, assign sequential tokens
    value_to_token = {}
    token_counters = {}
    pii_mapping = []

    for det in detections:
        value = det["value"].strip()
        entity_type = det["entity_type"]

        if value in value_to_token:
            continue

        prefix = ENTITY_TOKEN_PREFIX.get(entity_type, entity_type)
        token_counters[prefix] = token_counters.get(prefix, 0) + 1
        token = f"[{prefix}_{token_counters[prefix]}]"

        value_to_token[value] = token
        pii_mapping.append({
            "token": token,
            "value": value,
            "entity_type": entity_type,
        })

    # Replace PII in text (longest matches first to avoid partial replacements)
    anonymized = text
    for value, token in sorted(value_to_token.items(), key=lambda x: len(x[0]), reverse=True):
        anonymized = anonymized.replace(value, token)

    # Extract personal data for klantprofiel
    personal_data = _extract_personal_data(detections)

    return {
        "anonymized_text": anonymized,
        "pii_mapping": pii_mapping,
        "personal_data": personal_data,
        "pii_count": len(pii_mapping),
    }


def _extract_personal_data(detections: List[dict]) -> dict:
    """Extract personal data fields from PII detections for the klantprofiel."""
    data = {}

    # Priority mapping: entity_type → profile field
    field_map = {
        "PERSON": "naam",
        "BSN": "bsn",
        "IBAN": "iban",
        "ADRES": "adres",
        "POSTCODE": "postcode",
        "WOONPLAATS": "woonplaats",
        "TELEFOON": "telefoon",
        "EMAIL_ADDRESS": "email",
    }

    for det in detections:
        entity_type = det["entity_type"]
        if entity_type not in field_map:
            continue

        field = field_map[entity_type]
        value = det["value"].strip()

        # Keep first occurrence (usually most complete)
        if field not in data:
            data[field] = value

    # Try to extract birthdate from DATUM detections with "Geb." context
    for det in detections:
        if det["entity_type"] == "DATUM" and "geboortedatum" not in data:
            value = det["value"]
            if "Geb." in value or "geboortedatum" in value.lower():
                date_match = re.search(r"\d{2}[-/]\d{2}[-/]\d{4}", value)
                if date_match:
                    data["geboortedatum"] = date_match.group()

    return data


def extract_profile_from_text(text: str) -> dict:
    """
    Extract woningtype, gezinssamenstelling and other profile data
    directly from document text (not from PII detections).
    """
    extra = {}
    lower = text.lower()

    # Woningtype
    woning_patterns = [
        (r"(?i)\bvrijstaand", "vrijstaand"),
        (r"(?i)\b2[- ]onder[- ]1[- ]kap", "2-onder-1-kap"),
        (r"(?i)\bhoekwoning", "hoekwoning"),
        (r"(?i)\btussenwoning", "tussenwoning"),
        (r"(?i)\bappartement", "appartement"),
        (r"(?i)\bflat\b", "appartement"),
        (r"(?i)\bbovenwoning", "appartement"),
        (r"(?i)\bbenedenwoning", "appartement"),
    ]
    for pat, woningtype in woning_patterns:
        if re.search(pat, text):
            extra["woningtype"] = woningtype
            break

    # Gezinssamenstelling
    if re.search(r"(?i)gezin\s*/?\s*samenwonend|samenwonend|gezinssamenstelling.*gezin", text):
        extra["gezinssamenstelling"] = "gezin"
    elif re.search(r"(?i)eenpersoons|alleenstaand|gezinssamenstelling.*alleen", text):
        extra["gezinssamenstelling"] = "alleenstaand"
    elif re.search(r"(?i)samenwonend\s*\(zonder", text):
        extra["gezinssamenstelling"] = "samenwonend"

    # Eigendom
    if re.search(r"(?i)\beigendom\b|eigen\s+bewoning", text):
        extra["eigenaar"] = True
    elif re.search(r"(?i)\bhuur\b|\bhuurder\b", text):
        extra["eigenaar"] = False

    # Oppervlakte
    m = re.search(r"(\d{2,4})\s*m[²2]", text)
    if m:
        extra["oppervlakte"] = f"{m.group(1)} m²"

    return extra


def verify_no_pii_leakage(anonymized_text: str, known_pii_values: List[str]) -> Tuple[bool, List[str]]:
    """
    Verify that no known PII values appear in anonymized text.
    Returns (is_clean, list_of_leaked_values).
    """
    leaked = []
    for value in known_pii_values:
        value = value.strip()
        if len(value) < 3:
            continue
        if value in anonymized_text:
            leaked.append(value)
        # Also check case-insensitive
        elif value.lower() in anonymized_text.lower():
            leaked.append(value)

    return len(leaked) == 0, leaked
