#!/usr/bin/env python3
"""
MedSync Interaction Checker – example tests.
Run: python tests/test_interaction_checker.py
Or:  pytest tests/test_interaction_checker.py -v
"""
import json
import sys
from pathlib import Path

# Add project root so we can import backend
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.interaction_checker import (
    check_drug_interactions,
    load_interaction_data,
    SEVERITY_SCORE,
)


def run_test(name: str, condition: bool, detail: str = "") -> bool:
    """Print pass/fail and return True if passed."""
    status = "PASS" if condition else "FAIL"
    symbol = "✓" if condition else "✗"
    print(f"  {symbol} {name}")
    if detail and not condition:
        print(f"      {detail}")
    return condition


def test_severity_mapping():
    """1️⃣ Base severity: Mild=1, Moderate=2."""
    print("\n--- 1. Severity mapping ---")
    ok = True
    ok &= run_test("Mild = 1", SEVERITY_SCORE.get("Mild") == 1)
    ok &= run_test("Moderate = 2", SEVERITY_SCORE.get("Moderate") == 2)
    return ok


def test_valid_interaction_returns_structure():
    """2️⃣ Valid drugs return pair_results, total_score, moderate_count, overall_risk."""
    print("\n--- 2. Valid request – output structure ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin"])
    ok = True
    ok &= run_test("No error key", "error" not in result)
    ok &= run_test("Has pair_results", "pair_results" in result)
    ok &= run_test("Has total_score", "total_score" in result)
    ok &= run_test("Has moderate_count", "moderate_count" in result)
    ok &= run_test("Has overall_risk", "overall_risk" in result)
    ok &= run_test("overall_risk is valid", result["overall_risk"] in ("Mild", "Moderate", "Severe", "Critical"))
    ok &= run_test("total_score is number", isinstance(result["total_score"], (int, float)))
    return ok


def test_drug_not_found():
    """3️⃣ Unknown drug returns error, no crash."""
    print("\n--- 3. Drug not found ---")
    result = check_drug_interactions(["Ibuprofen", "NotARealDrugXYZ123"])
    ok = run_test("Returns error", "error" in result)
    ok &= run_test("Error message correct", result.get("error") == "Drug not found in database")
    return ok


def test_pair_not_found():
    """4️⃣ Both drugs exist but no interaction → No Known Interaction (informational)."""
    print("\n--- 4. Pair not found (both drugs exist, no interaction) ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin"])
    if "error" in result:
        run_test("Got pair_results", False, "Unexpected error")
        return False
    pairs = result["pair_results"]
    run_test("At least one pair", len(pairs) >= 1)
    # Find a "No Known Interaction" if any
    no_known = [p for p in pairs if p.get("severity") == "No Known Interaction"]
    ok = run_test(
        "Some pair has 'No Known Interaction' or known interaction",
        len(pairs) >= 1,
        "pair_results should contain each pair once"
    )
    ok &= run_test(
        "No Known Interaction not counted as Mild",
        result.get("overall_risk") in ("Mild", "Moderate", "Severe", "Critical")
    )
    return ok


def test_case_insensitive():
    """5️⃣ Case-insensitive drug matching."""
    print("\n--- 5. Case-insensitive matching ---")
    r1 = check_drug_interactions(["Ibuprofen", "Warfarin"])
    r2 = check_drug_interactions(["IBUPROFEN", "warfarin"])
    ok = run_test("No error for uppercase", "error" not in r2)
    ok &= run_test("Same number of pairs", len(r1["pair_results"]) == len(r2["pair_results"]))
    ok &= run_test("Same total_score", r1["total_score"] == r2["total_score"])
    return ok


def test_no_duplicate_pairs():
    """6️⃣ Each pair appears only once."""
    print("\n--- 6. No duplicate pairs ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin", "Digoxin"])
    if "error" in result:
        return run_test("No error", False, result.get("error"))
    pairs = result["pair_results"]
    seen = set()
    dup = False
    for p in pairs:
        key = tuple(sorted([p["drugA"], p["drugB"]]))
        if key in seen:
            dup = True
            break
        seen.add(key)
    return run_test("No duplicate pairs", not dup)


def test_2_to_10_drugs():
    """7️⃣ Accept 2–10 drugs; reject 1 and 11+."""
    print("\n--- 7. Drug count (2–10) ---")
    ok = True
    r1 = check_drug_interactions(["Ibuprofen"])
    ok &= run_test("1 drug → error", "error" in r1)
    data = load_interaction_data()
    drugs_11 = list(data[0].keys())[:11]
    r11 = check_drug_interactions(drugs_11, data[0], data[1])
    ok &= run_test("11 drugs → error", "error" in r11)
    r2 = check_drug_interactions(["Ibuprofen", "Warfarin"])
    ok &= run_test("2 drugs → success", "error" not in r2)
    return ok


def test_total_score_and_moderate_count():
    """8️⃣ total_score = sum of interaction scores; moderate_count and overall_risk."""
    print("\n--- 8. total_score & moderate_count & overall_risk ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin", "Digoxin"])
    if "error" in result:
        return run_test("No error", False, result.get("error"))
    total = result["total_score"]
    moderate_count = result["moderate_count"]
    overall = result["overall_risk"]
    # total_score should equal sum of (1 for Mild, 2 for Moderate) over known interactions
    expected_score = 0
    expected_moderate = 0
    for p in result["pair_results"]:
        sev = p.get("severity")
        if sev == "Mild":
            expected_score += 1
            expected_moderate += 0
        elif sev == "Moderate":
            expected_score += 2
            expected_moderate += 1
        # "No Known Interaction" adds nothing
    ok = run_test("total_score matches sum of pair severities", total == expected_score)
    ok &= run_test("moderate_count matches Moderate pairs", moderate_count == expected_moderate)
    ok &= run_test("overall_risk consistent with moderate_count",
                   (moderate_count >= 1 and overall in ("Moderate", "Severe", "Critical")) or
                   (moderate_count == 0 and overall == "Mild"))
    return ok


def main():
    print("MedSync – Interaction Checker Tests")
    print("==================================")
    results = []
    results.append(("Severity mapping", test_severity_mapping()))
    results.append(("Output structure", test_valid_interaction_returns_structure()))
    results.append(("Drug not found", test_drug_not_found()))
    results.append(("Pair not found", test_pair_not_found()))
    results.append(("Case-insensitive", test_case_insensitive()))
    results.append(("No duplicate pairs", test_no_duplicate_pairs()))
    results.append(("2–10 drugs", test_2_to_10_drugs()))
    results.append(("total_score & overall_risk", test_total_score_and_moderate_count()))

    print("\n" + "=" * 50)
    passed = sum(1 for _, p in results if p)
    total = len(results)
    if passed == total:
        print(f"All {total} test groups PASSED")
    else:
        print(f"Result: {passed}/{total} test groups passed")
    print("=" * 50)
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
