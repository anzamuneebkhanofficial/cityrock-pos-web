"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, ShoppingCart, AlertTriangle, TrendingUp, ArrowUpRight, Store, Clock } from "lucide-react";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { reportApi, inventoryApi, tenantApi } from "@/lib/api";
import Link from "next/link";
import { ChartCard } from "@/components/charts/ChartCard";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";
import { BarRankChart } from "@/components/charts/BarRankChart";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; tenantId: string } | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    const role = (u?.role || "").toLowerCase();
    if (["super_admin", "platform_admin", "support_agent", "sales_onboarding"].includes(role)) { 
      router.replace("/admin"); 
      return; 
    }
    if (role === "cashier") {
      router.replace("/pos");
      return;
    }
    setUser(u);

    Promise.all([
      reportApi.salesSummary({ period: "month" }),
      reportApi.topProducts({ limit: 5 }),
      inventoryApi.getLowStock(),
      tenantApi.getSubscription(),
    ]).then(([salesRes, topRes, stockRes, subRes]) => {
      setSummary(salesRes.data.data.summary || salesRes.data.data);
      setTrend(salesRes.data.data.trend || []);
      setTopProducts(topRes.data.data || []);
      setLowStockCount(stockRes.data.data.length);
      setSubscription(subRes.data.data.subscription);
      setTenantInfo(subRes.data.data.tenant || null);
    }).finally(() => setIsLoading(false));
  }, [router]);

  const logout = () => { localStorage.clear(); router.replace("/login"); };

  const tenantStatus = (subscription as Record<string, unknown>)?.status as string || (tenantInfo?.status as string) || "trial";

  const trialEndsDate = tenantInfo?.trialEndsAt
    ? new Date(String(tenantInfo.trialEndsAt))
    : ((subscription as Record<string, unknown>)?.currentPeriodEnd
        ? new Date(String((subscription as Record<string, unknown>).currentPeriodEnd))
        : null);
  const trialDaysRemaining = trialEndsDate
    ? Math.max(0, Math.ceil((trialEndsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 14;

  const isPageLoading = !user || isLoading;

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Trial Banner */}
        {tenantStatus === "trial" && (
          <div
            style={{
              marginBottom: 20,
              padding: "14px 20px",
              borderRadius: 14,
              background: "linear-gradient(90deg, rgba(247,147,26,0.14) 0%, rgba(247,147,26,0.04) 100%)",
              border: "1px solid rgba(247,147,26,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(247,147,26,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#F7931A",
                  flexShrink: 0,
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>
                  14-Day Free Trial Active — <span style={{ color: "#FFA733" }}>{trialDaysRemaining} days remaining</span>
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                  Your store has unrestricted multi-branch, POS register, and inventory tracking access.
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/billing"
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
            >
              Choose a Plan & Subscribe →
            </Link>
          </div>
        )}

        {/* Suspension / Grace Banner */}
        {tenantStatus === "suspended" && (
          <div className="suspension-banner">
            <AlertTriangle size={20} />
            <div>
              <strong>Account Suspended</strong> — Your subscription has lapsed. POS billing is locked.{" "}
              <Link href="/dashboard/billing" style={{ color: "#f87171", fontWeight: 700 }}>Renew now →</Link>
            </div>
          </div>
        )}
        {tenantStatus === "grace_period" && (
          <div className="grace-banner">
            <AlertTriangle size={20} />
            <div>
              <strong>Grace Period Active</strong> — Your trial/subscription period has expired. Please renew to avoid POS lockout.{" "}
              <Link href="/dashboard/billing" style={{ color: "#fbbf24", fontWeight: 700 }}>Renew now →</Link>
            </div>
          </div>
        )}

        <div className="page-header">
          <h1 className="page-title">Good morning, {user?.name.split(" ")[0]} 👋</h1>
          <p className="page-subtitle">Here&apos;s what&apos;s happening at your store today</p>
        </div>

        {isPageLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Stats */}
            <div className="grid-stats mb-6">
              <motion.div whileHover={{ y: -4 }} className="stat-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={22} color="var(--accent-primary)" />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--positive)", fontWeight: 600 }}>Today</span>
                </div>
                <div className="stat-value">PKR {(summary?.totalRevenue || 0).toLocaleString()}</div>
                <div className="stat-label">Revenue Today</div>
              </motion.div>

              <motion.div whileHover={{ y: -4 }} className="stat-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShoppingCart size={22} color="var(--positive)" />
                  </div>
                </div>
                <div className="stat-value">{(summary?.totalTransactions || 0).toLocaleString()}</div>
                <div className="stat-label">Transactions Today</div>
              </motion.div>

              <Link href="/dashboard/inventory?lowStock=true" style={{ textDecoration: "none" }}>
                <motion.div whileHover={{ y: -4 }} className="stat-card" style={{ borderColor: lowStockCount > 0 ? "rgba(249,115,22,0.3)" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: lowStockCount > 0 ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AlertTriangle size={22} color={lowStockCount > 0 ? "var(--accent-primary)" : "#64748b"} />
                    </div>
                    {lowStockCount > 0 && <ArrowUpRight size={16} color="var(--accent-primary)" />}
                  </div>
                  <div className="stat-value" style={{ color: lowStockCount > 0 ? "var(--accent-primary)" : undefined }}>{lowStockCount}</div>
                  <div className="stat-label">Low Stock Items</div>
                </motion.div>
              </Link>

              <motion.div whileHover={{ y: -4 }} className="stat-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={22} color="var(--accent-primary)" />
                  </div>
                </div>
                <div className="stat-value">PKR {(summary?.avgOrderValue || 0).toFixed(0)}</div>
                <div className="stat-label">Avg. Order Value</div>
              </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <ChartCard
                  title="Revenue Trend"
                  subtitle="Last 30 days revenue"
                  isLoading={isLoading}
                  isEmpty={!trend || trend.length === 0}
                  height={240}
                >
                  <AreaTrendChart
                    data={trend || []}
                    xKey="date"
                    yKey="revenue"
                    color="#f97316"
                    xFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                    }}
                    valueFormatter={(val) => `PKR ${(val / 1000).toFixed(0)}k`}
                  />
                </ChartCard>
              </div>
              <div>
                <ChartCard
                  title="Top Products"
                  subtitle="By items sold"
                  isLoading={isLoading}
                  isEmpty={!topProducts || topProducts.length === 0}
                  height={240}
                >
                  <BarRankChart
                    data={topProducts || []}
                    yKey="productName"
                    xKey="totalSold"
                    color="#f97316"
                    valueFormatter={(val) => `${val} units`}
                  />
                </ChartCard>
              </div>
            </div>

            {/* Quick access & Subscription Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold m-0 text-white flex items-center gap-2">
                      <Store size={18} className="text-accent-orange" /> Store Quick Actions
                    </h3>
                    <span className="text-xs text-secondary">Shortcut Menu</span>
                  </div>
                  <p className="text-xs text-secondary mb-5">Frequently accessed daily retail operations</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Link href="/pos" className="btn btn-primary py-3 px-4 flex flex-col items-center justify-center gap-2 text-center h-auto">
                      <ShoppingCart size={20} />
                      <span className="font-semibold text-xs">Open POS</span>
                    </Link>
                    <Link href="/dashboard/products" className="btn btn-secondary py-3 px-4 flex flex-col items-center justify-center gap-2 text-center h-auto">
                      <Package size={20} className="text-accent-orange" />
                      <span className="font-semibold text-xs">Products</span>
                    </Link>
                    <Link href="/dashboard/inventory" className="btn btn-secondary py-3 px-4 flex flex-col items-center justify-center gap-2 text-center h-auto">
                      <Store size={20} className="text-positive" />
                      <span className="font-semibold text-xs">Inventory</span>
                    </Link>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-subtle flex items-center justify-between text-xs text-secondary">
                  <span>Cashier terminal ready</span>
                  <Link href="/dashboard/reports" className="text-accent-orange hover:underline">View Sales Reports →</Link>
                </div>
              </div>

              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold m-0 text-white flex items-center gap-2">
                      <Clock size={18} className="text-accent-orange" /> Subscription & Plan
                    </h3>
                    <span className={`badge ${tenantStatus === "active" ? "badge-active" : tenantStatus === "trial" ? "badge-trial" : "badge-grace"} capitalize`}>
                      {tenantStatus.replace("_", " ")}
                    </span>
                  </div>
                  <div className="bg-surface-dark-alt rounded-lg p-4 border border-subtle mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-secondary font-medium uppercase tracking-wider">Current Organization</span>
                      <span className="text-xs font-bold text-white">{(tenantInfo?.businessName as string) || (user?.name ? `${user.name}'s Store` : "My Store")}</span>
                    </div>
                    <div className="text-xl font-extrabold text-white mb-1">
                      {tenantStatus === "active" ? (((subscription as Record<string, unknown>)?.planId as Record<string, unknown>)?.name as string || "Active Subscription") : "14-Day Free Evaluation"}
                    </div>
                    {(subscription as Record<string, unknown>)?.currentPeriodEnd ? (
                      <div className="flex items-center gap-2 text-xs text-secondary mt-2">
                        <Clock size={13} className="text-accent-orange" />
                        <span>{tenantStatus === "trial" ? `Trial Access: ${trialDaysRemaining} days remaining` : `Next Renewal: ${new Date(String((subscription as Record<string, unknown>).currentPeriodEnd)).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-secondary mt-1">Full access to multi-store catalog, inventory & barcode POS</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/dashboard/billing" className="btn btn-primary btn-sm flex-1">
                    Manage Billing & Invoices
                  </Link>
                  <Link href="/dashboard/settings" className="btn btn-secondary btn-sm">
                    Store Settings
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}

