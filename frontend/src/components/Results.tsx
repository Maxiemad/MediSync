import { motion } from "framer-motion";
import { CheckResult } from "../api";
import { severityColors } from "../theme";
import RiskCard from "./RiskCard";
import InteractionGraph from "./InteractionGraph";
import InteractionTable from "./InteractionTable";

interface ResultsProps {
  data: CheckResult;
  onBackToStart?: () => void;
}

export default function Results({ data, onBackToStart }: ResultsProps) {
  const hasWarning = Boolean(data.warning);

  return (
    <section id="results-section" className="relative z-10 px-4 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <RiskCard
          overallRisk={data.overall_risk}
          confidence={data.confidence_percentage}
          explanation={data.risk_explanation}
          recommendation={data.recommendation}
          highestRiskPair={data.highest_risk_pair}
        />

        {hasWarning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-slate-100/90 border border-slate-300/60 px-4 py-3 text-sm text-slate-700 flex items-start gap-3"
          >
            <span className="text-slate-500 shrink-0" aria-hidden>ℹ️</span>
            <span>{data.warning} Consider discussing with your doctor for a complete picture.</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="rounded-3xl glass border border-white/60 shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-sage-dark/20 bg-white/40">
                <h3 className="font-display font-semibold text-teal">Interaction graph</h3>
                <p className="text-sm text-slate-600">Nodes are drugs; edges show known interactions.</p>
              </div>
              <div className="h-[420px] bg-sage/30 relative">
                <InteractionGraph
                  nodes={data.graph_data.nodes}
                  edges={data.graph_data.edges}
                  severityColors={data.graph_data.severity_color_map ?? severityColors}
                />
                {data.graph_data.edges.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm bg-sage/20 rounded-b-3xl">
                    No known interactions between these drugs in our database.
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="rounded-3xl glass border border-white/60 shadow-card overflow-hidden h-full flex flex-col">
              <div className="px-4 py-3 border-b border-sage-dark/20 bg-white/40">
                <h3 className="font-display font-semibold text-teal">Interactions</h3>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <InteractionTable pairs={data.pair_results} severityColors={severityColors} />
              </div>
            </div>
          </motion.div>
        </div>

        {(data.dosage_warnings?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-amber-50/80 border border-amber-300/50 p-4 text-sm text-slate-700 space-y-1"
          >
            <strong className="text-amber-800">Dosage warnings</strong>
            <ul className="list-disc list-inside">
              {data.dosage_warnings!.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </motion.div>
        )}
        {(data.contraindication_warnings?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-red-50/80 border border-red-200/50 p-4 text-sm text-slate-700 space-y-1"
          >
            <strong className="text-red-800">Contraindications</strong>
            <ul className="list-disc list-inside">
              {data.contraindication_warnings!.map((w, i) => (
                <li key={i}>{w.drug}: {w.condition} – {w.advice}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {onBackToStart && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 flex justify-center"
          >
            <button
              type="button"
              onClick={onBackToStart}
              className="rounded-xl border-2 border-teal text-teal font-medium px-6 py-3 hover:bg-teal/10 transition-colors flex items-center gap-2"
            >
              <BackIcon className="w-5 h-5" />
              Back to start
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
