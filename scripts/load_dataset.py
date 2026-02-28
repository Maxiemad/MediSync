#!/usr/bin/env python3
"""
MediSync – Regenerate data/drug_interactions.json for dataset reproducibility.

Supports three modes (in order of use):
  1. Kaggle API: If kaggle package is installed and ~/.kaggle/kaggle.json exists,
     downloads mghobashy/drug-drug-interactions and uses the CSV inside.
  2. Local CSV: Place any DDI CSV in data/ (e.g. ddi_raw.csv, drug_interactions.csv).
     Expected columns (case-insensitive): two drug columns (drug_1/drug_2 or Drug1/Drug2),
     optional 'severity', optional 'description' or 'interaction'.
  3. --sample: Build a small demo JSON from built-in pairs (no download). Use for
     CI or when Kaggle/CSV is unavailable.

Output: data/drug_interactions.json (nested dict: DrugA -> DrugB -> { severity, description }).

Usage:
  python scripts/load_dataset.py              # Try Kaggle, then data/*.csv
  python scripts/load_dataset.py --sample     # Demo set only
  python scripts/load_dataset.py --csv data/my_ddi.csv  # Explicit CSV path

Kaggle dataset: https://www.kaggle.com/datasets/mghobashy/drug-drug-interactions
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

# Project root (parent of scripts/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_PATH = DATA_DIR / "drug_interactions.json"

# Severity normalization: map common values to Mild / Moderate / Severe
SEVERITY_MAP = {
    "mild": "Mild",
    "moderate": "Moderate",
    "severe": "Severe",
    "minor": "Mild",
    "major": "Severe",
    "critical": "Severe",
    "contraindicated": "Severe",
}


def _normalize_severity(raw: str) -> str:
    s = (raw or "").strip()
    return SEVERITY_MAP.get(s.lower(), "Moderate")


def _normalize_drug_name(name: str) -> str:
    """Title-case and collapse spaces."""
    if not name or not isinstance(name, str):
        return ""
    return " ".join(name.strip().split())


def _detect_csv_columns(reader: csv.DictReader) -> tuple[str, str, str | None, str | None]:
    """Return (col_drug1, col_drug2, col_severity or None, col_description or None)."""
    headers = [h.strip() for h in reader.fieldnames or []]
    # Common patterns
    drug_candidates = []
    severity_col = None
    desc_col = None
    for h in headers:
        lower = h.lower()
        if lower in ("drug_1", "drug1", "drug a", "drug_a"):
            drug_candidates.append((0, h))
        elif lower in ("drug_2", "drug2", "drug b", "drug_b"):
            drug_candidates.append((1, h))
        elif "severity" in lower:
            severity_col = h
        elif "description" in lower or "interaction" in lower or "text" in lower:
            if desc_col is None:
                desc_col = h
    # Fallback: first two columns as drugs, then look for severity/description by name
    if len(drug_candidates) < 2:
        drug_candidates = [(0, headers[0]), (1, headers[1])] if len(headers) >= 2 else []
    drug_candidates.sort(key=lambda x: x[0])
    col1 = drug_candidates[0][1] if len(drug_candidates) > 0 else headers[0]
    col2 = drug_candidates[1][1] if len(drug_candidates) > 1 else headers[1]
    if severity_col is None:
        for h in headers:
            if re.match(r"^(severity|level|risk)$", h, re.I):
                severity_col = h
                break
    if desc_col is None:
        for h in headers:
            if re.match(r"^(description|interaction|effect|details)$", h, re.I):
                desc_col = h
                break
    return col1, col2, severity_col, desc_col


def build_from_csv(csv_path: Path) -> dict:
    """Build interaction map from a CSV file. Returns dict suitable for JSON export."""
    interactions: dict[str, dict] = {}
    with open(csv_path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        col1, col2, col_sev, col_desc = _detect_csv_columns(reader)
        for row in reader:
            d1 = _normalize_drug_name(row.get(col1, ""))
            d2 = _normalize_drug_name(row.get(col2, ""))
            if not d1 or not d2 or d1 == d2:
                continue
            severity = _normalize_severity(row.get(col_sev, "Moderate") if col_sev else "Moderate")
            description = (row.get(col_desc, "") if col_desc else "").strip() or f"Interaction between {d1} and {d2}."
            entry = {"severity": severity, "description": description}
            # Store both A->B and B->A for O(1) lookup either way (store once per unordered pair)
            if d1 not in interactions:
                interactions[d1] = {}
            interactions[d1][d2] = entry
            if d2 not in interactions:
                interactions[d2] = {}
            interactions[d2][d1] = entry
    return interactions


def build_sample() -> dict:
    """Build a small demo interaction set (no external file). Includes 11+ drugs so tests can check max 10."""
    pairs = [
        ("Ibuprofen", "Warfarin", "Moderate", "Increased bleeding risk when combined."),
        ("Ibuprofen", "Digoxin", "Moderate", "NSAIDs may increase digoxin levels."),
        ("Warfarin", "Digoxin", "Moderate", "Digoxin may potentiate warfarin effect."),
        ("Aspirin", "Warfarin", "Severe", "Increased bleeding risk; avoid or monitor closely."),
        ("Aspirin", "Ibuprofen", "Moderate", "Combined NSAIDs increase GI bleeding risk."),
        ("Metformin", "Contrast dye", "Moderate", "Risk of lactic acidosis; hold metformin around contrast."),
        ("Lisinopril", "Potassium", "Moderate", "Risk of hyperkalaemia."),
        ("Amoxicillin", "Methotrexate", "Moderate", "May increase methotrexate levels."),
        ("Omeprazole", "Clopidogrel", "Moderate", "PPI may reduce clopidogrel effect."),
        ("Atorvastatin", "Digoxin", "Mild", "May increase digoxin concentration."),
    ]
    interactions: dict[str, dict] = {}
    for d1, d2, severity, description in pairs:
        entry = {"severity": severity, "description": description}
        for a, b in ((d1, d2), (d2, d1)):
            if a not in interactions:
                interactions[a] = {}
            interactions[a][b] = entry
    return interactions


def try_kaggle_download() -> Path | None:
    """If kaggle is installed and configured, download dataset and return path to first CSV in it."""
    try:
        import kaggle
    except ImportError:
        return None
    import zipfile
    import shutil
    dataset_dir = DATA_DIR / "kaggle_ddi"
    dataset_dir.mkdir(parents=True, exist_ok=True)
    try:
        kaggle.api.dataset_download_files(
            "mghobashy/drug-drug-interactions",
            path=str(dataset_dir),
            unzip=True,
        )
    except Exception:
        return None
    for f in dataset_dir.rglob("*.csv"):
        return f
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Regenerate data/drug_interactions.json")
    parser.add_argument("--sample", action="store_true", help="Build only demo set (no Kaggle/CSV)")
    parser.add_argument("--csv", type=Path, metavar="PATH", help="Use this CSV file (skip Kaggle)")
    args = parser.parse_args()

    data: dict | None = None
    source = ""

    if args.sample:
        data = build_sample()
        source = "sample"
    elif args.csv and args.csv.exists():
        data = build_from_csv(args.csv)
        source = str(args.csv)
    else:
        # Try Kaggle
        csv_path = try_kaggle_download()
        if csv_path is not None:
            data = build_from_csv(csv_path)
            source = str(csv_path)
        # Fallback: any CSV in data/
        if data is None:
            for p in sorted(DATA_DIR.glob("*.csv")):
                data = build_from_csv(p)
                source = str(p)
                break

    if data is None:
        print("No CSV found. Use --sample to build demo set, or place a DDI CSV in data/", file=sys.stderr)
        print("Kaggle: pip install kaggle && configure ~/.kaggle/kaggle.json", file=sys.stderr)
        return 1

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    num_drugs = len(data)
    num_pairs = sum(len(v) for v in data.values()) // 2
    print(f"Wrote {OUTPUT_PATH} (drugs={num_drugs}, pairs={num_pairs}) from {source}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
