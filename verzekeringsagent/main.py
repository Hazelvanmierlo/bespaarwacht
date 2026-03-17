"""
CLI entry point for the Verzekeringsagent document processing system.

Usage:
    python main.py verwerk <bestand.pdf> --type polis_auto
    python main.py analyseer <document_id>
    python main.py vergelijk <doc_id_1> <doc_id_2>
    python main.py klant <klant_id>
    python main.py test
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.extractor import extract_text
from src.anonymizer import anonymize_document, verify_no_pii_leakage, extract_profile_from_text
from src.detail_extractor import extract_details
from src.review_gate import review_document, check_ocr_quality
from src.database import (
    init_database, create_klant, get_klant, save_document,
    get_document, get_klant_documenten, save_pii_mapping,
    delete_klant, delete_document, cleanup_old_data, get_admin_overview,
)
from src.audit import log_action
from src.advisor import get_advice, compare_documents
from src.supabase_sync import sync_to_supabase, create_analysis_in_supabase, get_pending_analyses, auto_fill_profile


def cmd_verwerk(file_path: str, doc_type: str = ""):
    """Process a document: extract, anonymize, store."""
    print(f"\n  Bestand: {file_path}")
    print(f"  Type: {doc_type or '(niet opgegeven)'}")

    # Step 1: Extract text
    print("\n  [1/4] Tekst extraheren...")
    text = extract_text(file_path)
    print(f"         {len(text)} tekens geëxtraheerd")

    # Step 2: Anonymize
    print("  [2/4] PII detecteren en anonimiseren...")
    result = anonymize_document(text)
    print(f"         {result['pii_count']} PII-entiteiten gevonden en vervangen")

    if result["personal_data"]:
        print("         Persoonsgegevens geëxtraheerd:")
        for field, value in result["personal_data"].items():
            # Show masked version
            masked = value[:3] + "***" if len(value) > 3 else "***"
            print(f"           {field}: {masked}")

    # Step 3: Verify no leakage
    known_values = [m["value"] for m in result["pii_mapping"]]
    is_clean, leaked = verify_no_pii_leakage(result["anonymized_text"], known_values)
    if not is_clean:
        print(f"\n  WAARSCHUWING: PII-lekkage gedetecteerd! Gelekte waarden: {leaked}")
        print("  Verwerking afgebroken.")
        return

    # Step 4: OCR quality check
    ocr_quality = check_ocr_quality(text)
    if ocr_quality < 0.90:
        print(f"  [~] OCR-kwaliteit: {ocr_quality:.0%}")

    # Step 5: Extract details (premies, dekkingen, verbruik)
    print("  [3/6] Details extraheren (premies, dekking, verbruik)...")
    details = extract_details(result["anonymized_text"], doc_type)

    # Show extracted details
    if details.get("type") == "verzekering":
        premie = details.get("premie", {})
        if premie:
            pm = premie.get("per_maand", "?")
            pj = premie.get("per_jaar", "?")
            print(f"         Premie: €{pm}/mnd (€{pj}/jaar) — {premie.get('frequentie', '?')}")
        dekking = details.get("dekking", {})
        if dekking.get("type"):
            print(f"         Dekking: {dekking['type']}")
        er = details.get("eigen_risico")
        if er:
            print(f"         Eigen risico: €{er['bedrag']} {er.get('context', '')}")
        looptijd = details.get("looptijd", {})
        if looptijd.get("opzegtermijn"):
            print(f"         Opzegtermijn: {looptijd['opzegtermijn']}")
    elif details.get("type") == "energie":
        kosten = details.get("kosten", {})
        if kosten.get("elektriciteit"):
            print(f"         Elektriciteit: €{kosten['elektriciteit']}")
        if kosten.get("gas"):
            print(f"         Gas: €{kosten['gas']}")
        if kosten.get("totaal_jaar"):
            print(f"         Totaal/jaar: €{kosten['totaal_jaar']} (€{kosten['totaal_jaar']/12:.2f}/mnd)")
        verbruik = details.get("verbruik", {})
        if verbruik.get("stroom_kwh"):
            print(f"         Verbruik stroom: {verbruik['stroom_kwh']} kWh")
        if verbruik.get("gas_m3"):
            print(f"         Verbruik gas: {verbruik['gas_m3']} m³")
        periode = details.get("periode", {})
        if periode.get("dagen"):
            print(f"         Periode: {periode['dagen']} dagen (~{periode.get('maanden', '?')} maanden)")
        termijn = details.get("termijnbedrag", {})
        if termijn.get("laatste"):
            print(f"         Termijnbedrag: €{termijn['laatste']}/mnd (gemiddeld €{termijn.get('gemiddeld', '?')}/mnd)")

    # Step 6: Review gate
    print("  [4/6] Review gate...")
    review = review_document(
        anonymized_text=result["anonymized_text"],
        details=details,
        pii_detections=result["pii_mapping"],
        ocr_quality=ocr_quality,
    )

    if review["verdict"] == "manual":
        print(f"         [!] HANDMATIGE INVOER NODIG")
        for flag in review["flags"]:
            print(f"         - {flag['message']}")
        if review["missing_fields"]:
            print(f"         Ontbrekende velden:")
            for field in review["missing_fields"]:
                print(f"           • {field['label']}: {field.get('help', '')}")
    else:
        print(f"         [OK] Automatisch verwerkt")
        if review["flags"]:
            for flag in review["flags"]:
                print(f"         [i] {flag['message']}")

    # Step 7: Store
    print("  [5/6] Encrypted opslaan...")
    klant_id = create_klant(result["personal_data"])
    doc_id = save_document(
        klant_id=klant_id,
        anonymized_text=result["anonymized_text"],
        document_type=doc_type or details.get("document_type", ""),
        bedragen=details,
        origineel_bestand=os.path.basename(file_path),
    )
    save_pii_mapping(klant_id, doc_id, result["pii_mapping"])

    # Audit
    log_action(
        actie="document_verwerkt",
        klant_id=klant_id,
        document_id=doc_id,
        pii_gevonden=result["pii_count"],
        details={
            "bestand": os.path.basename(file_path),
            "type": doc_type,
            "tekst_lengte": len(text),
            "pii_types": list(set(m["entity_type"] for m in result["pii_mapping"])),
            "geextraheerde_details": {
                k: v for k, v in details.items()
                if v and k not in ("type", "document_type")
            },
            "review_verdict": review["verdict"],
            "review_flags": [f["type"] for f in review["flags"]],
            "admin_status": review["admin_status"],
            "ocr_kwaliteit": round(ocr_quality, 2) if ocr_quality else None,
        },
    )

    # Step 8: Sync to Supabase (if available)
    print("  [6/7] Supabase sync...")
    try:
        # Extract key fields for Supabase
        verzekeraar = ""
        premie = 0.0
        dekking_str = ""

        if details.get("type") == "verzekering":
            verzekeraar = details.get("product", "Onbekend")
            premie_data = details.get("premie", {})
            premie = premie_data.get("per_maand", 0)
            dekking_data = details.get("dekking", {})
            dekking_str = dekking_data.get("type", "")
        elif details.get("type") == "energie":
            verzekeraar = "Energieleverancier"
            kosten = details.get("kosten", {})
            premie = kosten.get("per_maand", 0)
            dekking_str = "Energie"

        # Find or use a default user (for CLI processing)
        from src.supabase_sync import get_users
        users = get_users()
        if users:
            user_id = users[0]["id"]  # Use first user for CLI processing
            supa_id = create_analysis_in_supabase(
                user_id=user_id,
                verzekeraar=verzekeraar,
                product_type=doc_type or details.get("document_type", "onbekend"),
                dekking=dekking_str,
                premie_huidig=premie,
                anonymized_text=result["anonymized_text"],
                pii_count=result["pii_count"],
                review_status=review["admin_status"],
                details=details,
                document_naam=os.path.basename(file_path),
            )
            if supa_id:
                print(f"         [OK] Gesynchroniseerd (Supabase ID: {supa_id[:8]}...)")
                # Auto-fill profile with extracted PII + text-based extraction
                if result["personal_data"]:
                    try:
                        profile_data = dict(result["personal_data"])
                        # Also extract woningtype, gezin from raw text
                        text_extras = extract_profile_from_text(text)
                        for k, v in text_extras.items():
                            if k not in profile_data:
                                profile_data[k] = str(v)
                        filled = auto_fill_profile(user_id, profile_data)
                        if filled:
                            extras = [k for k in text_extras if k in ("woningtype", "gezinssamenstelling")]
                            extra_str = f" (incl. {', '.join(extras)})" if extras else ""
                            print(f"         [OK] Profiel automatisch aangevuld{extra_str}")
                    except Exception as e:
                        print(f"         [i] Profiel auto-fill overgeslagen: {e}")
            else:
                print(f"         [!] Sync gefaald")
        else:
            print(f"         [!] Geen gebruikers in Supabase — maak eerst een account aan")
    except Exception as e:
        print(f"         [!] Supabase sync overgeslagen: {e}")

    print("  [7/7] Klaar!")
    print(f"\n  Klant ID (lokaal):  {klant_id}")
    print(f"  Document ID (lokaal): {doc_id}")
    print(f"  PII tokens:  {result['pii_count']}")
    print(f"\n  Gebruik: python main.py analyseer {doc_id}")


def cmd_analyseer(document_id: str):
    """Get Claude advice on an anonymized document."""
    doc = get_document(document_id)
    if not doc:
        print(f"  Document niet gevonden: {document_id}")
        return

    print(f"\n  Document: {doc['origineel_bestand'] or document_id}")
    print(f"  Type: {doc['document_type'] or '(onbekend)'}")
    print(f"  Geanonimiseerde tekst: {len(doc['geanonimiseerde_tekst'])} tekens")
    print("\n  Claude API advies ophalen...\n")

    log_action(actie="advies_gevraagd", klant_id=doc["klant_id"], document_id=document_id)

    advice = get_advice(doc["geanonimiseerde_tekst"], doc["document_type"])
    print(f"  {'='*60}")
    print(f"  ADVIES")
    print(f"  {'='*60}")
    print(f"  {advice}")

    log_action(actie="advies_gegeven", klant_id=doc["klant_id"], document_id=document_id)


def cmd_vergelijk(doc_id_1: str, doc_id_2: str):
    """Compare two documents via Claude."""
    doc1 = get_document(doc_id_1)
    doc2 = get_document(doc_id_2)

    if not doc1:
        print(f"  Document 1 niet gevonden: {doc_id_1}")
        return
    if not doc2:
        print(f"  Document 2 niet gevonden: {doc_id_2}")
        return

    print(f"\n  Document 1: {doc1['origineel_bestand'] or doc_id_1} ({doc1['document_type']})")
    print(f"  Document 2: {doc2['origineel_bestand'] or doc_id_2} ({doc2['document_type']})")
    print("\n  Claude API vergelijking ophalen...\n")

    result = compare_documents(
        doc1["geanonimiseerde_tekst"], doc1["document_type"] or "onbekend",
        doc2["geanonimiseerde_tekst"], doc2["document_type"] or "onbekend",
    )

    print(f"  {'='*60}")
    print(f"  VERGELIJKING")
    print(f"  {'='*60}")
    print(f"  {result}")


def cmd_klant(klant_id: str):
    """Show all documents for a klant."""
    klant = get_klant(klant_id)
    if not klant:
        print(f"  Klant niet gevonden: {klant_id}")
        return

    print(f"\n  Klant: {klant['naam'] or '(onbekend)'}")
    print(f"  Adres: {klant['adres'] or '-'}")
    print(f"  Postcode: {klant['postcode'] or '-'} {klant['woonplaats'] or ''}")
    print(f"  Email: {klant['email'] or '-'}")
    print(f"  Aangemaakt: {klant['aangemaakt_op']}")

    docs = get_klant_documenten(klant_id)
    if docs:
        print(f"\n  Documenten ({len(docs)}):")
        for doc in docs:
            print(f"    - {doc['id'][:8]}... | {doc['document_type'] or 'onbekend'} | {doc['origineel_bestand'] or '-'} | {doc['aangemaakt_op'][:10]}")
    else:
        print("\n  Geen documenten gevonden.")


def cmd_verwijder_klant(klant_id: str):
    """AVG Art. 17: Delete all data for a klant."""
    klant = get_klant(klant_id)
    if not klant:
        print(f"  Klant niet gevonden: {klant_id}")
        return

    print(f"\n  Klant: {klant['naam'] or '(onbekend)'}")
    print(f"  Dit verwijdert ALLE gegevens van deze klant (AVG Art. 17).")
    confirm = input("  Weet je het zeker? (ja/nee): ").strip().lower()

    if confirm != "ja":
        print("  Afgebroken.")
        return

    result = delete_klant(klant_id)
    print(f"\n  Verwijderd:")
    print(f"    Documenten: {result['documenten_verwijderd']}")
    print(f"    PII mappings: {result['pii_mappings_verwijderd']}")
    print(f"    Audit log: {result['audit_log']}")
    print(f"\n  Klant volledig verwijderd.")


def cmd_admin():
    """Show admin overview."""
    overview = get_admin_overview()

    print(f"\n  {'='*60}")
    print(f"  ADMIN OVERZICHT")
    print(f"  {'='*60}")
    print(f"\n  Totalen:")
    print(f"    Klanten:    {overview['klanten']}")
    print(f"    Documenten: {overview['documenten']}")
    print(f"    PII tokens: {overview['pii_mappings']}")

    if overview.get("per_type"):
        print(f"\n  Per type:")
        for doc_type, count in overview["per_type"].items():
            print(f"    {doc_type:30s} {count}")

    if overview.get("recent"):
        print(f"\n  Laatste verwerkingen:")
        for doc in overview["recent"]:
            # Parse admin_status from bedragen_json if available
            import json
            status = "[OK]"
            bedragen = doc.get("bedragen_json")
            if bedragen:
                try:
                    details = json.loads(bedragen)
                    # Check if it was a manual review
                except (json.JSONDecodeError, TypeError):
                    pass

            print(f"    {status} {doc['id'][:8]}... | {doc['document_type'] or 'onbekend':25s} | {doc['origineel_bestand'] or '-':30s} | {doc['aangemaakt_op'][:10]}")


def cmd_cleanup(days: int = 365):
    """Run data retention cleanup."""
    print(f"\n  Data ouder dan {days} dagen opruimen...")
    result = cleanup_old_data(days)
    print(f"  Klanten verwijderd: {result['klanten_verwijderd']}")
    print(f"  Documenten verwijderd: {result['documenten_verwijderd']}")
    print(f"  PII mappings verwijderd: {result['pii_mappings_verwijderd']}")


def cmd_sync():
    """Find uploads in Supabase without anonymized text and process them."""
    print("\n  Zoeken naar onverwerkte documenten in Supabase...")

    try:
        pending = get_pending_analyses()
    except Exception as e:
        print(f"  Supabase connectie gefaald: {e}")
        return

    if not pending:
        print("  Geen onverwerkte documenten gevonden.")
        return

    print(f"  {len(pending)} document(en) gevonden om te verwerken:")
    for doc in pending:
        print(f"    - {doc['id'][:8]}... | {doc.get('verzekeraar_huidig', '?')} | {doc.get('document_naam', '?')}")

    print("\n  Let op: dit verwerkt documenten die via de website zijn geupload.")
    print("  De PDF moet gedownload worden van Supabase Storage om te verwerken.")
    print("  Dit is nog niet geautomatiseerd — gebruik 'python main.py verwerk <pdf>' per bestand.")


def cmd_test():
    """Run leakage tests."""
    print("\n  Lekkage-tests uitvoeren...\n")

    # Import and run tests
    from tests.test_anonymizer import run_tests
    run_tests()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    # Ensure database exists
    init_database()

    command = sys.argv[1]

    if command == "verwerk":
        if len(sys.argv) < 3:
            print("  Gebruik: python main.py verwerk <bestand.pdf> [--type polis_auto]")
            return
        file_path = sys.argv[2]
        doc_type = ""
        if "--type" in sys.argv:
            idx = sys.argv.index("--type")
            if idx + 1 < len(sys.argv):
                doc_type = sys.argv[idx + 1]
        cmd_verwerk(file_path, doc_type)

    elif command == "analyseer":
        if len(sys.argv) < 3:
            print("  Gebruik: python main.py analyseer <document_id>")
            return
        cmd_analyseer(sys.argv[2])

    elif command == "vergelijk":
        if len(sys.argv) < 4:
            print("  Gebruik: python main.py vergelijk <doc_id_1> <doc_id_2>")
            return
        cmd_vergelijk(sys.argv[2], sys.argv[3])

    elif command == "klant":
        if len(sys.argv) < 3:
            print("  Gebruik: python main.py klant <klant_id>")
            return
        cmd_klant(sys.argv[2])

    elif command == "verwijder":
        if len(sys.argv) < 3:
            print("  Gebruik: python main.py verwijder <klant_id>")
            return
        cmd_verwijder_klant(sys.argv[2])

    elif command == "admin":
        cmd_admin()

    elif command == "cleanup":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 365
        cmd_cleanup(days)

    elif command == "sync":
        cmd_sync()

    elif command == "test":
        cmd_test()

    else:
        print(f"  Onbekend commando: {command}")
        print(__doc__)


if __name__ == "__main__":
    main()
