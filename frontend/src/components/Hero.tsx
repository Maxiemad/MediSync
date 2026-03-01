import { motion } from "framer-motion";
import HeroPills from "./HeroPills";
import ParticleBackground from "./ParticleBackground";
import Hero3DScene from "./Hero3DScene";

interface HeroProps {
  onStart: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden px-4 pt-16 pb-12">
      <ParticleBackground />
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-4 w-full max-w-[320px] mx-auto"
        >
          <Hero3DScene />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-teal/10 text-teal px-4 py-1.5 text-sm font-medium">
            <ShieldIcon className="w-4 h-4" />
            Safety First
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-teal-dark tracking-tight mb-4"
        >
          Medication Safety Made Intelligent.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-slate-600 text-lg sm:text-xl mb-10 max-w-lg"
        >
          Check drug interactions with a calm, clear view. No alarm, no clutter—just clarity.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <button
            onClick={onStart}
            className="rounded-2xl bg-teal text-white font-semibold px-8 py-4 shadow-soft hover:shadow-glow hover:bg-teal-light active:scale-[0.98] transition-all duration-300 ease-out"
          >
            Start Checking
          </button>
        </motion.div>
      </div>
      <div className="relative z-10 mt-12">
        <HeroPills />
      </div>
    </section>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
