'use client';

import { Canvas } from '@react-three/fiber';
import { ParticleGlobe } from './ParticleGlobe';
import { Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';

export function HeroScene() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <ParticleGlobe reducedMotion={Boolean(reduceMotion)} />
        </Suspense>
      </Canvas>
    </div>
  );
}
