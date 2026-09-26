"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ShoppingBag, Mail, ArrowLeft, Send, CheckCircle2, RefreshCw } from "lucide-react";
import { authApi } from "@/lib/api";
import { getRedirectPath } from "@/lib/auth";
import Link from "next/link";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("cityrock_token");
    const storedUser = localStorage.getItem("cityrock_user");
    if (token && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        router.replace(getRedirectPath(u.role));
        return;
      } catch {
        localStorage.removeItem("cityrock_token");
        localStorage.removeItem("cityrock_user");
      }
    }
    setIsCheckingAuth(false);
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await authApi.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success("Password reset instructions sent!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to process request. Please try again.");
    }
  };

  if (isCheckingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0A" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(247,147,26,0.2)", borderTopColor: "#F7931A", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden", background: "#0A0A0A" }}>
      {/* Animated background orbs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        
        
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "var(--brand)", color: "var(--brand-fg)" }}>
            <ShoppingBag size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>CityRock POS</h1>
          <p style={{ color: "#9CA3AF", fontSize: 14, margin: "8px 0 0" }}>Account Recovery</p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderRadius: 20, padding: "32px 36px" }}>
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(247,147,26,0.12)", border: "1px solid rgba(247,147,26,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Mail size={18} color="#F7931A" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Forgot password?</h2>
                    <p style={{ color: "#6B6B70", fontSize: 13, margin: 0 }}>No worries, we will send you reset instructions.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 24 }}>
                  <div className="form-group">
                    <label className="label">Registered Email Address</label>
                    <input
                      {...register("email")}
                      type="email"
                      className="input"
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                    />
                    {errors.email && <p className="field-error">{errors.email.message}</p>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isSubmitting}
                    style={{ justifyContent: "center", fontSize: 15, padding: "12px 20px", marginTop: 20 }}
                  >
                    {isSubmitting ? (
                      <>
                        <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                        Sending reset link...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Password Reset Link
                      </>
                    )}
                  </button>
                </form>

                <div style={{ marginTop: 24, textAlign: "center" }}>
                  <Link
                    href="/login"
                    style={{ color: "#9CA3AF", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }}
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                style={{ textAlign: "center" }}
              >
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(52, 199, 89, 0.15)", border: "1px solid rgba(52, 199, 89, 0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <CheckCircle2 size={32} color="#34C759" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px" }}>Check your inbox</h2>
                <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
                  We have sent password reset instructions to: <br />
                  <strong style={{ color: "#F7931A", wordBreak: "break-all" }}>{submittedEmail}</strong>
                </p>

                <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid #2A2A2E", borderRadius: 12, marginBottom: 24, textAlign: "left", fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
                  ⏱️ <strong>Note:</strong> The link in your email is valid for <strong>30 minutes</strong>. If you do not see it, check your spam or junk folder.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Link
                    href="/login"
                    className="btn btn-primary w-full"
                    style={{ justifyContent: "center", fontSize: 14, padding: "12px 20px", textDecoration: "none" }}
                  >
                    Return to Sign In
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    style={{ background: "transparent", border: "none", color: "#F7931A", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0" }}
                  >
                    <RefreshCw size={13} /> Try another email address
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


