"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Plus, Trash2, X, Mail, CheckCircle2, Clock, Send } from "lucide-react";
import toast from "react-hot-toast";
import api, { adminApi } from "@/lib/api";
import CustomSelect from "@/components/ui/CustomSelect";
import PasswordInput from "@/components/ui/PasswordInput";

import Pagination from "@/components/ui/Pagination";
import { Search } from "lucide-react";

interface PlatformStaff {
  _id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export default function PlatformStaffPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<PlatformStaff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "support_agent" });
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    const u = JSON.parse(stored);
    const role = (u?.role || "").toLowerCase();
    if (!["super_admin", "platform_admin"].includes(role)) {
      toast.error("Access Denied: Team Management is restricted to Super Admins only.");
      router.replace("/admin");
      return;
    }
  }, [router]);

  const fetchStaff = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const res = await adminApi.listStaff({ 
        search, 
        role: roleFilter !== "all" ? roleFilter : undefined,
        page, 
        limit 
      });
      if (requestId !== latestRequestIdRef.current) return;
      setStaffList(res.data?.data || []);
      const meta = res.data?.meta || {};
      setTotal(meta.total || res.data?.data?.length || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || res.data?.data?.length || 0) / limit) || 1);
    } catch (err) {
      if (requestId === latestRequestIdRef.current) {
        console.error(err);
        toast.error("Failed to load platform staff");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, roleFilter, page, limit]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAddStaff = async () => {
    if (submitting) return;
    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      return toast.error("Please fill all required fields");
    }
    setSubmitting(true);
    try {
      await api.post("/admin/staff", newStaff);
      toast.success("Staff member invited & verification email sent! ✉️");
      setShowAddModal(false);
      setNewStaff({ name: "", email: "", password: "", role: "support_agent" });
      setPage(1);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (id: string, staffName: string) => {
    setResendingId(id);
    try {
      const res = await adminApi.resendStaffInvite(id);
      toast.success(res.data.message || `Verification invite resent to ${staffName}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      toast.success("Staff member removed");
      fetchStaff();
    } catch (err) {
      toast.error("Failed to remove staff member");
    }
  };

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Platform Team Management</h1>
            <p className="page-subtitle">Manage support agents and sales representatives ({total.toLocaleString()} total members)</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Staff Member
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="card mb-4" style={{ padding: "14px 18px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              className="input" 
              placeholder="Search by name or email..." 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
              style={{ paddingLeft: 38 }} 
            />
          </div>

          <select
            className="input"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            style={{ width: "auto", minWidth: 160 }}
          >
            <option value="all">All Roles</option>
            <option value="support_agent">Support Agent</option>
            <option value="sales_agent">Sales Onboarding</option>
          </select>
        </div>

        <div className="card card-table">
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 48 }}>
                      <div className="spinner" style={{ width: 24, height: 24, margin: "0 auto", border: "3px solid #f3f4f6", borderTop: "3px solid #818cf8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
                      <Shield size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                      No platform staff found.
                    </td>
                  </tr>
                ) : (
                  staffList.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600, color: "#e2e8f0" }}>{s.name}</td>
                      <td style={{ color: "#94a3b8" }}>{s.email}</td>
                      <td>
                        <span className={`badge ${s.role === "support_agent" ? "badge-active" : "badge-trial"}`}>
                          {s.role === "support_agent" ? "Support Agent" : "Sales Onboarding"}
                        </span>
                      </td>
                      <td>
                        {s.isEmailVerified ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: "var(--positive-bg)",
                              color: "var(--positive)",
                              border: "1px solid var(--positive)",
                              padding: "3px 10px",
                              borderRadius: "var(--radius-sm)",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={13} /> Verified
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: "var(--surface-dark-alt)",
                              color: "var(--accent-primary)",
                              border: "1px solid var(--border-subtle)",
                              padding: "3px 10px",
                              borderRadius: "var(--radius-sm)",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <Clock size={13} /> Pending Verification
                          </span>
                        )}
                      </td>
                      <td style={{ color: "#64748b" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          {!s.isEmailVerified && (
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleResendInvite(s._id, s.name)}
                              disabled={resendingId === s._id}
                              title="Resend Verification OTP Email"
                              style={{
                                color: "var(--accent-primary)",
                                background: "var(--surface-dark-alt)",
                                border: "1px solid var(--border-subtle)",
                              }}
                            >
                              <Send size={13} className={resendingId === s._id ? "animate-spin" : ""} />
                              {resendingId === s._id ? "Resending..." : "Resend"}
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(s._id)}
                            title="Remove Staff Member"
                          >
                            <Trash2 size={13} />
                          </button>
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
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemLabel="team members"
          />
        </div>
      </motion.div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail size={18} color="#fff" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Add Team Member</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>They will receive credentials & a verification OTP</p>
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="form-group">
              <label className="label">Full Name *</label>
              <input 
                className="input" 
                placeholder="e.g. Sarah Ahmed" 
                value={newStaff.name} 
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="label">Email Address *</label>
              <input 
                className="input" 
                type="email" 
                placeholder="sarah@cityrock.pk" 
                value={newStaff.email} 
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="label">Temporary Password *</label>
              <PasswordInput 
                placeholder="Temporary password" 
                value={newStaff.password} 
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="label">Assigned Role *</label>
              <CustomSelect 
                value={newStaff.role}
                onChange={(val) => setNewStaff({ ...newStaff, role: val })}
                options={[
                  { value: "support_agent", label: "Customer Support Agent" },
                  { value: "sales_onboarding", label: "Sales & Onboarding Specialist" }
                ]}
              />
            </div>

            <div style={{ background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginTop: 16 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>
                ℹ️ The new member will be sent an official invitation email with their credentials and a 10-minute OTP code. Their status will remain <strong>Pending Verification</strong> until they verify their email.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddStaff} disabled={submitting}>
                {submitting ? "Sending Invite..." : "Invite & Send OTP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

