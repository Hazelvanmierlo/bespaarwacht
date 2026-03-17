"""
Module 6: Claude API integration for insurance/energy advice.
Only receives anonymized text — never personal data.
"""

import os
from typing import Optional

from dotenv import load_dotenv

SYSTEM_PROMPT = """
Je bent een onafhankelijk verzekeringsadviseur bij deverzekeringsagent.nl.
Je analyseert geanonimiseerde polissen en contracten en geeft eerlijk,
oprecht advies. Namen en nummers zijn vervangen door tokens ([NAAM_1] etc.)
— dat is correct en AVG-compliant.

Bij elke analyse:
1. Extraheer: type dekking, premie/bedrag, looptijd, eigen risico, uitsluitingen
2. Identificeer: wat ontbreekt of is ondermaats
3. Geef: concreet advies wat beter kan en waarom
4. Vergelijk: als meerdere documenten meegegeven, welke is objectief beter en waarom

Wees direct en eerlijk. Geen verkooppraatjes.
"""


def get_advice(anonymized_text: str, document_type: str = "") -> str:
    """Get insurance/energy advice from Claude based on anonymized document."""
    load_dotenv()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY niet gevonden in .env")

    try:
        import anthropic
    except ImportError:
        raise ImportError("anthropic package vereist: pip install anthropic")

    client = anthropic.Anthropic(api_key=api_key)

    type_context = f"\nDocumenttype: {document_type}" if document_type else ""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Analyseer dit geanonimiseerde document en geef advies:{type_context}\n\n---\n{anonymized_text}\n---",
            }
        ],
    )

    return message.content[0].text


def compare_documents(
    doc1_text: str, doc1_type: str,
    doc2_text: str, doc2_type: str,
) -> str:
    """Compare two anonymized documents via Claude."""
    load_dotenv()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY niet gevonden in .env")

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Vergelijk deze twee geanonimiseerde documenten en geef advies welke beter is:\n\n"
                    f"=== DOCUMENT 1 ({doc1_type}) ===\n{doc1_text}\n\n"
                    f"=== DOCUMENT 2 ({doc2_type}) ===\n{doc2_text}\n\n"
                    f"Geef een eerlijke vergelijking op: prijs, dekking, voorwaarden, en een aanbeveling."
                ),
            }
        ],
    )

    return message.content[0].text
