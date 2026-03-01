import { checkDrugInteractionsOffline } from "./offlineChecker";

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
    severity_color_map?: Record<string, string>;
  };
  total_pairs: number;
  known_pairs: number;
  unknown_pairs: number;
  confidence_percentage: number;
  overall_risk: string;
  risk_explanation: string;
  recommendation: string;
  dosage_warnings?: Array<{ drug: string; message: string; daily_mg?: number; max_daily_mg?: number }>;
  contraindication_warnings?: Array<{ drug: string; condition: string; advice: string; message?: string }>;
  warning?: string;
  highest_risk_pair?: { drugA?: string; drugB?: string; severity?: string; description?: string };
}

export interface CheckOptions {
  drug_doses?: Array<{ drug?: string; name?: string; daily_mg?: number; daily_dose?: number }>;
  patient_context?: Record<string, unknown>;
}

/**
 * Check drug interactions using bundled offline logic and data.
 * No network required – works fully offline.
 */
export function checkInteractions(drugs: string[], options?: CheckOptions): Promise<CheckResult> {
  const result = checkDrugInteractionsOffline(drugs, options);
  if ("error" in result) {
    return Promise.reject(new Error(result.error));
  }
  return Promise.resolve(result as CheckResult);
}
