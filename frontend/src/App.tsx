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
                <div className="rounded-2xl bg-white/80 shadow-soft px-6 py-4 text-severe border border-severe/30">
                  {error}
                </div>
              </div>
            )}
            {!result && !error && (
              <div className="max-w-2xl mx-auto mt-8 px-4 flex justify-center">
                <div className="rounded-2xl glass px-8 py-6 text-slate-600">Checking interactions…</div>
              </div>
            )}
            {result && <Results data={result} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
