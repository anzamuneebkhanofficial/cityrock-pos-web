"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ShoppingBag, Lock, CheckCircle2, AlertTriangle, ArrowLeft, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";
import { getRedirectPath } from "@/lib/auth";
import Link from "next/link";
import PasswordInput from "@/components/ui/PasswordInput";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("cityrock_token");
    const storedUser = localStorage.getItem("cityrock_user");
    if (storedToken && storedUser) {
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
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error("Password reset token is missing from the URL.");
      return;
    }

    try {
      await authApi.resetPassword({
        token,
        newPassword: data.newPassword,
      });
      setIsSuccess(true);
      toast.success("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.replace("/login");
      }, 2500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Invalid or expired password reset link. Please request a new one.");
    }
  };

  if (isCheckingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f19" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden", background: "#0A0A0A" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "var(--accent-primary)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
            <ShoppingBag size={28} color="oklch(0.14 0 0)" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>CityRock POS</h1>
          <p style={{ color: "#9CA3AF", fontSize: 14, margin: "8px 0 0" }}>Create New Password</p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderRadius: "var(--radius-lg)", padding: "32px 36px" }}>
          {!token ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--danger-bg)", border: "1px solid var(--danger)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <AlertTriangle size={28} color="var(--danger)" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", margin: "0 0 8px" }}>Invalid Reset Link</h2>
              <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                No password reset token was provided in the URL. Please request a fresh password reset link.
              </p>
              <Link
                href="/forgot-password"
                className="btn btn-primary w-full"
                style={{ justifyContent: "center", fontSize: 14, padding: "12px 20px", textDecoration: "none" }}
              >
                Request Password Reset Link
              </Link>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="reset-form"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <KeyRound size={18} color="#818cf8" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Set new password</h2>
                      <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Enter your new secure password below</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 24 }}>
                    <div className="form-group">
                      <label className="label">New Password</label>
                      <PasswordInput
                        {...register("newPassword")}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        autoFocus
                      />
                      {errors.newPassword && <p className="field-error">{errors.newPassword.message}</p>}
                    </div>

                    <div className="form-group">
                      <label className="label">Confirm New Password</label>
                      <PasswordInput
                        {...register("confirmPassword")}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                      />
                      {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
                    </div>

                    <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 20, fontSize: 12, color: "#94a3b8" }}>
                      🔒 Must contain at least <strong>8 characters</strong>.
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      disabled={isSubmitting}
                      style={{ justifyContent: "center", fontSize: 15, padding: "12px 20px" }}
                    >
                      {isSubmitting ? (
                        <>
                          <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                          Updating password...
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          Reset Password & Sign In
                        </>
                      )}
                    </button>
                  </form>

                  <div style={{ marginTop: 24, textAlign: "center" }}>
                    <Link
                      href="/login"
                      style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }}
                    >
                      <ArrowLeft size={14} /> Back to Sign In
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="reset-success"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  style={{ textAlign: "center" }}
                >
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <CheckCircle2 size={32} color="#10b981" />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", margin: "0 0 8px" }}>Password Updated!</h2>
                  <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                    Your password has been changed successfully. You will now be redirected to the sign in page.
                  </p>

                  <Link
                    href="/login"
                    className="btn btn-primary w-full"
                    style={{ justifyContent: "center", fontSize: 14, padding: "12px 20px", textDecoration: "none" }}
                  >
                    Go to Sign In Now
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f19" }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

