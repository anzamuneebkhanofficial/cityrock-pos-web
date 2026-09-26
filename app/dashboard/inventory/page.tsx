"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Store,
  AlertTriangle,
  AlertCircle,
  PackageCheck,
  TrendingUp,
  Download,
  SlidersHorizontal,
  X,
  Package,
  Boxes,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { inventoryApi, tenantApi } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";

interface InventoryItem {
  _id: string;
  quantity: number;
  reorderLevel: number;
  productId: {
    _id: string;
    name: string;
    sku: string;
    barcode: string;
    category?: string;
    basePrice?: number;
    costPrice?: number;
    unit?: string;
  };
  storeId: { _id: string; name: string; storeCode?: string };
}

interface StoreOption {
  _id: string;
  name: string;
}

interface ValuationData {
  totalItems: number;
  totalQuantity: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function InventoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [valuation, setValuation] = useState<ValuationData>({
    totalItems: 0,
    totalQuantity: 0,
    totalCostValuation: 0,
    totalRetailValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<
    "all" | "in_stock" | "low_stock" | "out_of_stock"
  >("all");
  const [stores, setStores] = useState<StoreOption[]>([]);

  // Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<"add" | "deduct" | "set">("add");
  const [adjustmentValue, setAdjustmentValue] = useState<string>("");
  const [newReorderLevel, setNewReorderLevel] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState("Restock / Received Shipment");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(stored));

    // Load store branches for dropdown
    tenantApi
      .listStores()
      .then((res) => {
        setStores(res.data?.data || []);
      })
      .catch(console.error);
  }, [router]);

  // Fetch Inventory Valuation Summary
  const fetchValuation = useCallback(async () => {
    try {
      const res = await inventoryApi.getValuation({
        storeId: storeFilter !== "all" ? storeFilter : undefined,
      });
      if (res.data?.data) {
        setValuation(res.data.data);
      }
    } catch {
      // Fallback calculation will occur in items if needed
    }
  }, [storeFilter]);

  const fetchInventory = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const res = await inventoryApi.list({
        search,
        storeId: storeFilter !== "all" ? storeFilter : undefined,
        stockStatus: stockFilter !== "all" ? stockFilter : undefined,
        page,
        limit,
      });
      if (requestId !== latestRequestIdRef.current) return;

      const fetchedItems: InventoryItem[] = res.data?.data || [];
      setItems(fetchedItems);
      const meta = res.data?.meta || {};
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || 0) / limit) || 1);
    } catch {
      if (requestId === latestRequestIdRef.current) {
        toast.error("Failed to load inventory");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, storeFilter, stockFilter, page, limit]);

  useEffect(() => {
    fetchInventory();
    fetchValuation();
  }, [fetchInventory, fetchValuation]);

  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustmentMode("add");
    setAdjustmentValue("");
    setNewReorderLevel(String(item.reorderLevel ?? 10));
    setAdjustmentReason("Restock / Received Shipment");
  };

  const handleSaveAdjustment = async () => {
    if (!adjustingItem || isSubmittingAdjust) return;
    const numVal = parseFloat(adjustmentValue);
    if (isNaN(numVal) && !newReorderLevel) {
      toast.error("Please provide an adjustment quantity or updated reorder level");
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      let finalQuantity: number | undefined = undefined;
      let adjustmentQty: number | undefined = undefined;

      if (!isNaN(numVal)) {
        if (adjustmentMode === "set") {
          finalQuantity = Math.max(0, numVal);
        } else if (adjustmentMode === "add") {
          adjustmentQty = Math.abs(numVal);
        } else if (adjustmentMode === "deduct") {
          adjustmentQty = -Math.abs(numVal);
        }
      }

      const payload: Record<string, unknown> = {
        reorderLevel: newReorderLevel ? parseInt(newReorderLevel, 10) : undefined,
      };

      if (finalQuantity !== undefined) {
        payload.quantity = finalQuantity;
      } else if (adjustmentQty !== undefined) {
        payload.adjustmentQty = adjustmentQty;
      }

      await inventoryApi.adjust(adjustingItem._id, payload as any);
      toast.success("Inventory stock level adjusted!");
      setAdjustingItem(null);
      fetchInventory();
      fetchValuation();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to adjust stock");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await inventoryApi.export({
        storeId: storeFilter !== "all" ? storeFilter : undefined,
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-stock-valuation.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const isPageLoading = !user || (isLoading && items.length === 0);

  return (
    <>
      <main className="main-content">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
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
              <h1 className="page-title">Inventory Management & Valuation</h1>
              <p className="page-subtitle">
                Real-time multi-branch stock levels, reorder alerts, and asset balance
                valuation ({total.toLocaleString()} catalog SKUs)
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <Download size={15} /> Export Stock Report
            </button>
          </div>

          {/* Retail Accounting & Valuation KPI Cards */}
          <div className="grid-stats mb-6">
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
                <Boxes size={20} />
              </div>
              <div className="stat-value text-white">
                {valuation.totalQuantity.toLocaleString()} pcs
              </div>
              <div className="stat-label">Total Stock On-Hand</div>
              <div className="text-xs text-secondary mt-1">Across all branches</div>
            </div>

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
                PKR{" "}
                {valuation.totalCostValuation >= 1000000
                  ? `${(valuation.totalCostValuation / 1000000).toFixed(2)}M`
                  : valuation.totalCostValuation.toLocaleString()}
              </div>
              <div className="stat-label">Asset Valuation (COGS)</div>
              <div className="text-xs text-secondary mt-1">
                Balance sheet cost value
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
                <TrendingUp size={20} />
              </div>
              <div className="stat-value text-positive">
                PKR{" "}
                {valuation.totalRetailValuation >= 1000000
                  ? `${(valuation.totalRetailValuation / 1000000).toFixed(2)}M`
                  : valuation.totalRetailValuation.toLocaleString()}
              </div>
              <div className="stat-label">Expected Retail Value</div>
              <div className="text-xs text-secondary mt-1">
                Projected sales realization
              </div>
            </div>

            <div className="stat-card">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background:
                    valuation.lowStockCount > 0 || valuation.outOfStockCount > 0
                      ? "rgba(245, 158, 11, 0.12)"
                      : "rgba(16, 185, 129, 0.12)",
                  color:
                    valuation.lowStockCount > 0 || valuation.outOfStockCount > 0
                      ? "#f59e0b"
                      : "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <ShieldAlert size={20} />
              </div>
              <div
                className="stat-value"
                style={{
                  color:
                    valuation.outOfStockCount > 0
                      ? "#ef4444"
                      : valuation.lowStockCount > 0
                      ? "#f59e0b"
                      : "#10b981",
                }}
              >
                {valuation.lowStockCount + valuation.outOfStockCount} Alerts
              </div>
              <div className="stat-label">Stock Warning Count</div>
              <div className="text-xs text-secondary mt-1">
                {valuation.outOfStockCount} stockouts • {valuation.lowStockCount} low
              </div>
            </div>
          </div>

          {/* Search & Dynamic Filters Bar */}
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
            <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
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
                placeholder="Search by product name, SKU, or barcode..."
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
                style={{ width: "auto", minWidth: 160 }}
              >
                <option value="all">All Store Branches</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Professional Retail Stock Status Filter */}
            <select
              className="input"
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as any);
                setPage(1);
              }}
              style={{ width: "auto", minWidth: 160 }}
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (Optimal)</option>
              <option value="low_stock">⚠️ Low Stock Alerts</option>
              <option value="out_of_stock">🚫 Out of Stock</option>
            </select>

            {(search || storeFilter !== "all" || stockFilter !== "all") && (
              <button
                className="btn btn-ghost btn-sm text-secondary hover:text-white"
                style={{ whiteSpace: "nowrap" }}
                onClick={() => {
                  setSearch("");
                  setStoreFilter("all");
                  setStockFilter("all");
                  setPage(1);
                }}
              >
                <X size={14} /> Clear Filters
              </button>
            )}
          </div>

          {/* Inventory Table with Accounting & Valuation Metrics */}
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
                      <th>Product Master</th>
                      <th>Store Branch</th>
                      <th>Unit Cost</th>
                      <th>Selling Price</th>
                      <th style={{ textAlign: "center" }}>In Stock Qty</th>
                      <th style={{ textAlign: "center" }}>Reorder Alert</th>
                      <th>Total Valuation</th>
                      <th>Stock Status</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            textAlign: "center",
                            padding: 48,
                            color: "#64748b",
                          }}
                        >
                          <Store
                            size={36}
                            style={{
                              margin: "0 auto 12px",
                              display: "block",
                              opacity: 0.4,
                            }}
                          />
                          No inventory records found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const costPrice = item.productId?.costPrice || 0;
                        const basePrice = item.productId?.basePrice || 0;
                        const totalValuation = item.quantity * costPrice;
                        const isStockout = item.quantity <= 0;
                        const isLowStock =
                          item.quantity > 0 && item.quantity <= item.reorderLevel;
                        const isSurplus =
                          item.quantity >= item.reorderLevel * 4 &&
                          item.reorderLevel > 0;

                        return (
                          <tr key={item._id}>
                            <td>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "#e2e8f0",
                                  fontSize: 14,
                                }}
                              >
                                {item.productId?.name || "Unknown Product"}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  fontFamily: "monospace",
                                  marginTop: 2,
                                }}
                              >
                                {item.productId?.sku ||
                                  item.productId?.barcode ||
                                  "—"}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  fontSize: 12,
                                  color: "#cbd5e1",
                                  fontWeight: 500,
                                }}
                              >
                                {item.storeId?.name || "Main Store"}
                              </span>
                            </td>
                            <td style={{ color: "#94a3b8", fontSize: 13 }}>
                              PKR {costPrice.toLocaleString()}
                            </td>
                            <td
                              style={{
                                color: "var(--accent-primary, #f97316)",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              PKR {basePrice.toLocaleString()}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                fontWeight: 800,
                                fontSize: 15,
                                color: isStockout
                                  ? "#ef4444"
                                  : isLowStock
                                  ? "#f59e0b"
                                  : "#10b981",
                              }}
                            >
                              {item.quantity.toLocaleString()}
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 400,
                                  color: "#64748b",
                                  marginLeft: 4,
                                }}
                              >
                                {item.productId?.unit || "pcs"}
                              </span>
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                color: "#94a3b8",
                                fontSize: 13,
                              }}
                            >
                              {item.reorderLevel}
                            </td>
                            <td style={{ fontWeight: 700, color: "#f8fafc" }}>
                              PKR {totalValuation.toLocaleString()}
                            </td>
                            <td>
                              {isStockout ? (
                                <span className="badge badge-suspended">
                                  <AlertCircle
                                    size={12}
                                    style={{
                                      display: "inline",
                                      marginRight: 4,
                                    }}
                                  />{" "}
                                  Out of Stock
                                </span>
                              ) : isLowStock ? (
                                <span className="badge badge-grace_period">
                                  <AlertTriangle
                                    size={12}
                                    style={{
                                      display: "inline",
                                      marginRight: 4,
                                    }}
                                  />{" "}
                                  Low Stock Warning
                                </span>
                              ) : isSurplus ? (
                                <span className="badge badge-trial">
                                  <TrendingUp
                                    size={12}
                                    style={{
                                      display: "inline",
                                      marginRight: 4,
                                    }}
                                  />{" "}
                                  Surplus Stock
                                </span>
                              ) : (
                                <span className="badge badge-active">
                                  <PackageCheck
                                    size={12}
                                    style={{
                                      display: "inline",
                                      marginRight: 4,
                                    }}
                                  />{" "}
                                  In Stock
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                className="btn btn-icon btn-secondary btn-sm"
                                title="Adjust Stock or Reorder Threshold"
                                onClick={() => handleOpenAdjust(item)}
                                style={{ padding: "6px 9px", borderRadius: 6 }}
                              >
                                <SlidersHorizontal size={14} />
                              </button>
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
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
                itemLabel="inventory items"
              />
            </div>
          )}
        </motion.div>
      </main>

      {/* ============================================================ */}
      {/* ADJUST STOCK & REORDER ALERT MODAL                            */}
      {/* ============================================================ */}
      {adjustingItem && (
        <div className="modal-overlay" onClick={() => setAdjustingItem(null)}>
          <div
            className="modal"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  Adjust Inventory Stock
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                  {adjustingItem.productId?.name} • Branch:{" "}
                  <strong style={{ color: "#f8fafc" }}>
                    {adjustingItem.storeId?.name}
                  </strong>
                </p>
              </div>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setAdjustingItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Level Info Banner */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  Current In-Stock Level
                </span>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color:
                      adjustingItem.quantity <= 0
                        ? "#ef4444"
                        : adjustingItem.quantity <= adjustingItem.reorderLevel
                        ? "#f59e0b"
                        : "#10b981",
                  }}
                >
                  {adjustingItem.quantity.toLocaleString()}{" "}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
                    {adjustingItem.productId?.unit || "pcs"}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  Current Reorder Alert
                </span>
                <div
                  style={{ fontSize: 20, fontWeight: 800, color: "#cbd5e1" }}
                >
                  {adjustingItem.reorderLevel}{" "}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
                    threshold
                  </span>
                </div>
              </div>
            </div>

            {/* Adjustment Operation Mode */}
            <div className="form-group mb-4">
              <label className="label">Adjustment Action</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setAdjustmentMode("add")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${
                      adjustmentMode === "add"
                        ? "var(--positive)"
                        : "var(--border-subtle)"
                    }`,
                    background:
                      adjustmentMode === "add"
                        ? "rgba(16, 185, 129, 0.15)"
                        : "transparent",
                    color: adjustmentMode === "add" ? "#10b981" : "#94a3b8",
                  }}
                >
                  + Add Stock
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentMode("deduct")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${
                      adjustmentMode === "deduct"
                        ? "#ef4444"
                        : "var(--border-subtle)"
                    }`,
                    background:
                      adjustmentMode === "deduct"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "transparent",
                    color: adjustmentMode === "deduct" ? "#ef4444" : "#94a3b8",
                  }}
                >
                  - Deduct Stock
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentMode("set")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${
                      adjustmentMode === "set"
                        ? "var(--accent-primary)"
                        : "var(--border-subtle)"
                    }`,
                    background:
                      adjustmentMode === "set"
                        ? "rgba(249, 115, 22, 0.15)"
                        : "transparent",
                    color:
                      adjustmentMode === "set"
                        ? "var(--accent-primary)"
                        : "#94a3b8",
                  }}
                >
                  = Exact Count
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="grid-2 mb-4">
              <div className="form-group">
                <label className="label">
                  {adjustmentMode === "add"
                    ? "Units to Add (+)"
                    : adjustmentMode === "deduct"
                    ? "Units to Deduct (-)"
                    : "Exact Stocktake Count"}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="e.g. 25"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Reorder Alert Level</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={newReorderLevel}
                  onChange={(e) => setNewReorderLevel(e.target.value)}
                />
              </div>
            </div>

            {/* Reason */}
            <div className="form-group mb-6">
              <label className="label">Reason / Audit Trail Note</label>
              <select
                className="input"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
              >
                <option value="Restock / Received Shipment">
                  Restock / Received Shipment from Supplier
                </option>
                <option value="Damaged Goods / Written-off">
                  Damaged Goods / Written-off
                </option>
                <option value="Physical Count Correction">
                  Physical Count Correction (Stocktake Audit)
                </option>
                <option value="Customer Return">Customer Return</option>
                <option value="Inter-branch Transfer">Inter-branch Transfer</option>
                <option value="Other Discrepancy">Other Discrepancy</option>
              </select>
            </div>

            {/* Projected Result */}
            {adjustmentValue && !isNaN(parseFloat(adjustmentValue)) && (
              <div
                style={{
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#38bdf8",
                  marginBottom: 20,
                }}
              >
                <strong>Projected New Quantity: </strong>
                {(() => {
                  const val = parseFloat(adjustmentValue);
                  let res = adjustingItem.quantity;
                  if (adjustmentMode === "add") res += val;
                  else if (adjustmentMode === "deduct") res -= val;
                  else if (adjustmentMode === "set") res = val;
                  return `${Math.max(0, res)} ${
                    adjustingItem.productId?.unit || "pcs"
                  }`;
                })()}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-ghost w-full"
                onClick={() => setAdjustingItem(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary w-full"
                onClick={handleSaveAdjustment}
                disabled={
                  isSubmittingAdjust ||
                  (!adjustmentValue && !newReorderLevel)
                }
                style={{ justifyContent: "center" }}
              >
                {isSubmittingAdjust ? "Applying..." : "Confirm Stock Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
