"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  ShoppingCart,
  Download,
  Filter,
  Calendar,
  Eye,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  X,
  Store,
  User,
  Printer,
} from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { salesApi, tenantApi, reportApi } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { ChartCard } from "@/components/charts/ChartCard";
import { BarTimeChart } from "@/components/charts/BarTimeChart";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";

interface SaleItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  lineTotal: number;
}

interface Sale {
  _id: string;
  invoiceNumber: string;
  total: number;
  subtotal?: number;
  cartDiscount?: number;
  taxAmount?: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  storeId: { _id?: string; name: string; storeCode?: string };
  cashierId: { _id?: string; name: string };
  customerSnapshot?: { name?: string; phone?: string };
  items?: SaleItem[];
}

interface StoreOption {
  _id: string;
  name: string;
}

interface SalesSummaryKPI {
  totalRevenue: number;
  totalTransactions: number;
  avgOrderValue: number;
  totalDiscount: number;
  trend?: Array<{ date: string; revenue: number; orders: number }>;
}

export default function SalesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesByHour, setSalesByHour] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryKPI>({
    totalRevenue: 0,
    totalTransactions: 0,
    avgOrderValue: 0,
    totalDiscount: 0,
    trend: [],
  });
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Timeframe Preset
  const [timeframe, setTimeframe] = useState<string>("today");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stores, setStores] = useState<StoreOption[]>([]);

  // Selected Sale for Receipt Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  const latestRequestIdRef = useRef(0);

  // Compute ISO date bounds based on timeframe
  const getDateBounds = useCallback(() => {
    const now = new Date();
    if (timeframe === "custom") {
      return { start: startDate, end: endDate };
    }
    if (timeframe === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: "" };
    }
    if (timeframe === "yesterday") {
      const start = new Date();
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (timeframe === "7days") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: "" };
    }
    if (timeframe === "30days") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: "" };
    }
    if (timeframe === "90days") {
      const start = new Date();
      start.setDate(now.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: "" };
    }
    if (timeframe === "180days") {
      const start = new Date();
      start.setDate(now.getDate() - 180);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: "" };
    }
    if (timeframe === "365days") {
      const start = new Date();
      start.setDate(now.getDate() - 365);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: "" };
    }
    return { start: "", end: "" }; // all time
  }, [timeframe, startDate, endDate]);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(stored));

    tenantApi
      .listStores()
      .then((res) => {
        setStores(res.data?.data || []);
      })
      .catch(console.error);
  }, [router]);

  // Fetch sales summary and hourly breakdown
  const fetchAnalytics = useCallback(async () => {
    setIsChartLoading(true);
    const { start, end } = getDateBounds();
    try {
      const summaryPromise = reportApi.salesSummary({
        period: timeframe,
        startDate: start || undefined,
        endDate: end || undefined,
        storeId: storeFilter !== "all" ? storeFilter : undefined,
      });

      const hourlyPromise =
        timeframe === "today" || timeframe === "yesterday"
          ? reportApi.salesByHour({
              date: timeframe === "yesterday" ? start : undefined,
            })
          : Promise.resolve({ data: { data: [] } });

      const [summaryRes, hourlyRes] = await Promise.all([
        summaryPromise,
        hourlyPromise,
      ]);

      if (summaryRes.data?.data) {
        setSalesSummary(summaryRes.data.data);
      }
      setSalesByHour(hourlyRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load sales analytics:", err);
    } finally {
      setIsChartLoading(false);
    }
  }, [timeframe, getDateBounds, storeFilter]);

  // Fetch transaction table list
  const fetchSales = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    const { start, end } = getDateBounds();
    try {
      const res = await salesApi.list({
        search,
        storeId: storeFilter !== "all" ? storeFilter : undefined,
        paymentMethod: paymentFilter !== "all" ? paymentFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        startDate: start || undefined,
        endDate: end || undefined,
        page,
        limit,
      });
      if (requestId !== latestRequestIdRef.current) return;
      const fetchedSales: Sale[] = res.data?.data || [];
      setSales(fetchedSales);
      const meta = res.data?.meta || {};
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || 0) / limit) || 1);
    } catch {
      if (requestId === latestRequestIdRef.current) {
        toast.error("Failed to load sales");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, storeFilter, paymentFilter, statusFilter, getDateBounds, page, limit]);

  useEffect(() => {
    fetchSales();
    fetchAnalytics();
  }, [fetchSales, fetchAnalytics]);

  const handleOpenReceipt = async (sale: Sale) => {
    setSelectedSale(sale);
    // If sale doesn't have populated items, fetch details
    if (!sale.items || sale.items.length === 0) {
      setIsReceiptLoading(true);
      try {
        const res = await salesApi.get(sale._id);
        if (res.data?.data) {
          setSelectedSale(res.data.data);
        }
      } catch {
        // Fallback with current snapshot
      } finally {
        setIsReceiptLoading(false);
      }
    }
  };

  const handleDownloadPDF = async (saleId: string) => {
    try {
      const res = await salesApi.getInvoicePDF(saleId);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt-${selectedSale?.invoiceNumber || saleId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const isHourlyMode = timeframe === "today" || timeframe === "yesterday";
  const isPageLoading = !user || (isLoading && sales.length === 0);

  return (
    <>
      <main className="main-content">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header with Title & Timeframe Selector */}
          <div
            className="page-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h1 className="page-title">Sales & Transaction History</h1>
              <p className="page-subtitle">
                Track revenue, customer receipts, and orders ({total.toLocaleString()}{" "}
                total orders)
              </p>
            </div>

            {/* Timeframe Dropdown (Today, 24h, 7D, 30D, 3M, 6M, 1Y, All Time) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={16} color="var(--accent-primary, #f97316)" />
                <select
                  className="input"
                  style={{
                    minWidth: 200,
                    fontWeight: 600,
                    borderColor: "var(--accent-primary, #f97316)",
                  }}
                  value={timeframe}
                  onChange={(e) => {
                    setTimeframe(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="today">Today (Last 24 Hours)</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7days">Last 7 Days (1 Week)</option>
                  <option value="30days">Last 30 Days (1 Month)</option>
                  <option value="90days">Last 3 Months (Quarter)</option>
                  <option value="180days">Last 6 Months</option>
                  <option value="365days">Last 1 Year (12 Months)</option>
                  <option value="all">All Time History</option>
                  <option value="custom">Custom Date Range...</option>
                </select>
              </div>

              {timeframe === "custom" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                  />
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>to</span>
                  <input
                    type="date"
                    className="input"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Timeframe KPI Summary Cards */}
          <div className="grid-stats mb-6">
            <div className="stat-card">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(249, 115, 22, 0.12)",
                  color: "var(--accent-primary, #f97316)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <DollarSign size={20} />
              </div>
              <div
                className="stat-value"
                style={{ color: "var(--accent-primary, #f97316)" }}
              >
                PKR {(salesSummary.totalRevenue || 0).toLocaleString()}
              </div>
              <div className="stat-label">Period Gross Revenue</div>
              <div className="text-xs text-secondary mt-1">
                Completed checkouts
              </div>
            </div>

            <div className="stat-card">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <ShoppingCart size={20} />
              </div>
              <div className="stat-value text-positive">
                {(salesSummary.totalTransactions || 0).toLocaleString()} Orders
              </div>
              <div className="stat-label">Total Transactions</div>
              <div className="text-xs text-secondary mt-1">Orders processed</div>
            </div>

            <div className="stat-card">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(56, 189, 248, 0.12)",
                  color: "#38bdf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <TrendingUp size={20} />
              </div>
              <div className="stat-value text-white">
                PKR {Math.round(salesSummary.avgOrderValue || 0).toLocaleString()}
              </div>
              <div className="stat-label">Average Basket Size (AOV)</div>
              <div className="text-xs text-secondary mt-1">Average sale ticket</div>
            </div>

            <div className="stat-card">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <CreditCard size={20} />
              </div>
              <div className="stat-value text-warning">
                PKR {(salesSummary.totalDiscount || 0).toLocaleString()}
              </div>
              <div className="stat-label">Promotions & Discounts</div>
              <div className="text-xs text-secondary mt-1">Customer savings</div>
            </div>
          </div>

          {/* Adaptive Analytics Chart: Hourly for 24h, Daily/Trend for multi-day */}
          <div className="mb-6">
            <ChartCard
              title={
                isHourlyMode
                  ? `Sales by Hour (${timeframe === "today" ? "Today" : "Yesterday"})`
                  : `Revenue Trend (${
                      timeframe === "7days"
                        ? "Last 7 Days"
                        : timeframe === "30days"
                        ? "Last 30 Days"
                        : timeframe === "90days"
                        ? "Last 3 Months"
                        : timeframe === "180days"
                        ? "Last 6 Months"
                        : timeframe === "365days"
                        ? "Last 1 Year"
                        : "Selected Period"
                    })`
              }
              subtitle="Real-time register receipts and checkout volume"
              isLoading={isChartLoading}
              isEmpty={
                isHourlyMode
                  ? salesByHour.length === 0
                  : !salesSummary.trend || salesSummary.trend.length === 0
              }
              height={260}
            >
              {isHourlyMode ? (
                <BarTimeChart
                  data={salesByHour}
                  xKey="hour"
                  yKey="revenue"
                  color="#f97316"
                  valueFormatter={(val) =>
                    val >= 1000
                      ? `PKR ${(val / 1000).toFixed(0)}k`
                      : `PKR ${val}`
                  }
                />
              ) : (
                <AreaTrendChart
                  data={salesSummary.trend || []}
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
                    val >= 1000
                      ? `PKR ${(val / 1000).toFixed(0)}k`
                      : `PKR ${val}`
                  }
                />
              )}
            </ChartCard>
          </div>

          {/* Search & Dynamic Filter Controls */}
          <div
            className="card mb-4"
            style={{
              padding: "14px 18px",
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search
                size={16}
                color="#64748b"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                className="input"
                placeholder="Search by invoice # or customer name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ paddingLeft: 38 }}
              />
            </div>

            {/* Store Filter */}
            {stores.length > 0 && (
              <select
                className="input"
                value={storeFilter}
                onChange={(e) => {
                  setStoreFilter(e.target.value);
                  setPage(1);
                }}
                style={{ width: "auto", minWidth: 150 }}
              >
                <option value="all">All Store Branches</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Payment Method Filter */}
            <select
              className="input"
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto", minWidth: 140 }}
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card / POS Terminal</option>
              <option value="wallet">Mobile Wallet (EasyPaisa/JazzCash)</option>
            </select>

            {/* Status Filter */}
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto", minWidth: 130 }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded / Returned</option>
            </select>

            {(search ||
              storeFilter !== "all" ||
              paymentFilter !== "all" ||
              statusFilter !== "all") && (
              <button
                className="btn btn-ghost btn-sm text-secondary hover:text-white"
                style={{ whiteSpace: "nowrap" }}
                onClick={() => {
                  setSearch("");
                  setStoreFilter("all");
                  setPaymentFilter("all");
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                <X size={14} /> Clear Filters
              </button>
            )}
          </div>

          {/* Sales History Table */}
          {isPageLoading ? (
            <TableSkeleton rows={limit} columns={7} />
          ) : (
            <div className="card card-table">
              <div
                className="table-wrapper"
                style={{ border: "none", borderRadius: 0 }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date & Time</th>
                      <th>Customer</th>
                      <th>Store Branch</th>
                      <th>Cashier</th>
                      <th>Payment</th>
                      <th style={{ textAlign: "right" }}>Total Amount</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th style={{ textAlign: "center" }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            textAlign: "center",
                            padding: 48,
                            color: "#64748b",
                          }}
                        >
                          <ShoppingCart
                            size={36}
                            style={{
                              margin: "0 auto 12px",
                              display: "block",
                              opacity: 0.4,
                            }}
                          />
                          No sales found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr
                          key={sale._id}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleOpenReceipt(sale)}
                        >
                          <td>
                            <div
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                color: "var(--accent-primary, #f97316)",
                                fontSize: 13,
                              }}
                            >
                              {sale.invoiceNumber}
                            </div>
                          </td>
                          <td style={{ color: "#94a3b8", fontSize: 12 }}>
                            {format(
                              new Date(sale.createdAt),
                              "dd MMM yyyy, hh:mm a"
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "#e2e8f0" }}>
                              {sale.customerSnapshot?.name || "Walk-in Customer"}
                            </div>
                            {sale.customerSnapshot?.phone && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  fontFamily: "monospace",
                                }}
                              >
                                {sale.customerSnapshot.phone}
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: 12,
                                color: "#cbd5e1",
                              }}
                            >
                              {sale.storeId?.name || "Main Store"}
                            </span>
                          </td>
                          <td style={{ color: "#cbd5e1", fontSize: 13 }}>
                            {sale.cashierId?.name || "Staff Cashier"}
                          </td>
                          <td>
                            <span
                              style={{
                                textTransform: "capitalize",
                                fontSize: 12,
                                color:
                                  sale.paymentMethod === "cash"
                                    ? "#10b981"
                                    : "#38bdf8",
                                fontWeight: 600,
                              }}
                            >
                              {sale.paymentMethod}
                            </span>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 800,
                              color: "#f8fafc",
                              fontSize: 14,
                            }}
                          >
                            PKR {sale.total?.toLocaleString()}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`badge ${
                                sale.status === "completed"
                                  ? "badge-active"
                                  : "badge-suspended"
                              }`}
                            >
                              {sale.status}
                            </span>
                          </td>
                          <td
                            style={{ textAlign: "center" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="btn btn-icon btn-ghost btn-sm"
                              title="View & Print Digital Receipt"
                              onClick={() => handleOpenReceipt(sale)}
                              style={{ color: "#38bdf8", borderRadius: 6 }}
                            >
                              <FileText size={15} />
                            </button>
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
                itemLabel="transactions"
              />
            </div>
          )}
        </motion.div>
      </main>

      {/* ============================================================ */}
      {/* DIGITAL RECEIPT & ORDER DETAIL MODAL                         */}
      {/* ============================================================ */}
      {selectedSale && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
                borderBottom: "1px dashed var(--border-subtle)",
                paddingBottom: 16,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--accent-primary, #f97316)",
                    fontWeight: 700,
                  }}
                >
                  Official Sales Receipt
                </span>
                <h3
                  className="modal-title"
                  style={{
                    margin: "2px 0 0",
                    fontFamily: "monospace",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {selectedSale.invoiceNumber}
                </h3>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                  {format(
                    new Date(selectedSale.createdAt),
                    "EEEE, MMMM dd, yyyy • hh:mm a"
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className={`badge ${
                    selectedSale.status === "completed"
                      ? "badge-active"
                      : "badge-suspended"
                  }`}
                >
                  {selectedSale.status}
                </span>
                <button
                  className="btn btn-icon btn-ghost"
                  onClick={() => setSelectedSale(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Store & Customer Metadata */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                background: "rgba(255,255,255,0.02)",
                padding: "12px 14px",
                borderRadius: 8,
                fontSize: 12,
                marginBottom: 16,
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div style={{ color: "#64748b" }}>Store Branch:</div>
                <div style={{ fontWeight: 600, color: "#f8fafc", marginTop: 2 }}>
                  {selectedSale.storeId?.name || "Main Flagship Store"}
                </div>
                <div style={{ color: "#64748b", marginTop: 6 }}>
                  Served by:
                </div>
                <div style={{ fontWeight: 500, color: "#cbd5e1", marginTop: 1 }}>
                  {selectedSale.cashierId?.name || "Counter Cashier"}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b" }}>Customer:</div>
                <div style={{ fontWeight: 600, color: "#f8fafc", marginTop: 2 }}>
                  {selectedSale.customerSnapshot?.name || "Walk-in Customer"}
                </div>
                {selectedSale.customerSnapshot?.phone && (
                  <div style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                    {selectedSale.customerSnapshot.phone}
                  </div>
                )}
                <div style={{ color: "#64748b", marginTop: 6 }}>
                  Payment Method:
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color:
                      selectedSale.paymentMethod === "cash"
                        ? "#10b981"
                        : "#38bdf8",
                  }}
                >
                  {selectedSale.paymentMethod}
                </div>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", fontSize: 13 }}>
                  <thead style={{ background: "rgba(255,255,255,0.03)" }}>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>
                        Item
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>
                        Qty
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>
                        Rate
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isReceiptLoading ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ textAlign: "center", padding: 20 }}
                        >
                          Loading receipt items...
                        </td>
                      </tr>
                    ) : selectedSale.items && selectedSale.items.length > 0 ? (
                      selectedSale.items.map((it, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderTop: "1px solid var(--border-subtle)",
                          }}
                        >
                          <td style={{ padding: "8px 12px" }}>
                            <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                              {it.productName}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {it.quantity}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              color: "#94a3b8",
                            }}
                          >
                            PKR {it.unitPrice?.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#f8fafc",
                            }}
                          >
                            PKR {it.lineTotal?.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "8px 12px", color: "#94a3b8" }}>
                          Single Checkout Sale
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                          }}
                        >
                          1
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "right",
                          }}
                        >
                          PKR {selectedSale.total?.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          PKR {selectedSale.total?.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div
              style={{
                borderTop: "1px dashed var(--border-subtle)",
                paddingTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {selectedSale.subtotal !== undefined && selectedSale.subtotal > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#94a3b8",
                  }}
                >
                  <span>Subtotal:</span>
                  <span>PKR {selectedSale.subtotal.toLocaleString()}</span>
                </div>
              )}

              {selectedSale.cartDiscount !== undefined &&
                selectedSale.cartDiscount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#f59e0b",
                    }}
                  >
                    <span>Cart Discount:</span>
                    <span>- PKR {selectedSale.cartDiscount.toLocaleString()}</span>
                  </div>
                )}

              {selectedSale.taxAmount !== undefined &&
                selectedSale.taxAmount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#94a3b8",
                    }}
                  >
                    <span>Sales Tax:</span>
                    <span>PKR {selectedSale.taxAmount.toLocaleString()}</span>
                  </div>
                )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#f8fafc",
                  }}
                >
                  Grand Total Paid:
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 20,
                    color: "var(--accent-primary, #f97316)",
                  }}
                >
                  PKR {selectedSale.total?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Receipt Modal Footer Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleDownloadPDF(selectedSale._id)}
              >
                <Download size={14} /> Download PDF Receipt
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedSale(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
