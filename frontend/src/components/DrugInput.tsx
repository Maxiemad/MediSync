import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { checkInteractions } from "../api";

interface DrugInputProps {
  id?: string;
  onSubmit: (drugs: string[]) => void;
  onResult: (data: Awaited<ReturnType<typeof checkInteractions>>) => void;
  onError: (message: string) => void;
  initialDrugs: string[];
  compact?: boolean;
}

export default function DrugInput({
  id,
  onSubmit,
  onResult,
  onError,
  initialDrugs,
  compact = false,
}: DrugInputProps) {
  const [drugs, setDrugs] = useState<string[]>(initialDrugs);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDrugs(initialDrugs);
  }, [initialDrugs]);

  const addDrug = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || drugs.length >= 10) return;
    if (drugs.some((d) => d.toLowerCase() === trimmed.toLowerCase())) return;
    setDrugs((prev) => [...prev, trimmed]);
    setInput("");
  };

  const removeDrug = (index: number) => {
    setDrugs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDrug(input);
    }
  };

  const handleSubmit = async () => {
    if (drugs.length < 2) {
      onError("Please add at least 2 drugs.");
      return;
    }
    if (drugs.length > 10) {
      onError("Maximum 10 drugs allowed.");
      return;
    }
    setLoading(true);
    onSubmit(drugs);
    try {
      const data = await checkInteractions(drugs);
      onResult(data);
      document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id={id} className="relative z-10 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <motion.div
          layout
          className="rounded-3xl glass border border-white/60 shadow-card p-6 sm:p-8"
          initial={compact ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {!compact && (
            <h2 className="font-display font-semibold text-xl text-teal mb-4">Check drug interactions</h2>
          )}
          <p className="text-slate-600 text-sm mb-4">
            Add 2–10 drugs (e.g. Ibuprofen, Warfarin). Comma or Enter to add.
          </p>
          <div
            className="flex flex-wrap gap-2 p-3 rounded-2xl bg-white/60 border border-sage-dark/40 min-h-[52px]"
            onClick={() => inputRef.current?.focus()}
          >
            <AnimatePresence mode="popLayout">
              {drugs.map((drug, i) => (
                <motion.span
                  key={`${drug}-${i}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal/12 text-teal px-3 py-1.5 text-sm font-medium"
                >
                  {drug}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDrug(i);
                    }}
                    className="hover:bg-teal/20 rounded-full p-0.5 transition-colors"
                    aria-label="Remove"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => input && addDrug(input)}
              placeholder={drugs.length === 0 ? "Type drug name..." : ""}
              className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 py-1"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || drugs.length < 2}
              className="rounded-xl bg-teal text-white font-medium px-6 py-3 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-light transition-colors"
            >
              {loading ? "Checking..." : "Check interactions"}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
