"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, Upload, CheckCircle2, XCircle, Clock, AlertTriangle, 
  Sparkles, Shield, Copy, FileText, ArrowRight,
  Store, Zap, RefreshCw, X, Receipt, Check, Building2, Wallet,
  Calendar, Layers, Info, HelpCircle, Eye, MessageSquare, ExternalLink
} from "lucide-react";
import { tenantApi, BACKEND_URL } from "@/lib/api";
import toast from "react-hot-toast";
import { differenceInDays, format } from "date-fns";
import Pagination from "@/components/ui/Pagination";
import PlansCarousel from "@/components/billing/PlansCarousel";

const PAYMENT_STATUS_CLASSES: Record<string, { badge: string; label: string }> = {
  pending_review: { badge: "badge badge-pending", label: "Pending Review" },
  confirmed: { badge: "badge badge-confirmed", label: "Confirmed / Active" },
  rejected: { badge: "badge badge-rejected", label: "Rejected" },
  awaiting_proof: { badge: "badge badge-grace", label: "Awaiting Proof" },
};

interface PlanItem {
  _id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  maxStores: number;
  features: string[];
  isPopular?: boolean;
}

interface PaymentAccountItem {
  _id: string;
  providerType: "bank" | "wallet" | "easypaisa" | "jazzcash" | "sadapay" | "nayapay" | string;
  providerName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
  branchCode?: string;
  isActive: boolean;
}

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  
  // Navigation Tabs: 'overview' | 'plans' | 'accounts' | 'history'
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "accounts" | "history">("overview");
  const [billingCycleToggle, setBillingCycleToggle] = useState<"monthly" | "annual">("annual");

  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Record<string, unknown> | null>(null);
  const [capacity, setCapacity] = useState<Record<string, unknown> | null>(null);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Submitting Payment Slip
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [modalContext, setModalContext] = useState<"renew" | "upgrade" | "custom">("renew");
  const [targetPlanForModal, setTargetPlanForModal] = useState<PlanItem | null>(null);
  const [targetCycleForModal, setTargetCycleForModal] = useState<"monthly" | "annual">("monthly");
  
  const [transactionId, setTransactionId] = useState("");
  const [proofForm, setProofForm] = useState({
    amount: "",
    paymentAccountId: "",
    referenceNote: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "owner") { 
      toast.error("Access Restricted: Only Store Owner can view billing.");
      router.replace("/dashboard"); 
      return; 
    }
    setUser(u);
    fetchData();
  }, [router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subRes, plansRes, accountsRes] = await Promise.allSettled([
        tenantApi.getSubscription(), 
        tenantApi.getPlans(),
        tenantApi.getPaymentAccounts()
      ]);

      if (subRes.status === "fulfilled") {
        const payload = subRes.value.data?.data;
        const subData = payload?.subscription || payload || null;
        setSubscription(subData);
        setTenantInfo(payload?.tenant || null);
        setPayments(payload?.payments || []);
        setCapacity(payload?.capacity || null);

        // Pre-set cycle toggle if active subscription has one
        if (subData?.billingCycle) {
          setBillingCycleToggle(subData.billingCycle as "monthly" | "annual");
        }
      }
      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value.data?.data || []);
      }
      if (accountsRes.status === "fulfilled") {
        const accs = accountsRes.value.data?.data || [];
        setPaymentAccounts(accs);
        if (accs.length > 0) {
          setProofForm(prev => ({ 
            ...prev, 
            paymentAccountId: prev.paymentAccountId || accs[0]._id 
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load billing:", e);
      toast.error("Failed to load subscription details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const generateTxnId = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TXN-POS-${rand}`;
  };

  const tenantStatus = (subscription as Record<string, unknown>)?.status as string || (tenantInfo?.status as string) || "trial";
  const activePlan = (subscription as Record<string, unknown>)?.planId as PlanItem | null;
  const activeBillingCycle = ((subscription as Record<string, unknown>)?.billingCycle as string) || "monthly";

  // Calculate Trial Days Remaining
  const trialEndsDate = tenantInfo?.trialEndsAt ? new Date(String(tenantInfo.trialEndsAt)) : null;
  const trialDaysRemaining = trialEndsDate ? Math.max(0, differenceInDays(trialEndsDate, new Date())) : 14;

  const currentPeriodEnd = (subscription as Record<string, unknown>)?.currentPeriodEnd 
    ? new Date(String((subscription as Record<string, unknown>).currentPeriodEnd)) 
    : null;

  const currentPeriodStart = (subscription as Record<string, unknown>)?.currentPeriodStart 
    ? new Date(String((subscription as Record<string, unknown>).currentPeriodStart)) 
    : null;

  // Open Renewal Modal
  const openRenewModal = () => {
    const plan = activePlan || plans[0] || null;
    const cycle = (activeBillingCycle as "monthly" | "annual") || "monthly";
    const amount = plan 
      ? (cycle === "annual" ? plan.annualPrice : plan.monthlyPrice) 
      : 5000;
    const newTxn = generateTxnId();
    
    setModalContext("renew");
    setTargetPlanForModal(plan);
    setTargetCycleForModal(cycle);
    setTransactionId(newTxn);
    setUploadedProofUrl(null);
    setProofFile(null);
    setUploadSuccessMessage(null);
    setUploadErrorMessage(null);
    setWhatsappConfirmed(false);
    setProofForm({ 
      amount: String(amount),
      paymentAccountId: paymentAccounts[0]?._id || "",
      referenceNote: newTxn,
    });
    setShowUploadModal(true);
  };

  // Open Upgrade Modal for a specific plan
  const openUpgradeModal = (targetPlan: PlanItem, targetCycle: "monthly" | "annual") => {
    const amount = targetCycle === "annual" ? targetPlan.annualPrice : targetPlan.monthlyPrice;
    const newTxn = generateTxnId();
    setModalContext("upgrade");
    setTargetPlanForModal(targetPlan);
    setTargetCycleForModal(targetCycle);
    setTransactionId(newTxn);
    setUploadedProofUrl(null);
    setProofFile(null);
    setUploadSuccessMessage(null);
    setUploadErrorMessage(null);
    setWhatsappConfirmed(false);
    setProofForm({ 
      amount: String(amount),
      paymentAccountId: paymentAccounts[0]?._id || "",
      referenceNote: newTxn,
    });
    setShowUploadModal(true);
  };

  // ── Handle Cloudinary File Upload ──
  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset upload state
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);
    setIsUploadingProof(true);

    const fd = new FormData();
    fd.append("proof", file);

    try {
      const res = await tenantApi.uploadPaymentProof(fd);
      const cloudUrl = res.data?.data?.url;
      if (!cloudUrl) {
        throw new Error("Cloudinary did not return a valid secure URL.");
      }
      setUploadedProofUrl(cloudUrl);
      setProofFile(file);
      setUploadSuccessMessage("Receipt screenshot successfully uploaded to Cloudinary Secure Storage!");
      toast.success("Receipt screenshot successfully uploaded to Cloudinary!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = error.response?.data?.message || error.message || "Failed to upload to Cloudinary";
      setUploadErrorMessage(`Cloudinary upload failed: ${msg}`);
      setUploadedProofUrl(null);
      setProofFile(null);
      toast.error(`Cloudinary upload failed: ${msg}`);
    } finally {
      setIsUploadingProof(false);
    }
  };

  // ── Submit Manual Proof with Mandatory Double Verification ──
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingProof) return;
    
    if (!proofForm.amount || !proofForm.paymentAccountId) {
      toast.error("Please provide payment amount and payment account");
      return;
    }

    // Double Verification Rule 1: Screenshot upload must use Cloudinary only
    if (!uploadedProofUrl) {
      toast.error("Payment screenshot is mandatory. Please upload your receipt to Cloudinary (Step 1 of Double Verification).");
      return;
    }

    // Double Verification Rule 2: WhatsApp confirmation is mandatory
    if (!whatsappConfirmed) {
      toast.error("WhatsApp confirmation is mandatory for double verification. Please click 'Send Proof on WhatsApp' before submitting.");
      return;
    }

    setIsSubmittingProof(true);
    const finalTxn = (proofForm.referenceNote || transactionId).trim();

    try {
      await tenantApi.submitPaymentProof({
        amount: Number(proofForm.amount),
        paymentAccountId: proofForm.paymentAccountId,
        referenceNote: finalTxn,
        transactionId: finalTxn,
        proofFileUrl: uploadedProofUrl,
        planId: targetPlanForModal?._id || activePlan?._id || undefined,
        billingCycle: targetCycleForModal,
        whatsappConfirmed: true,
        whatsappNumber: "03001234567",
      });

      toast.success("Payment proof and WhatsApp verification submitted! Finance team will verify shortly.");
      setShowUploadModal(false);
      setTargetPlanForModal(null);
      setUploadedProofUrl(null);
      setProofFile(null);
      setWhatsappConfirmed(false);
      setActiveTab("history");
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error.response?.data?.message || error.message || "Failed to submit payment verification");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const selectedAccount = paymentAccounts.find(a => a._id === proofForm.paymentAccountId);

  return (
    <>
      <main className="main-content">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          
          {/* Top Page Header */}
          <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 800 }}>
                <CreditCard size={26} color="var(--accent-primary)" /> Subscription & Billing Center
              </h1>
              <p className="page-subtitle" style={{ fontSize: 13, color: "#94a3b8" }}>
                Manage your active store subscription tier, extension renewals, bank accounts, and invoices.
              </p>
            </div>

            {/* Top Quick Actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={openRenewModal}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
              >
                <RefreshCw size={14} color="var(--accent-primary)" /> Renew Subscription
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab("plans")}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
              >
                <Zap size={14} /> Upgrade Plan
              </button>
            </div>
          </div>

          {/* ── SUB-NAVIGATION TABS (Multi-Page Concept) ── */}
          <div style={{ 
            display: "flex", 
            gap: 8, 
            background: "rgba(15,23,42,0.6)", 
            padding: 6, 
            borderRadius: 14, 
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 24,
            overflowX: "auto"
          }}>
            {[
              { id: "overview", label: "Current Plan & Overview", icon: Layers },
              { id: "plans", label: "Upgrade & Change Plan", icon: Sparkles },
              { id: "accounts", label: "Bank & Transfer Details", icon: Building2 },
              { id: "history", label: `Invoices & History (${payments.length})`, icon: Receipt },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 18px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    background: isActive ? "linear-gradient(135deg, #ea580c, #f97316)" : "transparent",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    boxShadow: isActive ? "0 4px 14px rgba(249,115,22,0.3)" : "none"
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
              <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
            </div>
          ) : (
            <>
              {/* ── BANNER 1: REJECTED PAYMENT NOTIFICATION ── */}
              {payments.length > 0 && payments[0].status === "rejected" && (
                <div style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  marginBottom: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <AlertTriangle size={22} color="#ef4444" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5" }}>
                        Payment Proof Requires Correction
                      </div>
                      <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>
                        <strong>Rejection Reason:</strong> {String(payments[0].rejectionReason || "Details did not match.")}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      setProofForm(prev => ({ ...prev, amount: String(payments[0].amount || "") }));
                      setShowUploadModal(true);
                    }}
                    style={{ background: "#ef4444", borderColor: "#ef4444" }}
                  >
                    Resubmit Slip
                  </button>
                </div>
              )}

              {/* ── BANNER 2: FREE TRIAL REMINDER BANNER ── */}
              {tenantStatus === "trial" && (
                <div style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
                  border: "1px solid rgba(245,158,11,0.35)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  marginBottom: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Clock size={22} color="#f59e0b" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fcd34d" }}>
                        CityRock 14-Day Free Trial Active ({trialDaysRemaining} days remaining)
                      </div>
                      <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>
                        You currently have full unlimited access. Please choose and activate a <strong>Starter</strong> or <strong>Pro</strong> plan before trial ends to keep your POS running seamlessly.
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => setActiveTab("plans")}
                    style={{ background: "#f59e0b", borderColor: "#f59e0b", color: "#fff", fontWeight: 700 }}
                  >
                    Select Plan & Upgrade
                  </button>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── TAB 1: CURRENT PLAN DETAIL & OVERVIEW ── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === "overview" && (
                <div>
                  {/* Detailed Plan Status Card */}
                  <div className="card" style={{ 
                    padding: 30, 
                    marginBottom: 24,
                    background: tenantStatus === "active" 
                      ? "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(14,20,35,0.85))"
                      : "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(14,20,35,0.85))",
                    border: tenantStatus === "active" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(249,115,22,0.25)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 24 }}>
                      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                        <div style={{ 
                          width: 58, 
                          height: 58, 
                          borderRadius: 16, 
                          background: tenantStatus === "active" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #ea580c, #f97316)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          boxShadow: "0 6px 20px rgba(249,115,22,0.3)",
                          flexShrink: 0
                        }}>
                          {tenantStatus === "active" ? <Shield size={30} color="#fff" /> : <Sparkles size={30} color="#fff" />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                              {tenantStatus === "trial" 
                                ? "CityRock POS 14-Day Free Trial" 
                                : activePlan 
                                ? `${activePlan.name} Plan (${activeBillingCycle === "annual" ? "Annual" : "Monthly"})` 
                                : "No Active Subscription"}
                            </h2>
                            <span className={`badge ${tenantStatus === "active" ? "badge-active" : tenantStatus === "trial" ? "badge-trial" : tenantStatus === "grace_period" ? "badge-grace" : "badge-suspended"}`}>
                              {tenantStatus === "trial" ? "FREE TRIAL" : tenantStatus.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                            {tenantStatus === "trial" 
                              ? "Exploring all premium features without branch or product limits."
                              : activePlan?.description || "Full retail store POS management."}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={openRenewModal}
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                        >
                          <RefreshCw size={15} color="var(--accent-primary)" /> Renew Current Plan
                        </button>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab("plans")}
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                        >
                          <Zap size={15} /> Upgrade / Change Tier
                        </button>
                      </div>
                    </div>

                    {/* Stats & Key Details Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      
                      {/* Renewal / Expiry Date */}
                      <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <Calendar size={14} color="var(--accent-primary)" />
                          {tenantStatus === "trial" ? "Trial Expiration" : "Next Billing & Renewal Date"}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                          {tenantStatus === "trial" ? (
                            <span style={{ color: "var(--accent-primary)" }}>{trialDaysRemaining} Days Left</span>
                          ) : currentPeriodEnd ? (
                            format(currentPeriodEnd, "dd MMMM yyyy")
                          ) : "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          {currentPeriodStart ? `Started: ${format(currentPeriodStart, "dd MMM yyyy")}` : "Auto-renews on due date"}
                        </div>
                      </div>

                      {/* Store Branch Capacity */}
                      <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <Store size={14} color="#10b981" /> Store Branch Allocation
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                          {tenantStatus === "trial" ? (
                            <span style={{ color: "#10b981" }}>{((capacity as any)?.currentStores ?? (capacity as any)?.storeCount ?? 1)} Active (Unlimited)</span>
                          ) : capacity ? (
                            <span>{((capacity as any)?.currentStores ?? (capacity as any)?.storeCount ?? 1)} / {((capacity as any)?.maxStores ?? 1)} Stores Used</span>
                          ) : "1 Store"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          {tenantStatus === "trial" 
                            ? "All store limits unlocked during trial" 
                            : (((capacity as any)?.remainingStores ?? Math.max(0, ((capacity as any)?.maxStores || 1) - ((capacity as any)?.currentStores || (capacity as any)?.storeCount || 1))) > 0)
                            ? `${(capacity as any)?.remainingStores ?? Math.max(0, ((capacity as any)?.maxStores || 1) - ((capacity as any)?.currentStores || (capacity as any)?.storeCount || 1))} branch slot(s) available` 
                            : "Limit reached. Upgrade for more stores."}
                        </div>
                      </div>

                      {/* Billing Cycle Info */}
                      <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <Clock size={14} color="var(--accent-primary)" /> Billing Frequency
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", textTransform: "capitalize" }}>
                          {tenantStatus === "trial" ? "Free Trial Period" : `${activeBillingCycle} Billing`}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          {activePlan 
                            ? `PKR ${(activeBillingCycle === "annual" ? activePlan.annualPrice : activePlan.monthlyPrice).toLocaleString()} per ${activeBillingCycle === "annual" ? "year" : "month"}`
                            : "Standard PKR 0 during trial"}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Feature Breakdown & Access Grid */}
                  <div className="card" style={{ padding: 26, marginBottom: 24 }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                      Active Plan Features & Entitlements
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                      {[
                        "Full Point of Sale (POS) Cashier Terminal",
                        "Barcode Scanner & Label Printing Engine",
                        "Multi-Branch Stock Transfers & Inventory Tracking",
                        "Thermal Receipt Printer Customization (80mm & 58mm)",
                        "Unlimited Cashier, Manager & Store Staff Accounts",
                        "Daily Sales, Low-Stock & Tax PDF/Excel Reports",
                        "Direct Supplier & Purchase Order Management",
                        "Customer Loyalty Points & Credit Ledger",
                        "24/7 WhatsApp & In-App Ticket Support"
                      ].map((feature, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                          <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: "#e2e8f0" }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Need Help / Manual Transfer Info footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(249,115,22,0.06)", padding: "16px 22px", borderRadius: 12, border: "1px solid rgba(249,115,22,0.18)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <HelpCircle size={20} color="var(--accent-primary)" />
                      <span style={{ fontSize: 13, color: "#cbd5e1" }}>
                        Need to submit an offline bank slip or extend your existing plan?
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("accounts")}>
                        View Bank Accounts
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={openRenewModal}>
                        Submit Renewal Slip
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── TAB 2: UPGRADE & CHANGE PLAN (Pricing Comparison) ── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === "plans" && (
                <div>
                  {/* Billing Frequency Switcher */}
                  <div style={{ textAlign: "center", marginBottom: 30 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "6px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", gap: 8 }}>
                      <button 
                        onClick={() => setBillingCycleToggle("monthly")}
                        style={{
                          background: billingCycleToggle === "monthly" ? "linear-gradient(135deg, #ea580c, #f97316)" : "transparent",
                          color: billingCycleToggle === "monthly" ? "#fff" : "#94a3b8",
                          border: "none",
                          padding: "8px 22px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        Monthly Billing
                      </button>
                      <button 
                        onClick={() => setBillingCycleToggle("annual")}
                        style={{
                          background: billingCycleToggle === "annual" ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
                          color: billingCycleToggle === "annual" ? "#fff" : "#94a3b8",
                          border: "none",
                          padding: "8px 22px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        Annual Billing <span style={{ fontSize: 10, background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>SAVE 17% (2 Mo. FREE)</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Plans Carousel & Comparison Slider */}
                  <div style={{ marginBottom: 40 }}>
                    <PlansCarousel
                      plans={plans}
                      billingCycle={billingCycleToggle}
                      activePlanId={activePlan?._id}
                      activeBillingCycle={activeBillingCycle}
                      tenantStatus={tenantStatus}
                      onSelectPlan={(plan, cycle) => openUpgradeModal(plan, cycle)}
                    />
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── TAB 3: BANK DETAILS & PAYMENT METHODS ── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === "accounts" && (
                <div>
                  {/* Top Guide */}
                  <div className="card" style={{ padding: 24, marginBottom: 24, background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.18)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                          Official Company Receiving Accounts
                        </h3>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
                          Transfer the subscription amount directly to any of the verified bank or wallet accounts below.
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary"
                        onClick={openRenewModal}
                        style={{ fontSize: 13 }}
                      >
                        <Upload size={15} /> Submit Payment Slip
                      </button>
                    </div>
                  </div>

                  {/* Bank Accounts Grid */}
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                    🏦 Direct Bank Wire Accounts
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 30 }}>
                    {paymentAccounts.filter(a => a.providerType === 'bank').map((b) => (
                      <div key={b._id} className="card" style={{ padding: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent-primary)" }}>{b.providerName}</span>
                          <span className="badge badge-active" style={{ fontSize: 11 }}>Verified Bank</span>
                        </div>
                        
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                          Account Title: <strong style={{ color: "#f8fafc" }}>{b.accountTitle}</strong>
                        </div>

                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 8, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>Account Number</div>
                            <span style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", fontFamily: "monospace" }}>{b.accountNumber}</span>
                          </div>
                          <button onClick={() => copyToClipboard(b.accountNumber, "Account Number")} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                            <Copy size={15} color="var(--accent-primary)" />
                          </button>
                        </div>

                        {b.iban && (
                          <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 8, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>IBAN</div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", fontFamily: "monospace" }}>{b.iban}</span>
                            </div>
                            <button onClick={() => copyToClipboard(b.iban || "", "IBAN")} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                              <Copy size={15} color="var(--accent-primary)" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mobile Wallets */}
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                    📱 Mobile Wallets (EasyPaisa / JazzCash / SadaPay)
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 30 }}>
                    {paymentAccounts.filter(a => a.providerType !== 'bank').map((w) => (
                      <div key={w._id} className="card" style={{ padding: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent-primary)" }}>{w.providerName}</span>
                          <span className="badge badge-info" style={{ fontSize: 11 }}>Instant Deposit</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                          Account Title: <strong style={{ color: "#f8fafc" }}>{w.accountTitle}</strong>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 8, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", fontFamily: "monospace" }}>{w.accountNumber}</span>
                          <button onClick={() => copyToClipboard(w.accountNumber, w.providerName)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                            <Copy size={15} color="var(--accent-primary)" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3 Step Instructions */}
                  <div className="card" style={{ padding: 24 }}>
                    <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>
                      How to Complete Your Manual Payment:
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                      <div style={{ background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>1. Transfer Funds</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>Send the exact PKR amount for your selected plan to any bank or wallet above.</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>2. Save Receipt / Screenshot</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>Capture the transaction reference number (TID) and receipt image from your banking app.</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>3. Submit Proof</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>Click "Submit Payment Slip" to upload the image. Your plan will activate within 1-2 hours.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── TAB 4: INVOICES & PAYMENT HISTORY ── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === "history" && (() => {
                const filteredHistory = payments.filter((p) => {
                  if (historyStatusFilter === "all") return true;
                  return p.status === historyStatusFilter;
                });
                const totalHistoryItems = filteredHistory.length;
                const totalHistoryPages = Math.ceil(totalHistoryItems / historyLimit) || 1;
                const paginatedHistory = filteredHistory.slice((historyPage - 1) * historyLimit, historyPage * historyLimit);

                return (
                  <div>
                    {/* Status Filter Bar */}
                    <div className="card mb-4" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Filter by Status:</span>
                        <select
                          className="input"
                          value={historyStatusFilter}
                          onChange={(e) => { setHistoryStatusFilter(e.target.value); setHistoryPage(1); }}
                          style={{ width: "auto", minWidth: 160 }}
                        >
                          <option value="all">All Invoices & Payments</option>
                          <option value="pending_review">Pending Review</option>
                          <option value="confirmed">Confirmed / Active</option>
                          <option value="rejected">Rejected / Invalid</option>
                        </select>
                      </div>

                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={openRenewModal}
                        style={{ fontSize: 12 }}
                      >
                        <Upload size={14} /> Submit Payment Slip
                      </button>
                    </div>

                    <div className="card card-table">
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Invoice / Submission Date</th>
                              <th>Amount (PKR)</th>
                              <th>Receiving Account</th>
                              <th>Transaction Ref #</th>
                              <th>Verification Status</th>
                              <th>Remarks & Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedHistory.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
                                  <Receipt size={36} style={{ margin: "0 auto 12px", opacity: 0.4, display: "block" }} />
                                  No payment records found. Your renewals and upgrade payments will appear here.
                                </td>
                              </tr>
                            ) : (
                              paginatedHistory.map((p) => (
                                <tr key={String(p._id)}>
                                  <td style={{ fontSize: 13, color: "#94a3b8" }}>
                                    {p.submittedAt ? format(new Date(String(p.submittedAt)), "dd MMM yyyy, hh:mm a") : "—"}
                                  </td>
                                  <td style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                                    PKR {Number(p.amount || 0).toLocaleString()}
                                  </td>
                                  <td>
                                    <span style={{ textTransform: "capitalize", background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
                                      {p.paymentAccountId ? (p.paymentAccountId as any).providerName : "Manual Bank"}
                                    </span>
                                  </td>
                                  <td style={{ fontFamily: "monospace", fontSize: 13, color: "#cbd5e1" }}>
                                    {(() => {
                                      const pAny = p as any;
                                      const tid = String(pAny.transactionId || pAny.referenceNote || "—");
                                      return (
                                        <>
                                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span>{tid}</span>
                                            {tid !== "—" && (
                                              <button
                                                onClick={() => copyToClipboard(tid, "Transaction ID")}
                                                className="btn btn-ghost btn-sm"
                                                style={{ padding: 2, height: "auto", minHeight: 0 }}
                                                title="Copy TID"
                                              >
                                                <Copy size={12} color="#94a3b8" />
                                              </button>
                                            )}
                                          </div>
                                          <div style={{ marginTop: 4 }}>
                                            {pAny.whatsappConfirmed ? (
                                              <span style={{ fontSize: 10, color: "#22c55e", display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                                                <MessageSquare size={11} /> WhatsApp Confirmed
                                              </span>
                                            ) : (
                                              <span style={{ fontSize: 10, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                <Clock size={11} /> WhatsApp Pending
                                              </span>
                                            )}
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </td>
                                  <td>
                                    <span className={PAYMENT_STATUS_CLASSES[String(p.status)]?.badge || "badge"}>
                                      {PAYMENT_STATUS_CLASSES[String(p.status)]?.label || String(p.status)}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: 13, color: p.status === "rejected" ? "#f87171" : p.status === "confirmed" ? "#34d399" : "#64748b" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                      <span>
                                        {p.status === "rejected" 
                                          ? String(p.rejectionReason || "Verification failed") 
                                          : p.status === "confirmed" 
                                          ? "✓ Verified & Plan Extended" 
                                          : "Under review by finance team"}
                                      </span>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {Boolean(p.proofFileUrl) && (
                                          <a 
                                            href={String(p.proofFileUrl).startsWith("http") ? String(p.proofFileUrl) : `${BACKEND_URL}${String(p.proofFileUrl)}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="btn btn-sm btn-ghost"
                                            style={{ fontSize: 11, color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)" }}
                                            title="View your uploaded receipt on Cloudinary"
                                          >
                                            <Shield size={11} /> Cloud Receipt
                                          </a>
                                        )}
                                        {p.status === "rejected" && (
                                          <button 
                                            className="btn btn-sm btn-ghost" 
                                            onClick={() => {
                                              setProofForm(prev => ({ ...prev, amount: String(p.amount || "") }));
                                              setShowUploadModal(true);
                                            }}
                                            style={{ color: "#ef4444", fontSize: 11, padding: "3px 8px", border: "1px solid rgba(239,68,68,0.3)" }}
                                          >
                                            Resubmit
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Universal Pagination */}
                      <Pagination
                        currentPage={historyPage}
                        totalPages={totalHistoryPages}
                        totalItems={totalHistoryItems}
                        limit={historyLimit}
                        onPageChange={setHistoryPage}
                        onLimitChange={setHistoryLimit}
                        itemLabel="payment slips"
                      />
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </motion.div>
      </main>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: SUBMIT PAYMENT SLIP / BANK PROOF ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showUploadModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="card" 
              style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 24, position: "relative" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                    {modalContext === "upgrade" 
                      ? `Upgrade to ${targetPlanForModal?.name || "Plan"}` 
                      : modalContext === "renew" 
                      ? "Renew / Extend Subscription" 
                      : "Submit Payment Slip"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                    {modalContext === "renew" 
                      ? "Pay to extend your active subscription period." 
                      : "Submit your bank receipt for fast verification."}
                  </p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Order Summary Box */}
              {targetPlanForModal && (
                <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{targetPlanForModal.name} Plan</div>
                    <div style={{ fontSize: 11, color: "var(--accent-primary)", textTransform: "capitalize" }}>Billing Cycle: {targetCycleForModal} (1 {targetCycleForModal === "annual" ? "Year" : "Month"})</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981" }}>PKR {Number(proofForm.amount || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>Amount Payable</div>
                  </div>
                </div>
              )}

              {/* ── Transaction ID Card ── */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Official Payment Transaction ID
                  </span>
                  <span className="badge badge-info" style={{ fontSize: 10, padding: "2px 6px" }}>
                    Unique TID
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800, color: "var(--accent-primary)", letterSpacing: "0.05em" }}>
                    {proofForm.referenceNote || transactionId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(proofForm.referenceNote || transactionId, "Transaction ID")}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                    title="Copy Transaction ID"
                  >
                    <Copy size={13} /> Copy TID
                  </button>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
                  This TID will be cross-checked by the admin on WhatsApp and against your Cloudinary receipt.
                </p>
              </div>

              <form onSubmit={handleSubmitProof}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label" style={{ fontSize: 12, fontWeight: 600 }}>Amount Transferred (PKR) *</label>
                  <input 
                    type="number" 
                    required 
                    className="input" 
                    placeholder="e.g. 5000" 
                    value={proofForm.amount}
                    onChange={e => setProofForm({ ...proofForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label" style={{ fontSize: 12, fontWeight: 600 }}>Target Bank / Wallet Account Transferred To *</label>
                  <select 
                    required 
                    className="input"
                    value={proofForm.paymentAccountId}
                    onChange={e => setProofForm({ ...proofForm, paymentAccountId: e.target.value })}
                  >
                    {paymentAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.providerName} — {acc.accountTitle} ({acc.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show selected account details right below */}
                {selectedAccount && (
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 8, marginBottom: 14, fontSize: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ color: "#94a3b8" }}>Transfer Details: <strong style={{ color: "#f8fafc" }}>{selectedAccount.providerName}</strong> ({selectedAccount.accountNumber})</div>
                    <div style={{ color: "#64748b", marginTop: 2 }}>Title: {selectedAccount.accountTitle} {selectedAccount.iban ? `| IBAN: ${selectedAccount.iban}` : ""}</div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label" style={{ fontSize: 12, fontWeight: 600 }}>Transaction Ref Number / TID / Notes</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. TXN-POS-123456 or Bank TID" 
                    value={proofForm.referenceNote}
                    onChange={e => setProofForm({ ...proofForm, referenceNote: e.target.value })}
                  />
                </div>

                {/* ── Receipt Screenshot / Proof Slip * (Cloudinary Only) ── */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label className="label" style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>
                      Receipt Screenshot / Proof Slip *
                    </label>
                    <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                      <Shield size={11} /> Cloudinary Cloud Storage
                    </span>
                  </div>

                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    disabled={isUploadingProof}
                    className="input" 
                    style={{ padding: 8 }}
                    onChange={handleProofFileUpload}
                  />

                  {/* Uploading State */}
                  {isUploadingProof && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", padding: "8px 12px", borderRadius: 6 }}>
                      <RefreshCw size={14} className="animate-spin" color="var(--accent-primary)" />
                      <span style={{ fontSize: 12, color: "var(--accent-primary)", fontWeight: 600 }}>
                        Uploading screenshot to Cloudinary Secure Storage...
                      </span>
                    </div>
                  )}

                  {/* Upload Success State */}
                  {uploadedProofUrl && !isUploadingProof && (
                    <div style={{ marginTop: 8, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "10px 12px", borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img 
                          src={uploadedProofUrl} 
                          alt="Slip Preview" 
                          style={{ width: 42, height: 42, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(16, 185, 129, 0.4)" }} 
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle2 size={13} /> {uploadSuccessMessage || "Slip attached & uploaded to Cloudinary"}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {proofFile?.name || "Uploaded screenshot"}
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            setUploadedProofUrl(null);
                            setProofFile(null);
                            setUploadSuccessMessage(null);
                          }} 
                          style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Error State */}
                  {uploadErrorMessage && !isUploadingProof && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "8px 12px", borderRadius: 6 }}>
                      <AlertTriangle size={15} color="#ef4444" />
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                        {uploadErrorMessage}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── WhatsApp Quick Verification Box (Matching Image 1) ── */}
                {(() => {
                  const targetPhone = selectedAccount?.accountNumber?.replace(/[^0-9]/g, "") || "03001234567";
                  const cleanPhone = targetPhone.startsWith("0") ? `92${targetPhone.slice(1)}` : targetPhone.startsWith("92") ? targetPhone : `92${targetPhone}`;
                  const displayPhone = selectedAccount?.accountNumber || "0300 1234567";
                  const currentTxnId = proofForm.referenceNote || transactionId;
                  
                  const waMessage = `Assalam-o-Alaikum CityRock Billing Team!\nStore: ${(tenantInfo as any)?.businessName || (user as any)?.businessName || user?.name || "CityRock Store"}\nPlan: ${targetPlanForModal?.name || "POS Plan"} (${targetCycleForModal})\nAmount: PKR ${Number(proofForm.amount || 0).toLocaleString()}\nTarget Account: ${selectedAccount?.providerName || "Bank"} (${selectedAccount?.accountNumber || ""})\nTransaction ID / TID: ${currentTxnId}\nReceipt: Uploaded to Cloudinary portal\n\nI have submitted the slip on the portal. Please verify my transaction ID and activate my subscription.`;
                  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

                  return (
                    <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: 8, padding: "12px 14px", marginBottom: 18 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <MessageSquare size={15} /> Send Proof via WhatsApp for Fast Verification
                      </div>
                      <p style={{ margin: "0 0 10px", fontSize: 11, color: "#94a3b8" }}>
                        Once uploaded, share your payment slip directly with our billing team on WhatsApp:
                      </p>
                      <a 
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setWhatsappConfirmed(true);
                          toast.success("WhatsApp opened in new tab! Transaction ID prefilled.");
                        }}
                        className="btn btn-sm"
                        style={{ 
                          background: "#22c55e", 
                          color: "#ffffff", 
                          fontWeight: 700, 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: 6, 
                          width: "100%", 
                          justifyContent: "center",
                          padding: "10px 14px",
                          borderRadius: 8,
                          textDecoration: "none"
                        }}
                      >
                        <MessageSquare size={16} /> Send Proof on WhatsApp ({displayPhone})
                      </a>

                      {/* WhatsApp Confirmation Status Toggle */}
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: "1px dashed rgba(34, 197, 94, 0.2)" }}>
                        <input 
                          type="checkbox" 
                          id="confirmWaCheckbox"
                          checked={whatsappConfirmed}
                          onChange={(e) => setWhatsappConfirmed(e.target.checked)}
                          style={{ accentColor: "#22c55e", cursor: "pointer", width: 16, height: 16 }}
                        />
                        <label htmlFor="confirmWaCheckbox" style={{ fontSize: 11, color: whatsappConfirmed ? "#22c55e" : "#cbd5e1", fontWeight: 600, cursor: "pointer" }}>
                          {whatsappConfirmed 
                            ? `✓ WhatsApp confirmation sent with TID: ${currentTxnId}` 
                            : "I have clicked and confirmed sending my TID via WhatsApp (Required)"}
                        </label>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Double Verification Summary Checklist ── */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: "#94a3b8", marginBottom: 6, fontSize: 11, textTransform: "uppercase" }}>
                    Double Verification Checklist:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: uploadedProofUrl ? "#10b981" : "#f59e0b" }}>
                      {uploadedProofUrl ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      <span>1. Cloudinary Screenshot Proof: {uploadedProofUrl ? "Ready & Uploaded" : "Upload Required"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: whatsappConfirmed ? "#22c55e" : "#f59e0b" }}>
                      {whatsappConfirmed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      <span>2. WhatsApp TID Confirmation: {whatsappConfirmed ? "Confirmed by Tenant" : "Click WhatsApp button above"}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isSubmittingProof || isUploadingProof}
                    style={{ minWidth: 160, justifyContent: "center", fontWeight: 700 }}
                  >
                    {isSubmittingProof ? "Submitting..." : "Submit for Verification"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

