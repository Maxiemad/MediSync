import { useMemo } from "react";
import { motion } from "framer-motion";

const COUNT = 24;
const COLORS = ["#2E7C7B", "#8FBC9A", "#9B8FA6"];

export default function ParticleBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 10,
        y: Math.random() * 100 - 10,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 4,
        color: COLORS[i % COLORS.length],
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: 0.2,
          }}
          animate={{
            opacity: [0.15, 0.35, 0.15],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
