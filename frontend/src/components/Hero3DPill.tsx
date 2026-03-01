import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";

export default function Hero3DPill() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      {/* Capsule: cylinder with rounded ends (three.js has no built-in capsule, use cylinder with radius = height/2 for pill shape) */}
      <cylinderGeometry args={[0.35, 0.35, 1.2, 24]} />
      <meshStandardMaterial
        color="#2E7C7B"
        metalness={0.15}
        roughness={0.6}
        envMapIntensity={1}
      />
    </mesh>
  );
}
