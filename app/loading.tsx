"use client";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="card flex flex-col items-center p-8 rounded-2xl max-w-sm w-full border border-[#2A2A2E] shadow-[0_0_40px_rgba(247,147,26,0.15)] bg-[#1A1A1C]"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-[#F7931A]/20 blur-xl rounded-full animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6FA5] via-[#FF9D4D] to-[#FFD24C] flex items-center justify-center relative z-10 shadow-lg shadow-[#F7931A]/30">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Loading...</h2>
        <p className="text-[#9CA3AF] text-sm text-center">
          Preparing your workspace. Just a moment!
        </p>
      </motion.div>
    </div>
  );
}

