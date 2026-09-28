'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const particleCount = 2000;
const particles = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos((Math.random() * 2) - 1);
  const r = 2.5 + (Math.random() * 0.1);

  particles[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  particles[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  particles[i * 3 + 2] = r * Math.cos(phi);
}

const ringGeometry1 = new THREE.BufferGeometry().setFromPoints(
  new THREE.EllipseCurve(0, 0, 3.2, 3.2, 0, 2 * Math.PI, false, 0).getPoints(100)
);
const ringGeometry2 = new THREE.BufferGeometry().setFromPoints(
  new THREE.EllipseCurve(0, 0, 3.6, 3.6, 0, 2 * Math.PI, false, 0).getPoints(100)
);
const ringGeometry3 = new THREE.BufferGeometry().setFromPoints(
  new THREE.EllipseCurve(0, 0, 4.0, 4.0, 0, 2 * Math.PI, false, 0).getPoints(100)
);

export function ParticleGlobe({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const ringRef1 = useRef<THREE.Line>(null);
  const ringRef2 = useRef<THREE.Line>(null);
  const ringRef3 = useRef<THREE.Line>(null);

  useFrame((state) => {
    if (reducedMotion) return;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x = state.clock.elapsedTime * 0.1;
      ringRef1.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.y = state.clock.elapsedTime * 0.08;
      ringRef2.current.rotation.z = state.clock.elapsedTime * 0.03;
    }
    if (ringRef3.current) {
      ringRef3.current.rotation.z = state.clock.elapsedTime * 0.12;
      ringRef3.current.rotation.x = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.015} color="#a1a1aa" transparent opacity={0.6} sizeAttenuation />
      </points>

      <primitive object={new THREE.Line(ringGeometry1, new THREE.LineBasicMaterial({ color: '#52525b', transparent: true, opacity: 0.3 }))} ref={ringRef1} />
      <primitive object={new THREE.Line(ringGeometry2, new THREE.LineBasicMaterial({ color: '#3f3f46', transparent: true, opacity: 0.3 }))} ref={ringRef2} />
      <primitive object={new THREE.Line(ringGeometry3, new THREE.LineBasicMaterial({ color: '#27272a', transparent: true, opacity: 0.3 }))} ref={ringRef3} />
    </group>
  );
}
