"""
MedSync Drug Interaction Checker – production backend logic.

- Base severity: Mild=1, Moderate=2
- Multi-drug risk aggregation: total_score, moderate_count, overall_risk
- Drug not found / pair not found handling
- Case-insensitive matching, 2–10 drugs, no duplicate pairs
"""

import json
from pathlib import Path
from typing import Any

# Base severity mapping (numeric score per interaction)
SEVERITY_SCORE = {"Mild": 1, "Moderate": 2}

# Overall risk classification by moderate_count
def _overall_risk(moderate_count: int) -> str:
    if moderate_count >= 5:
        return "Critical"
    if moderate_count >= 3:
        return "Severe"
    if moderate_count >= 1:
        return "Moderate"
    return "Mild"


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
            f"Interaction data not found. Run: python scripts/load_dataset.py"
        )
    with open(data_path) as f:
        interactions = json.load(f)
    lower_to_canonical = {name.lower(): name for name in interactions}
    return interactions, lower_to_canonical


def check_drug_interactions(
    drug_list: list[str],
    interactions: dict | None = None,
    lower_to_canonical: dict | None = None,
) -> dict[str, Any]:
    """
    Check interactions for a list of drugs (2–10). Production-ready.

    Returns:
        - On success: { "pair_results": [...], "total_score": int, "moderate_count": int, "overall_risk": str }
        - On drug not found: { "error": "Drug not found in database" }
    """
    MIN_DRUGS = 2
    MAX_DRUGS = 10

    if interactions is None or lower_to_canonical is None:
        interactions, lower_to_canonical = load_interaction_data()

    # Normalize input: strip, and resolve to canonical name
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

    # Deduplicate while preserving order (first occurrence counts)
    seen_drug = set()
    unique_drugs: list[str] = []
    for d in normalized:
        if d not in seen_drug:
            seen_drug.add(d)
            unique_drugs.append(d)

    if len(unique_drugs) < MIN_DRUGS:
        return {"error": "At least 2 drugs are required"}
    if len(unique_drugs) > MAX_DRUGS:
        return {"error": f"At most {MAX_DRUGS} drugs are supported"}

    pair_results: list[dict[str, Any]] = []
    total_score = 0
    moderate_count = 0

    for i in range(len(unique_drugs)):
        for j in range(i + 1, len(unique_drugs)):
            drug_a, drug_b = unique_drugs[i], unique_drugs[j]
            pair = (drug_a, drug_b)

            # Lookup: both keys exist; check if interaction exists
            entry = None
            if drug_a in interactions and drug_b in interactions.get(drug_a, {}):
                entry = interactions[drug_a][drug_b]

            if entry is not None:
                severity = entry.get("severity", "Moderate")
                description = entry.get("description", "")
                score = SEVERITY_SCORE.get(severity, 2)
                total_score += score
                if severity == "Moderate":
                    moderate_count += 1
                pair_results.append({
                    "drugA": drug_a,
                    "drugB": drug_b,
                    "severity": severity,
                    "description": description or "",
                })
            else:
                pair_results.append({
                    "drugA": drug_a,
                    "drugB": drug_b,
                    "severity": "No Known Interaction",
                    "description": "No interaction found in the current offline database.",
                })

    overall = _overall_risk(moderate_count)

    return {
        "pair_results": pair_results,
        "total_score": total_score,
        "moderate_count": moderate_count,
        "overall_risk": overall,
    }


if __name__ == "__main__":
    import sys
    data = load_interaction_data()
    drugs = sys.argv[1:] if len(sys.argv) > 1 else ["Ibuprofen", "Warfarin", "Digoxin"]
    result = check_drug_interactions(drugs, data[0], data[1])
    print(json.dumps(result, indent=2))
