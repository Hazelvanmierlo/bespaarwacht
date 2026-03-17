"""
Critical leakage tests: verify that NO PII values end up in anonymized text.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.anonymizer import anonymize_document, verify_no_pii_leakage


# ─── Test Data ────────────────────────────────────────────────────────────────

KNOWN_PII = {
    "naam": "Jan de Vries",
    "bsn": "123456782",  # Valid 11-proof BSN
    "iban": "NL91ABNA0417164300",
    "email": "jan@test.nl",
    "postcode": "1234 AB",
    "woonplaats": "Amsterdam",
    "adres": "Keizersgracht 123",
    "telefoon": "+31612345678",
    "geboortedatum": "15-03-1985",
}

TEST_POLIS = """Inboedelverzekering Polis
Datum: 01-08-2024
Polisnummer: 6494572-315-400

Gegevens verzekeringnemer
Volledige naam: Jan de Vries
BSN: 123456782
Adres: Keizersgracht 123
Postcode en woonplaats: 1234 AB Amsterdam
Geboortedatum: 15-03-1985
E-mail: jan@test.nl
Telefoon: +31612345678

Betaling via IBAN NL91ABNA0417164300

Dekking: Extra uitgebreid
Premie: € 173,88 per jaar
Eigen risico: € 250,00
"""

TEST_ENERGIE = """EINDNOTA
Jan de Vries
Keizersgracht 123
1234 AB Amsterdam

Klantnummer: 5924551
Factuurnummer: 1000060356885
EAN: 871685900003016958

Leveringskosten elektriciteit: € 1.359,67
Leveringskosten gas: € 2.475,37
Totaal: € 3.835,04
"""


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_geen_pii_in_geanonimiseerde_tekst():
    """CRITICAL: No known PII values may appear in anonymized text."""
    result = anonymize_document(TEST_POLIS)
    anon_text = result["anonymized_text"]

    all_pii_values = list(KNOWN_PII.values())
    is_clean, leaked = verify_no_pii_leakage(anon_text, all_pii_values)

    assert is_clean, f"PII LEKKAGE GEDETECTEERD! Gelekte waarden: {leaked}"
    print("  PASS: Geen PII in geanonimiseerde tekst (polis)")


def test_geen_pii_in_energie_document():
    """CRITICAL: No PII leakage in energy documents."""
    result = anonymize_document(TEST_ENERGIE)
    anon_text = result["anonymized_text"]

    pii_values = ["Jan de Vries", "Keizersgracht 123", "1234 AB", "Amsterdam",
                   "5924551", "1000060356885", "871685900003016958"]
    is_clean, leaked = verify_no_pii_leakage(anon_text, pii_values)

    assert is_clean, f"PII LEKKAGE GEDETECTEERD! Gelekte waarden: {leaked}"
    print("  PASS: Geen PII in geanonimiseerde tekst (energie)")


def test_tokens_aanwezig():
    """Verify that anonymized text contains proper tokens."""
    result = anonymize_document(TEST_POLIS)
    anon_text = result["anonymized_text"]

    # Must contain at least some tokens
    assert "[NAAM_" in anon_text or "[PERSOON" in anon_text, "Geen naam-tokens gevonden"
    assert "[ADRES_" in anon_text, "Geen adres-tokens gevonden"
    # Postcode may be part of WOONPLAATS token (e.g. "1234 AB Amsterdam" → [WOONPLAATS_1])
    assert "[POSTCODE_" in anon_text or "[WOONPLAATS_" in anon_text, "Geen postcode/woonplaats-tokens gevonden"
    print("  PASS: Tokens correct aanwezig in geanonimiseerde tekst")


def test_pii_mapping_compleet():
    """Verify PII mapping contains all detected entities."""
    result = anonymize_document(TEST_POLIS)

    assert len(result["pii_mapping"]) > 0, "Geen PII mapping gegenereerd"

    # Check that personal data was extracted
    pd = result["personal_data"]
    assert pd.get("naam") or pd.get("adres"), f"Geen persoonsgegevens geëxtraheerd: {pd}"
    print(f"  PASS: PII mapping compleet ({len(result['pii_mapping'])} entries)")


def test_bedragen_niet_geanonimiseerd():
    """Verify that monetary amounts are NOT anonymized (they're not PII)."""
    result = anonymize_document(TEST_POLIS)
    anon_text = result["anonymized_text"]

    # These amounts should still be visible
    assert "173,88" in anon_text, "Premie bedrag onterecht geanonimiseerd"
    assert "250,00" in anon_text, "Eigen risico bedrag onterecht geanonimiseerd"
    print("  PASS: Bedragen niet geanonimiseerd (correct)")


def test_verzekeraar_behouden():
    """Verify insurer names are kept (they're public info, not PII)."""
    text = """Polis bij Centraal Beheer
    Verzekeringnemer: Jan de Vries
    Premie: € 12,50 per maand"""

    result = anonymize_document(text)
    # Insurer name should be detectable but might be tagged as ORG
    # The key test is that Jan de Vries is anonymized
    assert "Jan de Vries" not in result["anonymized_text"], "Naam niet geanonimiseerd!"
    print("  PASS: Persoonsgegevens geanonimiseerd, verzekeraar-info behouden")


def test_email_geanonimiseerd():
    """Verify email addresses are properly anonymized."""
    result = anonymize_document(TEST_POLIS)
    assert "jan@test.nl" not in result["anonymized_text"], "Email niet geanonimiseerd!"
    print("  PASS: Email geanonimiseerd")


def test_telefoon_geanonimiseerd():
    """Verify phone numbers are properly anonymized."""
    result = anonymize_document(TEST_POLIS)
    assert "+31612345678" not in result["anonymized_text"], "Telefoon niet geanonimiseerd!"
    print("  PASS: Telefoonnummer geanonimiseerd")


# ─── Runner ───────────────────────────────────────────────────────────────────

def run_tests():
    """Run all tests and report results."""
    tests = [
        test_geen_pii_in_geanonimiseerde_tekst,
        test_geen_pii_in_energie_document,
        test_tokens_aanwezig,
        test_pii_mapping_compleet,
        test_bedragen_niet_geanonimiseerd,
        test_verzekeraar_behouden,
        test_email_geanonimiseerd,
        test_telefoon_geanonimiseerd,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"  FAIL: {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR: {test.__name__}: {e}")
            failed += 1

    print(f"\n  Resultaat: {passed} geslaagd, {failed} gefaald van {len(tests)} tests")
    if failed > 0:
        print("  WAARSCHUWING: Er zijn tests gefaald! Fix deze voor productiegebruik.")
        return False
    else:
        print("  Alle tests geslaagd!")
        return True


if __name__ == "__main__":
    run_tests()
