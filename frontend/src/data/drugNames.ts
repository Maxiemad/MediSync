/**
 * Drug names from interaction dataset – for autocomplete only.
 * Same data as drug_interactions.json keys; keeps bundle from loading JSON twice
 * when offlineChecker already imports it (Vite dedupes the module).
 */
import interactionsData from "./drug_interactions.json";

const data = interactionsData as Record<string, unknown>;
export const drugNames: string[] = Object.keys(data).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

export function filterDrugNames(prefix: string, limit = 12): string[] {
  const q = prefix.trim().toLowerCase();
  if (!q) return [];
  const out: string[] = [];
  for (const name of drugNames) {
    if (name.toLowerCase().startsWith(q) || name.toLowerCase().includes(q)) {
      out.push(name);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Drugs starting with the given letter (A–Z), alphabetically sorted. For browse-by-letter. */
export function getDrugNamesByLetter(letter: string, limit = 24): string[] {
  const L = letter.trim().toUpperCase().slice(0, 1);
  if (!L) return [];
  const out: string[] = [];
  for (const name of drugNames) {
    if (name.toUpperCase().startsWith(L)) {
      out.push(name);
      if (out.length >= limit) break;
    }
  }
  return out;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export function getLettersWithDrugs(): string[] {
  return LETTERS.filter((L) => getDrugNamesByLetter(L, 1).length > 0);
}
