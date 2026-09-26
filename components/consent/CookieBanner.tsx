"use client";

import React, { useState } from "react";
import { useConsent } from "./ConsentProvider";
import { CONSENT_TEXT } from "@/lib/consent";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";

export function CookieBanner() {
  const { showBanner, showSettings, acceptAll, rejectNonEssential, closeSettings, openSettings, saveConsent, analytics, marketing } = useConsent();

  // Local state for settings modal
  const [tempAnalytics, setTempAnalytics] = useState(analytics);
  const [tempMarketing, setTempMarketing] = useState(marketing);

  const handleSaveSettings = () => {
    saveConsent({ analytics: tempAnalytics, marketing: tempMarketing });
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && !showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed bottom-4 left-4 right-4 md:right-auto md:bottom-6 md:left-6 md:max-w-sm z-[9999] card p-6 shadow-2xl"
            role="dialog"
            aria-labelledby="cookie-banner-title"
          >
            <h2 id="cookie-banner-title" className="text-lg font-bold mb-2">
              {CONSENT_TEXT.banner.title}
            </h2>
            <p className="text-sm text-secondary mb-6 leading-relaxed">
              {CONSENT_TEXT.banner.text}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={acceptAll}
                className="btn btn-primary w-full"
              >
                {CONSENT_TEXT.banner.acceptAll}
              </button>
              <button
                onClick={rejectNonEssential}
                className="btn btn-secondary w-full"
              >
                {CONSENT_TEXT.banner.rejectNonEssential}
              </button>
              <button
                onClick={openSettings}
                className="btn btn-ghost w-full mt-1 text-sm"
              >
                {CONSENT_TEXT.banner.settings}
              </button>
            </div>
            <p className="text-xs text-muted mt-6 text-center">
              Read our <Link href="/cookie-policy" className="hover:underline">Cookie Policy</Link> and <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
              role="dialog"
              aria-labelledby="cookie-settings-title"
            >
              <div className="p-4 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <h2 id="cookie-settings-title" className="text-lg font-bold">
                  {CONSENT_TEXT.modal.title}
                </h2>
                <button onClick={closeSettings} className="p-1 text-muted hover:text-primary hover:bg-[var(--surface-dark-alt)] rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* Essential */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{CONSENT_TEXT.modal.essential.title}</h3>
                    <p className="text-sm text-secondary mt-1 leading-relaxed">
                      {CONSENT_TEXT.modal.essential.description}
                    </p>
                  </div>
                  <div className="pt-1">
                    <span className="text-xs font-bold text-accent-orange uppercase tracking-wider">Always On</span>
                  </div>
                </div>

                {/* Analytics */}
                <div className="flex gap-4 pt-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="flex-1">
                    <h3 className="font-semibold">{CONSENT_TEXT.modal.analytics.title}</h3>
                    <p className="text-sm text-secondary mt-1 leading-relaxed">
                      {CONSENT_TEXT.modal.analytics.description}
                    </p>
                  </div>
                  <div className="pt-1">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={tempAnalytics} onChange={() => setTempAnalytics(!tempAnalytics)} />
                      <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: tempAnalytics ? "var(--accent-primary)" : "var(--surface-dark-alt)" }}></div>
                    </label>
                  </div>
                </div>

                {/* Marketing */}
                <div className="flex gap-4 pt-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="flex-1">
                    <h3 className="font-semibold">{CONSENT_TEXT.modal.marketing.title}</h3>
                    <p className="text-sm text-secondary mt-1 leading-relaxed">
                      {CONSENT_TEXT.modal.marketing.description}
                    </p>
                  </div>
                  <div className="pt-1">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={tempMarketing} onChange={() => setTempMarketing(!tempMarketing)} />
                      <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: tempMarketing ? "var(--accent-primary)" : "var(--surface-dark-alt)" }}></div>
                    </label>
                  </div>
                </div>

              </div>
              <div className="p-4 flex flex-col sm:flex-row-reverse gap-3" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-dark-alt)" }}>
                <button
                  onClick={handleSaveSettings}
                  className="btn btn-primary w-full"
                >
                  {CONSENT_TEXT.modal.save}
                </button>
                <button
                  onClick={acceptAll}
                  className="btn btn-secondary w-full"
                >
                  {CONSENT_TEXT.banner.acceptAll}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
