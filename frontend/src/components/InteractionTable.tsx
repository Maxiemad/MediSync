import { motion } from "framer-motion";

interface Pair {
  drugA: string;
  drugB: string;
  severity: string;
  description: string;
}

interface InteractionTableProps {
  pairs: Pair[];
  severityColors: Record<string, string>;
}

export default function InteractionTable({ pairs, severityColors }: InteractionTableProps) {
  return (
    <ul className="space-y-3">
      {pairs.map((p, i) => {
        const color = severityColors[p.severity] ?? severityColors.Unknown;
        return (
          <motion.li
            key={`${p.drugA}-${p.drugB}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl p-3 bg-white/50 border border-sage-dark/30"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-teal">{p.drugA}</span>
              <span className="text-slate-400">+</span>
              <span className="font-medium text-teal">{p.drugB}</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-lg"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {p.severity}
              </span>
            </div>
            {p.description && (
              <p className="text-sm text-slate-600 mt-1.5 leading-snug">{p.description}</p>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
