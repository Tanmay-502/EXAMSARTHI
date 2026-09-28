"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LucideIcon,
  Mic, 
  Brain, 
  ShieldCheck, 
  Database, 
  Settings2, 
  RadioTower, 
  Volume2, 
  Server,
  ArrowRight,
  ArrowDown
} from 'lucide-react';
import Link from 'next/link';

interface SystemNode {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  details: string[];
}

const nodes: SystemNode[] = [
  {
    id: "input",
    title: "Voice Gateway",
    description: "Captures user speech and handles ambient noise cancellation.",
    icon: Mic,
    details: [
      "Web Speech API (SpeechRecognition)",
      "Continuous listening mode",
      "Auto-restart on silence timeouts",
      "Volume threshold detection"
    ]
  },
  {
    id: "assistant",
    title: "Global Assistant",
    description: "Orchestrates intent parsing and state transitions.",
    icon: Brain,
    details: [
      "Maintains ConversationState",
      "Normalizes transcript text",
      "Deterministic Command Parser",
      "LLM fallback (when enabled)"
    ]
  },
  {
    id: "security",
    title: "Safe Action Registry",
    description: "Authorizes and maps voice intents to application state.",
    icon: ShieldCheck,
    details: [
      "Context-aware execution boundaries",
      "Prevents out-of-scope actions",
      "State machine transitions",
      "Validates exam rules"
    ]
  },
  {
    id: "engine",
    title: "Exam Engine",
    description: "The core React state machine governing the active test.",
    icon: Settings2,
    details: [
      "IDLE → SPEAKING → LISTENING → PROCESSING",
      "Handles mark-for-review",
      "Timer and auto-submit logic",
      "Accessible DOM reflection"
    ]
  },
  {
    id: "database",
    title: "Supabase Backend",
    description: "Secure, real-time persistence and authentication.",
    icon: Database,
    details: [
      "Row Level Security (RLS) policies",
      "Candidate session isolation",
      "Server-side grading",
      "Stateless session recovery"
    ]
  },
  {
    id: "output",
    title: "Speech Synthesis",
    description: "Provides screen-reader-like auditory feedback.",
    icon: Volume2,
    details: [
      "Web Speech API (SpeechSynthesis)",
      "Interruptible announcements",
      "Custom voice and rate selection",
      "Aria-live assertive DOM updates"
    ]
  }
];

const RobotVisual = () => (
  <motion.div
    initial={{ y: 0 }}
    animate={{ y: [-5, 5, -5] }}
    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-4 mr-4"
  >
    <svg 
      width="40" 
      height="40" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ExamSaarthi voice assistant"
    >
      <rect x="25" y="35" width="50" height="35" rx="8" fill="#27272a" stroke="#e4e4e7" strokeWidth="4" />
      <circle cx="40" cy="52" r="5" fill="#a855f7" />
      <circle cx="60" cy="52" r="5" fill="#a855f7" />
      <path d="M45 65 Q 50 68 55 65" stroke="#e4e4e7" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="35" x2="50" y2="20" stroke="#e4e4e7" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="15" r="5" fill="#3b82f6" />
      <path d="M15 52 L 25 52" stroke="#e4e4e7" strokeWidth="4" strokeLinecap="round" />
      <path d="M75 52 L 85 52" stroke="#e4e4e7" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </motion.div>
);

export default function ArchitecturePage() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center py-16 px-6 md:px-12 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-6xl z-10 space-y-16">
        <header className="text-center space-y-6">
          <div className="flex justify-center items-center">
            <RobotVisual />
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
              <Server className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-100">
            System Architecture
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            ExamSaarthi V2 is built on a resilient, accessible, voice-first architecture designed to decouple input from UI presentation.
          </p>
        </header>

        {/* Interactive Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Nodes Column */}
          <div className="lg:col-span-7 space-y-6 relative">
            <h2 className="sr-only">Architecture Nodes</h2>
            
            <div className="flex flex-col gap-4 relative">
              {/* Connecting line for desktop with Animated Data Pulses */}
              <div className="hidden lg:block absolute left-13 top-10 bottom-10 w-0.5 bg-zinc-700 -z-10 overflow-hidden">
                <motion.div
                  className="w-full h-32 bg-linear-to-b from-transparent via-primary to-transparent opacity-50"
                  animate={{
                    y: ['-100%', '1000%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                  }}
                />
              </div>

              {nodes.map((node) => {
                const isActive = activeNode === node.id;
                const Icon = node.icon;
                
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNode(isActive ? null : node.id)}
                    aria-expanded={isActive}
                    aria-controls={`node-details-${node.id}`}
                    className={`group relative text-left w-full flex items-center p-6 rounded-2xl transition-all duration-300 border-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 ${
                      isActive 
                        ? 'bg-zinc-950 border-white shadow-[0_0_30px_-5px_rgba(var(--primary),0.2)] scale-[1.02]' 
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-white/50 hover:bg-card'
                    }`}
                  >
                    <div className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? 'bg-white text-black' : 'bg-zinc-900 text-muted-foreground group-hover:bg-white/10 group-hover:text-primary'
                    }`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="ml-6 flex-1">
                      <h3 className="text-2xl font-bold tracking-tight">{node.title}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{node.description}</p>
                    </div>
                    <div className={`ml-4 transition-transform duration-300 ${isActive ? 'rotate-90 text-primary' : 'text-muted-foreground'}`}>
                      <ArrowRight className="w-6 h-6 hidden md:block" />
                      <ArrowDown className="w-6 h-6 block md:hidden" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 relative min-h-100">
            <div className="lg:sticky lg:top-24">
              <AnimatePresence mode="wait">
                {activeNode ? (
                  <motion.div
                    key={activeNode}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card border-2 border-white/15 rounded-3xl p-8 shadow-xl"
                    id={`node-details-${activeNode}`}
                    role="region"
                    aria-label={`${nodes.find(n => n.id === activeNode)?.title} details`}
                  >
                    {(() => {
                      const node = nodes.find(n => n.id === activeNode)!;
                      const Icon = node.icon;
                      return (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                            <Icon className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-3xl font-bold mb-4">{node.title}</h3>
                          <p className="text-lg text-muted-foreground mb-8">
                            {node.description}
                          </p>
                          <ul className="space-y-4">
                            {node.details.map((detail, i) => (
                              <li key={i} className="flex items-start">
                                <div className="mt-1 mr-4 w-2 h-2 rounded-full bg-primary shrink-0" />
                                <span className="text-lg font-medium">{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      );
                    })()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-3xl bg-black"
                  >
                    <RadioTower className="w-16 h-16 text-muted-foreground mb-6 opacity-50" />
                    <h3 className="text-2xl font-bold text-muted-foreground mb-2">Explore the System</h3>
                    <p className="text-muted-foreground">
                      Select a component on the left to view its technical details and responsibilities.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-bold bg-white text-black hover:bg-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring border-2 border-transparent"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
