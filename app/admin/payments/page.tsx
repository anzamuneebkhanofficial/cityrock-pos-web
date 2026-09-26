"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, Upload, Eye } from "lucide-react";
import { adminApi, getImageUrl } from "@/lib/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  paymentAccountId?: { providerName: string; accountNumber?: string };
  planId?: { name: string };
  billingCycle?: string;
  transactionId?: string;
  whatsappConfirmed?: boolean;
  status: string;
  referenceNote: string;
  proofFileUrl: string;
  submittedAt: string;
  tenantId: { businessName: string; ownerEmail: string; city: string; ownerPhone?: string };
  subscriptionId?: { status: string };
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; open: boolean }>({ id: "", open: false });
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    const role = (u?.role || "").toLowerCase();
    if (!["super_admin", "platform_admin", "sales_onboarding"].includes(role)) {
      toast.error("Access Denied: Payment review is restricted to Sales & Admins.");
      router.replace("/admin");
      return;
    }
    setUser(u);
    fetchPayments();
  }, [router]);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getPendingPayments({ status: "pending_review" });
      setPayments(res.data.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirm = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(id);
    try {
      await adminApi.reviewPaymentRequest(id, { status: "confirmed" });
      toast.success("Payment confirmed and subscription extended!");
      setPayments((prev) => prev.filter((p) => p._id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    } finally {
      setActionLoading("");
    }
  };

  const handleReject = async () => {
    if (actionLoading) return;
    if (!rejectReason.trim()) return;
    setActionLoading(rejectModal.id);
    try {
      await adminApi.reviewPaymentRequest(rejectModal.id, { status: "rejected", rejectionReason: rejectReason });
      toast.success("Payment rejected. Tenant has been notified.");
      setPayments((prev) => prev.filter((p) => p._id !== rejectModal.id));
      setRejectModal({ id: "", open: false });
      setRejectReason("");
    } catch {
      toast.error("Failed to reject payment");
    } finally {
      setActionLoading("");
    }
  };

  if (!user) {
    return (
      <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        Loading...
      </main>
    );
  }

  return (
    <>
      <main className="main-content">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="page-header">
            <h1 className="page-title">Payment Review Queue</h1>
            <p className="page-subtitle">{payments.length} payments awaiting verification</p>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 60 }}>
              <CheckCircle size={48} color="#10b981" style={{ margin: "0 auto 16px" }} />
              <h3 style={{ color: "#e2e8f0", margin: "0 0 8px" }}>All caught up!</h3>
              <p style={{ color: "#64748b" }}>No pending payments to review.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {payments.map((p) => (
                <motion.div key={p._id} layout className="card" style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                      {p.tenantId?.businessName}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{p.tenantId?.ownerEmail}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{p.tenantId?.city}</div>
                    <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</span>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#818cf8" }}>PKR {p.amount?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Account</span>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", textTransform: "capitalize" }}>{p.paymentAccountId ? p.paymentAccountId.providerName : "Manual"}</div>
                      </div>
                      {p.planId && (
                        <div>
                          <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Target Plan</span>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-primary)" }}>{p.planId.name} ({p.billingCycle || "monthly"})</div>
                        </div>
                      )}
                      {p.referenceNote && (
                        <div>
                          <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ref #</span>
                          <div style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "monospace" }}>{p.referenceNote}</div>
                        </div>
                      )}
                    </div>
                    {p.submittedAt && (
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> Submitted {formatDistanceToNow(new Date(p.submittedAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>

                  {p.proofFileUrl && (
                    <div>
                      <a href={getImageUrl(p.proofFileUrl)} target="_blank" rel="noreferrer">
                        <div style={{ width: 120, height: 90, background: "var(--surface-dark-alt)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, border: "1px solid var(--border-subtle)", cursor: "pointer" }}>
                          <Upload size={20} color="var(--accent-primary)" />
                          <span style={{ fontSize: 11, color: "var(--accent-primary)" }}>View Proof</span>
                        </div>
                      </a>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-success"
                      disabled={actionLoading === p._id}
                      onClick={() => handleConfirm(p._id)}
                    >
                      <CheckCircle size={16} /> Confirm
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={actionLoading === p._id}
                      onClick={() => setRejectModal({ id: p._id, open: true })}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="modal-overlay" onClick={() => setRejectModal({ id: "", open: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--negative-bg)", border: "1px solid var(--negative)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--negative)" }}>
                <XCircle size={24} />
              </div>
              <h3 className="modal-title" style={{ margin: 0 }}>Reject Payment</h3>
            </div>
            
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>
              Select a common reason below or type a custom message. This will be sent directly to the customer so they can fix the issue.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                "Amount transferred does not match plan price.",
                "Payment proof image is unreadable or blurred.",
                "Transaction reference number is invalid or not found."
              ].map(reason => (
                <button 
                  key={reason}
                  type="button" 
                  onClick={() => setRejectReason(reason)}
                  style={{
                    background: rejectReason === reason ? "var(--negative-bg)" : "var(--surface-dark-alt)",
                    border: `1px solid ${rejectReason === reason ? "var(--negative)" : "var(--border-subtle)"}`,
                    color: rejectReason === reason ? "var(--negative)" : "var(--text-primary)",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {reason.split(" ")[0]} {reason.includes("Amount") ? "Mismatch" : reason.includes("unreadable") ? "Proof" : "Ref"}
                </button>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <textarea
                className="input"
                rows={3}
                placeholder="Type rejection reason here..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ resize: "none" }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setRejectModal({ id: "", open: false })}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} disabled={!rejectReason.trim() || !!actionLoading} onClick={handleReject}>
                {actionLoading ? "Processing..." : "Reject Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

