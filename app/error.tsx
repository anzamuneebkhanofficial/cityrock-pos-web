"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="max-w-lg w-full text-center relative z-10">
        <div className="card p-8 sm:p-10 rounded-2xl border border-[#2A2A2E] bg-[#121214]">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#1A1A1C] border border-[#2A2A2E] flex items-center justify-center mb-6">
            <AlertTriangle size={28} className="text-[#FF5A5F]" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h2>
          <p className="text-[#9CA3AF] text-sm mb-8 leading-relaxed max-w-[320px] mx-auto">
            An unexpected error occurred while processing this request. The issue has been logged.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => reset()}
              className="btn btn-primary py-2.5 px-6 font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCcw size={16} />
              Try Again
            </button>
            <Link 
              href="/"
              className="btn btn-secondary py-2.5 px-6 font-semibold flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
