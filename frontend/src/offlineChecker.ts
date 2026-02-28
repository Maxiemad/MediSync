/**
 * MediSync offline checker – same logic as backend (interaction_checker + dosage_contraindications).
 * Data bundled from src/data/*.json. No network; works fully offline.
 */

import interactionsData from "./data/drug_interactions.json";
import dosageData from "./data/drug_dosage_limits.json";
import contraData from "./data/drug_contraindications.json";

const SEVERITY_SCORE: Record<string, number> = { Mild: 1, Moderate: 2, Severe: 3 };
const SEVERITY_COLORS: Record<string, string> = {
  Mild: "#22c55e",
  Moderate: "#f59e0b",
  Severe: "#ef4444",
  Unknown: "#6b7280",
};
const MIN_DRUGS = 2;
const MAX_DRUGS = 10;

const interactions = interactionsData as Record<string, Record<string, { severity: string; description: string }>>;
const lowerToCanonical: Record<string, string> = {};
for (const name of Object.keys(interactions)) {
  lowerToCanonical[name.toLowerCase()] = name;
}

const dosageLimits = dosageData as Record<string, { max_daily_mg?: number; unit?: string; route?: string }>;
const contraindications = contraData as Record<string, Record<string, string>>;

function overallRisk(mildCount: number, moderateCount: number, severeCount: number): string {
  let base: string;
  if (severeCount >= 1) base = "Severe";
  else if (moderateCount >= 1) base = "Moderate";
  else base = "Mild";
  if (base === "Mild" && mildCount >= 3) return "Moderate";
  if (base === "Moderate" && moderateCount >= 2) return "Severe";
  return base;
}

function confidenceLevel(pct: number): string {
  if (pct >= 80) return "High";
  if (pct >= 50) return "Medium";
  return "Low";
}

function riskExplanation(overall: string, unknownPairs: number): string {
  const base: Record<string, string> = {
    Mild: "Low interaction risk detected. Minimal clinical concern based on available data.",
    Moderate: "Moderate interaction risk detected. Monitoring may be required.",
    Severe: "Severe interaction risk detected. Increased cumulative toxicity risk.",
  };
  let text = base[overall] ?? "";
  if (unknownPairs > 0)
    text += " Note: Some drug pairs lack interaction data in the current offline database.";
  return text;
}

function recommendation(overall: string): string {
  const map: Record<string, string> = {
    Mild: "Continue current regimen. No changes required based on available interaction data.",
    Moderate: "Consider monitoring patient response. Review dosing if clinically indicated.",
    Severe: "Review prescription and monitor patient. Consider alternatives or dose adjustments.",
  };
  return map[overall] ?? "Review prescription and monitor patient.";
}

function lookupInteraction(drugA: string, drugB: string): { severity: string; description: string } | null {
  const e = interactions[drugA]?.[drugB];
  if (e) return e;
  return interactions[drugB]?.[drugA] ?? null;
}

function* pairs<T>(arr: T[]): Generator<[T, T]> {
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) yield [arr[i], arr[j]];
}

function checkDosageWarnings(
  _canonicalDrugs: string[],
  drugDoses: Array<{ drug?: string; name?: string; daily_mg?: number; daily_dose?: number }> | null
): Array<{ drug: string; daily_mg: number; max_daily_mg: number; unit?: string; message: string }> {
  const out: Array<{ drug: string; daily_mg: number; max_daily_mg: number; unit?: string; message: string }> = [];
  if (!drugDoses?.length) return out;
  for (const item of drugDoses) {
    const name = (item.drug ?? item.name ?? "").trim();
    if (!name) continue;
    const dailyMg = Number(item.daily_mg ?? item.daily_dose ?? 0);
    if (Number.isNaN(dailyMg)) continue;
    const canonical = lowerToCanonical[name.toLowerCase()] ?? name;
    const limit = dosageLimits[canonical];
    if (!limit || limit.max_daily_mg == null) continue;
    const maxMg = Number(limit.max_daily_mg);
    if (Number.isNaN(maxMg) || dailyMg <= maxMg) continue;
    const unit = limit.unit ?? "mg";
    out.push({
      drug: canonical,
      daily_mg: dailyMg,
      max_daily_mg: maxMg,
      unit,
      message: `Daily dose ${dailyMg} ${unit} exceeds maximum ${maxMg} for ${canonical}.`,
    });
  }
  return out;
}

function checkContraindicationWarnings(
  canonicalDrugs: string[],
  patientContext: Record<string, unknown> | null
): Array<{ drug: string; condition: string; advice: string; message: string }> {
  const out: Array<{ drug: string; condition: string; advice: string; message: string }> = [];
  if (!patientContext) return out;
  const active = Object.entries(patientContext)
    .filter(([, v]) => v)
    .map(([k]) => k.trim().toLowerCase());
  if (!active.length) return out;
  for (const drug of canonicalDrugs) {
    const contra = contraindications[drug] ?? {};
    for (const [cond, advice] of Object.entries(contra)) {
      if (advice && active.includes(cond.toLowerCase())) {
        out.push({
          drug,
          condition: cond,
          advice,
          message: `${drug}: ${cond} – ${advice}.`,
        });
      }
    }
  }
  return out;
}

export interface CheckResult {
  pair_results: Array<{
    drugA: string;
    drugB: string;
    severity: string;
    description: string;
    severity_score?: number;
  }>;
  graph_data: {
    nodes: Array<{ id: string }>;
    edges: Array<{
      source: string;
      target: string;
      severity: string;
      weight: number;
      color?: string;
      description?: string;
    }>;
    severity_color_map: Record<string, string>;
  };
  total_pairs: number;
  known_pairs: number;
  unknown_pairs: number;
  interactions_not_found: Array<{ drugA: string; drugB: string; description: string }>;
  confidence_percentage: number;
  confidence_level: string;
  graph_density: number;
  total_score: number;
  mild_count: number;
  moderate_count: number;
  severe_count: number;
  overall_risk: string;
  severity_score_map: Record<string, number>;
  highest_risk_pair: Record<string, unknown>;
  risk_explanation: string;
  recommendation: string;
  dosage_warnings: Array<{ drug: string; daily_mg: number; max_daily_mg: number; unit?: string; message: string }>;
  contraindication_warnings: Array<{ drug: string; condition: string; advice: string; message: string }>;
  warning?: string;
}

export function checkDrugInteractionsOffline(
  drugList: string[],
  options?: {
    drug_doses?: Array<{ drug?: string; name?: string; daily_mg?: number; daily_dose?: number }>;
    patient_context?: Record<string, unknown>;
  }
): CheckResult | { error: string } {
  const normalized: string[] = [];
  for (const d of drugList) {
    if (typeof d !== "string") continue;
    const raw = d.trim();
    if (!raw) continue;
    const key = lowerToCanonical[raw.toLowerCase()];
    if (key == null) return { error: "Drug not found in database" };
    normalized.push(key);
  }
  const seen = new Set<string>();
  const uniqueDrugs: string[] = [];
  for (const d of normalized) {
    if (seen.has(d)) continue;
    seen.add(d);
    uniqueDrugs.push(d);
  }
  if (uniqueDrugs.length < MIN_DRUGS) return { error: "At least two valid drugs are required." };
  if (uniqueDrugs.length > MAX_DRUGS) return { error: "Maximum 10 drugs allowed per request." };

  const n = uniqueDrugs.length;
  const totalPairs = (n * (n - 1)) / 2;
  const pairResults: CheckResult["pair_results"] = [];
  const graphNodes: Array<{ id: string }> = uniqueDrugs.map((id) => ({ id }));
  const graphEdges: CheckResult["graph_data"]["edges"] = [];
  const interactionsNotFound: Array<{ drugA: string; drugB: string; description: string }> = [];

  let totalScore = 0;
  let mildCount = 0;
  let moderateCount = 0;
  let severeCount = 0;
  let knownPairs = 0;
  let unknownPairs = 0;
  let highestRiskPair: Record<string, unknown> = {};
  let highestSeverityValue = 0;

  for (const [drugA, drugB] of pairs(uniqueDrugs)) {
    const entry = lookupInteraction(drugA, drugB);
    if (entry) {
      let severity = entry.severity === "Critical" ? "Severe" : entry.severity;
      if (!(severity in SEVERITY_SCORE)) severity = "Moderate";
      const description = entry.description ?? "";
      const weight = SEVERITY_SCORE[severity] ?? 2;
      totalScore += weight;
      if (severity === "Mild") mildCount++;
      else if (severity === "Moderate") moderateCount++;
      else if (severity === "Severe") severeCount++;
      knownPairs++;
      pairResults.push({
        drugA,
        drugB,
        severity,
        description,
        severity_score: weight,
      });
      graphEdges.push({
        source: drugA,
        target: drugB,
        severity,
        weight,
        color: SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.Unknown,
        description: (description || "").slice(0, 150),
      });
      if (weight > highestSeverityValue) {
        highestSeverityValue = weight;
        highestRiskPair = { drugA, drugB, severity, weight, description: entry.description ?? "" };
      }
    } else {
      unknownPairs++;
      pairResults.push({
        drugA,
        drugB,
        severity: "Unknown",
        description: "No interaction data available in the current database.",
      });
      interactionsNotFound.push({
        drugA,
        drugB,
        description: "No interaction data available in the current database.",
      });
    }
  }

  const overall = overallRisk(mildCount, moderateCount, severeCount);
  const confidencePercentage = totalPairs > 0 ? Math.round((knownPairs / totalPairs) * 10000) / 100 : 100;
  const confidenceLevelLabel = confidenceLevel(confidencePercentage);
  const graphDensity = totalPairs > 0 ? Math.round((knownPairs / totalPairs) * 100) / 100 : 1;

  const result: CheckResult = {
    pair_results: pairResults,
    graph_data: {
      nodes: graphNodes,
      edges: graphEdges,
      severity_color_map: SEVERITY_COLORS,
    },
    total_pairs: totalPairs,
    known_pairs: knownPairs,
    unknown_pairs: unknownPairs,
    interactions_not_found: interactionsNotFound,
    confidence_percentage: confidencePercentage,
    confidence_level: confidenceLevelLabel,
    graph_density: graphDensity,
    total_score: totalScore,
    mild_count: mildCount,
    moderate_count: moderateCount,
    severe_count: severeCount,
    overall_risk: overall,
    severity_score_map: SEVERITY_SCORE,
    highest_risk_pair: highestRiskPair,
    risk_explanation: riskExplanation(overall, unknownPairs),
    recommendation: recommendation(overall),
    dosage_warnings: checkDosageWarnings(uniqueDrugs, options?.drug_doses ?? null),
    contraindication_warnings: checkContraindicationWarnings(uniqueDrugs, options?.patient_context ?? null),
  };
  if (unknownPairs > 0) result.warning = "Some drug pairs are missing interaction data.";
  return result;
}
