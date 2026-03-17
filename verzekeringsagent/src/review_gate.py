"""
Module 8: Review gate — determines if a document can be processed automatically
or needs manual input from the customer.

Returns a verdict: "auto" (proceed) or "manual" (show form to customer).
Also provides info for the admin dashboard.
"""

import re
from typing import Optional


# Sensitive terms that indicate high-risk documents
SENSITIVE_TERMS = [
    "medisch", "psychiatr", "arbeidsongeschikt", "aow", "wia", "wga",
    "ziektewet", "handicap", "diagnose", "behandeling", "ziekenhuis",
    "letselschade", "overlijden", "uitvaart", "levensverzekering",
]

# Minimum fields needed for comparison
REQUIRED_INSURANCE = ["premie"]
REQUIRED_ENERGY = ["kosten"]


def review_document(
    anonymized_text: str,
    details: dict,
    pii_detections: list,
    ocr_quality: Optional[float] = None,
) -> dict:
    """
    Decide if document can be auto-processed or needs manual customer input.

    Returns:
        {
            "verdict": "auto" | "manual",
            "flags": [...],           # list of flag dicts
            "missing_fields": [...],  # fields the customer should fill in
            "admin_status": "ok" | "review" | "ocr_matig",
        }
    """
    flags = []
    missing_fields = []

    # ── Flag 1: OCR quality too low ──
    if ocr_quality is not None and ocr_quality < 0.60:
        flags.append({
            "type": "ocr_kwaliteit",
            "severity": "high",
            "message": f"OCR-kwaliteit is {ocr_quality:.0%} — tekst mogelijk onbetrouwbaar",
        })

    # ── Flag 2: No premium/cost found ──
    doc_type = details.get("type", "")
    if doc_type == "verzekering":
        premie = details.get("premie", {})
        if not premie.get("per_maand") and not premie.get("per_jaar"):
            flags.append({
                "type": "geen_premie",
                "severity": "high",
                "message": "Geen premie gevonden in document",
            })
            missing_fields.append({
                "field": "premie",
                "label": "Premie",
                "type": "bedrag",
                "placeholder": "€ 0,00",
                "help": "Wat betaal je per maand of per jaar?",
            })
            missing_fields.append({
                "field": "premie_periode",
                "label": "Per",
                "type": "select",
                "options": ["maand", "jaar"],
            })
    elif doc_type == "energie":
        kosten = details.get("kosten", {})
        if not kosten.get("elektriciteit") and not kosten.get("gas") and not kosten.get("per_maand"):
            flags.append({
                "type": "geen_kosten",
                "severity": "high",
                "message": "Geen energiekosten gevonden in document",
            })
            missing_fields.append({
                "field": "kosten_maand",
                "label": "Maandbedrag",
                "type": "bedrag",
                "placeholder": "€ 0,00",
                "help": "Wat betaal je per maand aan energie?",
            })

    # ── Flag 3: Unknown document type ──
    if not doc_type or doc_type == "onbekend":
        flags.append({
            "type": "onbekend_type",
            "severity": "medium",
            "message": "Documenttype niet herkend",
        })
        missing_fields.append({
            "field": "document_type",
            "label": "Type document",
            "type": "select",
            "options": [
                "polis_inboedel", "polis_opstal", "polis_aansprakelijkheid",
                "polis_reis", "polis_auto", "polis_zorg", "energie",
            ],
        })

    # ── Flag 4: No insurer/supplier found ──
    if doc_type == "verzekering" and not details.get("product"):
        # Check if we can find it in the text
        if not _find_verzekeraar(anonymized_text):
            missing_fields.append({
                "field": "verzekeraar",
                "label": "Verzekeraar",
                "type": "text",
                "placeholder": "bijv. Centraal Beheer",
                "help": "Bij welke verzekeraar heb je deze polis?",
            })

    # ── Flag 5: Sensitive content ──
    text_lower = anonymized_text.lower()
    found_sensitive = [term for term in SENSITIVE_TERMS if term in text_lower]
    if found_sensitive:
        flags.append({
            "type": "gevoelige_inhoud",
            "severity": "low",
            "message": f"Document bevat mogelijk gevoelige termen: {', '.join(found_sensitive[:3])}",
        })

    # ── Determine verdict ──
    high_flags = [f for f in flags if f["severity"] == "high"]
    has_critical_missing = any(f["field"] in ("premie", "kosten_maand") for f in missing_fields)

    if high_flags or has_critical_missing:
        verdict = "manual"
        admin_status = "review"
    elif flags:
        verdict = "auto"  # non-critical flags, still process
        admin_status = "review"
    else:
        verdict = "auto"
        admin_status = "ok"

    # OCR-specific admin status
    if ocr_quality is not None and ocr_quality < 0.75:
        admin_status = "ocr_matig"

    return {
        "verdict": verdict,
        "flags": flags,
        "missing_fields": missing_fields,
        "admin_status": admin_status,
    }


def check_ocr_quality(text: str) -> float:
    """
    Estimate OCR quality based on text characteristics.
    Returns score 0.0 (garbage) to 1.0 (perfect).
    """
    if not text or len(text) < 20:
        return 0.0

    chars = list(text)
    total = len(chars)

    # Ratio of readable characters (letters, digits, common punctuation, whitespace)
    readable = sum(1 for c in chars if c.isalnum() or c in " \n\t.,;:!?€()-/&@")
    readable_ratio = readable / total

    # Ratio of actual letters (not just numbers/symbols)
    alpha_ratio = sum(1 for c in chars if c.isalpha()) / total

    # Check for common OCR garbage patterns
    garbage_patterns = [
        r"[^\x20-\x7E\xC0-\xFF\n\t]{3,}",  # 3+ non-printable chars in a row
        r"(.)\1{4,}",                          # same char repeated 5+ times
        r"[|Il1]{5,}",                          # common OCR confusion
    ]
    garbage_count = sum(len(re.findall(p, text)) for p in garbage_patterns)
    garbage_penalty = min(garbage_count * 0.05, 0.3)

    # Average word length (very short = bad OCR, very long = missed spaces)
    words = text.split()
    if words:
        avg_word_len = sum(len(w) for w in words) / len(words)
        word_penalty = 0.0
        if avg_word_len < 2.0 or avg_word_len > 20.0:
            word_penalty = 0.2
        elif avg_word_len < 3.0 or avg_word_len > 15.0:
            word_penalty = 0.1
    else:
        word_penalty = 0.3

    # Combined score
    score = (readable_ratio * 0.4 + alpha_ratio * 0.4 + 0.2) - garbage_penalty - word_penalty
    return max(0.0, min(1.0, score))


def _find_verzekeraar(text: str) -> str:
    """Try to find insurer name in text."""
    known = [
        "Centraal Beheer", "OHRA", "Nationale-Nederlanden", "Interpolis",
        "FBTO", "InShared", "Allianz", "ASR", "a.s.r.", "Aegon",
        "Ditzo", "ZLM", "Univé", "Avéro Achmea", "TVM",
    ]
    for name in known:
        if name.lower() in text.lower():
            return name
    return ""
