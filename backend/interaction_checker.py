"""
MediSync Drug Interaction Checker – production backend logic.

- Graph-based model: drugs = nodes, known interactions = weighted edges
- Dataset preloaded at startup (global cache)
- Input validation, logging, highest_risk_pair
- Offline-only, O(1) lookup, FastAPI-compatible
"""

import json
import logging
from itertools import combinations
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Base severity mapping (numeric score per interaction) – used for total_score and graph edge weight
SEVERITY_SCORE = {"Mild": 1, "Moderate": 2, "Severe": 3}

# Color coding for graph (hex) – use in UI for nodes/edges by severity (3 classes only)
SEVERITY_COLORS = {
    "Mild": "#22c55e",
    "Moderate": "#f59e0b",
    "Severe": "#ef4444",
    "Unknown": "#6b7280",
}

MIN_DRUGS = 2
MAX_DRUGS = 10

# Global cached dataset (preloaded at startup)
_interactions_cache: dict | None = None
_lower_to_canonical_cache: dict | None = None


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_interaction_data() -> tuple[dict, dict]:
    """
    Load interaction map and case-insensitive drug name lookup.
    Returns (interactions_map, lower_to_canonical).
    """
    data_path = _project_root() / "data" / "drug_interactions.json"
    if not data_path.exists():
        raise FileNotFoundError(
            "Interaction data not found. Run: python scripts/load_dataset.py"
        )
    with open(data_path) as f:
        interactions = json.load(f)
    lower_to_canonical = {name.lower(): name for name in interactions}
    return interactions, lower_to_canonical


def init_interaction_data() -> None:
    """Preload dataset at application startup. Call once (e.g. FastAPI lifespan)."""
    global _interactions_cache, _lower_to_canonical_cache
    if _interactions_cache is None:
        _interactions_cache, _lower_to_canonical_cache = load_interaction_data()
        logger.info("Drug interaction dataset preloaded")


def get_cached_data() -> tuple[dict, dict]:
    """Return cached dataset. Initializes if not yet loaded."""
    if _interactions_cache is None or _lower_to_canonical_cache is None:
        init_interaction_data()
    return _interactions_cache, _lower_to_canonical_cache


def _overall_risk(mild_count: int, moderate_count: int, severe_count: int) -> str:
    """
    Overall risk: 3 classes only (Mild, Moderate, Severe).
    - Base: all mild → Mild; any moderate (no severe) → Moderate; any severe → Severe.
    - Escalation: ≥3 Mild → +1 level (Mild→Moderate); ≥2 Moderate → +1 level (Moderate→Severe); Severe → no escalation.
    """
    if severe_count >= 1:
        base = "Severe"
    elif moderate_count >= 1:
        base = "Moderate"
    else:
        base = "Mild"

    if base == "Mild" and mild_count >= 3:
        return "Moderate"
    if base == "Moderate" and moderate_count >= 2:
        return "Severe"
    return base


def _confidence_level(confidence_percentage: float) -> str:
    """Label for UI: High / Medium / Low."""
    if confidence_percentage >= 80:
        return "High"
    if confidence_percentage >= 50:
        return "Medium"
    return "Low"


def _build_risk_explanation(overall: str, unknown_pairs: int) -> str:
    base = {
        "Mild": "Low interaction risk detected. Minimal clinical concern based on available data.",
        "Moderate": "Moderate interaction risk detected. Monitoring may be required.",
        "Severe": "Severe interaction risk detected. Increased cumulative toxicity risk.",
    }.get(overall, "")
    if unknown_pairs > 0:
        base += " Note: Some drug pairs lack interaction data in the current offline database."
    return base


def _build_recommendation(overall: str) -> str:
    return {
        "Mild": "Continue current regimen. No changes required based on available interaction data.",
        "Moderate": "Consider monitoring patient response. Review dosing if clinically indicated.",
        "Severe": "Review prescription and monitor patient. Consider alternatives or dose adjustments.",
    }.get(overall, "Review prescription and monitor patient.")


def _lookup_interaction(interactions: dict, drug_a: str, drug_b: str) -> dict | None:
    """Check interaction in both directions (A→B and B→A). O(1) lookup."""
    entry = interactions.get(drug_a, {}).get(drug_b)
    if entry is not None:
        return entry
    return interactions.get(drug_b, {}).get(drug_a)


def check_drug_interactions(
    drug_list: list[str],
    interactions: dict | None = None,
    lower_to_canonical: dict | None = None,
    drug_doses: list[dict[str, Any]] | None = None,
    patient_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Check interactions for a list of drugs (2–10). Production-ready.

    Optional:
      - drug_doses: [{"drug": "Ibuprofen", "daily_mg": 400}] for dosage limit checks.
      - patient_context: {"pregnancy": true, "severe_liver_impairment": true} for contraindication flags.

    Returns:
        - On success: full structure with pair_results, graph_data, risk_explanation,
          dosage_warnings, contraindication_warnings, etc.
        - On error: { "error": "..." }
    """
    interactions, lower_to_canonical = get_cached_data() if (interactions is None or lower_to_canonical is None) else (interactions, lower_to_canonical)

    # 1. Input validation & sanitization
    normalized: list[str] = []
    for d in drug_list:
        if not isinstance(d, str):
            continue
        raw = d.strip()
        if not raw:
            continue
        key = lower_to_canonical.get(raw.lower())
        if key is None:
            return {"error": "Drug not found in database"}
        normalized.append(key)

    # Deduplicate while preserving order
    seen = set()
    unique_drugs: list[str] = []
    for d in normalized:
        if d not in seen:
            seen.add(d)
            unique_drugs.append(d)

    if len(unique_drugs) < MIN_DRUGS:
        return {"error": "At least two valid drugs are required."}
    if len(unique_drugs) > MAX_DRUGS:
        return {"error": "Maximum 10 drugs allowed per request."}

    n = len(unique_drugs)
    total_pairs = n * (n - 1) // 2

    pair_results: list[dict[str, Any]] = []
    graph_nodes: list[dict[str, str]] = [{"id": drug} for drug in unique_drugs]
    graph_edges: list[dict[str, Any]] = []
    interactions_not_found: list[dict[str, Any]] = []

    total_score = 0
    mild_count = 0
    moderate_count = 0
    severe_count = 0
    known_pairs = 0
    unknown_pairs = 0
    highest_risk_pair: dict[str, Any] | None = None
    highest_severity_value = 0

    for drug_a, drug_b in combinations(unique_drugs, 2):
        entry = _lookup_interaction(interactions, drug_a, drug_b)

        if entry is not None:
            raw_severity = entry.get("severity", "Moderate")
            # Normalize to 3 classes only: Critical → Severe
            severity = "Severe" if raw_severity == "Critical" else raw_severity
            if severity not in SEVERITY_SCORE:
                severity = "Moderate"
            description = entry.get("description", "")
            weight = SEVERITY_SCORE.get(severity, 2)
            total_score += weight
            if severity == "Mild":
                mild_count += 1
            elif severity == "Moderate":
                moderate_count += 1
            elif severity == "Severe":
                severe_count += 1
            known_pairs += 1
            pair_results.append({
                "drugA": drug_a,
                "drugB": drug_b,
                "severity": severity,
                "severity_score": weight,
                "description": description or "",
            })
            graph_edges.append({
                "source": drug_a,
                "target": drug_b,
                "severity": severity,
                "weight": weight,
                "color": SEVERITY_COLORS.get(severity, SEVERITY_COLORS["Unknown"]),
                "description": (description or "")[:150],
            })
            if weight > highest_severity_value:
                highest_severity_value = weight
                highest_risk_pair = {
                    "drugA": drug_a,
                    "drugB": drug_b,
                    "severity": severity,
                    "weight": weight,
                    "description": description or "",
                }
        else:
            unknown_pairs += 1
            pair_results.append({
                "drugA": drug_a,
                "drugB": drug_b,
                "severity": "Unknown",
                "severity_score": None,
                "description": "No interaction data available in the current database.",
            })
            interactions_not_found.append({
                "drugA": drug_a,
                "drugB": drug_b,
                "description": "No interaction data available in the current database.",
            })

    overall = _overall_risk(mild_count, moderate_count, severe_count)
    confidence_percentage = round((known_pairs / total_pairs) * 100, 2) if total_pairs > 0 else 100.0
    confidence_level = _confidence_level(confidence_percentage)
    graph_density = round(known_pairs / total_pairs, 2) if total_pairs > 0 else 1.0

    result: dict[str, Any] = {
        "pair_results": pair_results,
        "graph_data": {
            "nodes": graph_nodes,
            "edges": graph_edges,
            "severity_color_map": SEVERITY_COLORS,
        },
        "total_pairs": total_pairs,
        "known_pairs": known_pairs,
        "unknown_pairs": unknown_pairs,
        "interactions_not_found": interactions_not_found,
        "confidence_percentage": confidence_percentage,
        "confidence_level": confidence_level,
        "graph_density": graph_density,
        "total_score": total_score,
        "mild_count": mild_count,
        "moderate_count": moderate_count,
        "severe_count": severe_count,
        "overall_risk": overall,
        "severity_score_map": SEVERITY_SCORE,
        "highest_risk_pair": highest_risk_pair if highest_risk_pair is not None else {},
        "risk_explanation": _build_risk_explanation(overall, unknown_pairs),
        "recommendation": _build_recommendation(overall),
    }
    if unknown_pairs > 0:
        result["warning"] = "Some drug pairs are missing interaction data."

    # Dosage and contraindication checks (optional modules)
    try:
        from backend.dosage_contraindications import (
            check_dosage_warnings,
            check_contraindication_warnings,
        )
        result["dosage_warnings"] = check_dosage_warnings(
            unique_drugs, drug_doses, lower_to_canonical
        )
        result["contraindication_warnings"] = check_contraindication_warnings(
            unique_drugs, patient_context
        )
    except Exception as e:
        logger.debug("Dosage/contraindication checks skipped: %s", e)
        result["dosage_warnings"] = []
        result["contraindication_warnings"] = []

    logger.info(
        "check_interactions: drugs=%s total_pairs=%d known_pairs=%d overall_risk=%s",
        unique_drugs,
        total_pairs,
        known_pairs,
        overall,
    )

    return result


# Backward compatibility: expose load_interaction_data for scripts that pass data explicitly
def load_interaction_data_fresh() -> tuple[dict, dict]:
    """Load data from disk (bypasses cache). Use for testing or one-off scripts."""
    return load_interaction_data()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    import sys
    init_interaction_data()
    drugs = sys.argv[1:] if len(sys.argv) > 1 else ["Ibuprofen", "Warfarin", "Digoxin"]
    result = check_drug_interactions(drugs)
    print(json.dumps(result, indent=2))
