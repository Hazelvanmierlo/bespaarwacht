"""
Module 4: Encrypted SQLite database.
All personal data is AES-256 encrypted via Fernet before storage.
"""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet
from dotenv import load_dotenv


def _get_fernet() -> Fernet:
    """Get Fernet encryption instance from environment."""
    load_dotenv()
    key = os.getenv("FERNET_KEY")
    if not key:
        raise RuntimeError(
            "FERNET_KEY niet gevonden in .env. Genereer met:\n"
            '  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        )
    return Fernet(key.encode())


def _encrypt(value: Optional[str]) -> Optional[str]:
    """Encrypt a string value. Returns None if input is None."""
    if value is None:
        return None
    return _get_fernet().encrypt(value.encode()).decode()


def _decrypt(value: Optional[str]) -> Optional[str]:
    """Decrypt a string value. Returns None if input is None."""
    if value is None:
        return None
    return _get_fernet().decrypt(value.encode()).decode()


def _get_db_path() -> str:
    """Get database path from environment or default."""
    load_dotenv()
    db_path = os.getenv("DATABASE_PATH", "./data/verzekeringsagent.db")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    return db_path


def _get_connection() -> sqlite3.Connection:
    """Get SQLite connection with WAL mode for better concurrency."""
    conn = sqlite3.connect(_get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_database():
    """Initialize database schema."""
    conn = _get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS klanten (
            id TEXT PRIMARY KEY,
            naam_encrypted TEXT,
            bsn_encrypted TEXT,
            adres_encrypted TEXT,
            postcode_encrypted TEXT,
            woonplaats_encrypted TEXT,
            geboortedatum_encrypted TEXT,
            iban_encrypted TEXT,
            email_encrypted TEXT,
            telefoon_encrypted TEXT,
            aangemaakt_op TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documenten (
            id TEXT PRIMARY KEY,
            klant_id TEXT NOT NULL,
            document_type TEXT,
            verzekeraar TEXT,
            geanonimiseerde_tekst TEXT NOT NULL,
            bedragen_json TEXT,
            origineel_bestand TEXT,
            aangemaakt_op TEXT NOT NULL,
            FOREIGN KEY (klant_id) REFERENCES klanten(id)
        );

        CREATE TABLE IF NOT EXISTS pii_mapping (
            id TEXT PRIMARY KEY,
            klant_id TEXT NOT NULL,
            document_id TEXT NOT NULL,
            token TEXT NOT NULL,
            originele_waarde_encrypted TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            FOREIGN KEY (klant_id) REFERENCES klanten(id),
            FOREIGN KEY (document_id) REFERENCES documenten(id)
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            klant_id TEXT,
            document_id TEXT,
            actie TEXT NOT NULL,
            pii_gevonden INTEGER DEFAULT 0,
            verwerkt_op TEXT NOT NULL,
            details_json TEXT
        );
    """)
    conn.commit()
    conn.close()


# ─── Klant Operations ─────────────────────────────────────────────────────────

def create_klant(personal_data: dict) -> str:
    """Create a new klant record with encrypted personal data. Returns klant_id."""
    klant_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = _get_connection()
    conn.execute(
        """INSERT INTO klanten (id, naam_encrypted, bsn_encrypted, adres_encrypted,
           postcode_encrypted, woonplaats_encrypted, geboortedatum_encrypted,
           iban_encrypted, email_encrypted, telefoon_encrypted, aangemaakt_op)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            klant_id,
            _encrypt(personal_data.get("naam")),
            _encrypt(personal_data.get("bsn")),
            _encrypt(personal_data.get("adres")),
            _encrypt(personal_data.get("postcode")),
            _encrypt(personal_data.get("woonplaats")),
            _encrypt(personal_data.get("geboortedatum")),
            _encrypt(personal_data.get("iban")),
            _encrypt(personal_data.get("email")),
            _encrypt(personal_data.get("telefoon")),
            now,
        ),
    )
    conn.commit()
    conn.close()
    return klant_id


def get_klant(klant_id: str) -> Optional[dict]:
    """Get decrypted klant data."""
    conn = _get_connection()
    row = conn.execute("SELECT * FROM klanten WHERE id = ?", (klant_id,)).fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row["id"],
        "naam": _decrypt(row["naam_encrypted"]),
        "bsn": _decrypt(row["bsn_encrypted"]),
        "adres": _decrypt(row["adres_encrypted"]),
        "postcode": _decrypt(row["postcode_encrypted"]),
        "woonplaats": _decrypt(row["woonplaats_encrypted"]),
        "geboortedatum": _decrypt(row["geboortedatum_encrypted"]),
        "iban": _decrypt(row["iban_encrypted"]),
        "email": _decrypt(row["email_encrypted"]),
        "telefoon": _decrypt(row["telefoon_encrypted"]),
        "aangemaakt_op": row["aangemaakt_op"],
    }


# ─── Document Operations ──────────────────────────────────────────────────────

def save_document(
    klant_id: str,
    anonymized_text: str,
    document_type: str = "",
    verzekeraar: str = "",
    bedragen: Optional[dict] = None,
    origineel_bestand: str = "",
) -> str:
    """Save anonymized document. Returns document_id."""
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = _get_connection()
    conn.execute(
        """INSERT INTO documenten (id, klant_id, document_type, verzekeraar,
           geanonimiseerde_tekst, bedragen_json, origineel_bestand, aangemaakt_op)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            doc_id,
            klant_id,
            document_type,
            verzekeraar,
            anonymized_text,
            json.dumps(bedragen, ensure_ascii=False) if bedragen else None,
            origineel_bestand,
            now,
        ),
    )
    conn.commit()
    conn.close()
    return doc_id


def get_document(document_id: str) -> Optional[dict]:
    """Get document by ID."""
    conn = _get_connection()
    row = conn.execute("SELECT * FROM documenten WHERE id = ?", (document_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def get_klant_documenten(klant_id: str) -> list:
    """Get all documents for a klant."""
    conn = _get_connection()
    rows = conn.execute(
        "SELECT * FROM documenten WHERE klant_id = ? ORDER BY aangemaakt_op DESC",
        (klant_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── PII Mapping Operations ──────────────────────────────────────────────────

def save_pii_mapping(klant_id: str, document_id: str, pii_mapping: list):
    """Save encrypted PII token mappings."""
    conn = _get_connection()
    for item in pii_mapping:
        conn.execute(
            """INSERT INTO pii_mapping (id, klant_id, document_id, token,
               originele_waarde_encrypted, entity_type)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                klant_id,
                document_id,
                item["token"],
                _encrypt(item["value"]),
                item["entity_type"],
            ),
        )
    conn.commit()
    conn.close()


def get_pii_mapping(document_id: str) -> list:
    """Get decrypted PII mapping for a document."""
    conn = _get_connection()
    rows = conn.execute(
        "SELECT * FROM pii_mapping WHERE document_id = ?", (document_id,)
    ).fetchall()
    conn.close()
    return [
        {
            "token": r["token"],
            "value": _decrypt(r["originele_waarde_encrypted"]),
            "entity_type": r["entity_type"],
        }
        for r in rows
    ]


# ─── AVG: Right to Deletion ──────────────────────────────────────────────────

def delete_klant(klant_id: str) -> dict:
    """
    AVG Art. 17: Right to erasure. Deletes ALL data for a klant:
    - Personal data (klanten table)
    - All documents
    - All PII mappings
    - Audit log entries are KEPT but klant_id is anonymized
    Returns summary of what was deleted.
    """
    conn = _get_connection()

    # Count what we're deleting
    doc_count = conn.execute(
        "SELECT COUNT(*) FROM documenten WHERE klant_id = ?", (klant_id,)
    ).fetchone()[0]
    pii_count = conn.execute(
        "SELECT COUNT(*) FROM pii_mapping WHERE klant_id = ?", (klant_id,)
    ).fetchone()[0]

    # Delete PII mappings
    conn.execute("DELETE FROM pii_mapping WHERE klant_id = ?", (klant_id,))

    # Delete documents
    conn.execute("DELETE FROM documenten WHERE klant_id = ?", (klant_id,))

    # Delete klant record
    conn.execute("DELETE FROM klanten WHERE id = ?", (klant_id,))

    # Anonymize audit log (keep for compliance, remove link to klant)
    conn.execute(
        "UPDATE audit_log SET klant_id = 'VERWIJDERD', details_json = NULL WHERE klant_id = ?",
        (klant_id,),
    )

    # Log the deletion itself
    from .audit import log_action
    log_action(
        actie="klant_verwijderd_avg17",
        klant_id="VERWIJDERD",
        pii_gevonden=0,
        details={"oorspronkelijk_klant_id": klant_id[:8] + "..."},
    )

    conn.commit()
    conn.close()

    return {
        "klant_id": klant_id,
        "documenten_verwijderd": doc_count,
        "pii_mappings_verwijderd": pii_count,
        "audit_log": "geanonimiseerd (bewaard voor compliance)",
    }


def delete_document(document_id: str) -> bool:
    """Delete a single document and its PII mappings."""
    conn = _get_connection()
    conn.execute("DELETE FROM pii_mapping WHERE document_id = ?", (document_id,))
    result = conn.execute("DELETE FROM documenten WHERE id = ?", (document_id,))
    conn.commit()
    deleted = result.rowcount > 0
    conn.close()
    return deleted


# ─── AVG: Data Retention ─────────────────────────────────────────────────────

def cleanup_old_data(retention_days: int = 365) -> dict:
    """
    Delete data older than retention_days.
    Default: 1 year. Run this periodically (e.g. weekly cron).
    """
    conn = _get_connection()
    cutoff = f"datetime('now', '-{retention_days} days')"

    # Find old klanten
    old_klanten = conn.execute(
        f"SELECT id FROM klanten WHERE aangemaakt_op < {cutoff}"
    ).fetchall()

    deleted_klanten = 0
    deleted_docs = 0
    deleted_pii = 0

    for row in old_klanten:
        klant_id = row["id"]
        deleted_pii += conn.execute(
            "SELECT COUNT(*) FROM pii_mapping WHERE klant_id = ?", (klant_id,)
        ).fetchone()[0]
        deleted_docs += conn.execute(
            "SELECT COUNT(*) FROM documenten WHERE klant_id = ?", (klant_id,)
        ).fetchone()[0]

        conn.execute("DELETE FROM pii_mapping WHERE klant_id = ?", (klant_id,))
        conn.execute("DELETE FROM documenten WHERE klant_id = ?", (klant_id,))
        conn.execute("DELETE FROM klanten WHERE id = ?", (klant_id,))
        conn.execute(
            "UPDATE audit_log SET klant_id = 'VERLOPEN', details_json = NULL WHERE klant_id = ?",
            (klant_id,),
        )
        deleted_klanten += 1

    conn.commit()
    conn.close()

    return {
        "retention_dagen": retention_days,
        "klanten_verwijderd": deleted_klanten,
        "documenten_verwijderd": deleted_docs,
        "pii_mappings_verwijderd": deleted_pii,
    }


# ─── Admin Overview ──────────────────────────────────────────────────────────

def get_admin_overview() -> dict:
    """Get overview statistics for admin dashboard."""
    conn = _get_connection()

    totals = {
        "klanten": conn.execute("SELECT COUNT(*) FROM klanten").fetchone()[0],
        "documenten": conn.execute("SELECT COUNT(*) FROM documenten").fetchone()[0],
        "pii_mappings": conn.execute("SELECT COUNT(*) FROM pii_mapping").fetchone()[0],
    }

    # Documents by type
    types = conn.execute(
        "SELECT document_type, COUNT(*) as cnt FROM documenten GROUP BY document_type ORDER BY cnt DESC"
    ).fetchall()
    totals["per_type"] = {r["document_type"] or "onbekend": r["cnt"] for r in types}

    # Recent documents
    recent = conn.execute(
        "SELECT d.id, d.document_type, d.origineel_bestand, d.aangemaakt_op, d.bedragen_json, k.id as klant_id "
        "FROM documenten d JOIN klanten k ON d.klant_id = k.id "
        "ORDER BY d.aangemaakt_op DESC LIMIT 20"
    ).fetchall()
    totals["recent"] = [dict(r) for r in recent]

    conn.close()
    return totals
