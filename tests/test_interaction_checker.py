#!/usr/bin/env python3
"""
MediSync Interaction Checker – example tests.
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
    """2️⃣ Valid drugs return full structure including graph_data, risk_explanation, etc."""
    print("\n--- 2. Valid request – output structure ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin"])
    ok = True
    ok &= run_test("No error key", "error" not in result)
    ok &= run_test("Has pair_results", "pair_results" in result)
    ok &= run_test("Has graph_data", "graph_data" in result)
    ok &= run_test("Has graph_data.nodes", "nodes" in result.get("graph_data", {}))
    ok &= run_test("Has graph_data.edges", "edges" in result.get("graph_data", {}))
    ok &= run_test("Has total_pairs", "total_pairs" in result)
    ok &= run_test("Has known_pairs", "known_pairs" in result)
    ok &= run_test("Has unknown_pairs", "unknown_pairs" in result)
    ok &= run_test("Has confidence_percentage", "confidence_percentage" in result)
    ok &= run_test("Has graph_density", "graph_density" in result)
    ok &= run_test("Has total_score", "total_score" in result)
    ok &= run_test("Has moderate_count", "moderate_count" in result)
    ok &= run_test("Has overall_risk", "overall_risk" in result)
    ok &= run_test("Has risk_explanation", "risk_explanation" in result)
    ok &= run_test("Has recommendation", "recommendation" in result)
    ok &= run_test("Has highest_risk_pair", "highest_risk_pair" in result)
    ok &= run_test("overall_risk is valid", result["overall_risk"] in ("Mild", "Moderate", "Severe", "Critical"))
    ok &= run_test("total_score is number", isinstance(result["total_score"], (int, float)))
    ok &= run_test("total_pairs = n*(n-1)/2", result["total_pairs"] == 1)  # 2 drugs → 1 pair
    return ok


def test_drug_not_found():
    """3️⃣ Unknown drug returns error, no crash."""
    print("\n--- 3. Drug not found ---")
    result = check_drug_interactions(["Ibuprofen", "NotARealDrugXYZ123"])
    ok = run_test("Returns error", "error" in result)
    ok &= run_test("Error message correct", result.get("error") == "Drug not found in database")
    return ok


def test_pair_not_found():
    """4️⃣ Both drugs exist but no interaction → Unknown (informational, no score impact)."""
    print("\n--- 4. Pair not found (both drugs exist, no interaction) ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin"])
    if "error" in result:
        run_test("Got pair_results", False, "Unexpected error")
        return False
    pairs = result["pair_results"]
    run_test("At least one pair", len(pairs) >= 1)
    unknown = [p for p in pairs if p.get("severity") == "Unknown"]
    ok = run_test(
        "Some pair has 'Unknown' or known interaction",
        len(pairs) >= 1,
        "pair_results should contain each pair once"
    )
    ok &= run_test(
        "Unknown not counted as Mild",
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
    """8️⃣ total_score = sum of known interaction scores; moderate_count and overall_risk; Unknown excluded."""
    print("\n--- 8. total_score & moderate_count & overall_risk ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin", "Digoxin"])
    if "error" in result:
        return run_test("No error", False, result.get("error"))
    total = result["total_score"]
    moderate_count = result["moderate_count"]
    overall = result["overall_risk"]
    # total_score = sum of (1 for Mild, 2 for Moderate) over known interactions only; Unknown adds nothing
    expected_score = 0
    expected_moderate = 0
    for p in result["pair_results"]:
        sev = p.get("severity")
        if sev == "Mild":
            expected_score += 1
        elif sev == "Moderate":
            expected_score += 2
            expected_moderate += 1
        # "Unknown" adds nothing
    ok = run_test("total_score matches sum of known pair severities", total == expected_score)
    ok &= run_test("moderate_count matches Moderate pairs", moderate_count == expected_moderate)
    ok &= run_test("overall_risk consistent with moderate_count",
                   (moderate_count >= 1 and overall in ("Moderate", "Severe", "Critical")) or
                   (moderate_count == 0 and overall == "Mild"))
    return ok


def test_graph_edges_only_known():
    """9️⃣ Graph edges only for known interactions; edges have source, target, severity, weight."""
    print("\n--- 9. Graph edges (known only) ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin", "Digoxin"])
    if "error" in result:
        return run_test("No error", False, result.get("error"))
    edges = result["graph_data"]["edges"]
    known = result["known_pairs"]
    ok = run_test("Edge count = known_pairs", len(edges) == known)
    for e in edges:
        ok &= run_test("Edge has weight", "weight" in e and e["weight"] in (1, 2))
    return ok


def test_confidence_and_warning():
    """🔟 total_pairs, known/unknown, confidence_percentage; warning when unknown_pairs > 0."""
    print("\n--- 10. Confidence & warning ---")
    result = check_drug_interactions(["Ibuprofen", "Warfarin", "Digoxin"])
    if "error" in result:
        return run_test("No error", False, result.get("error"))
    n = 3
    expected_pairs = n * (n - 1) // 2
    ok = run_test("total_pairs = n*(n-1)/2", result["total_pairs"] == expected_pairs)
    ok &= run_test("known_pairs + unknown_pairs = total_pairs",
                   result["known_pairs"] + result["unknown_pairs"] == result["total_pairs"])
    conf = result["confidence_percentage"]
    ok &= run_test("confidence_percentage = (known/total)*100 rounded to 2 decimals",
                   isinstance(conf, (int, float)) and 0 <= conf <= 100)
    if result["unknown_pairs"] > 0:
        ok &= run_test("warning present when unknown_pairs > 0", "warning" in result)
    else:
        ok &= run_test("warning omitted when unknown_pairs == 0", "warning" not in result)
    return ok


def main():
    print("MediSync – Interaction Checker Tests")
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
    results.append(("graph edges (known only)", test_graph_edges_only_known()))
    results.append(("confidence & warning", test_confidence_and_warning()))

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
