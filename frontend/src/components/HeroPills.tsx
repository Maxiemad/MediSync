import { motion } from "framer-motion";

export default function HeroPills() {
  return (
    <div className="flex items-center justify-center gap-6">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-12 h-8 rounded-full bg-white/80 shadow-card border border-white/60"
          style={{ rotateX: 20, rotateY: i * 15 }}
          animate={{
            y: [0, -8, 0],
            rotateY: [i * 15, i * 15 + 5, i * 15],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
