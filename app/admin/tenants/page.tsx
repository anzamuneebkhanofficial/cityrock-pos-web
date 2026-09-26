"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Filter, Eye, Trash2, AlertTriangle } from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import Pagination from "@/components/ui/Pagination";

const STATUS_CLASSES: Record<string, string> = {
  active: "badge badge-active",
  trial: "badge badge-trial",
  grace_period: "badge badge-grace",
  suspended: "badge badge-suspended",
  cancelled: "badge badge-cancelled",
};

export default function AdminTenantsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [tenants, setTenants] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listTenants({
        search,
        status: statusFilter || undefined,
        page,
        limit
      });
      setTenants(res.data?.data || []);
      const meta = res.data?.meta || {};
      setTotal(meta.total || res.data?.data?.length || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || res.data?.data?.length || 0) / limit) || 1);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page, limit]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!confirm(`WARNING: This will PERMANENTLY delete "${name}" and ALL associated data (products, sales, staff, customers, history). This action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?`)) {
      return;
    }
    
    setIsDeleting(id);
    try {
      await adminApi.deleteTenant(id);
      toast.success(`${name} has been completely deleted.`);
      fetchTenants();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete tenant");
    } finally {
      setIsDeleting(null);
    }
  };

  const isPageLoading = !user || isLoading;

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header">
          <h1 className="page-title">Tenant Businesses</h1>
          <p className="page-subtitle">{total.toLocaleString()} registered retail & wholesale clients</p>
        </div>

        {/* Filters */}
        <div className="card mb-6" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 240px" }}>
              <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                className="input"
                placeholder="Search by business name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 38 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["", "active", "trial", "grace_period", "suspended"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  style={{
                    padding: "6px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${statusFilter === s ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    background: statusFilter === s ? "var(--surface-dark-alt)" : "transparent",
                    color: statusFilter === s ? "var(--accent-primary)" : "var(--text-secondary)",
                    fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {s === "" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {isPageLoading ? (
          <TableSkeleton rows={limit} columns={6} />
        ) : (
          <div className="card card-table">
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Owner</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: 40 }}>No tenants found matching your search.</td></tr>
                  ) : tenants.map((t: Record<string, unknown>) => (
                    <tr key={String(t._id)}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{String(t.businessName)}</div>
                      </td>
                      <td>
                        <div>{String(t.ownerName || "")}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{String(t.ownerEmail)}</div>
                      </td>
                      <td>{String(t.city || "—")}</td>
                      <td>
                        <span className={STATUS_CLASSES[String(t.status)] || "badge"}>
                          {String(t.status).replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ color: "#64748b", fontSize: 13 }}>
                        {t.createdAt ? formatDistanceToNow(new Date(String(t.createdAt)), { addSuffix: true }) : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Link href={`/admin/tenants/${String(t._id)}`} className="btn btn-sm btn-ghost">
                            <Eye size={14} /> View
                          </Link>
                          <button 
                            onClick={() => handleDeleteTenant(String(t._id), String(t.businessName))}
                            disabled={isDeleting === String(t._id)}
                            className="btn btn-sm btn-ghost" 
                            style={{ color: "#ef4444" }}
                            title="Cascade Delete Account"
                          >
                            {isDeleting === String(t._id) ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              itemLabel="tenants"
            />
          </div>
        )}
      </motion.div>
    </main>
  );
}

