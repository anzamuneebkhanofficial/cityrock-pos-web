"use client";

import React from "react";
import { useConsent } from "./ConsentProvider";
import { CONSENT_TEXT } from "@/lib/consent";

export function FooterCookieLink() {
  const { openSettings } = useConsent();

  return (
    <button
      onClick={openSettings}
      className="hover:text-white transition-colors text-left"
    >
      {CONSENT_TEXT.banner.settings}
    </button>
  );
}
