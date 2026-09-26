import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="max-w-lg w-full text-center relative z-10">
        <div className="mb-6">
          <h1 className="text-[96px] leading-none font-black text-[#F7931A] tracking-tight">
            404
          </h1>
        </div>

        <div className="card p-8 sm:p-10 rounded-2xl border border-[#2A2A2E] bg-[#121214]">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#1A1A1C] border border-[#2A2A2E] flex items-center justify-center mb-6">
            <Search size={28} className="text-[#F7931A]" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
          <p className="text-[#9CA3AF] text-sm mb-8 leading-relaxed max-w-[320px] mx-auto">
            The page you are looking for doesn't exist, was moved, or is temporarily unavailable.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/"
              className="btn btn-primary py-2.5 px-6 font-semibold flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Return Home
            </Link>
          </div>
        </div>
        
        <p className="mt-6 text-[#6B6B70] text-xs font-mono">
          HTTP 404 — NOT FOUND
        </p>
      </div>
    </div>
  );
}
