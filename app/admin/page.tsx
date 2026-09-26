"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users, CreditCard, MessageSquare, TrendingUp,
  AlertTriangle, CheckCircle, Clock, XCircle, ArrowRight, Plus
} from "lucide-react";
import { adminApi } from "@/lib/api";
import Link from "next/link";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { ChartCard } from "@/components/charts/ChartCard";
import { DonutChart } from "@/components/charts/DonutChart";

interface Stats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  graceTenants: number;
  pendingPayments: number;
  openTickets: number;
}

function StatCard({ 
  label, 
  value, 
  icon, 
  colorClass = "text-accent-orange", 
  href 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  colorClass?: string; 
  href?: string 
}) {
  const card = (
    <motion.div
      whileHover={{ y: -3 }}
      className="stat-card"
      style={{ cursor: href ? "pointer" : "default" }}
    >
      <div className="stat-card-header">
        <div className={`stat-icon-wrapper ${colorClass}`}>
          {icon}
        </div>
        {href && <ArrowRight size={14} className="text-slate-500 hover:text-white transition-colors" />}
      </div>
      <div className="stat-value">{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{card}</Link> : card;
}

const defaultStats: Stats = {
  totalTenants: 0,
  activeTenants: 0,
  trialTenants: 0,
  suspendedTenants: 0,
  graceTenants: 0,
  pendingPayments: 0,
  openTickets: 0,
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    const role = (u?.role || "").toLowerCase();
    if (!["super_admin", "platform_admin", "support_agent", "sales_onboarding"].includes(role)) {
      if (role === "cashier") {
        router.replace("/pos");
      } else {
        router.replace("/dashboard");
      }
      return;
    }
    setUser(u);
    adminApi.getStats()
      .then((res) => {
        if (res.data?.data) setStats(res.data.data);
      })
      .catch(() => {
        setStats(defaultStats);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const logout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  const isPageLoading = !user || isLoading;
  const role = (user?.role || "").toLowerCase();
  const isSuperAdmin = ["super_admin", "platform_admin"].includes(role);
  const isSales = role === "sales_onboarding";
  const isSupport = role === "support_agent";

  const getPageTitle = () => {
    if (isSales) return "Sales & Onboarding Hub";
    if (isSupport) return "Customer Support Hub";
    return "Platform Overview";
  };

  const getPageSubtitle = () => {
    if (isSales) return "Track new trial signups, onboarding status, and payment approvals";
    if (isSupport) return "Manage tenant issues, support tickets, and customer inquiries";
    return "All tenants, subscriptions, support, and platform operations";
  };

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="page-title">{getPageTitle()}</h1>
            <p className="page-subtitle">{getPageSubtitle()}</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "var(--positive-bg)", color: "var(--positive)", border: "1px solid var(--border-subtle)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--positive)", display: "inline-block" }} />
              Platform Online
            </span>
            {isSuperAdmin && (
              <Link href="/admin/staff" className="btn btn-primary btn-sm">
                <Plus size={15} /> Add Staff Member
              </Link>
            )}
            {isSales && (
              <Link href="/admin/payments" className="btn btn-primary btn-sm">
                Review Payments ({stats.pendingPayments})
              </Link>
            )}
            {isSupport && (
              <Link href="/admin/tickets" className="btn btn-primary btn-sm">
                Ticket Queue ({stats.openTickets})
              </Link>
            )}
          </div>
        </div>

        {isPageLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Stats Grid tailored by Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {isSupport ? (
                <>
                  <StatCard label="Open Support Tickets" value={stats.openTickets} icon={<MessageSquare size={22} />} colorClass="text-accent-orange" href="/admin/tickets" />
                  <StatCard label="Total Tenants" value={stats.totalTenants} icon={<Users size={22} />} colorClass="text-accent-orange" href="/admin/tenants" />
                  <StatCard label="Active Subscriptions" value={stats.activeTenants} icon={<CheckCircle size={22} />} colorClass="text-positive" href="/admin/tenants?status=active" />
                  <StatCard label="On Free Trial" value={stats.trialTenants} icon={<Clock size={22} />} colorClass="text-accent-orange" href="/admin/tenants?status=trial" />
                </>
              ) : isSales ? (
                <>
                  <StatCard label="On Free Trial" value={stats.trialTenants} icon={<Clock size={22} />} colorClass="text-accent-orange" href="/admin/tenants?status=trial" />
                  <StatCard label="Pending Payment Proofs" value={stats.pendingPayments} icon={<CreditCard size={22} />} colorClass="text-accent-orange" href="/admin/payments" />
                  <StatCard label="Grace Period (Follow-up)" value={stats.graceTenants} icon={<AlertTriangle size={22} />} colorClass="text-warning" href="/admin/tenants?status=grace_period" />
                  <StatCard label="Active Subscriptions" value={stats.activeTenants} icon={<CheckCircle size={22} />} colorClass="text-positive" href="/admin/tenants?status=active" />
                </>
              ) : (
                <>
                  <StatCard label="Total Tenants" value={stats.totalTenants} icon={<Users size={22} />} colorClass="text-accent-orange" href="/admin/tenants" />
                  <StatCard label="Active Subscriptions" value={stats.activeTenants} icon={<CheckCircle size={22} />} colorClass="text-positive" href="/admin/tenants?status=active" />
                  <StatCard label="On Free Trial" value={stats.trialTenants} icon={<Clock size={22} />} colorClass="text-accent-orange" href="/admin/tenants?status=trial" />
                  <StatCard label="Pending Payments" value={stats.pendingPayments} icon={<CreditCard size={22} />} colorClass="text-accent-orange" href="/admin/billing" />
                </>
              )}
            </div>

            {/* Role-Specific Action Queues & Subscription Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Queues (Col Span 2) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {!isSupport && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold m-0 text-white">Payment Review Queue</h3>
                        <p className="text-xs text-secondary mt-1">Manual bank & digital payment slips pending verification</p>
                      </div>
                      <Link href="/admin/billing" className="btn btn-sm btn-secondary">Review Proofs</Link>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="w-12 h-12 rounded-lg bg-surface-dark-alt border border-subtle flex items-center justify-center text-accent-orange">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <div className="text-3xl font-extrabold text-accent-orange leading-none">{stats.pendingPayments}</div>
                        <div className="text-xs text-secondary mt-1">slips awaiting financial review</div>
                      </div>
                    </div>
                  </div>
                )}

                {!isSales && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold m-0 text-white">Customer Support Queue</h3>
                        <p className="text-xs text-secondary mt-1">Support tickets submitted by store owners needing resolution</p>
                      </div>
                      <Link href="/admin/tickets" className="btn btn-sm btn-secondary">View Tickets</Link>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="w-12 h-12 rounded-lg bg-surface-dark-alt border border-subtle flex items-center justify-center text-positive">
                        <MessageSquare size={24} />
                      </div>
                      <div>
                        <div className="text-3xl font-extrabold text-positive leading-none">{stats.openTickets}</div>
                        <div className="text-xs text-secondary mt-1">open tickets requiring support agent response</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tenant Subscription Breakdown via Recharts */}
              {!isSupport && (
                <div className="lg:col-span-1 flex flex-col">
                  <ChartCard
                    title="Subscription Health"
                    subtitle="Breakdown by status"
                    isEmpty={stats.totalTenants === 0}
                    height={250}
                  >
                    <DonutChart
                      data={[
                        { name: "Active", count: stats.activeTenants },
                        { name: "Free Trial", count: stats.trialTenants },
                        { name: "Grace Period", count: stats.graceTenants },
                        { name: "Suspended", count: stats.suspendedTenants },
                      ].filter((d) => d.count > 0 || stats.totalTenants === 0)}
                      nameKey="name"
                      valueKey="count"
                      colors={["#10b981", "#f97316", "#f59e0b", "#ef4444"]}
                      valueFormatter={(val) => `${val} Stores`}
                    />
                  </ChartCard>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}

