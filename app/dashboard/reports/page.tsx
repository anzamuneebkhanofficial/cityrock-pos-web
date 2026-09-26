"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart2,
  Download,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  Percent,
  Package,
  Award,
  CreditCard,
  Building,
} from "lucide-react";
import { reportApi, tenantApi } from "@/lib/api";
import { ChartCard } from "@/components/charts/ChartCard";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";

interface Summary {
  totalRevenue: number;
  totalTransactions: number;
  avgOrderValue: number;
  totalDiscount: number;
  netRevenue?: number;
  costOfGoodsSold?: number;
  grossProfit?: number;
  grossMargin?: number;
}

interface TopProduct {
  _id?: string;
  productName: string;
  totalSold?: number;
  totalQty?: number;
  totalRevenue: number;
}

interface CashierPerformance {
  _id?: string;
  cashierName: string;
  cashierEmail?: string;
  totalRevenue: number;
  totalTransactions: number;
}

interface StoreOption {
  _id: string;
  name: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [storeId, setStoreId] = useState("all");
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyTrend, setDailyTrend] = useState<
    { date: string; revenue: number; orders: number }[]
  >([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [cashierPerf, setCashierPerf] = useState<CashierPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(stored));

    tenantApi
      .listStores()
      .then((res) => setStores(res.data?.data || []))
      .catch(console.error);
  }, [router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        period,
        storeId: storeId !== "all" ? storeId : undefined,
      };
      if (period === "custom") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const [salesRes, topRes, cashierRes] = await Promise.all([
        reportApi.salesSummary(params),
        reportApi.topProducts({ limit: 8 }),
        reportApi.cashierPerformance(),
      ]);

      const data = salesRes.data.data;
      setSummary({
        totalRevenue: data.totalRevenue || 0,
        totalTransactions: data.totalTransactions || 0,
        totalDiscount: data.totalDiscount || 0,
        avgOrderValue: data.avgOrderValue || 0,
        netRevenue: data.netRevenue ?? (data.totalRevenue - (data.totalDiscount || 0)),
        costOfGoodsSold: data.costOfGoodsSold || 0,
        grossProfit: data.grossProfit ?? ((data.totalRevenue - (data.totalDiscount || 0)) - (data.costOfGoodsSold || 0)),
        grossMargin: data.grossMargin ?? 0,
      });

      setDailyTrend(data.trend || []);
      setTopProducts(topRes.data.data || []);
      setCashierPerf(
        (cashierRes.data.data || []).map((c: any) => ({
          ...c,
          cashierName: c.cashierName || "Staff Cashier",
          totalRevenue: c.totalRevenue ?? c.totalSales ?? 0,
          totalTransactions: c.totalTransactions || 0,
        }))
      );
    } catch (err) {
      console.error("Failed to load reports data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    const params: Record<string, unknown> = { type: "sales", period };
    if (period === "custom") {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }
    const res = await reportApi.export(params);
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-sales-report-${period}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <main
        className="main-content"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        Loading reports...
      </main>
    );
  }

  // Calculate highest revenue for visual relative bar calculation
  const maxProductRevenue =
    topProducts.length > 0
      ? Math.max(...topProducts.map((p) => p.totalRevenue || 0))
      : 1;

  const maxCashierRevenue =
    cashierPerf.length > 0
      ? Math.max(...cashierPerf.map((c) => c.totalRevenue || 0))
      : 1;

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header with Preset Timeframes & Custom Date Range */}
        <div
          className="page-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 className="page-title">Executive Reports & Retail Accounting</h1>
            <p className="page-subtitle">
              P&L income performance, COGS inventory cost, top product margins, and cashier audit
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Store Branch Filter */}
            {stores.length > 0 && (
              <select
                className="input"
                style={{ width: "auto", minWidth: 150 }}
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              >
                <option value="all">All Branches</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Timeframe Presets Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={16} color="var(--accent-primary, #f97316)" />
              <select
                className="input"
                style={{
                  minWidth: 190,
                  fontWeight: 600,
                  borderColor: "var(--accent-primary, #f97316)",
                }}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="today">Today (24 Hours)</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days (1 Week)</option>
                <option value="month">Last 30 Days (1 Month)</option>
                <option value="quarter">Last 3 Months (Quarter)</option>
                <option value="half_year">Last 6 Months</option>
                <option value="year">Last 1 Year (12 Months)</option>
                <option value="all">All Time Historical</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {period === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span style={{ color: "#94a3b8", fontSize: 12 }}>to</span>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <button className="btn btn-sm btn-ghost" onClick={handleExport}>
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>

        {/* Financial Accounting P&L Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* 1. Gross Revenue */}
          <div className="stat-card">
            <div className="stat-label">Gross Revenue</div>
            <div
              className="stat-value"
              style={{
                color: "var(--accent-primary, #f97316)",
                fontSize: 18,
                marginTop: 4,
              }}
            >
              PKR {(summary?.totalRevenue || 0).toLocaleString()}
            </div>
            <div className="text-xs text-secondary mt-1">Total register sales</div>
          </div>

          {/* 2. Discounts Given */}
          <div className="stat-card">
            <div className="stat-label">Discounts & Promo</div>
            <div
              className="stat-value"
              style={{ color: "#f59e0b", fontSize: 18, marginTop: 4 }}
            >
              PKR {(summary?.totalDiscount || 0).toLocaleString()}
            </div>
            <div className="text-xs text-secondary mt-1">Customer savings</div>
          </div>

          {/* 3. Net Revenue */}
          <div className="stat-card">
            <div className="stat-label">Net Sales</div>
            <div
              className="stat-value text-white"
              style={{ fontSize: 18, marginTop: 4 }}
            >
              PKR {(summary?.netRevenue || 0).toLocaleString()}
            </div>
            <div className="text-xs text-secondary mt-1">Gross minus discounts</div>
          </div>

          {/* 4. COGS (Inventory Cost) */}
          <div className="stat-card">
            <div className="stat-label">Cost of Goods (COGS)</div>
            <div
              className="stat-value"
              style={{ color: "#94a3b8", fontSize: 18, marginTop: 4 }}
            >
              PKR {(summary?.costOfGoodsSold || 0).toLocaleString()}
            </div>
            <div className="text-xs text-secondary mt-1">Direct item cost</div>
          </div>

          {/* 5. Gross Profit */}
          <div className="stat-card">
            <div className="stat-label">Gross Profit</div>
            <div
              className="stat-value"
              style={{
                color:
                  (summary?.grossProfit || 0) >= 0 ? "#10b981" : "#ef4444",
                fontSize: 18,
                marginTop: 4,
              }}
            >
              PKR {(summary?.grossProfit || 0).toLocaleString()}
            </div>
            <div
              className="text-xs mt-1"
              style={{
                color:
                  (summary?.grossProfit || 0) >= 0 ? "#10b981" : "#ef4444",
                fontWeight: 600,
              }}
            >
              {summary?.grossMargin || 0}% Gross Margin
            </div>
          </div>

          {/* 6. Order Volume & AOV */}
          <div className="stat-card">
            <div className="stat-label">Transactions & Basket</div>
            <div
              className="stat-value text-white"
              style={{ fontSize: 18, marginTop: 4 }}
            >
              {(summary?.totalTransactions || 0).toLocaleString()} orders
            </div>
            <div className="text-xs text-secondary mt-1">
              AOV: PKR {Math.round(summary?.avgOrderValue || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="mb-6">
          <ChartCard
            title="Revenue Trend"
            subtitle={`Daily sales performance for ${
              period === "today"
                ? "Today"
                : period === "yesterday"
                ? "Yesterday"
                : period === "week"
                ? "Last 7 Days"
                : period === "month"
                ? "Last 30 Days"
                : period === "quarter"
                ? "Last 3 Months"
                : period === "half_year"
                ? "Last 6 Months"
                : period === "year"
                ? "Last 1 Year"
                : "Selected Timeframe"
            }`}
            isLoading={isLoading}
            isEmpty={!dailyTrend || dailyTrend.length === 0}
            height={280}
          >
            <AreaTrendChart
              data={dailyTrend || []}
              xKey="date"
              yKey="revenue"
              color="#f97316"
              xFormatter={(val) => {
                const d = new Date(val);
                return `${d.getDate()} ${d.toLocaleString("default", {
                  month: "short",
                })}`;
              }}
              valueFormatter={(val) =>
                val >= 1000 ? `PKR ${(val / 1000).toFixed(0)}k` : `PKR ${val}`
              }
            />
          </ChartCard>
        </div>

        {/* Bottom Section: Executive Top Products & Cashier Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Top Products by Revenue Leaderboard */}
          <div className="card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  className="font-bold m-0 text-base text-white"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Award size={18} color="var(--accent-primary, #f97316)" />
                  Top Products by Revenue
                </h3>
                <p className="text-xs text-secondary mt-1">
                  Ranked by total sales realization in selected period
                </p>
              </div>
              <span className="badge badge-trial">
                {topProducts.length} Top Performers
              </span>
            </div>

            {isLoading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: 20,
                }}
              >
                <div className="skeleton" style={{ height: 40 }} />
                <div className="skeleton" style={{ height: 40 }} />
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            ) : topProducts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 48,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <Package
                  size={32}
                  style={{ margin: "0 auto 10px", opacity: 0.4 }}
                />
                No product sales recorded in this period.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topProducts.map((p, index) => {
                  const revenue = p.totalRevenue || 0;
                  const soldQty = p.totalSold ?? p.totalQty ?? 0;
                  const pct = Math.round(
                    (revenue / (maxProductRevenue || 1)) * 100
                  );

                  return (
                    <div
                      key={p._id || index}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background:
                                index === 0
                                  ? "rgba(249, 115, 22, 0.2)"
                                  : index === 1
                                  ? "rgba(56, 189, 248, 0.2)"
                                  : index === 2
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(255,255,255,0.06)",
                              color:
                                index === 0
                                  ? "#f97316"
                                  : index === 1
                                  ? "#38bdf8"
                                  : index === 2
                                  ? "#10b981"
                                  : "#94a3b8",
                              fontWeight: 800,
                              fontSize: 11,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            #{index + 1}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "#f8fafc",
                              fontSize: 13,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={p.productName}
                          >
                            {p.productName}
                          </span>
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          {soldQty > 0 && (
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>
                              {soldQty} pcs
                            </span>
                          )}
                          <span
                            style={{
                              fontWeight: 700,
                              color: "var(--accent-primary, #f97316)",
                              fontSize: 14,
                            }}
                          >
                            PKR {revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Visual Revenue Proportion Bar */}
                      <div
                        style={{
                          width: "100%",
                          height: 5,
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background:
                              index === 0
                                ? "linear-gradient(90deg, #f97316, #fb923c)"
                                : index === 1
                                ? "linear-gradient(90deg, #0284c7, #38bdf8)"
                                : "linear-gradient(90deg, #059669, #10b981)",
                            borderRadius: 3,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Staff Cashier Checkout & Audit Performance */}
          <div className="card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  className="font-bold m-0 text-base text-white"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Users size={18} color="#10b981" />
                  Cashier & Staff Audit Performance
                </h3>
                <p className="text-xs text-secondary mt-1">
                  Individual register checkout revenue, volume, and average basket
                </p>
              </div>
              <span className="badge badge-active">
                {cashierPerf.length} Active Cashiers
              </span>
            </div>

            {isLoading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: 20,
                }}
              >
                <div className="skeleton" style={{ height: 40 }} />
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            ) : cashierPerf.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 48,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <Users
                  size={32}
                  style={{ margin: "0 auto 10px", opacity: 0.4 }}
                />
                No cashier transaction records available.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cashierPerf.map((c, index) => {
                  const revenue = c.totalRevenue || 0;
                  const orders = c.totalTransactions || 0;
                  const avgTicket = orders > 0 ? Math.round(revenue / orders) : 0;
                  const pct = Math.round(
                    (revenue / (maxCashierRevenue || 1)) * 100
                  );

                  return (
                    <div
                      key={c._id || index}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#10b981",
                              fontWeight: 700,
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {c.cashierName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#f8fafc",
                                fontSize: 14,
                              }}
                            >
                              {c.cashierName}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                              }}
                            >
                              {orders.toLocaleString()} transactions processed
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "#10b981",
                              fontSize: 15,
                            }}
                          >
                            PKR {revenue.toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                            }}
                          >
                            Avg: PKR {avgTicket.toLocaleString()} / sale
                          </div>
                        </div>
                      </div>

                      {/* Cashier Contribution Bar */}
                      <div
                        style={{
                          width: "100%",
                          height: 5,
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background:
                              "linear-gradient(90deg, #10b981, #34d399)",
                            borderRadius: 3,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
