"use client";
import { useEffect, useState } from "react";
import { adminApi, BACKEND_URL } from "@/lib/api";
import { 
  CheckCircle, XCircle, Eye, Plus, Edit, 
  Trash2, CreditCard, Shield, Layers, Upload, X, Search,
  ExternalLink, AlertTriangle, Download, MessageSquare, Copy
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import PlansCarousel from "@/components/billing/PlansCarousel";

interface PlanItem {
  _id?: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  maxStores: number;
  discountPercent: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
}

interface PaymentAccountItem {
  _id?: string;
  providerType: "bank" | "wallet" | "other";
  providerName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
  instructions?: string;
  isActive: boolean;
}

export default function AdminBillingDashboard() {
  const [activeTab, setActiveTab] = useState<"queue" | "plans" | "accounts">("queue");
  
  const [queue, setQueue] = useState<any[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queuePage, setQueuePage] = useState(1);
  const [queueLimit, setQueueLimit] = useState(10);
  const [queueTotalPages, setQueueTotalPages] = useState(1);
  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState("all");

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccountItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);

  // Rejection Modal
  const [rejectModal, setRejectModal] = useState<{ open: boolean; paymentId: string; reason: string }>({
    open: false,
    paymentId: "",
    reason: ""
  });

  // Proof Image & Payment Review Modal
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [previewPayment, setPreviewPayment] = useState<any | null>(null);

  // Plan Modal
  const [planModal, setPlanModal] = useState<{ open: boolean; isEdit: boolean; data: PlanItem }>({
    open: false,
    isEdit: false,
    data: {
      name: "",
      description: "",
      monthlyPrice: 5000,
      annualPrice: 50000,
      currency: "PKR",
      maxStores: 1,
      discountPercent: 17,
      features: ["1 Store Location", "Unlimited Products", "Basic Reporting"],
      isPopular: false,
      isActive: true
    }
  });
  const [featuresInput, setFeaturesInput] = useState("");
  const [isViewMode, setIsViewMode] = useState(false);

  // Payment Account Modal
  const [accountModal, setAccountModal] = useState<{ open: boolean; isEdit: boolean; data: PaymentAccountItem }>({
    open: false,
    isEdit: false,
    data: {
      providerType: "bank",
      providerName: "",
      accountTitle: "",
      accountNumber: "",
      iban: "",
      instructions: "",
      isActive: true
    }
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, queuePage, queueLimit, queueSearch, queueStatusFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "queue") {
        const res = await adminApi.getPendingPayments({
          search: queueSearch,
          status: queueStatusFilter !== "all" ? queueStatusFilter : undefined,
          page: queuePage,
          limit: queueLimit
        });
        setQueue(res.data?.data || []);
        const meta = res.data?.meta || {};
        setQueueTotal(meta.total || res.data?.data?.length || 0);
        setQueueTotalPages(meta.totalPages || Math.ceil((meta.total || res.data?.data?.length || 0) / queueLimit) || 1);
      } else if (activeTab === "plans") {
        const res = await adminApi.listPlans();
        setPlans(res.data?.data || []);
      } else if (activeTab === "accounts") {
        const res = await adminApi.getPaymentAccounts();
        setAccounts(res.data?.data || []);
      }
    } catch (e: any) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // --- Payment Queue Actions ---
  const handleReviewPayment = async (id: string, status: string, rejectionReason: string = "", crossCheckedWhatsApp?: boolean) => {
    try {
      await adminApi.reviewPaymentRequest(id, { status, rejectionReason, crossCheckedWhatsApp });
      toast.success(`Payment marked as ${status === "confirmed" ? "Approved & Plan Activated" : "Rejected"}`);
      setRejectModal({ open: false, paymentId: "", reason: "" });
      setPreviewPayment(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update payment status");
    }
  };

  // --- Plan CRUD Actions ---
  const openCreatePlan = () => {
    setIsViewMode(false);
    setFeaturesInput("1 Store Location, Unlimited Products, Basic Reporting");
    setPlanModal({
      open: true,
      isEdit: false,
      data: {
        name: "",
        description: "",
        monthlyPrice: 5000,
        annualPrice: 50000,
        currency: "PKR",
        maxStores: 1,
        discountPercent: 17,
        features: ["1 Store Location", "Unlimited Products", "Basic Reporting"],
        isPopular: false,
        isActive: true
      }
    });
  };

  const openEditPlan = (plan: PlanItem) => {
    setIsViewMode(false);
    setFeaturesInput((plan.features || []).join(", "));
    setPlanModal({
      open: true,
      isEdit: true,
      data: { ...plan }
    });
  };

  const openViewPlan = (plan: PlanItem) => {
    setIsViewMode(true);
    setFeaturesInput((plan.features || []).join(", "));
    setPlanModal({
      open: true,
      isEdit: true,
      data: { ...plan }
    });
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this plan? If users are currently subscribed to it, it is recommended to just mark it as 'Inactive' instead. Proceed with deletion?")) return;
    try {
      await adminApi.deletePlan(id);
      toast.success("Plan deleted successfully");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete plan");
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...planModal.data,
        features: featuresInput.split(",").map(s => s.trim()).filter(Boolean)
      };

      if (planModal.isEdit && planModal.data._id) {
        await adminApi.updatePlan(planModal.data._id, payload);
        toast.success("Plan updated successfully");
      } else {
        await adminApi.createPlan(payload);
        toast.success("Plan created successfully");
      }
      setPlanModal(prev => ({ ...prev, open: false }));
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save plan");
    }
  };

  // --- Payment Account CRUD Actions ---
  const openCreateAccount = () => {
    setAccountModal({
      open: true,
      isEdit: false,
      data: {
        providerType: "bank",
        providerName: "",
        accountTitle: "",
        accountNumber: "",
        iban: "",
        instructions: "",
        isActive: true
      }
    });
  };

  const openEditAccount = (acc: PaymentAccountItem) => {
    setAccountModal({
      open: true,
      isEdit: true,
      data: { ...acc }
    });
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (accountModal.isEdit && accountModal.data._id) {
        await adminApi.updatePaymentAccount(accountModal.data._id, accountModal.data as any);
        toast.success("Payment account updated successfully");
      } else {
        await adminApi.createPaymentAccount(accountModal.data as any);
        toast.success("Payment account created successfully");
      }
      setAccountModal(prev => ({ ...prev, open: false }));
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save payment account");
    }
  };

  const toggleAccountStatus = async (acc: PaymentAccountItem) => {
    if (!acc._id) return;
    try {
      await adminApi.updatePaymentAccount(acc._id, { isActive: !acc.isActive });
      toast.success(`Account marked as ${!acc.isActive ? 'Active' : 'Inactive'}`);
      fetchData();
    } catch (e: any) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="main-content">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Billing & Subscription Management</h1>
        <p className="page-subtitle">Configure pricing plans, company receiving bank accounts, and review manual verification requests.</p>
        
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button 
            className={`btn ${activeTab === "queue" ? "btn-primary" : "btn-ghost"}`} 
            onClick={() => setActiveTab("queue")}
          >
            <CreditCard size={16} /> Verification Queue ({queue.length})
          </button>
          <button 
            className={`btn ${activeTab === "plans" ? "btn-primary" : "btn-ghost"}`} 
            onClick={() => setActiveTab("plans")}
          >
            <Layers size={16} /> Subscription Plans
          </button>
          <button 
            className={`btn ${activeTab === "accounts" ? "btn-primary" : "btn-ghost"}`} 
            onClick={() => setActiveTab("accounts")}
          >
            <Shield size={16} /> Company Payment Accounts
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
      ) : (
        <>
          {/* TAB 1: Verification Queue */}
          {activeTab === "queue" && (
            <div>
              {/* Search & Status Filter Bar */}
              <div className="card mb-4" style={{ padding: "14px 18px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                  <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    className="input" 
                    placeholder="Search by tenant name, email, or ref note..." 
                    value={queueSearch} 
                    onChange={(e) => { setQueueSearch(e.target.value); setQueuePage(1); }} 
                    style={{ paddingLeft: 38 }} 
                  />
                </div>

                <select
                  className="input"
                  value={queueStatusFilter}
                  onChange={(e) => { setQueueStatusFilter(e.target.value); setQueuePage(1); }}
                  style={{ width: "auto", minWidth: 160 }}
                >
                  <option value="all">All Submissions</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="confirmed">Confirmed / Active</option>
                  <option value="rejected">Rejected / Invalid</option>
                </select>
              </div>

              <div className="card card-table">
                <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                  <table style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Tenant</th>
                        <th>Amount</th>
                        <th>Target Account</th>
                        <th>Transaction ID / TID</th>
                        <th>Proof Receipt</th>
                        <th>WhatsApp Verification</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.length === 0 ? (
                        <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No pending payments matching your filters. All caught up!</td></tr>
                      ) : (
                        queue.map((p) => {
                          const currentTxnId = p.transactionId || p.referenceNote || "—";
                          const fullUrl = p.proofFileUrl?.startsWith("http") ? p.proofFileUrl : p.proofFileUrl ? `${BACKEND_URL}${p.proofFileUrl}` : null;
                          const tenantPhone = p.tenantId?.ownerPhone || "03001234567";
                          const cleanPhone = tenantPhone.replace(/[^0-9]/g, "");
                          const waPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone.startsWith("92") ? cleanPhone : `92${cleanPhone}`;

                          return (
                            <tr key={p._id}>
                              <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                                <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                                  {new Date(p.submittedAt || p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                  {new Date(p.submittedAt || p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: "#f8fafc" }}>{p.tenantId?.businessName || "Unknown"}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.tenantId?.ownerEmail}</div>
                                {p.tenantId?.ownerPhone && (
                                  <a
                                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Assalam-o-Alaikum! Cross-checking ${p.tenantId?.businessName} payment TID: ${currentTxnId} for CityRock POS.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#22c55e", textDecoration: "none", marginTop: 4, fontWeight: 500 }}
                                    title="Cross-check tenant on WhatsApp"
                                  >
                                    <MessageSquare size={12} /> {p.tenantId.ownerPhone}
                                  </a>
                                )}
                              </td>
                              <td style={{ fontWeight: 700, color: "var(--accent-primary)", whiteSpace: "nowrap" }}>PKR {p.amount?.toLocaleString()}</td>
                              <td>
                                <span style={{ background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", padding: "3px 8px", borderRadius: "var(--radius-sm)", fontSize: 12, whiteSpace: "nowrap" }}>
                                  {p.paymentAccountId?.providerName || "Manual Transfer"}
                                </span>
                              </td>
                              <td style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ color: "#f8fafc", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>
                                    {currentTxnId}
                                  </span>
                                  {currentTxnId !== "—" && (
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(currentTxnId, "Transaction ID")}
                                      className="btn btn-ghost btn-sm"
                                      style={{ padding: 2, height: "auto", minHeight: 0 }}
                                      title="Copy Transaction ID"
                                    >
                                      <Copy size={13} color="#94a3b8" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td>
                                {fullUrl ? (
                                  <div 
                                    onClick={() => {
                                      setPreviewProofUrl(fullUrl);
                                      setPreviewPayment(p);
                                    }}
                                    className="hover:border-accent-orange transition-all"
                                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, border: "1px solid var(--border-subtle)" }}
                                    title="Click to inspect receipt screenshot"
                                  >
                                    <img 
                                      src={fullUrl} 
                                      alt="Receipt slip" 
                                      style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)" }} 
                                    />
                                    <div style={{ lineHeight: 1.2 }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 3 }}>
                                        <Eye size={12} /> View Slip
                                      </div>
                                      <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600, marginTop: 2 }}>Cloud Verified</div>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#f59e0b", fontSize: 11, background: "rgba(245, 158, 11, 0.1)", padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(245, 158, 11, 0.2)", whiteSpace: "nowrap" }}>
                                    <AlertTriangle size={12} /> No Slip Uploaded
                                  </span>
                                )}
                              </td>
                              <td>
                                {p.whatsappConfirmed ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34, 197, 94, 0.12)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                                      <CheckCircle size={12} /> WhatsApp Verified
                                    </span>
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Assalam-o-Alaikum! Cross-checking receipt and TID ${currentTxnId} for ${p.tenantId?.businessName}.`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ fontSize: 11, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                                      className="hover:text-positive transition-colors"
                                      title="Open chat to cross-check"
                                    >
                                      <MessageSquare size={11} className="text-positive" /> Direct Chat
                                    </a>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                                      <AlertTriangle size={12} /> WhatsApp Pending
                                    </span>
                                    <span style={{ fontSize: 10, color: "#ef4444" }}>
                                      Verification Required
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={`badge badge-${p.status === "confirmed" ? "active" : p.status === "pending_review" ? "warning" : "danger"}`}>
                                  {p.status === "confirmed" ? "Approved" : p.status === "pending_review" ? "Pending Review" : "Rejected"}
                                </span>
                              </td>
                              <td>
                                {p.status === "pending_review" ? (
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button 
                                      className="btn btn-sm btn-success" 
                                      onClick={() => handleReviewPayment(p._id, "confirmed", "", true)}
                                      title="Approve payment & activate subscription"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-danger" 
                                      onClick={() => setRejectModal({ open: true, paymentId: p._id, reason: "" })}
                                      title="Reject payment submission"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: p.status === "confirmed" ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                                    {p.status === "confirmed" ? "✓ Approved" : "✕ Rejected"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Universal Pagination */}
                <Pagination
                  currentPage={queuePage}
                  totalPages={queueTotalPages}
                  totalItems={queueTotal}
                  limit={queueLimit}
                  onPageChange={setQueuePage}
                  onLimitChange={setQueueLimit}
                  itemLabel="verification requests"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Plans Management */}
          {activeTab === "plans" && (
            <div className="space-y-6">
              {/* Live Plans Carousel Preview */}
              <div className="card p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-bold m-0 text-white">Interactive Plans Slider Preview</h3>
                    <p className="text-xs text-secondary mt-1">Live customer preview — browse tiers with slider without layout overcrowding</p>
                  </div>
                  <button className="btn btn-primary" onClick={openCreatePlan}>
                    <Plus size={16} /> Add New Plan
                  </button>
                </div>
                <PlansCarousel
                  plans={plans}
                  billingCycle="annual"
                  isAdminPreview={true}
                  onEditPlan={openEditPlan}
                  onSelectPlan={() => {}}
                />
              </div>

              {/* Dynamic Subscription Plans Table */}
              <div className="card card-table">
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-dark)" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Plan Configuration & Store Limits</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Manage tier pricing, feature limits, and active status.</p>
                  </div>
                </div>

              <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Plan Name</th>
                      <th>Max Stores</th>
                      <th>Monthly (PKR)</th>
                      <th>Annual (PKR)</th>
                      <th>Popular</th>
                      <th>Active</th>
                      <th>Features</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 32 }}>No plans created yet.</td></tr>
                    ) : (
                      plans.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <div style={{ fontWeight: 700, color: "#fff" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.description}</div>
                          </td>
                          <td><span className="badge badge-info">{p.maxStores} Store{p.maxStores > 1 ? "s" : ""}</span></td>
                          <td style={{ fontWeight: 600 }}>PKR {p.monthlyPrice?.toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: "#10b981" }}>PKR {p.annualPrice?.toLocaleString()}</td>
                          <td>
                            {p.isPopular ? <CheckCircle size={16} color="#10b981" /> : <XCircle size={16} color="#64748b" />}
                          </td>
                          <td>
                            {p.isActive ? (
                              <span className="badge badge-active">Active</span>
                            ) : (
                              <span className="badge badge-danger">Disabled</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: "#cbd5e1" }}>
                            {p.features?.length} items
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-sm btn-ghost" onClick={() => openViewPlan(p)} title="View Details">
                                <Eye size={14} /> View
                              </button>
                              <button className="btn btn-sm btn-ghost" onClick={() => openEditPlan(p)} title="Edit Plan">
                                <Edit size={14} /> Edit
                              </button>
                              <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444" }} onClick={() => p._id && handleDeletePlan(p._id)} title="Delete Plan">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}

          {/* TAB 3: Payment Accounts Management */}
          {activeTab === "accounts" && (
            <div className="card card-table">
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-dark)" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Company Receiving Payment Accounts</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>These accounts are shown directly to customers for bank transfers and manual wallet deposits.</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateAccount}>
                  <Plus size={16} /> Add Receiving Account
                </button>
              </div>

              <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Provider / Bank Name</th>
                      <th>Account Title</th>
                      <th>Account Number</th>
                      <th>IBAN</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: 32 }}>No payment accounts created yet.</td></tr>
                    ) : (
                      accounts.map((a) => (
                        <tr key={a._id}>
                          <td>
                            <span style={{ textTransform: "capitalize", background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", padding: "3px 8px", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                              {a.providerType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: "#fff" }}>{a.providerName}</td>
                          <td>{a.accountTitle}</td>
                          <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{a.accountNumber}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>{a.iban || "—"}</td>
                          <td>
                            <button 
                              onClick={() => toggleAccountStatus(a)}
                              className={`badge badge-${a.isActive ? "active" : "danger"}`}
                              style={{ cursor: "pointer", border: "none" }}
                            >
                              {a.isActive ? "Active (Visible)" : "Inactive (Hidden)"}
                            </button>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-ghost" onClick={() => openEditAccount(a)}>
                              <Edit size={14} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- MODAL 1: Create/Edit Plan --- */}
      {planModal.open && (
        <div className="modal-overlay" onClick={() => setPlanModal(prev => ({ ...prev, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="modal-title">
                {isViewMode ? "View Plan Details" : planModal.isEdit ? "Edit Subscription Plan" : "Create New Pricing Plan"}
              </h3>
              <button className="btn btn-ghost" onClick={() => setPlanModal(prev => ({ ...prev, open: false }))}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group">
                <label className="label">Plan Name *</label>
                <input 
                  className="input" 
                  required 
                  disabled={isViewMode}
                  value={planModal.data.name} 
                  onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, name: e.target.value } })} 
                  placeholder="e.g. Enterprise Plus" 
                />
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <input 
                  className="input" 
                  disabled={isViewMode}
                  value={planModal.data.description || ""} 
                  onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, description: e.target.value } })} 
                  placeholder="e.g. Full power for enterprise chains" 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Monthly Price (PKR) *</label>
                  <input 
                    type="number" 
                    className="input" 
                    required 
                    disabled={isViewMode}
                    value={planModal.data.monthlyPrice} 
                    onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, monthlyPrice: Number(e.target.value) } })} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Annual Price (PKR) *</label>
                  <input 
                    type="number" 
                    className="input" 
                    required 
                    disabled={isViewMode}
                    value={planModal.data.annualPrice} 
                    onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, annualPrice: Number(e.target.value) } })} 
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Max Store Locations *</label>
                  <input 
                    type="number" 
                    className="input" 
                    required 
                    disabled={isViewMode}
                    value={planModal.data.maxStores} 
                    onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, maxStores: Number(e.target.value) } })} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Annual Discount %</label>
                  <input 
                    type="number" 
                    className="input" 
                    disabled={isViewMode}
                    value={planModal.data.discountPercent} 
                    onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, discountPercent: Number(e.target.value) } })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Features (comma-separated)</label>
                <textarea 
                  className="input" 
                  rows={4}
                  disabled={isViewMode}
                  value={featuresInput} 
                  onChange={e => setFeaturesInput(e.target.value)} 
                  placeholder="e.g. 2 Store Locations, Unlimited Products, Real-time Dashboard, Export Reports, Dedicated Support" 
                />
              </div>

              <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: isViewMode ? "default" : "pointer", fontSize: 13, opacity: isViewMode ? 0.7 : 1 }}>
                  <input 
                    type="checkbox" 
                    disabled={isViewMode}
                    checked={planModal.data.isPopular} 
                    onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, isPopular: e.target.checked } })} 
                  />
                  Mark as Most Popular
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: isViewMode ? "default" : "pointer", fontSize: 13, opacity: isViewMode ? 0.7 : 1 }}>
                  <input 
                    type="checkbox" 
                    disabled={isViewMode}
                    checked={planModal.data.isActive} 
                    onChange={e => setPlanModal({ ...planModal, data: { ...planModal.data, isActive: e.target.checked } })} 
                  />
                  Active (Visible to customers)
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPlanModal(prev => ({ ...prev, open: false }))}>
                  {isViewMode ? "Close" : "Cancel"}
                </button>
                {!isViewMode && (
                  <button type="submit" className="btn btn-primary">{planModal.isEdit ? "Save Changes" : "Create Plan"}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Create/Edit Payment Account --- */}
      {accountModal.open && (
        <div className="modal-overlay" onClick={() => setAccountModal(prev => ({ ...prev, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="modal-title">{accountModal.isEdit ? "Edit Account" : "Add Payment Account"}</h3>
              <button className="btn btn-ghost" onClick={() => setAccountModal(prev => ({ ...prev, open: false }))}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Account Type *</label>
                  <select 
                    className="input"
                    value={accountModal.data.providerType}
                    onChange={e => setAccountModal({ ...accountModal, data: { ...accountModal.data, providerType: e.target.value as any } })}
                  >
                    <option value="bank">Bank Account</option>
                    <option value="wallet">Mobile Wallet (JazzCash/EasyPaisa)</option>
                    <option value="other">Other Gateway</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Provider Name *</label>
                  <input 
                    className="input" 
                    required 
                    value={accountModal.data.providerName} 
                    onChange={e => setAccountModal({ ...accountModal, data: { ...accountModal.data, providerName: e.target.value } })} 
                    placeholder="e.g. Meezan Bank, JazzCash" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Account Title / Name *</label>
                <input 
                  className="input" 
                  required 
                  value={accountModal.data.accountTitle} 
                  onChange={e => setAccountModal({ ...accountModal, data: { ...accountModal.data, accountTitle: e.target.value } })} 
                  placeholder="e.g. CityRock Technologies (Pvt) Ltd" 
                />
              </div>

              <div className="form-group">
                <label className="label">Account Number / Mobile Number *</label>
                <input 
                  className="input" 
                  required 
                  value={accountModal.data.accountNumber} 
                  onChange={e => setAccountModal({ ...accountModal, data: { ...accountModal.data, accountNumber: e.target.value } })} 
                  placeholder="e.g. 0123456789012345 or 0300-1234567" 
                />
              </div>

              <div className="form-group">
                <label className="label">IBAN (Optional)</label>
                <input 
                  className="input" 
                  value={accountModal.data.iban || ""} 
                  onChange={e => setAccountModal({ ...accountModal, data: { ...accountModal.data, iban: e.target.value } })} 
                  placeholder="e.g. PK36MEZN0001230123456789" 
                />
              </div>

              <div className="form-group">
                <label className="label">Special Instructions (Optional)</label>
                <input 
                  className="input" 
                  value={accountModal.data.instructions || ""} 
                  onChange={e => setAccountModal({ ...accountModal, data: { ...accountModal.data, instructions: e.target.value } })} 
                  placeholder="e.g. Please put your Store Name in reference" 
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input 
                  type="checkbox" 
                  checked={accountModal.data.isActive} 
                  onChange={e => setAccountModal({ ...accountModal, data: { ...accountModal.data, isActive: e.target.checked } })} 
                />
                Active (Visible to customers on checkout)
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAccountModal(prev => ({ ...prev, open: false }))}>Cancel</button>
                <button type="submit" className="btn btn-primary">{accountModal.isEdit ? "Update Account" : "Add Account"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Rejection Reason --- */}
      {rejectModal.open && (
        <div className="modal-overlay" onClick={() => setRejectModal({ open: false, paymentId: "", reason: "" })}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--negative-bg)", border: "1px solid var(--negative)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--negative)" }}>
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="modal-title" style={{ margin: 0, fontSize: 18, color: "var(--negative)" }}>Reject Payment Request</h3>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Notify customer with reason & instruction</span>
              </div>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Choose a quick reason below or write a custom explanation. An automated email will be sent to the customer immediately.
            </p>

            {/* Quick Preset Badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                "Amount transferred does not match the chosen plan price.",
                "Payment proof image or receipt screenshot is unreadable/blurred.",
                "Bank transaction reference number could not be found or verified.",
                "Payment sent to an incorrect company account."
              ].map((preset) => {
                const label = preset.includes("Amount") 
                  ? "💰 Amount Mismatch" 
                  : preset.includes("unreadable") 
                  ? "📷 Unreadable Proof" 
                  : preset.includes("reference") 
                  ? "🔍 Invalid Ref #" 
                  : "🏦 Wrong Account";
                const isSelected = rejectModal.reason === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectModal(prev => ({ ...prev, reason: preset }))}
                    style={{
                      background: isSelected ? "var(--negative-bg)" : "var(--surface-dark-alt)",
                      border: `1px solid ${isSelected ? "var(--negative)" : "var(--border-subtle)"}`,
                      color: isSelected ? "var(--negative)" : "var(--text-primary)",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="label" style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>Rejection Message to Customer *</label>
              <textarea 
                className="input"
                rows={3}
                required
                placeholder="Type or select a reason above..."
                value={rejectModal.reason}
                onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                style={{ resize: "none", fontSize: 13 }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button 
                type="button"
                className="btn btn-ghost" 
                onClick={() => setRejectModal({ open: false, paymentId: "", reason: "" })}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                disabled={!rejectModal.reason.trim()}
                onClick={() => handleReviewPayment(rejectModal.paymentId, "rejected", rejectModal.reason)}
                style={{ justifyContent: "center", minWidth: 140 }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Proof Viewer & Double Verification Inspector --- */}
      {(previewProofUrl || previewPayment) && (
        <div className="modal-overlay" onClick={() => { setPreviewProofUrl(null); setPreviewPayment(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 740, width: "100%", maxHeight: "92vh", overflowY: "auto", textAlign: "left", padding: 24, position: "relative" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 className="modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                  Payment Proof Receipt
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Verify transaction amount, TID & WhatsApp confirmation before approving subscription
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {previewProofUrl && (
                  <a 
                    href={previewProofUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-sm btn-ghost" 
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent-primary)", fontSize: 12 }}
                  >
                    <ExternalLink size={14} /> Open Full
                  </a>
                )}
                <button className="btn btn-ghost" onClick={() => { setPreviewProofUrl(null); setPreviewPayment(null); }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Transaction ID & Cross-Check Card ── */}
            {(() => {
              const currentTxn = previewPayment?.transactionId || previewPayment?.referenceNote || "N/A";
              const tenantPhone = previewPayment?.tenantId?.ownerPhone || "03001234567";
              const cleanPhone = tenantPhone.replace(/[^0-9]/g, "");
              const waPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone.startsWith("92") ? cleanPhone : `92${cleanPhone}`;

              return (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                        Transaction ID (TID) to Verify:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "var(--accent-primary)", letterSpacing: "0.05em" }}>
                          {currentTxn}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentTxn, "Transaction ID")}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "2px 6px", height: "auto" }}
                          title="Copy Transaction ID"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp Double Verification Status Badge */}
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 2 }}>
                        WhatsApp Verification:
                      </span>
                      {previewPayment?.whatsappConfirmed ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.35)", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          <CheckCircle size={12} /> Confirmed by Tenant
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.35)", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          <AlertTriangle size={12} /> Verification Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>Tenant / Business:</span>
                      <strong style={{ color: "#f8fafc" }}>{previewPayment?.tenantId?.businessName || "Unknown"}</strong>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{previewPayment?.tenantId?.ownerEmail}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>Amount Transferred:</span>
                      <strong style={{ color: "#10b981", fontSize: 14 }}>PKR {Number(previewPayment?.amount || 0).toLocaleString()}</strong>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{previewPayment?.billingCycle || "monthly"} cycle</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>Receiving Account:</span>
                      <strong style={{ color: "#f8fafc" }}>{previewPayment?.paymentAccountId?.providerName || "Manual Account"}</strong>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{previewPayment?.paymentAccountId?.accountNumber || ""}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>Cross-Check WhatsApp:</span>
                      <a
                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Assalam-o-Alaikum! Cross-checking payment TID: ${currentTxn} for ${previewPayment?.tenantId?.businessName}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-ghost"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", padding: "2px 6px", fontSize: 11, border: "1px solid rgba(34, 197, 94, 0.3)" }}
                      >
                        <MessageSquare size={12} /> {tenantPhone}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Receipt Image Area */}
            <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 14, border: "1px solid var(--border-subtle)", textAlign: "center", marginBottom: 16 }}>
              {previewProofUrl ? (
                <img 
                  src={previewProofUrl} 
                  alt="Payment proof receipt" 
                  style={{ maxWidth: "100%", maxHeight: "50vh", objectFit: "contain", borderRadius: 8, margin: "0 auto", display: "block", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
                />
              ) : (
                <div style={{ padding: 40, color: "#94a3b8" }}>
                  <AlertTriangle size={36} color="#f59e0b" style={{ margin: "0 auto 8px" }} />
                  <p>No receipt image file available for this payment.</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <span className={`badge badge-${previewPayment?.status === "confirmed" ? "active" : previewPayment?.status === "pending_review" ? "warning" : "danger"}`}>
                  Status: {previewPayment?.status === "confirmed" ? "Approved & Plan Active" : previewPayment?.status === "pending_review" ? "Pending Review" : "Rejected"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => { setPreviewProofUrl(null); setPreviewPayment(null); }}
                >
                  Close
                </button>

                {previewPayment?.status === "pending_review" && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={() => {
                        setRejectModal({ open: true, paymentId: previewPayment._id, reason: "" });
                      }}
                    >
                      Reject
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={() => handleReviewPayment(previewPayment._id, "confirmed", "", true)}
                      style={{ fontWeight: 700 }}
                    >
                      Approve & Activate Plan
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

