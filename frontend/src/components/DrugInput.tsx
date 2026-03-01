import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { checkInteractions, CheckOptions } from "../api";
import { drugNames, filterDrugNames, getDrugNamesByLetter, getLettersWithDrugs } from "../data/drugNames";

interface DrugInputProps {
  id?: string;
  onSubmit: (drugs: string[]) => void;
  onResult: (data: Awaited<ReturnType<typeof checkInteractions>>) => void;
  onError: (message: string) => void;
  initialDrugs: string[];
  compact?: boolean;
}

const PATIENT_CONTEXT_OPTIONS = [
  { key: "pregnancy", label: "Pregnancy" },
  { key: "severe_liver_impairment", label: "Severe liver impairment" },
  { key: "penicillin_allergy", label: "Penicillin allergy" },
  { key: "renal_impairment", label: "Renal impairment" },
] as const;

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [drugDoses, setDrugDoses] = useState<Record<string, string>>({});
  const [patientContext, setPatientContext] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setDrugs(initialDrugs);
  }, [initialDrugs]);

  // Single letter (A–Z) → show only drugs starting with that letter. Otherwise typeahead search.
  useEffect(() => {
    const trimmed = input.trim();
    const isSingleLetter = trimmed.length === 1 && /^[A-Za-z]$/.test(trimmed);
    const list = isSingleLetter
      ? getDrugNamesByLetter(trimmed, 100)
      : filterDrugNames(input, 15);
    setSuggestions(list);
    setHighlightIndex(0);
    setShowSuggestions(trimmed.length > 0 && list.length > 0);
  }, [input]);

  const addDrug = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || drugs.length >= 10) return;
    const canonical =
      suggestions.find((s) => s.toLowerCase() === trimmed.toLowerCase()) ??
      drugNames.find((s) => s.toLowerCase() === trimmed.toLowerCase()) ??
      trimmed;
    const inDb = drugNames.some((n) => n.toLowerCase() === canonical.toLowerCase());
    if (!inDb) return;
    if (drugs.some((d) => d.toLowerCase() === canonical.toLowerCase())) return;
    setDrugs((prev) => [...prev, canonical]);
    setInput("");
    setShowSuggestions(false);
  };

  const handleAddClick = () => {
    if (showSuggestions && suggestions.length > 0) {
      addDrug(suggestions[highlightIndex] ?? input);
      return;
    }
    addDrug(input);
  };

  const lettersWithDrugs = getLettersWithDrugs();
  const onLetterClick = (letter: string) => {
    const L = letter.toUpperCase();
    const list = getDrugNamesByLetter(L, 100);
    setInput(L);
    setSuggestions(list);
    setHighlightIndex(0);
    setShowSuggestions(list.length > 0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const removeDrug = (index: number) => {
    setDrugs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (highlightIndex + 1) % suggestions.length;
        setHighlightIndex(next);
        setTimeout(() => listRef.current?.children[next + 1]?.scrollIntoView({ block: "nearest" }), 0);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (highlightIndex - 1 + suggestions.length) % suggestions.length;
        setHighlightIndex(prev);
        setTimeout(() => listRef.current?.children[prev + 1]?.scrollIntoView({ block: "nearest" }), 0);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        addDrug(suggestions[highlightIndex] ?? input);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (suggestions.length === 1) addDrug(suggestions[0]);
      else addDrug(input);
    }
  };

  const buildOptions = (): CheckOptions => {
    const doses = drugs
      .filter((d) => drugDoses[d] !== undefined && drugDoses[d] !== "")
      .map((d) => ({ drug: d, daily_mg: Number(drugDoses[d]) }));
    const context: Record<string, unknown> = {};
    PATIENT_CONTEXT_OPTIONS.forEach(({ key }) => {
      if (patientContext[key]) context[key] = true;
    });
    return {
      drug_doses: doses.length ? doses : undefined,
      patient_context: Object.keys(context).length ? context : undefined,
    };
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
      const options = buildOptions();
      const data = await checkInteractions(drugs, options);
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
          <p className="text-slate-600 text-sm mb-3">
            Add 2–10 drugs. Type for suggestions, use <strong>Add</strong> to add by click, or browse <strong>A–Z</strong>.
          </p>

          {/* A–Z alphabetical browse: only letters that have drugs */}
          {!compact && lettersWithDrugs.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Browse by letter (A–Z)</p>
              <div className="flex flex-wrap gap-1">
                {lettersWithDrugs.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => onLetterClick(letter)}
                    className="w-8 h-8 rounded-lg border border-sage-dark/40 bg-white/70 text-slate-600 text-sm font-medium hover:bg-teal/15 hover:border-teal/40 hover:text-teal transition-colors"
                    aria-label={`Drugs starting with ${letter}`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <div
              className="flex flex-wrap gap-2 p-3 rounded-2xl bg-white/60 border border-sage-dark/40 min-h-[52px] items-center"
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
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => input.trim() && setShowSuggestions(suggestions.length > 0)}
                placeholder={drugs.length === 0 ? "Type drug name (e.g. Ibuprofen)..." : ""}
                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 py-1"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="drug-suggestions"
                id="drug-input-field"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddClick();
                }}
                className="shrink-0 rounded-xl bg-teal text-white font-medium px-4 py-2 text-sm hover:bg-teal-light transition-colors flex items-center gap-1.5"
                aria-label="Add drug"
              >
                <PlusIcon className="w-4 h-4" />
                Add
              </button>
            </div>
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.ul
                  id="drug-suggestions"
                  ref={listRef}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white border border-sage-dark/30 shadow-lg max-h-56 overflow-auto z-50 py-1"
                  role="listbox"
                  aria-label="Drug suggestions (alphabetical A–Z)"
                >
                  <li className="px-4 py-1.5 text-xs font-medium text-slate-400 border-b border-slate-100 sticky top-0 bg-white z-10">
                    {input.trim().length === 1 && /^[A-Za-z]$/.test(input.trim())
                      ? `Drugs starting with "${input.trim().toUpperCase()}" – click to add`
                      : "Alphabetical (A–Z) – click to add"}
                  </li>
                  {suggestions.map((name, i) => (
                    <li
                      key={name}
                      role="option"
                      aria-selected={i === highlightIndex}
                      className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                        i === highlightIndex ? "bg-teal/15 text-teal font-medium" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addDrug(name);
                      }}
                    >
                      {name}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* Optional: dosage & patient context */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((a) => !a)}
              className="text-sm text-teal font-medium hover:underline flex items-center gap-1"
            >
              {showAdvanced ? "▼" : "▶"} Add dosage & patient context (optional)
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-4 rounded-2xl bg-white/50 border border-sage-dark/30 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Daily dose (mg) per drug</p>
                      <div className="flex flex-wrap gap-2">
                        {drugs.map((d) => (
                          <label key={d} className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 whitespace-nowrap">{d}:</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="mg"
                              value={drugDoses[d] ?? ""}
                              onChange={(e) => setDrugDoses((prev) => ({ ...prev, [d]: e.target.value }))}
                              className="w-20 rounded-lg border border-sage-dark/40 px-2 py-1 text-sm"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Patient context (if applicable)</p>
                      <div className="flex flex-wrap gap-3">
                        {PATIENT_CONTEXT_OPTIONS.map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={patientContext[key] ?? false}
                              onChange={(e) => setPatientContext((prev) => ({ ...prev, [key]: e.target.checked }))}
                              className="rounded border-sage-dark/40 text-teal"
                            />
                            <span className="text-sm text-slate-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || drugs.length < 2}
              className="rounded-xl bg-teal text-white font-medium px-6 py-3 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-light transition-colors"
            >
              {loading ? "Checking…" : "Check interactions"}
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
