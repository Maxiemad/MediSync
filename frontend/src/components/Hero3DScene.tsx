import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import Hero3DPill from "./Hero3DPill";

export default function Hero3DScene() {
  return (
    <div className="w-full h-[200px] sm:h-[240px] rounded-2xl overflow-hidden bg-gradient-to-b from-teal/10 to-sage/30 border border-white/60 shadow-soft">
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} castShadow />
        <pointLight position={[-3, -2, 2]} intensity={0.4} color="#8FBC9A" />
        <Suspense fallback={null}>
          <Hero3DPill />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.2}
          maxPolarAngle={Math.PI / 2 + 0.2}
          minPolarAngle={Math.PI / 2 - 0.2}
        />
      </Canvas>
    </div>
  );
}
