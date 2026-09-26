"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ShoppingBag, Zap } from "lucide-react";
import { authApi } from "@/lib/api";
import { getRedirectPath } from "@/lib/auth";
import Link from "next/link";
import PasswordInput from "@/components/ui/PasswordInput";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      if (res.data?.requiresVerification) {
        const targetEmail = res.data?.data?.email || data.email;
        router.replace(`/verify-email?email=${encodeURIComponent(targetEmail)}`);
        return;
      }
      const { token, user } = res.data.data;
      localStorage.setItem("cityrock_token", token);
      localStorage.setItem("cityrock_user", JSON.stringify(user));
      toast.success(`Welcome back, ${user.name}!`);
      router.replace(getRedirectPath(user.role));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; requiresVerification?: boolean; data?: { email?: string } } } };
      if (error.response?.data?.requiresVerification) {
        const targetEmail = error.response?.data?.data?.email || data.email;
        router.replace(`/verify-email?email=${encodeURIComponent(targetEmail)}`);
        return;
      }
      toast.error(error.response?.data?.message || "Invalid email or password.");
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
          <p style={{ color: "#9CA3AF", fontSize: 14, margin: "8px 0 0" }}>Cloud Retail Management Platform</p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderRadius: 20, padding: "32px 36px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", margin: "0 0 6px" }}>Sign in to your account</h2>
          <p style={{ color: "#6B6B70", fontSize: 13, margin: "0 0 28px" }}>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="label">Email address</label>
              <input
                {...register("email")}
                type="email"
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <PasswordInput
                {...register("password")}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
              <Link href="/forgot-password" style={{ color: "#F7931A", fontSize: 13, textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
              style={{ justifyContent: "center", fontSize: 15, padding: "12px 20px" }}
            >
              {isSubmitting ? (
                <><span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Signing in...</>
              ) : (
                <><Zap size={18} />Sign In</>
              )}
            </button>
          </form>

          <hr className="divider" style={{ margin: "28px 0" }} />
          <p style={{ textAlign: "center", fontSize: 13, color: "#6B6B70" }}>
            New to CityRock?{" "}
            <Link href="/signup" style={{ color: "#F7931A", fontWeight: 600, textDecoration: "none" }}>
              Create a free account
            </Link>
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 24 }}>
          By signing in, you agree to CityRock&apos;s Terms of Service and Privacy Policy.
        </p>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}



