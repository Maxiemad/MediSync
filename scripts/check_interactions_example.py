#!/usr/bin/env python3
"""
Example: Check drug interactions using the backend.
Run scripts/load_dataset.py first to generate data/drug_interactions.json.

Uses backend.interaction_checker for:
- Severity scoring (Mild=1, Moderate=2)
- Multi-drug aggregation (total_score, moderate_count, overall_risk)
- Drug not found / pair not found handling
"""
import json
import sys
from pathlib import Path

# Allow importing backend from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.interaction_checker import check_drug_interactions


def main():
    test_drugs = ["Ibuprofen", "Warfarin", "Digoxin"]
    if len(sys.argv) > 1:
        test_drugs = sys.argv[1:]

    result = check_drug_interactions(test_drugs)

    if "error" in result:
        print("Error:", result["error"])
        return

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
