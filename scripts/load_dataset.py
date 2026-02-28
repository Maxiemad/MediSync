#!/usr/bin/env python3
"""
Load the drug-drug-interactions dataset from Kaggle using kagglehub.
Exports a curated subset as an optimized O(1) lookup map for MedSync.
"""
import json
from pathlib import Path

import kagglehub
import pandas as pd

# Curated subset size (5k-20k for hackathon: fast + lightweight)
TARGET_INTERACTIONS = 12_000


def infer_severity(description: str) -> str:
    """
    Infer severity (Mild/Moderate/Severe) from interaction description.
    Rule-based for explainability - aligns with MedSync architecture.
    """
    if not description or not isinstance(description, str):
        return "Moderate"

    desc_lower = description.lower()

    severe_keywords = [
        "contraindicated", "life-threatening", "fatal", "death",
        "serious adverse", "major bleeding", "cardiac arrest",
        "respiratory depression", "severe toxicity", "absolute contraindication",
    ]
    if any(kw in desc_lower for kw in severe_keywords):
        return "Severe"

    moderate_keywords = [
        "risk or severity of adverse effects", "increase the risk",
        "may increase", "may decrease", "toxicity", "cardiotoxic",
        "hepatotoxic", "nephrotoxic", "hypotension", "hypoglycemia",
        "bleeding risk", "qt prolongation",
    ]
    if any(kw in desc_lower for kw in moderate_keywords):
        return "Moderate"

    mild_keywords = [
        "may alter", "may affect", "may reduce",
        "absorption", "bioavailability", "metabolism",
    ]
    if any(kw in desc_lower for kw in mild_keywords):
        return "Mild"

    return "Moderate"


def load_and_preprocess():
    """Load from Kaggle and preprocess for MedSync."""
    print("Downloading dataset from Kaggle...")
    dataset_path = kagglehub.dataset_download("mghobashy/drug-drug-interactions")
    csv_path = Path(dataset_path) / "db_drug_interactions.csv"

    if not csv_path.exists():
        raise FileNotFoundError(f"Expected CSV at {csv_path}")

    df = pd.read_csv(csv_path)
    df.columns = ["drug1", "drug2", "interaction_description"]

    df["drug1"] = df["drug1"].str.strip().str.title()
    df["drug2"] = df["drug2"].str.strip().str.title()
    df["severity"] = df["interaction_description"].apply(infer_severity)

    df["pair_key"] = df.apply(
        lambda r: tuple(sorted([r["drug1"], r["drug2"]])), axis=1
    )
    df = df.drop_duplicates(subset=["pair_key"], keep="first").drop(
        columns=["pair_key"]
    )

    return df


def curate_subset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Keep 5k-20k interactions with mixed severity and common drugs.
    Common = high frequency (interacts with many other drugs).
    """
    from collections import Counter

    drug_counts = Counter()
    for _, row in df.iterrows():
        drug_counts[row["drug1"]] += 1
        drug_counts[row["drug2"]] += 1

    top_drugs = {d for d, _ in drug_counts.most_common(400)}
    subset = df[
        df["drug1"].isin(top_drugs) & df["drug2"].isin(top_drugs)
    ].copy()

    if len(subset) > TARGET_INTERACTIONS:
        subset = subset.sample(n=TARGET_INTERACTIONS, random_state=42)

    return subset[["drug1", "drug2", "severity", "interaction_description"]].rename(
        columns={"interaction_description": "description"}
    )


def build_interaction_map(df: pd.DataFrame) -> dict:
    """
    Build O(1) lookup map.
    Format: { "DrugA": { "DrugB": { "severity": "...", "description": "..." } } }
    """
    MAX_DESC_LEN = 150  # Truncate for smaller file size
    index = {}
    for _, row in df.iterrows():
        d1, d2 = row["drug1"], row["drug2"]
        desc = str(row["description"])
        if len(desc) > MAX_DESC_LEN:
            desc = desc[: MAX_DESC_LEN - 3] + "..."
        entry = {"severity": row["severity"], "description": desc}
        if d1 not in index:
            index[d1] = {}
        index[d1][d2] = entry
        if d2 not in index:
            index[d2] = {}
        index[d2][d1] = entry
    return index


def main():
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "data"
    data_dir.mkdir(exist_ok=True)

    df = load_and_preprocess()
    df_curated = curate_subset(df)

    print(f"Curated: {len(df_curated)} interactions "
          f"(from {len(df)}), mixed severity, common drugs")

    interaction_map = build_interaction_map(df_curated)

    out_path = data_dir / "drug_interactions.json"
    with open(out_path, "w") as f:
        json.dump(interaction_map, f, separators=(",", ":"))  # Compact, no indent

    size_kb = out_path.stat().st_size / 1024
    print(f"Exported to {out_path} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
