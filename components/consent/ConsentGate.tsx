"use client";

import React from "react";
import { useConsent } from "./ConsentProvider";

interface ConsentGateProps {
  category: "analytics" | "marketing";
  children: React.ReactNode;
}

/**
 * Any new tracker MUST be wrapped in ConsentGate.
 * Only renders children if the specified consent category has been accepted.
 */
export function ConsentGate({ category, children }: ConsentGateProps) {
  const consent = useConsent();

  // If not ready (still reading cookies), don't render anything to prevent hydration errors or loading scripts too early
  if (!consent.ready) {
    return null;
  }

  const isGranted = category === "analytics" ? consent.analytics : consent.marketing;

  if (!isGranted) {
    return null;
  }

  return <>{children}</>;
}
