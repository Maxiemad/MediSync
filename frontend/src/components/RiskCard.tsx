import { motion } from "framer-motion";
import { severityColors } from "../theme";

interface RiskCardProps {
  overallRisk: string;
  confidence: number;
  explanation: string;
  recommendation: string;
  highestRiskPair?: { drugA?: string; drugB?: string; severity?: string; description?: string };
}

export default function RiskCard({
  overallRisk,
  confidence,
  explanation,
  recommendation,
  highestRiskPair,
}: RiskCardProps) {
  const color = severityColors[overallRisk] ?? severityColors.Unknown;
  const hasHighest = highestRiskPair && (highestRiskPair.drugA ?? highestRiskPair.drugB);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl glass border border-white/60 shadow-card overflow-hidden"
    >
      <div className="p-6 sm:p-8 flex flex-wrap items-start gap-6">
        <div className="flex items-center gap-4">
          <div
            className="rounded-2xl p-4 flex items-center justify-center"
            style={{ backgroundColor: `${color}22` }}
          >
            <ShieldIcon className="w-10 h-10" style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Overall risk</p>
            <p className="font-display font-bold text-2xl" style={{ color }}>
              {overallRisk.toUpperCase()}
            </p>
            <p className="text-sm text-slate-600 mt-0.5">Confidence: {confidence}%</p>
          </div>
        </div>
        <div className="flex-1 min-w-[280px] space-y-3">
          <p className="text-slate-700">{explanation}</p>
          <p className="text-slate-600 text-sm font-medium">{recommendation}</p>
          {hasHighest && (
            <div
              className="rounded-xl p-3 text-sm border"
              style={{ backgroundColor: `${severityColors[highestRiskPair!.severity ?? "Unknown"]}18`, borderColor: `${severityColors[highestRiskPair!.severity ?? "Unknown"]}44` }}
            >
              <p className="font-medium text-slate-700 mb-0.5">
                Highest risk pair: {highestRiskPair!.drugA} + {highestRiskPair!.drugB}
                {highestRiskPair!.severity && (
                  <span className="ml-1.5 font-semibold" style={{ color: severityColors[highestRiskPair!.severity] }}>
                    ({highestRiskPair!.severity})
                  </span>
                )}
              </p>
              {highestRiskPair!.description && (
                <p className="text-slate-600 text-xs leading-snug">{highestRiskPair!.description}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ShieldIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
