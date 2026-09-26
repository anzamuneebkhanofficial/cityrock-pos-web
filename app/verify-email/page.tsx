"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Mail, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import { authApi } from "@/lib/api";
import { getRedirectPath } from "@/lib/auth";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes = 600s
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for OTP expiration (10 minutes)
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const cooldownTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, ""); // numeric only

    if (cleanValue.length > 1) {
      // Handles multi-character paste or autofill
      handlePasteValue(cleanValue);
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (cleanValue && index === 5 && newDigits.every((d) => d.length === 1)) {
      triggerVerification(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      handlePasteValue(pastedData);
    }
  };

  const handlePasteValue = (value: string) => {
    const newDigits = ["", "", "", "", "", ""];
    const chars = value.slice(0, 6).split("");
    chars.forEach((char, i) => {
      newDigits[i] = char;
    });
    setOtpDigits(newDigits);

    const focusIdx = Math.min(chars.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (chars.length === 6) {
      triggerVerification(newDigits.join(""));
    }
  };

  const triggerVerification = async (codeToVerify?: string) => {
    if (isLoading) return;
    const code = codeToVerify || otpDigits.join("");
    if (code.length < 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    if (!email) {
      toast.error("Email address is missing");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.verifyEmail({ email, otp: code });
      const { token, user } = res.data.data;

      localStorage.setItem("cityrock_token", token);
      localStorage.setItem("cityrock_user", JSON.stringify(user));

      setIsVerifiedSuccess(true);
      toast.success(res.data.message || "Email verified successfully! 🎉");
      router.replace(getRedirectPath(user.role));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    if (!email) {
      toast.error("Please specify a valid email address");
      return;
    }

    setResending(true);
    try {
      const res = await authApi.resendOtp(email);
      toast.success(res.data.message || "A new 6-digit verification code has been sent!");
      setResendCooldown(30); // 30 seconds cooldown
      setTimeLeft(600); // reset 10-minute expiry
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Background glow orbs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        
        
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: "100%", maxWidth: 500, position: "relative", zIndex: 1 }}
      >
        <div className="card" style={{ borderRadius: 24, padding: "36px 32px", border: "1px solid rgba(255,255,255,0.1)" }}>
          {isVerifiedSuccess ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ textAlign: "center", padding: "24px 0" }}
            >
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)" }}>
                <CheckCircle2 size={44} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>Account Verified!</h2>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 16px" }}>
                Your email has been verified. Redirecting you to your dashboard...
              </p>
              <div className="spinner" style={{ width: 24, height: 24, margin: "0 auto", border: "3px solid rgba(255,255,255,0.2)", borderTop: "3px solid #10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </motion.div>
          ) : (
            <>
              {/* Icon & Title */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 0 30px rgba(99,102,241,0.35)" }}>
                  <Mail size={32} color="#ffffff" />
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>Verify Your Email</h1>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                  We sent a 6-digit verification code to
                </p>
                <div style={{ display: "inline-block", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: 8, padding: "4px 12px", marginTop: 8 }}>
                  <strong style={{ color: "#c7d2fe", fontSize: 14, fontFamily: "monospace" }}>{email || "your email address"}</strong>
                </div>
              </div>

              {/* 6-Digit Segmented OTP Input */}
              <div style={{ marginBottom: 24 }}>
                <label className="label" style={{ textAlign: "center", display: "block", marginBottom: 12 }}>
                  Enter 6-Digit Verification Code
                </label>
                <div
                  style={{ display: "flex", justifyContent: "center", gap: 10 }}
                  onPaste={handlePaste}
                >
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      style={{
                        width: 52,
                        height: 60,
                        textAlign: "center",
                        fontSize: 24,
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: "#f8fafc",
                        background: digit ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        border: `2px solid ${digit ? "#818cf8" : "rgba(255, 255, 255, 0.12)"}`,
                        borderRadius: 12,
                        outline: "none",
                        transition: "all 0.2s ease",
                        boxShadow: digit ? "0 0 16px rgba(99, 102, 241, 0.25)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Expiry Timer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 24, fontSize: 13, color: timeLeft < 120 ? "#f87171" : "#94a3b8" }}>
                <span>Code expires in:</span>
                <strong style={{ fontFamily: "monospace", fontSize: 14, color: timeLeft < 120 ? "#ef4444" : "#e2e8f0" }}>
                  {formatTimer(timeLeft)}
                </strong>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() => triggerVerification()}
                disabled={isLoading || otpDigits.join("").length < 6}
                style={{
                  justifyContent: "center",
                  padding: "14px",
                  fontSize: 15,
                  borderRadius: 12,
                  marginBottom: 20,
                  opacity: otpDigits.join("").length < 6 ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Verifying code...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Verify & Continue <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Resend Section */}
              <div style={{ textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 20 }}>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px" }}>
                  Didn&apos;t receive the code or expired?
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending || resendCooldown > 0}
                  className="btn btn-ghost btn-sm"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: resendCooldown > 0 ? "#64748b" : "#818cf8",
                    fontWeight: 600,
                    cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
                  {resendCooldown > 0 ? `Resend Code in (${resendCooldown}s)` : resending ? "Sending..." : "Resend Verification Code"}
                </button>
              </div>

              {/* Back to login */}
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link
                  href="/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#94a3b8",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" style={{ width: 32, height: 32, border: "3px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}


