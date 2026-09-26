"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowRight,
  Layers,
  Cpu,
  Sparkles,
  Shield,
  Store,
  HelpCircle,
  ChevronRight,
  Check,
} from "lucide-react";

interface MobileNavDrawerProps {
  user: any;
  dashboardPath: string;
}

export default function MobileNavDrawer({ user, dashboardPath }: MobileNavDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-close if screen is resized to desktop width (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features", icon: <Layers size={17} /> },
    { href: "#integrations", label: "Hardware & APIs", icon: <Cpu size={17} /> },
    { href: "#demo", label: "Live Register", icon: <Sparkles size={17} /> },
    { href: "#architecture", label: "Architecture", icon: <Shield size={17} /> },
    { href: "#solutions", label: "Store Types", icon: <Store size={17} /> },
    { href: "#faq", label: "FAQ", icon: <HelpCircle size={17} /> },
  ];

  return (
    <>
      {/* ── Trigger Button with Beautiful Morphing 3-Line & Cross Icon ─────────── */}
      <div className="mobile-nav-toggle lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close Menu" : "Open Menu"}
          className="relative w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-90 border border-white/[0.12] hover:border-[#F7931A]/50 transition-all duration-150 flex flex-col items-center justify-center cursor-pointer select-none focus:outline-none"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <div className="w-5 h-4 relative flex flex-col justify-between items-center pointer-events-none">
            {/* Top Bar */}
            <span
              className={`block h-[2px] rounded-full bg-white transition-all duration-200 ease-out origin-center ${
                isOpen
                  ? "w-5 translate-y-[7px] rotate-45"
                  : "w-5"
              }`}
            />

            {/* Middle Bar */}
            <span
              className={`block h-[2px] rounded-full bg-[#F7931A] transition-all duration-200 ease-out ${
                isOpen
                  ? "w-0 opacity-0 scale-x-0"
                  : "w-3.5 self-start ml-0.5"
              }`}
            />

            {/* Bottom Bar */}
            <span
              className={`block h-[2px] rounded-full bg-white transition-all duration-200 ease-out origin-center ${
                isOpen
                  ? "w-5 -translate-y-[7px] -rotate-45"
                  : "w-5"
              }`}
            />
          </div>
        </button>
      </div>

      {/* ── Mobile Sidebar Drawer (Portaled into document.body, Always On Top, z-[9999]) ── */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] mobile-nav-drawer-root lg:hidden transition-opacity duration-200 ease-out ${
              isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!isOpen}
          >
            {/* Dark Backdrop Overlay */}
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80"
              style={{ willChange: "opacity" }}
            />

            {/* Slide-in Drawer Panel (GPU Composited 60fps) */}
            <div
              className={`fixed top-0 right-0 bottom-0 w-[86%] max-w-[340px] bg-[#121214] border-l border-[#2A2A2E] shadow-2xl flex flex-col justify-between p-5 sm:p-6 overflow-y-auto z-10 transition-transform duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isOpen ? "translate-x-0" : "translate-x-full"
              }`}
              style={{
                willChange: "transform",
                transform: isOpen ? "translate3d(0, 0, 0)" : "translate3d(100%, 0, 0)",
                WebkitOverflowScrolling: "touch",
              }}
            >
          <div>
            {/* Drawer Top Bar */}
            <div className="flex items-center justify-between pb-5 border-b border-[#2A2A2E]">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] flex items-center justify-center">
                  <ShoppingBag size={16} className="text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-white">CityRock POS</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F7931A]/15 text-[#F7931A] border border-[#F7931A]/30">
                    ERP
                  </span>
                </div>
              </Link>

              {/* Designer Close Cross Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-[#9CA3AF] hover:text-white border border-white/[0.1] hover:border-[#F7931A]/40 active:scale-90 transition-all duration-150 flex items-center justify-center cursor-pointer select-none group focus:outline-none"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 group-hover:rotate-90 text-[#9CA3AF] group-hover:text-white"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Drawer Nav Links */}
            <div className="py-5">
              <div className="text-[11px] font-bold text-[#6B6B70] uppercase tracking-wider mb-2 px-3">
                Menu Navigation
              </div>
              <nav className="flex flex-col space-y-1">
                {navLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-[#1A1A1C] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#F7931A]">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight size={15} className="text-[#6B6B70] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-5 border-t border-[#2A2A2E] space-y-2.5">
            {user ? (
              <Link
                href={dashboardPath}
                onClick={() => setIsOpen(false)}
                className="btn btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-[#FF9500]/25 flex items-center justify-center gap-2"
              >
                <span>Launch Dashboard</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-[#FF9500]/25 flex items-center justify-center gap-2"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-semibold text-[#9CA3AF] hover:text-white border border-[#2A2A2E] rounded-xl bg-[#1A1A1C] hover:bg-[#232326] transition-colors block"
                >
                  Sign In to Your Account
                </Link>
              </>
            )}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6B6B70] pt-1">
              <Check size={12} className="text-[#34C759]" />
              <span>Instant setup • Zero credit card required</span>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
