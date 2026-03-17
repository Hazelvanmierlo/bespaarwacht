"""
Module 9: Sync anonymized documents to Supabase.
Bridges the local Python processing system with the Next.js frontend.

After processing a document locally (PII detection, anonymization, detail extraction),
this module pushes the anonymized text + extracted details to Supabase so the
Next.js account dashboard can display them.
"""

import json
import os
from typing import Optional

from dotenv import load_dotenv


def _get_supabase():
    """Get Supabase client."""
    load_dotenv()
    # Also load parent .env.local for Supabase keys
    parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", ".env.local")
    if os.path.exists(parent_env):
        load_dotenv(parent_env)

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise RuntimeError(
            "Supabase credentials niet gevonden. Zorg dat NEXT_PUBLIC_SUPABASE_URL en "
            "SUPABASE_SERVICE_ROLE_KEY in .env of ../.env.local staan."
        )

    from supabase import create_client
    return create_client(url, key)


def sync_to_supabase(
    analysis_id: str,
    anonymized_text: str,
    pii_count: int = 0,
    review_status: str = "ok",
    details: Optional[dict] = None,
) -> bool:
    """
    Update an existing saved_analysis with anonymized data.
    Call this after processing a document that was uploaded via the Next.js frontend.
    """
    supabase = _get_supabase()

    update_data = {
        "geanonimiseerde_tekst": anonymized_text,
        "pii_count": pii_count,
        "review_status": review_status,
    }
    if details:
        update_data["bedragen_json"] = json.dumps(details, ensure_ascii=False)

    result = supabase.table("saved_analyses").update(update_data).eq("id", analysis_id).execute()
    return len(result.data) > 0


def create_analysis_in_supabase(
    user_id: str,
    verzekeraar: str,
    product_type: str,
    dekking: str,
    premie_huidig: float,
    anonymized_text: str,
    pii_count: int = 0,
    review_status: str = "ok",
    details: Optional[dict] = None,
    document_naam: str = "",
) -> Optional[str]:
    """
    Create a new saved_analysis record with anonymized data.
    Use this when processing a document from the Python CLI (not uploaded via Next.js).
    Returns the analysis ID.
    """
    supabase = _get_supabase()

    insert_data = {
        "user_id": user_id,
        "verzekeraar_huidig": verzekeraar,
        "product_type": product_type,
        "dekking": dekking,
        "premie_huidig": premie_huidig,
        "geanonimiseerde_tekst": anonymized_text,
        "pii_count": pii_count,
        "review_status": review_status,
        "monitoring_active": True,
    }
    if details:
        insert_data["bedragen_json"] = json.dumps(details, ensure_ascii=False)

    # Try inserting, and retry without optional columns if schema cache is stale
    try:
        if document_naam:
            insert_data["document_naam"] = document_naam
        result = supabase.table("saved_analyses").insert(insert_data).execute()
    except Exception:
        insert_data.pop("document_naam", None)
        result = supabase.table("saved_analyses").insert(insert_data).execute()
    if result.data:
        return result.data[0].get("id")
    return None


def get_pending_analyses(user_id: Optional[str] = None) -> list:
    """
    Get analyses that have documents uploaded but no anonymized text yet.
    These need to be processed by the Python system.
    """
    supabase = _get_supabase()

    query = supabase.table("saved_analyses") \
        .select("id, user_id, verzekeraar_huidig, product_type, document_url, document_naam") \
        .is_("geanonimiseerde_tekst", "null") \
        .not_.is_("document_url", "null")

    if user_id:
        query = query.eq("user_id", user_id)

    result = query.execute()
    return result.data or []


def get_users() -> list:
    """Get all users (for batch processing)."""
    supabase = _get_supabase()
    result = supabase.table("users").select("id, name, email").execute()
    return result.data or []


def auto_fill_profile(user_id: str, personal_data: dict) -> bool:
    """
    Auto-fill user profile with PII extracted from documents.
    Only fills fields that are currently empty — never overwrites existing data.
    """
    supabase = _get_supabase()

    # Get current profile — use * to avoid schema cache issues with specific columns
    result = supabase.table("users").select("*").eq("id", user_id).execute()

    if not result.data:
        return False

    current = result.data[0]

    # Map PII fields to profile columns
    field_map = {
        "naam": "name",
        "postcode": "postcode",
        "woonplaats": "woonplaats",
        "geboortedatum": "geboortedatum",
        "telefoon": "telefoon",
        "iban": "iban",
        "adres": "adres",
        "woningtype": "woningtype",
        "gezinssamenstelling": "gezinssamenstelling",
        "email": None,  # don't auto-fill email (auth field)
    }

    updates = {}
    for pii_field, db_field in field_map.items():
        if not db_field:
            continue
        pii_value = personal_data.get(pii_field)
        if pii_value and not current.get(db_field):
            updates[db_field] = pii_value

    # Try to extract huisnummer from adres if not set
    if not current.get("huisnummer") and personal_data.get("adres"):
        import re
        m = re.search(r"\b(\d{1,5}\s?[a-zA-Z]?)\s*$", personal_data["adres"])
        if m:
            updates["huisnummer"] = m.group(1).strip()

    if not updates:
        return False

    updates["pii_bron"] = "document"

    # Try with all fields first, then retry with only new fields if schema cache is stale
    try:
        supabase.table("users").update(updates).eq("id", user_id).execute()
        return True
    except Exception:
        # Retry with only the basic fields that are guaranteed to exist
        safe_fields = {k: v for k, v in updates.items() if k in ("name", "pii_bron")}
        if safe_fields:
            try:
                supabase.table("users").update(safe_fields).eq("id", user_id).execute()
                return True
            except Exception:
                pass
        return False
