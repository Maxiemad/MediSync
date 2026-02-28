import { motion } from "framer-motion";
import { CheckResult } from "../api";
import { severityColors } from "../theme";
import RiskCard from "./RiskCard";
import InteractionGraph from "./InteractionGraph";
import InteractionTable from "./InteractionTable";

interface ResultsProps {
  data: CheckResult;
}

export default function Results({ data }: ResultsProps) {
  return (
    <section id="results-section" className="relative z-10 px-4 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <RiskCard
          overallRisk={data.overall_risk}
          confidence={data.confidence_percentage}
          explanation={data.risk_explanation}
          recommendation={data.recommendation}
        />

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
              <div className="h-[420px] bg-sage/30">
                <InteractionGraph
                  nodes={data.graph_data.nodes}
                  edges={data.graph_data.edges}
                  severityColors={data.graph_data.severity_color_map ?? severityColors}
                />
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
            className="rounded-2xl bg-amber-50/80 border border-moderate/30 p-4 text-sm text-slate-700"
          >
            <strong className="text-moderate">Dosage:</strong>{" "}
            {data.dosage_warnings!.map((w) => w.message).join(" ")}
          </motion.div>
        )}
        {(data.contraindication_warnings?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-severe/10 border border-severe/20 p-4 text-sm text-slate-700"
          >
            <strong className="text-severe">Contraindications:</strong>{" "}
            {data.contraindication_warnings!.map((w) => `${w.drug}: ${w.condition} – ${w.advice}`).join(" ")}
          </motion.div>
        )}
      </div>
    </section>
  );
}
