"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ShoppingBag, ChevronRight, ChevronLeft, Check, Zap } from "lucide-react";
import { authApi } from "@/lib/api";
import { getRedirectPath } from "@/lib/auth";
import Link from "next/link";
import PasswordInput from "@/components/ui/PasswordInput";

const STORE_TYPES = [
  { value: "clothing", label: "Clothing & Apparel", icon: "👕", desc: "Sizes & colors, barcodes, garment tags", tag: "Variants" },
  { value: "shoes", label: "Footwear & Shoes", icon: "👟", desc: "Sizes 38-45, pair units, colorways", tag: "Variants" },
  { value: "general_retail", label: "General Retail", icon: "🛒", desc: "Mixed inventory, barcode scanner ready", tag: "Barcode" },
  { value: "supermarket", label: "Supermarket & Mart", icon: "🏪", desc: "High SKU volume, weight & pack units", tag: "High SKU" },
  { value: "pharmacy", label: "Pharmacy & Medical", icon: "💊", desc: "Batch numbers & expiry dates tracking", tag: "Batch/Expiry" },
  { value: "kiryana", label: "Kiryana & Grocery", icon: "🧺", desc: "Loose staples, kg/g weights, fast cash POS", tag: "Fast Cash" },
  { value: "electronics", label: "Electronics & Mobile", icon: "📱", desc: "IMEI / Serial numbers, warranty, gadgets", tag: "Serial/IMEI" },
  { value: "cosmetics", label: "Cosmetics & Beauty", icon: "💄", desc: "Shades, volume variants & expiry tracking", tag: "Shades/Batches" },
  { value: "bakery", label: "Bakery & Cafe", icon: "🥐", desc: "Fresh confectioneries, per kg/pcs, expiry", tag: "Fresh Food" },
  { value: "jewelry", label: "Jewelry & Watches", icon: "💎", desc: "Precious metals (grams), high-value luxury", tag: "High Value" },
  { value: "stationery", label: "Books & Stationery", icon: "📚", desc: "ISBN barcodes, office & school supplies", tag: "ISBN/Barcode" },
  { value: "hardware", label: "Hardware & Tools", icon: "🔧", desc: "Plumbing, electrical, meter/set/box units", tag: "Industrial" },
];

const step1Schema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  ownerEmail: z.string().email("Invalid email"),
  ownerPhone: z.string().min(10, "Valid phone required").max(15),
  city: z.string().min(2, "City is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type Step1Form = z.infer<typeof step1Schema>;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [storeType, setStoreType] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [step1Data, setStep1Data] = useState<Step1Form | null>(null);

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

  const { register, handleSubmit, formState: { errors } } = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
  });

  const handleStep1 = (data: Step1Form) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleStep2 = async () => {
    if (isLoading) return;
    if (!storeType || !step1Data) return;
    setIsLoading(true);
    try {
      const res = await authApi.signup({
        businessName: step1Data.businessName,
        ownerName: step1Data.ownerName,
        ownerEmail: step1Data.ownerEmail,
        ownerPhone: step1Data.ownerPhone,
        city: step1Data.city,
        password: step1Data.password,
        storeType,
      });
      
      if (res.data?.requiresVerification) {
        toast.success("Account created! A verification code has been sent to your email ✉️");
        router.replace(`/verify-email?email=${encodeURIComponent(step1Data.ownerEmail)}`);
        return;
      }

      const { token, user } = res.data.data;
      if (token && user) {
        localStorage.setItem("cityrock_token", token);
        localStorage.setItem("cityrock_user", JSON.stringify(user));
        toast.success("Account created! Your 14-day free trial has started 🎉");
        router.replace(getRedirectPath(user.role));
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
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

  const filteredStoreTypes = STORE_TYPES.filter((t) =>
    !categoryFilter ||
    t.label.toLowerCase().includes(categoryFilter.toLowerCase()) ||
    t.desc.toLowerCase().includes(categoryFilter.toLowerCase()) ||
    t.tag.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative", overflow: "hidden", background: "#0A0A0A" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: step === 2 ? 780 : 580, position: "relative", zIndex: 1 }}
      >
        {/* Logo & Headline */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, background: "linear-gradient(135deg, #FF6FA5 0%, #FF9D4D 55%, #FFD24C 100%)", borderRadius: 14, marginBottom: 12, boxShadow: "0 0 24px rgba(247,147,26,0.4)" }}>
            <ShoppingBag size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>Start your free trial</h1>
          <p style={{ color: "#9CA3AF", fontSize: 13, margin: "6px 0 0" }}>14 days full access — no credit card required</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                background: step >= s ? (step > s ? "#34C759" : "#FF9500") : "rgba(255,255,255,0.06)",
                border: step >= s ? "none" : "1px solid #2A2A2E",
                color: step >= s ? "#fff" : "#6B6B70",
                transition: "all 0.3s",
              }}>
                {step > s ? <Check size={14} /> : s}
              </div>
              <span style={{ fontSize: 12, color: step >= s ? "#F7931A" : "#6B6B70", display: s === 3 ? "none" : "block" }}>
                {s === 1 ? "Account Info" : "Store Industry"}
              </span>
              {s < 3 && <div style={{ width: 40, height: 1, background: step > s ? "#34C759" : "rgba(247,147,26,0.2)" }} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card" style={{ borderRadius: 20, padding: "32px 36px" }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", margin: "0 0 20px" }}>Business details</h2>
                <form onSubmit={handleSubmit(handleStep1)}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="label">Business Name *</label>
                      <input {...register("businessName")} className="input" placeholder="e.g. Metro Fashion & Retail" />
                      {errors.businessName && <p className="field-error">{errors.businessName.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="label">Owner Full Name *</label>
                      <input {...register("ownerName")} className="input" placeholder="e.g. Tariq Mehmood" />
                      {errors.ownerName && <p className="field-error">{errors.ownerName.message}</p>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">Email Address *</label>
                    <input {...register("ownerEmail")} type="email" className="input" placeholder="tariq@metroretail.pk" />
                    {errors.ownerEmail && <p className="field-error">{errors.ownerEmail.message}</p>}
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="label">Phone Number *</label>
                      <input {...register("ownerPhone")} className="input" placeholder="03001234567" />
                      {errors.ownerPhone && <p className="field-error">{errors.ownerPhone.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="label">City *</label>
                      <input {...register("city")} className="input" placeholder="Lahore" />
                      {errors.city && <p className="field-error">{errors.city.message}</p>}
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="label">Password *</label>
                      <PasswordInput {...register("password")} placeholder="Min. 8 characters" />
                      {errors.password && <p className="field-error">{errors.password.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="label">Confirm Password *</label>
                      <PasswordInput {...register("confirmPassword")} placeholder="Repeat password" />
                      {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center", marginTop: 12 }}>
                    Continue to Store Type <ChevronRight size={18} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card" style={{ borderRadius: 20, padding: "28px 32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", margin: "0 0 4px" }}>
                      Select your business category
                    </h2>
                    <p style={{ color: "#9CA3AF", fontSize: 13, margin: 0 }}>
                      This provisions the right schema, barcode standards, and starter inventory for your POS.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="Search industry..."
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid #2A2A2E",
                      borderRadius: 8,
                      color: "#fff",
                      outline: "none",
                      width: 160,
                    }}
                  />
                </div>

                {/* 12 Validated Category Cards Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 10,
                    maxHeight: "380px",
                    overflowY: "auto",
                    paddingRight: 4,
                    marginBottom: 24,
                  }}
                >
                  {filteredStoreTypes.map((type) => {
                    const isSelected = storeType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setStoreType(type.value)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: `2px solid ${isSelected ? "#F7931A" : "#2A2A2E"}`,
                          background: isSelected ? "rgba(247,147,26,0.14)" : "rgba(26,26,28,0.7)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.18s",
                          boxShadow: isSelected ? "0 0 16px rgba(247,147,26,0.22)" : "none",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: 100,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 22 }}>{type.icon}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 6,
                                background: isSelected ? "rgba(247,147,26,0.3)" : "rgba(255,255,255,0.06)",
                                color: isSelected ? "#FFA733" : "#9CA3AF",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {type.tag}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#FFA733" : "#FFFFFF" }}>
                            {type.label}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, lineHeight: 1.3 }}>
                          {type.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: "0 0 auto" }}>
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={handleStep2}
                    disabled={!storeType || isLoading}
                    style={{ justifyContent: "center" }}
                  >
                    {isLoading ? "Creating store..." : "Start 14-Day Free Trial"} {!isLoading && <Zap size={18} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="card" style={{ borderRadius: 20, padding: "48px 36px", textAlign: "center" }}>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  style={{ width: 72, height: 72, background: "linear-gradient(135deg, #34C759, #28A745)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}
                >
                  <Check size={36} color="#fff" />
                </motion.div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" }}>You&apos;re all set!</h2>
                <p style={{ color: "#9CA3AF", fontSize: 15 }}>Your 14-day free trial has started. Redirecting to your dashboard...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ textAlign: "center", fontSize: 13, color: "#6B6B70", marginTop: 20 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#F7931A", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}




