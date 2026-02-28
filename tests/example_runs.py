#!/usr/bin/env python3
"""
Example runs – see real inputs and outputs.
Run: python tests/example_runs.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.interaction_checker import check_drug_interactions


def run_example(name: str, drugs: list[str]):
    print(f"\n{'='*60}")
    print(f"Example: {name}")
    print(f"Input drugs: {drugs}")
    print("---")
    result = check_drug_interactions(drugs)
    print(json.dumps(result, indent=2))
    print()


if __name__ == "__main__":
    print("MedSync – Example runs (real API output)")
    run_example("2 drugs – both exist, no interaction", ["Ibuprofen", "Warfarin"])
    run_example("3 drugs – one known interaction", ["Ibuprofen", "Warfarin", "Digoxin"])
    run_example("Case-insensitive", ["IBUPROFEN", "warfarin"])
    run_example("Drug not found (should error)", ["Ibuprofen", "FakeDrug999"])
    run_example("Too few drugs (should error)", ["Ibuprofen"])
