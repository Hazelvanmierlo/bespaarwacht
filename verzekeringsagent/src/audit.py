"""
Module 5: Audit logging.
Logs every document processing action for AVG compliance.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional

from .database import _get_connection


def log_action(
    actie: str,
    klant_id: Optional[str] = None,
    document_id: Optional[str] = None,
    pii_gevonden: int = 0,
    details: Optional[dict] = None,
):
    """Log an action to the audit trail."""
    conn = _get_connection()
    conn.execute(
        """INSERT INTO audit_log (id, klant_id, document_id, actie, pii_gevonden, verwerkt_op, details_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            str(uuid.uuid4()),
            klant_id,
            document_id,
            actie,
            pii_gevonden,
            datetime.now(timezone.utc).isoformat(),
            json.dumps(details, ensure_ascii=False) if details else None,
        ),
    )
    conn.commit()
    conn.close()


def get_audit_log(klant_id: Optional[str] = None, limit: int = 50) -> list:
    """Retrieve audit log entries."""
    conn = _get_connection()
    if klant_id:
        rows = conn.execute(
            "SELECT * FROM audit_log WHERE klant_id = ? ORDER BY verwerkt_op DESC LIMIT ?",
            (klant_id, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM audit_log ORDER BY verwerkt_op DESC LIMIT ?",
            (limit,),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
