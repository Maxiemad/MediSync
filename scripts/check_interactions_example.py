#!/usr/bin/env python3
"""
Example: Check drug interactions using the preprocessed lookup map.
Run scripts/load_dataset.py first to generate data/drug_interactions.json.
O(1) lookup - no full-table scan, no pandas per request.
"""
import json
from pathlib import Path


def load_interactions():
    data_path = Path(__file__).resolve().parent.parent / "data" / "drug_interactions.json"
    if not data_path.exists():
        raise FileNotFoundError(
            f"Run 'python scripts/load_dataset.py' first to generate {data_path}"
        )
    with open(data_path) as f:
        return json.load(f)


def check_interactions(interactions: dict, drug_list: list[str]) -> list[dict]:
    """
    Check interactions between drugs in the list. O(1) lookup per pair.
    Returns list of { drug1, drug2, severity, description }.
    """
    results = []
    seen = set()

    for i, d1 in enumerate(drug_list):
        d1_norm = d1.strip().title()
        if d1_norm not in interactions:
            continue
        for d2 in drug_list[i + 1 :]:
            d2_norm = d2.strip().title()
            pair = tuple(sorted([d1_norm, d2_norm]))
            if pair in seen:
                continue
            if d2_norm in interactions[d1_norm]:
                entry = interactions[d1_norm][d2_norm]
                results.append({
                    "drug1": d1_norm,
                    "drug2": d2_norm,
                    "severity": entry["severity"],
                    "description": entry["description"],
                })
                seen.add(pair)

    return results


def main():
    interactions = load_interactions()
    drug_count = len(interactions)
    print(f"Loaded {drug_count} drugs in lookup map")

    test_drugs = ["Ibuprofen", "Warfarin", "Digoxin"]
    conflicts = check_interactions(interactions, test_drugs)

    print(f"\nChecking: {test_drugs}")
    print(f"Found {len(conflicts)} interaction(s):\n")
    for c in conflicts:
        print(f"  [{c['severity']}] {c['drug1']} + {c['drug2']}")
        print(f"    → {c['description'][:80]}...")


if __name__ == "__main__":
    main()
