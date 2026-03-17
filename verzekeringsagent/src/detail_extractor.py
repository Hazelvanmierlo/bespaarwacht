"""
Module 7: Extract policy/contract details from anonymized text.
Pulls out: premiums, coverage, deductibles, periods, conditions, usage.
Works on both insurance policies and energy contracts.
"""

import json
import re
from typing import Optional


def extract_details(anonymized_text: str, document_type: str = "") -> dict:
    """
    Extract financial and contractual details from anonymized document text.
    Returns structured dict with all found details.
    """
    text = anonymized_text

    # Detect document category if not specified
    if not document_type:
        document_type = _detect_type(text)

    if document_type.startswith("energie") or document_type in ("energie", "gas", "stroom"):
        return _extract_energie(text, document_type)
    else:
        return _extract_verzekering(text, document_type)


# ─── Insurance Policy Extraction ─────────────────────────────────────────────

def _extract_verzekering(text: str, document_type: str) -> dict:
    """Extract details from insurance policy documents."""
    result = {
        "type": "verzekering",
        "document_type": document_type,
        "product": _detect_product(text),
        "premie": _extract_premie(text),
        "dekking": _extract_dekking(text),
        "eigen_risico": _extract_eigen_risico(text),
        "verzekerd_bedrag": _extract_verzekerd_bedrag(text),
        "looptijd": _extract_looptijd(text),
        "betaalperiode": _extract_betaalperiode(text),
        "voorwaarden": _extract_voorwaarden(text),
        "clausules": _extract_clausules(text),
        "dekkingsgebied": _extract_dekkingsgebied(text),
        "gezinssamenstelling": _extract_gezin(text),
    }

    # Calculate yearly premium if we have monthly
    premie = result["premie"]
    if premie.get("per_maand") and not premie.get("per_jaar"):
        premie["per_jaar"] = round(premie["per_maand"] * 12, 2)
        premie["per_jaar_berekend"] = True
    elif premie.get("per_jaar") and not premie.get("per_maand"):
        premie["per_maand"] = round(premie["per_jaar"] / 12, 2)
        premie["per_maand_berekend"] = True

    return result


def _extract_premie(text: str) -> dict:
    """Extract premium amounts and payment frequency."""
    premie = {}

    # "Premie per maand" or "€ X,XX /mnd" patterns
    maand_patterns = [
        r"[Pp]remie\s+per\s+maand[^€]*€?\s*(\d+[.,]\d{2})",
        r"[Pp]remie\s+per\s+maand\s*\(?incl[^)]*\)?\s*€?\s*(\d+[.,]\d{2})",
        r"(\d+[.,]\d{2})\s*/?\s*(?:mnd|maand|p\.m\.|per maand)",
        r"[Mm]aandpremie[:\s]*€?\s*(\d+[.,]\d{2})",
    ]
    for pat in maand_patterns:
        m = re.search(pat, text)
        if m:
            premie["per_maand"] = _parse_amount(m.group(1))
            premie["frequentie"] = "maandelijks"
            break

    # "Premie per jaar" or "€ X,XX /jr" or "jaarpremie"
    jaar_patterns = [
        r"[Pp]remie\s+per\s+jaar[^€]*€?\s*(\d+[.,]\d{2})",
        r"[Jj]aarpremie[:\s]*€?\s*(\d+[.,]\d{2})",
        r"(\d+[.,]\d{2})\s*/?\s*(?:jr|jaar|p\.j\.|per jaar)",
    ]
    for pat in jaar_patterns:
        m = re.search(pat, text)
        if m:
            premie["per_jaar"] = _parse_amount(m.group(1))
            if "frequentie" not in premie:
                premie["frequentie"] = "jaarlijks"
            break

    # Generic: just "Premie" followed by an amount
    if not premie:
        m = re.search(r"[Pp]remie[^€\d]{0,30}€?\s*(\d+[.,]\d{2})", text)
        if m:
            amount = _parse_amount(m.group(1))
            # Guess: < 50 is probably monthly, > 50 probably yearly
            if amount < 50:
                premie["per_maand"] = amount
                premie["frequentie"] = "maandelijks"
            else:
                premie["per_jaar"] = amount
                premie["frequentie"] = "jaarlijks"

    return premie


def _extract_dekking(text: str) -> dict:
    """Extract coverage type and details."""
    dekking = {}

    # Coverage type: Basis, Uitgebreid, Extra Uitgebreid, All Risk
    type_patterns = [
        (r"(?i)\b(all\s*risk)\b", "All Risk"),
        (r"(?i)\b(extra\s+uitgebreid)\b", "Extra Uitgebreid"),
        (r"(?i)\b(uitgebreid)\b", "Uitgebreid"),
        (r"(?i)\b(basis)\b", "Basis"),
        (r"(?i)\b(budget)\b", "Budget"),
    ]
    for pat, label in type_patterns:
        if re.search(pat, text):
            dekking["type"] = label
            break

    # Coverage items (from tables like "Brand & ontploffing: Gedekt")
    items = []
    for m in re.finditer(r"([A-Za-z\s&]+?)\s*(?:✓|Gedekt|gedekt|Ja|ja|Verzekerd|verzekerd)", text):
        item = m.group(1).strip()
        if len(item) > 3 and len(item) < 60:
            items.append(item)
    if items:
        dekking["gedekt"] = items

    # Excluded items
    excluded = []
    for m in re.finditer(r"([A-Za-z\s&]+?)\s*(?:✗|Niet gedekt|niet gedekt|Nee|nee|Uitgesloten)", text):
        item = m.group(1).strip()
        if len(item) > 3 and len(item) < 60:
            excluded.append(item)
    if excluded:
        dekking["niet_gedekt"] = excluded

    return dekking


def _extract_eigen_risico(text: str) -> Optional[dict]:
    """Extract deductible (eigen risico)."""
    patterns = [
        r"[Ee]igen\s+[Rr]isico[^€\d]{0,40}€?\s*(\d+[.,]?\d*)",
        r"€?\s*(\d+[.,]?\d*)\s*(?:per schadegeval|eigen risico)",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            amount = _parse_amount(m.group(1))
            context = ""
            # Check for conditional eigen risico
            if "storm" in text[max(0, m.start()-100):m.end()+100].lower():
                context = "storm/neerslag"
            return {"bedrag": amount, "context": context or "per schadegeval"}
    return None


def _extract_verzekerd_bedrag(text: str) -> Optional[dict]:
    """Extract insured amount."""
    patterns = [
        r"[Vv]erzekerd\s+bedrag[^€\d]{0,30}€?\s*([\d.,]+)",
        r"[Mm]aximaal\s+verzekerd[^€\d]{0,30}€?\s*([\d.,]+)",
        r"[Ww]aardegarantie",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            if "Waardegarantie" in (m.group(0) if m.lastindex is None else ""):
                return {"type": "Waardegarantie"}
            try:
                return {"bedrag": _parse_amount(m.group(1))}
            except (IndexError, ValueError):
                pass
    return None


def _extract_looptijd(text: str) -> dict:
    """Extract contract duration and renewal info."""
    looptijd = {}

    # Contract duration
    m = re.search(r"[Cc]ontractduur[:\s]*(\d+)\s*(jaar|maand)", text)
    if m:
        looptijd["duur"] = f"{m.group(1)} {m.group(2)}"

    # Cancellation terms
    if re.search(r"(?i)dagelijks\s+opzegbaar", text):
        looptijd["opzegtermijn"] = "dagelijks opzegbaar"
    elif re.search(r"(?i)maandelijks?\s+(?:opzegbaar|beëindigen)", text):
        looptijd["opzegtermijn"] = "maandelijks opzegbaar"
    else:
        m = re.search(r"[Oo]pzegtermijn[:\s]*(\d+)\s*(maand|dag)", text)
        if m:
            looptijd["opzegtermijn"] = f"{m.group(1)} {m.group(2)}en"

    # Auto-renewal
    if re.search(r"(?i)verlengen\s+we.*telkens\s+met\s+een\s+jaar", text):
        looptijd["verlenging"] = "automatisch per jaar"

    return looptijd


def _extract_betaalperiode(text: str) -> str:
    """Extract payment frequency."""
    if re.search(r"(?i)maandelijks", text):
        return "maandelijks"
    elif re.search(r"(?i)per\s+kwartaal|kwartaal", text):
        return "per kwartaal"
    elif re.search(r"(?i)jaarlijks|per\s+jaar", text):
        return "jaarlijks"
    return ""


def _extract_voorwaarden(text: str) -> list:
    """Extract policy condition references."""
    conditions = []
    for m in re.finditer(r"(?:^|\n)\s*-\s*([A-Z]{1,4}\s+\d{4}[-/]\d{2})\b", text):
        conditions.append(m.group(1))
    # Also match "INB2207" style
    for m in re.finditer(r"\b([A-Z]{2,5}\d{4})\b", text):
        ref = m.group(1)
        if ref not in conditions:
            conditions.append(ref)
    return conditions


def _extract_clausules(text: str) -> list:
    """Extract clause names."""
    clausules = []
    for m in re.finditer(r"(?:^|\n)\s*-\s*((?:Garantie|Opzet|Water|Brand|Storm|Glas)\w*clausule)", text):
        clausules.append(m.group(1))
    if not clausules and "Garantieclausule" in text:
        clausules.append("Garantieclausule")
    return clausules


def _extract_dekkingsgebied(text: str) -> str:
    """Extract coverage area."""
    if re.search(r"(?i)dekkingsgebied[:\s]*wereld", text):
        return "Wereld"
    elif re.search(r"(?i)dekkingsgebied[:\s]*europa", text):
        return "Europa"
    elif re.search(r"(?i)dekkingsgebied[:\s]*nederland", text):
        return "Nederland"
    return ""


def _extract_gezin(text: str) -> str:
    """Extract family composition."""
    if re.search(r"(?i)eenpersoons|alleenstaand", text):
        return "Eenpersoons"
    elif re.search(r"(?i)gezin|samenwonend", text):
        return "Gezin / samenwonend"
    return ""


# ─── Energy Contract Extraction ──────────────────────────────────────────────

def _extract_energie(text: str, document_type: str) -> dict:
    """Extract details from energy contract/invoice documents."""
    result = {
        "type": "energie",
        "document_type": document_type,
        "kosten": _extract_energie_kosten(text),
        "verbruik": _extract_verbruik(text),
        "tarieven": _extract_tarieven(text),
        "termijnbedrag": _extract_termijnbedrag(text),
        "contract": _extract_energie_contract(text),
        "periode": _extract_periode(text),
    }

    # Calculate monthly costs if we only have yearly
    kosten = result["kosten"]
    if kosten.get("totaal_jaar") and not kosten.get("per_maand"):
        kosten["per_maand"] = round(kosten["totaal_jaar"] / 12, 2)
        kosten["per_maand_berekend"] = True

    return result


def _extract_energie_kosten(text: str) -> dict:
    """Extract energy costs."""
    kosten = {}

    # Electricity costs
    m = re.search(r"(?:Leveringskosten\s+elektriciteit|Totaal\s+elektriciteit)[^€\d]*€?\s*([\d.,]+)", text)
    if m:
        kosten["elektriciteit"] = _parse_amount(m.group(1))

    # Gas costs
    m = re.search(r"(?:Leveringskosten\s+gas|Totaal\s+gas)[^€\d]*€?\s*([\d.,]+)", text)
    if m:
        kosten["gas"] = _parse_amount(m.group(1))

    # Total
    m = re.search(r"Totaal\s+(?:door u\s+)?(?:te\s+)?betalen[^€\d]*€?\s*(-?[\d.,]+)", text)
    if m:
        kosten["totaal_te_betalen"] = _parse_amount(m.group(1))

    # Monthly costs
    m = re.search(r"[Kk]osten\s+per\s+maand[^€\d]*€?\s*([\d.,]+)", text)
    if m:
        kosten["per_maand"] = _parse_amount(m.group(1))

    # Total year (sum of electricity + gas)
    if "elektriciteit" in kosten and "gas" in kosten:
        kosten["totaal_jaar"] = round(kosten["elektriciteit"] + kosten["gas"], 2)

    return kosten


def _extract_verbruik(text: str) -> dict:
    """Extract energy usage/consumption."""
    verbruik = {}

    # Split text into electricity and gas sections for targeted extraction
    elektra_section = ""
    gas_section = ""

    # Find electricity section
    e_start = re.search(r"(?i)verbruik\s+elektriciteit", text)
    g_start = re.search(r"(?i)verbruik\s+gas", text)

    if e_start and g_start:
        elektra_section = text[e_start.start():g_start.start()]
        gas_section = text[g_start.start():]
    elif e_start:
        elektra_section = text[e_start.start():]
    elif g_start:
        gas_section = text[g_start.start():]
    else:
        # No clear sections, use full text
        elektra_section = text
        gas_section = text

    # ── Electricity kWh ──
    # Look in electricity section first, then full text
    stroom_kwh = _find_consumption(elektra_section, "kwh")
    if not stroom_kwh:
        stroom_kwh = _find_consumption(text, "kwh")
    if stroom_kwh:
        verbruik["stroom_kwh"] = stroom_kwh

    # ── Gas m³ ──
    # Look in gas section specifically
    gas_m3 = _find_consumption(gas_section, "gas")
    if not gas_m3:
        gas_m3 = _find_consumption(text, "gas")
    if gas_m3:
        verbruik["gas_m3"] = gas_m3

    # Number of days
    m = re.search(r"Aantal\s+dagen\s+(\d+)", text)
    if m:
        verbruik["dagen"] = int(m.group(1))

    # Meter readings
    meterstanden = []
    for m in re.finditer(r"Meterstanden\s*\w*\s*([\d.]+)\s*\([KMNSC]\)\s*([\d.]+)\s*\([KMNSC]\)\s*([\d.,]+)", text):
        meterstanden.append({
            "start": _parse_int(m.group(1)),
            "eind": _parse_int(m.group(2)),
            "verbruik": _parse_int(m.group(3)),
        })
    if meterstanden:
        verbruik["meterstanden"] = meterstanden

    return verbruik


def _find_consumption(section: str, energy_type: str) -> Optional[int]:
    """Find consumption value in a section of text."""
    candidates = []

    if energy_type == "kwh":
        # "Totaal verbruik 5.157" or "5.157 kWh" or "5157 kWh"
        patterns = [
            r"Totaal\s+verbruik\s*\*?\s*([\d.,]+)",
            r"([\d.,]+)\s*kWh",
        ]
    else:  # gas
        # "Totaal verbruik * 1.666,75" or "1.670 m³" or "Gastarief 1.666,75 m³"
        patterns = [
            r"Totaal\s+verbruik\s*\*?\s*([\d.,]+)",
            r"([\d.,]+)\s*m[³3²]",
            r"[Gg]astarief\s+([\d.,]+)\s*m[³3]",
        ]

    for pat in patterns:
        for m in re.finditer(pat, section):
            raw = m.group(1)
            try:
                val = _parse_number(raw)
                # Reasonable range for annual consumption
                if energy_type == "kwh" and 100 < val < 100000:
                    candidates.append(val)
                elif energy_type == "gas" and 50 < val < 50000:
                    candidates.append(val)
            except (ValueError, IndexError):
                pass

    if not candidates:
        return None

    # For "Totaal verbruik" matches, prefer the first one found
    # For multiple candidates, take the most common or first reasonable value
    return int(round(candidates[0]))


def _extract_tarieven(text: str) -> dict:
    """Extract energy tariffs."""
    tarieven = {}

    # Electricity tariff per kWh
    m = re.search(r"[Ee]lektriciteit\s+enkel\s+tarief.*?€?\s*(\d+[.,]\d{3,5})", text)
    if m:
        tarieven["stroom_per_kwh"] = _parse_amount(m.group(1))

    # Gas tariff per m3
    m = re.search(r"[Gg]as\s+enkel\s+tarief.*?€?\s*(\d+[.,]\d{3,5})", text)
    if not m:
        m = re.search(r"[Gg]aslevering.*?€?\s*(\d+[.,]\d{3,5})", text)
    if m:
        tarieven["gas_per_m3"] = _parse_amount(m.group(1))

    # Energy tax
    m = re.search(r"[Ee]nergiebelasting.*?€?\s*(\d+[.,]\d{3,5})", text)
    if m:
        tarieven["energiebelasting_per_kwh"] = _parse_amount(m.group(1))

    # Fixed delivery costs
    m = re.search(r"[Vv]aste\s+leveringskosten.*?€?\s*(\d+[.,]\d{2})", text)
    if m:
        tarieven["vast_per_maand"] = _parse_amount(m.group(1))

    return tarieven


def _extract_termijnbedrag(text: str) -> dict:
    """Extract monthly advance payment (termijnbedrag)."""
    termijn = {}

    # Current monthly amount
    amounts = []
    for m in re.finditer(r"(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}\s*€?\s*([\d.,]+)", text, re.IGNORECASE):
        amounts.append(_parse_amount(m.group(1)))

    if amounts:
        termijn["bedragen"] = amounts
        termijn["gemiddeld"] = round(sum(amounts) / len(amounts), 2)
        termijn["laatste"] = amounts[-1]
        termijn["totaal"] = round(sum(amounts), 2)

    # Explicit termijnbedrag
    m = re.search(r"[Tt]ermijnbedrag[^€\d]*€?\s*([\d.,]+)", text)
    if m:
        termijn["huidig"] = _parse_amount(m.group(1))

    return termijn


def _extract_energie_contract(text: str) -> dict:
    """Extract energy contract details."""
    contract = {}

    # Contract type
    if re.search(r"(?i)variabel|flex", text):
        contract["type"] = "variabel"
    elif re.search(r"(?i)vast|fix", text):
        contract["type"] = "vast"

    # Meter type
    if re.search(r"(?i)slimme\s+meter", text):
        contract["meter"] = "slim"
    elif re.search(r"(?i)enkel\s+tarief", text):
        contract["meter"] = "enkel"
    elif re.search(r"(?i)dubbel\s+tarief|normaal.*dal", text):
        contract["meter"] = "dubbel"

    # Netbeheerder
    m = re.search(r"[Nn]etbeheerder[:\s]*(Liander|Stedin|Enexis|Westland|Coteq|Rendo)", text)
    if m:
        contract["netbeheerder"] = m.group(1)

    return contract


def _extract_periode(text: str) -> dict:
    """Extract contract/invoice period."""
    periode = {}

    # Start and end dates from "Startdatum ... Einddatum ..."
    m = re.search(r"Startdatum\s+\[DATUM_(\d+)\]\s+Einddatum\s+\[DATUM_(\d+)\]", text)
    if m:
        periode["start_token"] = f"[DATUM_{m.group(1)}]"
        periode["eind_token"] = f"[DATUM_{m.group(2)}]"

    # Number of days
    m = re.search(r"Aantal\s+dagen\s+(\d+)", text)
    if m:
        periode["dagen"] = int(m.group(1))
        # Approximate months
        dagen = int(m.group(1))
        periode["maanden"] = round(dagen / 30.44, 1)

    return periode


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_amount(s: str) -> float:
    """Parse a Dutch-format amount string to float. '1.359,67' → 1359.67"""
    s = s.strip().lstrip("€").strip()
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    return float(s)


def _parse_number(s: str) -> float:
    """
    Parse a Dutch number string to float, handling:
    - '1.670' (thousand separator) → 1670
    - '1.666,75' (thousand sep + decimal) → 1666.75
    - '5157' → 5157
    - '5.157' → 5157
    """
    s = s.strip().lstrip("€").strip()
    if "," in s and "." in s:
        # Both present: dot is thousand sep, comma is decimal
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        # Only comma: it's a decimal separator
        s = s.replace(",", ".")
    elif "." in s:
        # Only dot: check if it's a thousand separator or decimal
        # If exactly 3 digits after dot, it's a thousand separator
        parts = s.split(".")
        if len(parts) == 2 and len(parts[1]) == 3:
            s = s.replace(".", "")  # thousand separator
        # Otherwise leave as decimal (e.g. "0.16059")
    return float(s)


def _parse_int(s: str) -> int:
    """Parse a number string, removing thousand separators."""
    return int(round(_parse_number(s)))


def _detect_type(text: str) -> str:
    """Auto-detect document type from content."""
    lower = text.lower()
    if any(w in lower for w in ["leveringskosten", "energiebelasting", "kwh", "m³", "netbeheer", "termijnbedrag"]):
        return "energie"
    if "inboedel" in lower:
        return "polis_inboedel"
    if "opstal" in lower:
        return "polis_opstal"
    if "aansprakelijkheid" in lower:
        return "polis_aansprakelijkheid"
    if any(w in lower for w in ["reis", "annulering", "werelddekking"]):
        return "polis_reis"
    if any(w in lower for w in ["auto", "voertuig", "wa "]):
        return "polis_auto"
    if any(w in lower for w in ["zorg", "basisverzekering", "aanvullend"]):
        return "polis_zorg"
    return "onbekend"


def _detect_product(text: str) -> str:
    """Detect insurance product type."""
    lower = text.lower()
    if "inboedel" in lower:
        return "Inboedelverzekering"
    if "opstal" in lower or "woonhuis" in lower:
        return "Opstalverzekering"
    if "aansprakelijkheid" in lower:
        return "Aansprakelijkheidsverzekering"
    if "reis" in lower:
        return "Reisverzekering"
    if "auto" in lower or "voertuig" in lower:
        return "Autoverzekering"
    if "zorg" in lower:
        return "Zorgverzekering"
    return ""
