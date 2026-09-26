"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Store as StoreIcon,
  Users,
  Package,
  ShoppingCart,
  Clock,
  ExternalLink,
  Edit3,
  Copy,
  Check,
  TrendingUp,
  Receipt,
  Globe,
  FileText,
  BadgeCheck,
  X,
  Save,
  MessageSquare,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getImageUrl } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_BADGES: Record<string, { label: string; class: string; dot: string }> = {
  active: { label: "Active", class: "badge badge-active", dot: "#22c55e" },
  trial: { label: "14-Day Free Trial", class: "badge badge-trial", dot: "#f97316" },
  grace_period: { label: "Grace Period", class: "badge badge-grace", dot: "#eab308" },
  suspended: { label: "Suspended", class: "badge badge-suspended", dot: "#ef4444" },
  cancelled: { label: "Cancelled", class: "badge badge-cancelled", dot: "#64748b" },
};

interface TenantData {
  _id: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  city: string;
  country: string;
  address?: string;
  cnic?: string;
  status: string;
  trialEndsAt?: string;
  logoUrl?: string | null;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
    cnic?: string;
    role?: string;
    avatarUrl?: string | null;
    isActive?: boolean;
    isEmailVerified?: boolean;
    lastLoginAt?: string | null;
    createdAt?: string;
  };
  subscription?: {
    _id?: string;
    status?: string;
    billingCycle?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    autoRenew?: boolean;
    planId?: {
      _id?: string;
      name?: string;
      code?: string;
      price?: number;
      billingCycle?: string;
      description?: string;
      maxStores?: number;
      maxRegisters?: number;
      maxUsers?: number;
      maxProducts?: number;
      features?: string[];
    };
  };
  stores?: Array<{
    _id: string;
    name: string;
    storeCode: string;
    storeType?: string;
    city?: string;
    address?: string;
    phone?: string;
    isMainStore?: boolean;
    createdAt?: string;
  }>;
  staff?: Array<{
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    isActive?: boolean;
    lastLoginAt?: string | null;
    avatarUrl?: string | null;
    createdAt?: string;
  }>;
  stats?: {
    totalStores: number;
    totalStaff: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  };
  recentSales?: Array<{
    _id: string;
    receiptNumber: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
    status: string;
    createdAt: string;
  }>;
  payments?: Array<{
    _id: string;
    amount: number;
    currency?: string;
    status: string;
    proofFileUrl?: string;
    paymentChannel?: string;
    submittedAt?: string;
    createdAt: string;
    planId?: { name: string; price: number };
  }>;
  tickets?: Array<{
    _id: string;
    ticketNumber?: string;
    subject: string;
    category?: string;
    priority: string;
    status: string;
    createdAt: string;
  }>;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = (params?.id as string) || "";

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "subscription" | "stores" | "staff" | "orders" | "payments">("overview");
  const [copiedId, setCopiedId] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    city: "",
    country: "Pakistan",
    address: "",
    cnic: "",
    timezone: "Asia/Karachi",
    status: "active",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTenantDetails = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await adminApi.getTenant(tenantId);
      if (res.data?.data) {
        const data = res.data.data;
        setTenant(data);
        setEditForm({
          businessName: data.businessName || "",
          ownerName: data.ownerName || data.owner?.name || "",
          ownerEmail: data.ownerEmail || data.owner?.email || "",
          ownerPhone: data.ownerPhone || data.owner?.phone || "",
          city: data.city || "",
          country: data.country || "Pakistan",
          address: data.address || "",
          cnic: data.cnic || data.owner?.cnic || "",
          timezone: data.timezone || "Asia/Karachi",
          status: data.status || "active",
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load tenant details");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenantDetails();
  }, [fetchTenantDetails]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    toast.success("Tenant ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!tenant) return;
    if (!confirm(`Are you sure you want to change tenant status to "${newStatus.replace("_", " ")}"?`)) return;

    setStatusUpdating(true);
    try {
      await adminApi.updateTenantStatus(tenant._id, newStatus);
      toast.success(`Tenant marked as ${newStatus.replace("_", " ")}`);
      setTenant((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update tenant status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSavingEdit(true);
    try {
      await adminApi.updateTenant(tenant._id, editForm);
      toast.success("Tenant details updated permanently!");
      setIsEditOpen(false);
      fetchTenantDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update tenant details");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenant) return;
    if (!confirm(`WARNING: This will PERMANENTLY delete "${tenant.businessName}" and ALL associated data (products, sales, staff, customers, history). This action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await adminApi.deleteTenant(tenant._id);
      toast.success(`${tenant.businessName} has been completely deleted.`);
      router.push("/admin/tenants");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete tenant");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="main-content" style={{ padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 100, height: 32, background: "var(--surface-dark-alt)", borderRadius: 6 }} />
        </div>
        <div className="card" style={{ height: 160, marginBottom: 24, background: "var(--surface-dark-alt)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card" style={{ height: 90, background: "var(--surface-dark-alt)" }} />
          ))}
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="main-content" style={{ padding: 32, textAlign: "center" }}>
        <div className="card" style={{ maxWidth: 500, margin: "60px auto", padding: 40 }}>
          <AlertTriangle size={48} color="#f97316" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Tenant Not Found</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>
            The requested business profile does not exist or may have been removed.
          </p>
          <Link href="/admin/tenants" className="btn btn-primary">
            <ArrowLeft size={16} /> Return to Tenants List
          </Link>
        </div>
      </main>
    );
  }

  const currentStatus = STATUS_BADGES[tenant.status] || {
    label: tenant.status,
    class: "badge",
    dot: "#94a3b8",
  };

  const plan = tenant.subscription?.planId;
  const owner = tenant.owner || {
    name: tenant.ownerName,
    email: tenant.ownerEmail,
    phone: tenant.ownerPhone,
    cnic: tenant.cnic,
    role: "owner",
  };

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {/* Navigation Breadcrumb & Back */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/admin/tenants" className="btn btn-sm btn-ghost" style={{ gap: 6 }}>
              <ArrowLeft size={16} /> Back to Tenants
            </Link>
            <span style={{ color: "#475569" }}>/</span>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>{tenant.businessName}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Quick Status Control */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-dark-alt)", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, paddingLeft: 4 }}>STATUS:</span>
              <select
                className="input"
                style={{ padding: "4px 8px", height: 32, fontSize: 13, width: "auto", minWidth: 130 }}
                value={tenant.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusUpdating}
              >
                <option value="active">Active</option>
                <option value="trial">Free Trial</option>
                <option value="grace_period">Grace Period</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button onClick={() => setIsEditOpen(true)} className="btn btn-sm btn-secondary" style={{ gap: 6 }}>
              <Edit3 size={14} /> Edit Profile
            </button>
            <button 
              onClick={handleDeleteTenant} 
              disabled={isDeleting}
              className="btn btn-sm" 
              style={{ gap: 6, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
              title="Delete account completely"
            >
              {isDeleting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Trash2 size={14} />} 
              Delete
            </button>
          </div>
        </div>

        {/* Hero Business Header Card */}
        <div className="card mb-6" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Business Avatar / Logo */}
              <div style={{ width: 80, height: 80, borderRadius: 16, background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))", border: "2px solid rgba(249,115,22,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {tenant.logoUrl ? (
                  <img src={getImageUrl(tenant.logoUrl)} alt={tenant.businessName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Building2 size={40} color="var(--accent-primary)" />
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                    {tenant.businessName}
                  </h1>
                  <span className={currentStatus.class} style={{ fontSize: 12, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: currentStatus.dot }} />
                    {currentStatus.label}
                  </span>
                  {plan && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                      {plan.name || "Standard Plan"}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#94a3b8" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={14} color="var(--accent-primary)" />
                    <span>{tenant.city}, {tenant.country}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={14} color="#64748b" />
                    <span>Joined {format(new Date(tenant.createdAt), "MMM d, yyyy")}</span>
                  </div>

                  <div
                    onClick={() => copyToClipboard(tenant._id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: "var(--surface-dark-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border-subtle)" }}
                    title="Click to copy ID"
                  >
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0" }}>ID: {tenant._id.slice(0, 10)}...</span>
                    {copiedId ? <Check size={12} color="#22c55e" /> : <Copy size={12} color="#64748b" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {owner.phone && (
                <a
                  href={`https://wa.me/${owner.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ background: "#25D366", color: "#fff", border: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Phone size={14} /> WhatsApp Owner
                </a>
              )}
              {owner.email && (
                <a
                  href={`mailto:${owner.email}?subject=CityRock%20POS%20Support`}
                  className="btn btn-sm btn-secondary"
                  style={{ gap: 6 }}
                >
                  <Mail size={14} /> Email
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Total Gross Revenue</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34, 197, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={18} color="#22c55e" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>
              PKR {(tenant.stats?.totalRevenue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>All-time processed sales</div>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Completed Sales</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(249, 115, 22, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Receipt size={18} color="var(--accent-primary)" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc" }}>
              {(tenant.stats?.totalOrders || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Total customer receipts</div>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Store Branches</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(56, 189, 248, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <StoreIcon size={18} color="#38bdf8" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc" }}>
              {tenant.stats?.totalStores || tenant.stores?.length || 0}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Active retail/wholesale outlets</div>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Staff & Cashiers</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={18} color="#a855f7" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc" }}>
              {tenant.stats?.totalStaff || tenant.staff?.length || 0}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Authorized store operators</div>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Catalog Products</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(234, 179, 8, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={18} color="#eab308" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc" }}>
              {(tenant.stats?.totalProducts || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>SKUs in active inventory</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8, marginBottom: 24, overflowX: "auto" }}>
          {[
            { id: "overview", label: "A to Z Profile", icon: <User size={16} /> },
            { id: "subscription", label: "Plan & Quota Limits", icon: <CreditCard size={16} /> },
            { id: "stores", label: `Outlets (${tenant.stores?.length || 0})`, icon: <StoreIcon size={16} /> },
            { id: "staff", label: `Team & Staff (${tenant.staff?.length || 0})`, icon: <Users size={16} /> },
            { id: "orders", label: `Recent Orders (${tenant.recentSales?.length || 0})`, icon: <Receipt size={16} /> },
            { id: "payments", label: `Billing History (${tenant.payments?.length || 0})`, icon: <Clock size={16} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeTab === t.id ? "var(--accent-primary)" : "transparent",
                color: activeTab === t.id ? "#000" : "var(--text-secondary)",
                fontWeight: activeTab === t.id ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: OVERVIEW (A to Z Deep Profile Details) ── */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            {/* Business Information Card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 14, marginBottom: 20 }}>
                <Building2 size={22} color="var(--accent-primary)" />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>Business Identity & Details</h3>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Registered organization profile</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Business Name</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginTop: 2 }}>{tenant.businessName}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>City</span>
                    <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2 }}>{tenant.city || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Country</span>
                    <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2 }}>{tenant.country || "Pakistan"}</div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Physical Address</span>
                  <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2 }}>{tenant.address || "No street address recorded"}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Timezone</span>
                    <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2 }}>{tenant.timezone || "Asia/Karachi"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Operational Status</span>
                    <div style={{ marginTop: 4 }}>
                      <span className={currentStatus.class} style={{ fontSize: 11 }}>{currentStatus.label}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Account Registered</span>
                    <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>
                      {format(new Date(tenant.createdAt), "dd MMM yyyy, hh:mm a")}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Last Profile Update</span>
                    <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>
                      {formatDistanceToNow(new Date(tenant.updatedAt || tenant.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Tenant Database Identifier</span>
                  <div style={{ fontSize: 12, fontFamily: "monospace", color: "#94a3b8", background: "var(--surface-dark-alt)", padding: "6px 10px", borderRadius: 6, marginTop: 4, wordBreak: "break-all" }}>
                    {tenant._id}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Owner Information Card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 14, marginBottom: 20 }}>
                <User size={22} color="var(--accent-primary)" />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>Business Owner Profile</h3>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Primary business contact & owner credentials</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 14, background: "var(--surface-dark-alt)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {owner.avatarUrl ? (
                    <img src={getImageUrl(owner.avatarUrl)} alt={owner.name || "Owner"} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    (owner.name || tenant.ownerName || "O").charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                    {owner.name || tenant.ownerName || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--accent-primary)", fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={14} /> Registered Store Owner
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Email Address</span>
                  <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <Mail size={14} color="#64748b" />
                    <span>{owner.email || tenant.ownerEmail || "—"}</span>
                    {owner.isEmailVerified && (
                      <span title="Verified Email" style={{ color: "#22c55e", display: "inline-flex" }}>
                        <BadgeCheck size={14} />
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Phone / WhatsApp Contact</span>
                  <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone size={14} color="#64748b" />
                    <span>{owner.phone || tenant.ownerPhone || "Not specified"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>CNIC / National ID Card</span>
                  <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <CreditCard size={14} color="var(--accent-primary)" />
                    <span style={{ fontFamily: "monospace", letterSpacing: "0.05em", fontWeight: 600 }}>
                      {owner.cnic || tenant.cnic || "Not registered"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Account Status</span>
                    <div style={{ fontSize: 13, color: "#22c55e", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={14} /> Active User
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Last Login Session</span>
                    <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>
                      {owner.lastLoginAt ? formatDistanceToNow(new Date(owner.lastLoginAt), { addSuffix: true }) : "No recorded login"}
                    </div>
                  </div>
                </div>

                {owner._id && (
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Owner User ID</span>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: "#94a3b8", background: "var(--surface-dark-alt)", padding: "6px 10px", borderRadius: 6, marginTop: 4 }}>
                      {owner._id}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: SUBSCRIPTION & QUOTA LIMITS ── */}
        {activeTab === "subscription" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Active Plan Card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Active Plan Information
                  </span>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", margin: "4px 0" }}>
                    {plan?.name || "Trial / Starter Package"}
                  </h3>
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                    {plan?.description || "High-performance POS package for single or multi-store operations"}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-primary)" }}>
                    PKR {(plan?.price || 0).toLocaleString()}
                    <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 400 }}> / {plan?.billingCycle || tenant.subscription?.billingCycle || "month"}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span className={currentStatus.class} style={{ fontSize: 11 }}>{currentStatus.label}</span>
                  </div>
                </div>
              </div>

              {/* Cycle Timing */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, padding: 16, background: "var(--surface-dark-alt)", borderRadius: 10, border: "1px solid var(--border-subtle)", marginBottom: 24 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Billing Interval</span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", textTransform: "capitalize", marginTop: 2 }}>
                    {tenant.subscription?.billingCycle || "Monthly"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Period Started</span>
                  <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 2 }}>
                    {tenant.subscription?.currentPeriodStart ? format(new Date(tenant.subscription.currentPeriodStart), "dd MMM yyyy") : "—"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Period Renewal / Expiry</span>
                  <div style={{ fontSize: 14, color: "var(--accent-primary)", fontWeight: 700, marginTop: 2 }}>
                    {tenant.trialEndsAt
                      ? `${format(new Date(tenant.trialEndsAt), "dd MMM yyyy")} (${formatDistanceToNow(new Date(tenant.trialEndsAt), { addSuffix: true })})`
                      : tenant.subscription?.currentPeriodEnd
                      ? `${format(new Date(tenant.subscription.currentPeriodEnd), "dd MMM yyyy")}`
                      : "Lifetime / No Expiry"}
                  </div>
                </div>
              </div>

              {/* Resource Quotas vs Usage */}
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Resource Usage & Quota Allowances
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
                {/* Stores Quota */}
                <div style={{ padding: 16, background: "var(--surface-dark-alt)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#94a3b8" }}>Store Branches Allowed</span>
                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                      {tenant.stores?.length || 0} / {plan?.maxStores || 1}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (((tenant.stores?.length || 0) / (plan?.maxStores || 1)) * 100))}%`,
                        background: "var(--accent-primary)",
                      }}
                    />
                  </div>
                </div>

                {/* Users Quota */}
                <div style={{ padding: 16, background: "var(--surface-dark-alt)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#94a3b8" }}>Staff / Cashier Accounts</span>
                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                      {tenant.staff?.length || 0} / {plan?.maxUsers || 5}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (((tenant.staff?.length || 0) / (plan?.maxUsers || 5)) * 100))}%`,
                        background: "#a855f7",
                      }}
                    />
                  </div>
                </div>

                {/* Products Quota */}
                <div style={{ padding: 16, background: "var(--surface-dark-alt)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#94a3b8" }}>Inventory SKU Capacity</span>
                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                      {tenant.stats?.totalProducts || 0} / {(plan?.maxProducts || 1000).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (((tenant.stats?.totalProducts || 0) / (plan?.maxProducts || 1000)) * 100))}%`,
                        background: "#38bdf8",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Plan Included Features */}
              {plan?.features && plan.features.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase" }}>
                    Included Plan Capabilities
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#e2e8f0" }}>
                        <Check size={14} color="#22c55e" style={{ flexShrink: 0 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: STORE OUTLETS ── */}
        {activeTab === "stores" && (
          <div className="card card-table">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>Store Outlets & Locations</h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Retail branches operated under this business</p>
              </div>
            </div>

            <div className="table-wrapper" style={{ border: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Store Name</th>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Location / City</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {!tenant.stores || tenant.stores.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>No store branches recorded.</td></tr>
                  ) : (
                    tenant.stores.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600, color: "#f8fafc" }}>
                          {s.name}
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 12, background: "var(--surface-dark-alt)", padding: "2px 6px", borderRadius: 4 }}>
                            {s.storeCode}
                          </span>
                        </td>
                        <td style={{ textTransform: "capitalize", color: "#94a3b8" }}>
                          {(s.storeType || "General Retail").replace("_", " ")}
                        </td>
                        <td>{s.city || tenant.city || "—"}</td>
                        <td>{s.phone || tenant.ownerPhone || "—"}</td>
                        <td>
                          {s.isMainStore ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(249,115,22,0.15)", color: "var(--accent-primary)" }}>
                              Primary Branch
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: "#64748b" }}>Sub-Branch</span>
                          )}
                        </td>
                        <td style={{ color: "#64748b", fontSize: 12 }}>
                          {s.createdAt ? format(new Date(s.createdAt), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: TEAM & STAFF ── */}
        {activeTab === "staff" && (
          <div className="card card-table">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>Team & Staff Roster</h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Managers, cashiers, and store supervisors</p>
            </div>

            <div className="table-wrapper" style={{ border: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {!tenant.staff || tenant.staff.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>No staff accounts registered.</td></tr>
                  ) : (
                    tenant.staff.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-dark-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {u.avatarUrl ? (
                                <img src={getImageUrl(u.avatarUrl)} alt={u.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                u.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span style={{ fontWeight: 600, color: "#f8fafc" }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "#cbd5e1", fontSize: 13 }}>{u.email}</td>
                        <td style={{ color: "#94a3b8", fontSize: 13 }}>{u.phone || "—"}</td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: u.role === "owner" ? "rgba(249,115,22,0.15)" : u.role === "manager" ? "rgba(168,85,247,0.15)" : "rgba(56,189,248,0.15)", color: u.role === "owner" ? "var(--accent-primary)" : u.role === "manager" ? "#a855f7" : "#38bdf8", textTransform: "capitalize" }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: u.isActive !== false ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>
                            {u.isActive !== false ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td style={{ color: "#64748b", fontSize: 12 }}>
                          {u.lastLoginAt ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true }) : "Never"}
                        </td>
                        <td style={{ color: "#64748b", fontSize: 12 }}>
                          {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 5: RECENT ORDERS ── */}
        {activeTab === "orders" && (
          <div className="card card-table">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>Latest Transactions</h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Most recent sales receipts logged by POS terminals</p>
            </div>

            <div className="table-wrapper" style={{ border: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!tenant.recentSales || tenant.recentSales.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>No sales recorded yet.</td></tr>
                  ) : (
                    tenant.recentSales.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--accent-primary)" }}>
                          {s.receiptNumber}
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: 13 }}>
                          {format(new Date(s.createdAt), "dd MMM yyyy, hh:mm a")}
                        </td>
                        <td style={{ color: "#f8fafc" }}>{s.customerName || "Walk-in Customer"}</td>
                        <td style={{ textTransform: "capitalize", color: "#cbd5e1" }}>{s.paymentMethod}</td>
                        <td style={{ fontWeight: 700, color: "#22c55e" }}>
                          PKR {(s.totalAmount || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className="badge badge-active" style={{ fontSize: 11 }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 6: BILLING & PAYMENT PROOFS ── */}
        {activeTab === "payments" && (
          <div className="card card-table">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>Subscription Payments & Slips</h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Payment submissions submitted for subscription renewals</p>
            </div>

            <div className="table-wrapper" style={{ border: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Channel</th>
                    <th>Amount</th>
                    <th>Proof Slip</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!tenant.payments || tenant.payments.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>No payment submissions found.</td></tr>
                  ) : (
                    tenant.payments.map((p) => (
                      <tr key={p._id}>
                        <td style={{ color: "#94a3b8", fontSize: 13 }}>
                          {format(new Date(p.submittedAt || p.createdAt), "dd MMM yyyy")}
                        </td>
                        <td style={{ fontWeight: 600, color: "#f8fafc" }}>
                          {p.planId?.name || "Standard Subscription"}
                        </td>
                        <td style={{ textTransform: "capitalize", color: "#cbd5e1" }}>
                          {p.paymentChannel || "Bank Transfer"}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--accent-primary)" }}>
                          PKR {(p.amount || 0).toLocaleString()}
                        </td>
                        <td>
                          {p.proofFileUrl ? (
                            <a
                              href={getImageUrl(p.proofFileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-ghost"
                              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                              <ExternalLink size={12} /> View Slip
                            </a>
                          ) : (
                            <span style={{ color: "#64748b", fontSize: 12 }}>No image</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: p.status === "verified" ? "rgba(34,197,94,0.15)" : p.status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)", color: p.status === "verified" ? "#22c55e" : p.status === "rejected" ? "#ef4444" : "#eab308", textTransform: "capitalize" }}>
                            {p.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── EDIT TENANT DETAILS MODAL ── */}
      {isEditOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: 24, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Edit3 size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#f8fafc" }}>Edit Business & Owner Profile</h3>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="btn btn-sm btn-ghost" style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label className="label">Business Name *</label>
                  <input
                    className="input"
                    value={editForm.businessName}
                    onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Owner Full Name *</label>
                  <input
                    className="input"
                    value={editForm.ownerName}
                    onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label className="label">Owner Email Address *</label>
                  <input
                    type="email"
                    className="input"
                    value={editForm.ownerEmail}
                    onChange={(e) => setEditForm({ ...editForm, ownerEmail: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Owner Phone / WhatsApp</label>
                  <input
                    className="input"
                    placeholder="e.g. 03001234567"
                    value={editForm.ownerPhone}
                    onChange={(e) => setEditForm({ ...editForm, ownerPhone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label className="label">CNIC / National ID Card</label>
                  <input
                    className="input"
                    placeholder="e.g. 35202-1234567-1"
                    value={editForm.cnic}
                    onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">City *</label>
                  <input
                    className="input"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Physical Address</label>
                <input
                  className="input"
                  placeholder="Shop / Floor / Street Address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label className="label">Operational Status</label>
                  <select
                    className="input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="trial">Free Trial</option>
                    <option value="grace_period">Grace Period</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Timezone</label>
                  <input
                    className="input"
                    value={editForm.timezone}
                    onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit} style={{ gap: 6 }}>
                  <Save size={16} /> {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
