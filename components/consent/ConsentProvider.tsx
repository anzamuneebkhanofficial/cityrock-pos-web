"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { defaultConsent, ConsentChoices, CONSENT_VERSION } from "@/lib/consent";

interface ConsentContextType {
  analytics: boolean;
  marketing: boolean;
  ready: boolean;
  showBanner: boolean;
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  saveConsent: (choices: Partial<ConsentChoices>) => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [choices, setChoices] = useState<ConsentChoices>(defaultConsent);
  const [ready, setReady] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    try {
      const match = document.cookie.match(/(^| )cookie_consent=([^;]+)/);
      if (match && match[2]) {
        const stored = JSON.parse(decodeURIComponent(match[2])) as ConsentChoices;
        if (stored.v === CONSENT_VERSION) {
          setChoices(stored);
        } else {
          setShowBanner(true); // Version mismatch
        }
      } else {
        setShowBanner(true); // No cookie found
      }
    } catch (e) {
      setShowBanner(true);
    }
    setReady(true);
  }, []);

  const saveConsent = (updates: Partial<ConsentChoices>) => {
    const newChoices = { ...choices, ...updates, v: CONSENT_VERSION, ts: new Date().toISOString() };
    setChoices(newChoices);
    document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify(newChoices))}; path=/; max-age=31536000; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => saveConsent({ analytics: true, marketing: true });
  const rejectNonEssential = () => saveConsent({ analytics: false, marketing: false });
  const openSettings = () => setShowSettings(true);
  const closeSettings = () => setShowSettings(false);

  return (
    <ConsentContext.Provider
      value={{
        analytics: choices.analytics,
        marketing: choices.marketing,
        ready,
        showBanner,
        showSettings,
        openSettings,
        closeSettings,
        saveConsent,
        acceptAll,
        rejectNonEssential,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
}
