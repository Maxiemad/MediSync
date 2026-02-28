/**
 * Calm Intelligence – risk-based background tints (very subtle).
 * Mild → soft green, Moderate → warm beige, Severe → light muted coral.
 */
export const riskBackgroundTint: Record<string, string> = {
  Mild: "rgba(234, 244, 241, 0.6)",      // sage
  Moderate: "rgba(249, 245, 238, 0.5)",   // warm beige
  Severe: "rgba(249, 238, 238, 0.4)",    // very light muted coral
  Unknown: "rgba(245, 244, 249, 0.5)",   // gray-lilac
};

export const severityColors: Record<string, string> = {
  Mild: "#8FBC9A",
  Moderate: "#D4A574",
  Severe: "#C97B7B",
  Unknown: "#9B8FA6",
};

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_KEY = import.meta.env.VITE_API_KEY || "medisync-demo-key-2024";
