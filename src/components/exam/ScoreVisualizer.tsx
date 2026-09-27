'use client';

import { motion } from 'framer-motion';

interface ScoreVisualizerProps {
  percentage: number;
}

export function ScoreVisualizer({ percentage }: ScoreVisualizerProps) {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
      {/* Minimal SVG Circle for Score */}
      <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle 
          cx="50" cy="50" r="45" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="8" 
          className="text-muted/30"
        />
        <motion.circle 
          cx="50" cy="50" r="45" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="8" 
          strokeLinecap="round"
          className="text-primary"
          initial={{ strokeDasharray: "0 283" }}
          animate={{ strokeDasharray: `${percentage * 2.83} 283` }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        />
      </svg>
      <div className="text-center z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-5xl font-extrabold"
        >
          {percentage}%
        </motion.div>
      </div>
    </div>
  );
}
