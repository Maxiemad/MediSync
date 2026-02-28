"""
MediSync – Dosage limits and contraindication checks.

- Optional data: data/drug_dosage_limits.json, data/drug_contraindications.json
- If files are missing, checks are skipped and empty lists returned.
"""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_DATA_DIR = _PROJECT_ROOT / "data"
_DOSAGE_PATH = _DATA_DIR / "drug_dosage_limits.json"
_CONTRA_PATH = _DATA_DIR / "drug_contraindications.json"

_dosage_cache: dict | None = None
_contraindication_cache: dict | None = None
_contra_lower_to_canonical: dict | None = None


def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Could not load %s: %s", path, e)
        return {}


def load_dosage_limits() -> dict:
    """Return drug -> { max_daily_mg, unit, route }. Cached."""
    global _dosage_cache
    if _dosage_cache is None:
        _dosage_cache = _load_json(_DOSAGE_PATH)
    return _dosage_cache


def load_contraindications() -> tuple[dict, dict]:
    """Return (drug -> { condition -> advice }, lower_to_canonical). Cached."""
    global _contraindication_cache, _contra_lower_to_canonical
    if _contraindication_cache is None:
        _contraindication_cache = _load_json(_CONTRA_PATH)
        _contra_lower_to_canonical = {k.lower(): k for k in _contraindication_cache}
    return _contraindication_cache, _contra_lower_to_canonical or {}


def init_dosage_contraindications() -> None:
    """Preload dosage and contraindication data (call at app startup)."""
    load_dosage_limits()
    load_contraindications()
    logger.info("Dosage and contraindication data loaded (if present)")


def check_dosage_warnings(
    canonical_drugs: list[str],
    drug_doses: list[dict[str, Any]] | None,
    lower_to_canonical: dict[str, str],
) -> list[dict[str, Any]]:
    """
    drug_doses: optional list of { "drug": "<name>", "daily_mg": <float> }.
    Returns list of { "drug", "daily_mg", "max_daily_mg", "message" } for exceeded limits.
    """
    warnings: list[dict[str, Any]] = []
    limits = load_dosage_limits()
    if not limits or not drug_doses:
        return warnings
    for item in drug_doses:
        drug_name = (item.get("drug") or item.get("name") or "").strip()
        if not drug_name:
            continue
        try:
            daily_mg = float(item.get("daily_mg", item.get("daily_dose", 0)))
        except (TypeError, ValueError):
            continue
        canonical = lower_to_canonical.get(drug_name.lower()) or drug_name
        limit_entry = limits.get(canonical)
        if not limit_entry:
            continue
        max_mg = limit_entry.get("max_daily_mg")
        if max_mg is None:
            continue
        try:
            max_mg = float(max_mg)
        except (TypeError, ValueError):
            continue
        if daily_mg > max_mg:
            warnings.append({
                "drug": canonical,
                "daily_mg": daily_mg,
                "max_daily_mg": max_mg,
                "unit": limit_entry.get("unit", "mg"),
                "message": f"Daily dose {daily_mg} {limit_entry.get('unit', 'mg')} exceeds maximum {max_mg} for {canonical}.",
            })
    return warnings


def check_contraindication_warnings(
    canonical_drugs: list[str],
    patient_context: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """
    patient_context: optional { "pregnancy": true, "severe_liver_impairment": true, "penicillin_allergy": true, ... }.
    Returns list of { "drug", "condition", "advice" } for applicable contraindications.
    """
    warnings: list[dict[str, Any]] = []
    contra, _ = load_contraindications()
    if not contra or not patient_context:
        return warnings
    # Normalize context keys to lowercase; value truthy means condition applies
    active_conditions = [k.strip().lower() for k, v in patient_context.items() if v]
    if not active_conditions:
        return warnings
    for drug in canonical_drugs:
        drug_contra = contra.get(drug, {})
        for cond, advice in drug_contra.items():
            if cond.lower() in active_conditions and advice:
                warnings.append({
                    "drug": drug,
                    "condition": cond,
                    "advice": advice,
                    "message": f"{drug}: {cond} – {advice}.",
                })
    return warnings
