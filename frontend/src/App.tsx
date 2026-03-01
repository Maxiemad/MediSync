import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { riskBackgroundTint } from "./theme";
import { CheckResult } from "./api";
import Hero from "./components/Hero";
import DrugInput from "./components/DrugInput";
import Results from "./components/Results";

export default function App() {
  const [drugs, setDrugs] = useState<string[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const riskLevel = result?.overall_risk ?? "Mild";
  const bgTint = useMemo(
    () => riskBackgroundTint[riskLevel] ?? riskBackgroundTint.Mild,
    [riskLevel]
  );

  const handleSubmit = (drugList: string[]) => {
    setDrugs(drugList);
    setResult(null);
    setError(null);
    setHasChecked(true);
  };

  const handleResult = (data: CheckResult) => {
    setResult(data);
    setError(null);
  };

  const handleError = (msg: string) => {
    setError(msg);
    setResult(null);
  };

  const goBackToStart = () => {
    setHasChecked(false);
    setResult(null);
    setError(null);
    setDrugs([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="min-h-screen transition-[background-color] duration-[800ms] ease-out"
      style={{
        backgroundColor: hasChecked && result ? bgTint : "var(--bg-sage)",
      }}
    >
      <AnimatePresence mode="wait">
        {!hasChecked && !result && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Hero onStart={() => document.getElementById("drug-input")?.scrollIntoView({ behavior: "smooth" })} />
            <DrugInput
              id="drug-input"
              onSubmit={handleSubmit}
              onResult={handleResult}
              onError={handleError}
              initialDrugs={[]}
            />
          </motion.div>
        )}

        {hasChecked && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="pb-24"
          >
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-sage-dark/20 shadow-sm">
              <div className="max-w-2xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goBackToStart}
                  className="flex items-center gap-2 rounded-xl text-teal font-medium px-4 py-2.5 hover:bg-teal/10 transition-colors text-sm"
                  aria-label="Back to start"
                >
                  <BackIcon className="w-4 h-4" />
                  Back to start
                </button>
                <span className="text-slate-500 text-sm">or change drugs below and check again</span>
              </div>
            </div>
            <DrugInput
              id="drug-input-top"
              onSubmit={handleSubmit}
              onResult={handleResult}
              onError={handleError}
              initialDrugs={drugs}
              compact
            />
            {error && (
              <div className="max-w-2xl mx-auto mt-6 px-4">
                <div className="rounded-2xl bg-red-50/90 border border-red-200 shadow-soft px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 shrink-0 mt-0.5" aria-hidden>⚠️</span>
                    <p className="text-red-900 text-sm font-medium">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 rounded-lg bg-red-100 text-red-800 px-4 py-2 text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {!result && !error && (
              <div className="max-w-2xl mx-auto mt-8 px-4 flex justify-center">
                <div className="rounded-2xl glass px-8 py-6 text-slate-600">Checking interactions…</div>
              </div>
            )}
            {result && <Results data={result} onBackToStart={goBackToStart} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
