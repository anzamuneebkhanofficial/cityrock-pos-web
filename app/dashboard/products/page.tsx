"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  Edit3,
  Trash2,
  X,
  Package,
  Layers,
  Check,
  AlertCircle,
  TrendingUp,
  Tag,
  DollarSign,
  Barcode,
} from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { reportApi, productApi, tenantApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Pagination from "@/components/ui/Pagination";
import { ChartCard } from "@/components/charts/ChartCard";
import { DonutChart } from "@/components/charts/DonutChart";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string(),
  sku: z.string(),
  barcode: z.string(),
  basePrice: z.number().min(0, "Selling price must be >= 0"),
  costPrice: z.number().min(0, "Cost price must be >= 0"),
  unit: z.string(),
  isActive: z.boolean(),
});
type ProductFormData = z.infer<typeof productSchema>;

interface Variant {
  _id?: string;
  size?: string;
  color?: string;
  sku?: string;
  barcode?: string;
  additionalPrice?: number;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  basePrice: number;
  costPrice: number;
  unit?: string;
  isActive: boolean;
  variants: Variant[];
  createdAt?: string;
  updatedAt?: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryShare, setCategoryShare] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form for Add Product
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { isSubmitting: isAdding, errors: addErrors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      category: "",
      basePrice: 0,
      costPrice: 0,
      unit: "pcs",
      isActive: true,
    },
  });

  // React Hook Form for Edit Product
  const [editVariants, setEditVariants] = useState<Variant[]>([]);
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    watch: watchEdit,
    formState: { isSubmitting: isEditing, errors: editErrors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      category: "",
      basePrice: 0,
      costPrice: 0,
      unit: "pcs",
      isActive: true,
    },
  });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    validCount: number;
    errorCount: number;
    errors: unknown[];
  } | null>(null);
  const [importRows, setImportRows] = useState<unknown[]>([]);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(stored));

    // Fetch analytics once
    reportApi
      .categoryShare()
      .then((res) => {
        setCategoryShare(res.data?.data || []);
      })
      .catch(console.error)
      .finally(() => setIsChartLoading(false));
  }, [router]);

  const fetchProducts = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const res = await productApi.list({
        search,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit,
      });
      if (requestId !== latestRequestIdRef.current) return;
      const fetchedProducts: Product[] = res.data?.data || [];
      setProducts(fetchedProducts);
      const meta = res.data?.meta || {};
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || 0) / limit) || 1);

      // Extract unique categories for filter
      if (fetchedProducts.length > 0) {
        const uniqueCats = Array.from(
          new Set(fetchedProducts.map((p) => p.category).filter(Boolean))
        );
        setCategories((prev) => Array.from(new Set([...prev, ...uniqueCats])));
      }
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
        console.error("Failed to fetch products:", error);
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, categoryFilter, statusFilter, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onAddProduct = async (data: ProductFormData) => {
    try {
      await productApi.create({
        name: data.name.trim(),
        category: data.category.trim() || undefined,
        sku: data.sku.trim() || undefined,
        barcode: data.barcode.trim() || undefined,
        basePrice: data.basePrice,
        costPrice: data.costPrice,
        unit: data.unit,
        isActive: true,
      });
      toast.success("Product created successfully!");
      setShowAddModal(false);
      resetAdd();
      setPage(1);
      fetchProducts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to add product");
    }
  };

  const handleOpenEdit = (p: Product) => {
    setEditProduct(p);
    resetEdit({
      name: p.name || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      category: p.category || "",
      basePrice: p.basePrice ?? 0,
      costPrice: p.costPrice ?? 0,
      unit: p.unit || "pcs",
      isActive: p.isActive ?? true,
    });
    setEditVariants(
      Array.isArray(p.variants) ? JSON.parse(JSON.stringify(p.variants)) : []
    );
  };

  const onSaveEdit = async (data: ProductFormData) => {
    if (!editProduct) return;
    try {
      await productApi.update(editProduct._id, {
        name: data.name.trim(),
        sku: data.sku.trim(),
        barcode: data.barcode.trim(),
        category: data.category.trim(),
        basePrice: data.basePrice,
        costPrice: data.costPrice,
        unit: data.unit,
        isActive: data.isActive,
        variants: editVariants,
      });
      toast.success("Product updated successfully!");
      setEditProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update product");
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await productApi.delete(productToDelete._id);
      toast.success(`"${productToDelete.name}" removed from catalog`);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddVariantRow = () => {
    const currentSku = watchEdit("sku");
    setEditVariants((prev) => [
      ...prev,
      {
        size: "",
        color: "",
        sku: `${currentSku || "VAR"}-${prev.length + 1}`,
        barcode: "",
        additionalPrice: 0,
      },
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setEditVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (
    index: number,
    field: keyof Variant,
    val: string | number
  ) => {
    setEditVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleValidateImport = async () => {
    if (!importFile) return;
    const fd = new FormData();
    fd.append("file", importFile);
    try {
      const res = await productApi.validateImport(fd);
      setImportPreview(res.data.data);
      setImportRows(res.data.data.preview || []);
    } catch {
      toast.error("Failed to parse file");
    }
  };

  const handleExport = async () => {
    try {
      const res = await productApi.export();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "products.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const isPageLoading = !user || (isLoading && products.length === 0);

  return (
    <>
      <main className="main-content">
        {isPageLoading ? (
          <TableSkeleton rows={limit} columns={7} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
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
                <h1 className="page-title">Products Catalog</h1>
                <p className="page-subtitle">
                  {total.toLocaleString()} products registered in your store
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={handleExport}>
                  <Download size={15} /> Export
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload size={15} /> Import
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={15} /> Add Product
                </button>
              </div>
            </div>

            {/* Analytics & KPI Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <ChartCard
                  title="Revenue by Category"
                  subtitle="All time sales share"
                  isLoading={isChartLoading}
                  isEmpty={categoryShare.length === 0}
                  height={320}
                >
                  <DonutChart
                    data={categoryShare}
                    nameKey="category"
                    valueKey="totalRevenue"
                    valueFormatter={(val) =>
                      val >= 1000000
                        ? `PKR ${(val / 1000000).toFixed(2)}M`
                        : `PKR ${(val / 1000).toFixed(0)}k`
                    }
                  />
                </ChartCard>
              </div>

              <div className="lg:col-span-2 flex flex-col justify-between gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 h-full">
                  <div className="stat-card flex flex-col justify-center">
                    <div className="stat-label">Total Catalog Products</div>
                    <div className="stat-value text-accent-orange mt-2">
                      {total.toLocaleString()}
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      Active inventory SKUs
                    </div>
                  </div>

                  <div className="stat-card flex flex-col justify-center">
                    <div className="stat-label">Active Categories</div>
                    <div className="stat-value text-white mt-2">
                      {categories.length > 0 ? categories.length : 4}
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      Organized catalog taxonomy
                    </div>
                  </div>

                  <div className="stat-card flex flex-col justify-center">
                    <div className="stat-label">Stock Status</div>
                    <div className="stat-value text-positive mt-2">Ready</div>
                    <div className="text-xs text-secondary mt-1">
                      Multi-store sync active
                    </div>
                  </div>

                  <div className="stat-card flex flex-col justify-center">
                    <div className="stat-label">Barcode POS Ready</div>
                    <div className="stat-value text-white mt-2">100%</div>
                    <div className="text-xs text-secondary mt-1">
                      EAN-13 & Code-128 support
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Full-Width Search & Filter Bar */}
            <div className="card p-4 mb-6">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  />
                  <input
                    className="input pl-10"
                    placeholder="Search products by title, SKU, or barcode..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                {/* Category Filter */}
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 170 }}
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 150 }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="true">Active Only</option>
                  <option value="false">Archived Only</option>
                </select>

                {(search ||
                  categoryFilter !== "all" ||
                  statusFilter !== "all") && (
                  <button
                    className="btn btn-ghost btn-sm text-secondary hover:text-white"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setStatusFilter("all");
                      setPage(1);
                    }}
                  >
                    <X size={14} /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Products Table with Clean Essential Columns & 3 Actions */}
            <div className="card card-table">
              <div
                className="table-wrapper"
                style={{ border: "none", borderRadius: 0 }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Selling Price</th>
                      <th>Cost Price</th>
                      <th>Variants</th>
                      <th style={{ textAlign: "center", minWidth: 130 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            textAlign: "center",
                            padding: 48,
                            color: "#64748b",
                          }}
                        >
                          <Package
                            size={36}
                            style={{
                              margin: "0 auto 12px",
                              display: "block",
                              opacity: 0.4,
                            }}
                          />
                          No products found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const variantCount = Array.isArray(p.variants)
                          ? p.variants.length
                          : 0;
                        return (
                          <tr key={p._id}>
                            <td>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "#e2e8f0",
                                  fontSize: 14,
                                }}
                              >
                                {p.name}
                              </div>
                              {p.barcode && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#64748b",
                                    fontFamily: "monospace",
                                    marginTop: 2,
                                  }}
                                >
                                  {p.barcode}
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                fontFamily: "monospace",
                                fontSize: 13,
                                color: "#cbd5e1",
                              }}
                            >
                              {p.sku || "—"}
                            </td>
                            <td>
                              <span
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  padding: "3px 9px",
                                  borderRadius: 6,
                                  fontSize: 12,
                                  color: "#cbd5e1",
                                  fontWeight: 500,
                                }}
                              >
                                {p.category || "General"}
                              </span>
                            </td>
                            <td
                              style={{
                                fontWeight: 700,
                                color: "var(--accent-primary, #f97316)",
                                fontSize: 14,
                              }}
                            >
                              PKR {p.basePrice?.toLocaleString()}
                            </td>
                            <td style={{ color: "#94a3b8", fontSize: 13 }}>
                              PKR {p.costPrice?.toLocaleString() || "0"}
                            </td>
                            <td>
                              {variantCount > 0 ? (
                                <span className="badge badge-trial">
                                  <Layers
                                    size={11}
                                    style={{
                                      display: "inline",
                                      marginRight: 4,
                                    }}
                                  />
                                  {variantCount} variant
                                  {variantCount > 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span
                                  style={{ color: "#64748b", fontSize: 12 }}
                                >
                                  Single item
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                }}
                              >
                                {/* 1. View Action */}
                                <button
                                  className="btn btn-icon btn-ghost btn-sm"
                                  title="View Full Product Details"
                                  onClick={() => setViewProduct(p)}
                                  style={{
                                    color: "#38bdf8",
                                    padding: "6px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  <Eye size={15} />
                                </button>

                                {/* 2. Edit Action */}
                                <button
                                  className="btn btn-icon btn-ghost btn-sm"
                                  title="Edit Product Details"
                                  onClick={() => handleOpenEdit(p)}
                                  style={{
                                    color: "var(--accent-primary, #f97316)",
                                    padding: "6px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  <Edit3 size={15} />
                                </button>

                                {/* 3. Delete Action */}
                                <button
                                  className="btn btn-icon btn-ghost btn-sm"
                                  title="Delete Product"
                                  onClick={() => setProductToDelete(p)}
                                  style={{
                                    color: "#ef4444",
                                    padding: "6px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
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
                itemLabel="products"
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 1. VIEW PRODUCT MODAL (Comprehensive Details & Variants)     */}
      {/* ============================================================ */}
      {viewProduct && (
        <div className="modal-overlay" onClick={() => setViewProduct(null)}>
          <div
            className="modal"
            style={{ maxWidth: 720 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: 16,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    {viewProduct.name}
                  </h3>
                  <span
                    className={`badge ${
                      viewProduct.isActive !== false
                        ? "badge-active"
                        : "badge-suspended"
                    }`}
                  >
                    {viewProduct.isActive !== false ? "Active" : "Archived"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 6,
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  <span>
                    SKU:{" "}
                    <code style={{ color: "#f8fafc" }}>
                      {viewProduct.sku || "N/A"}
                    </code>
                  </span>
                  <span>•</span>
                  <span>
                    Barcode:{" "}
                    <code style={{ color: "#f8fafc" }}>
                      {viewProduct.barcode || "N/A"}
                    </code>
                  </span>
                  <span>•</span>
                  <span>
                    Category:{" "}
                    <strong style={{ color: "#e2e8f0" }}>
                      {viewProduct.category || "General"}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setViewProduct(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Financial Accounting & Pricing Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: "var(--surface-dark-alt, #14171d)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  SELLING PRICE
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--accent-primary, #f97316)",
                    marginTop: 4,
                  }}
                >
                  PKR {viewProduct.basePrice?.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Per {viewProduct.unit || "unit"}
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-dark-alt, #14171d)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  COST PRICE (COGS)
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#cbd5e1",
                    marginTop: 4,
                  }}
                >
                  PKR {(viewProduct.costPrice || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Per {viewProduct.unit || "unit"}
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-dark-alt, #14171d)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  UNIT PROFIT
                </div>
                {(() => {
                  const profit =
                    (viewProduct.basePrice || 0) - (viewProduct.costPrice || 0);
                  const margin =
                    viewProduct.basePrice > 0
                      ? Math.round((profit / viewProduct.basePrice) * 100)
                      : 0;
                  return (
                    <>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: profit >= 0 ? "#10b981" : "#ef4444",
                          marginTop: 4,
                        }}
                      >
                        PKR {profit.toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: profit >= 0 ? "#10b981" : "#ef4444",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {margin}% Profit Margin
                      </div>
                    </>
                  );
                })()}
              </div>

              <div
                style={{
                  background: "var(--surface-dark-alt, #14171d)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  VARIANTS
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#38bdf8",
                    marginTop: 4,
                  }}
                >
                  {Array.isArray(viewProduct.variants)
                    ? viewProduct.variants.length
                    : 0}{" "}
                  SKUs
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Size & Color Matrix
                </div>
              </div>
            </div>

            {/* Product Variants Table */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#f8fafc",
                    margin: 0,
                  }}
                >
                  Product Variants & Attributes
                </h4>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  {viewProduct.variants?.length || 0} variant options
                </span>
              </div>

              {!viewProduct.variants || viewProduct.variants.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: 8,
                    padding: "20px 16px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  <Package
                    size={22}
                    style={{ margin: "0 auto 6px", opacity: 0.5 }}
                  />
                  This product has no size or color variants. It sells under the
                  base catalog SKU.
                </div>
              ) : (
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
                          Variant SKU
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>
                          Size
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>
                          Color
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>
                          Barcode
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>
                          Retail Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewProduct.variants.map((v, idx) => {
                        const finalPrice =
                          (viewProduct.basePrice || 0) +
                          (Number(v.additionalPrice) || 0);
                        return (
                          <tr
                            key={v._id || idx}
                            style={{
                              borderTop: "1px solid var(--border-subtle)",
                            }}
                          >
                            <td
                              style={{
                                padding: "8px 12px",
                                fontFamily: "monospace",
                                color: "#e2e8f0",
                              }}
                            >
                              {v.sku || `${viewProduct.sku}-${idx + 1}`}
                            </td>
                            <td
                              style={{
                                padding: "8px 12px",
                                color: "#cbd5e1",
                                fontWeight: 500,
                              }}
                            >
                              {v.size || "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 12px",
                                color: "#cbd5e1",
                                fontWeight: 500,
                              }}
                            >
                              {v.color || "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 12px",
                                fontFamily: "monospace",
                                color: "#94a3b8",
                              }}
                            >
                              {v.barcode || "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 12px",
                                textAlign: "right",
                                fontWeight: 700,
                                color: "var(--accent-primary, #f97316)",
                              }}
                            >
                              PKR {finalPrice.toLocaleString()}
                              {v.additionalPrice ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#10b981",
                                    marginLeft: 4,
                                  }}
                                >
                                  (+{v.additionalPrice})
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 16,
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const p = viewProduct;
                  setViewProduct(null);
                  handleOpenEdit(p);
                }}
              >
                <Edit3 size={14} /> Edit This Product
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setViewProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. EDIT PRODUCT MODAL (Form Modification & Variants)          */}
      {/* ============================================================ */}
      {editProduct && (
        <div className="modal-overlay" onClick={() => setEditProduct(null)}>
          <div
            className="modal"
            style={{ maxWidth: 760, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  Edit Product Information
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                  Modify product catalog entry and variant specifications
                </p>
              </div>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setEditProduct(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit(onSaveEdit)}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Product Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Oxford Derby Shoes"
                    {...registerEdit("name")}
                  />
                  {editErrors.name && (
                    <span style={{ color: "#ef4444", fontSize: 12 }}>
                      {editErrors.name.message}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Category</label>
                  <input
                    className="input"
                    placeholder="e.g. Footwear"
                    {...registerEdit("category")}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="label">SKU</label>
                  <input
                    className="input"
                    placeholder="e.g. SHO-OXF-001"
                    {...registerEdit("sku")}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Barcode</label>
                  <input
                    className="input"
                    placeholder="e.g. 89640001001"
                    {...registerEdit("barcode")}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Selling Price (PKR) *</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="e.g. 4500"
                    {...registerEdit("basePrice", { valueAsNumber: true })}
                  />
                  {editErrors.basePrice && (
                    <span style={{ color: "#ef4444", fontSize: 12 }}>
                      {editErrors.basePrice.message}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Cost Price (COGS in PKR)</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="e.g. 2400"
                    {...registerEdit("costPrice", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label className="label">Unit of Measure</label>
                  <select
                    className="input"
                    {...registerEdit("unit")}
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="pair">Pair</option>
                    <option value="box">Box</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="set">Set</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Catalog Status</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 8,
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="radio"
                        name="isActive"
                        checked={watchEdit("isActive") === true}
                        onChange={() => setEditValue("isActive", true)}
                      />
                      <span style={{ color: "#10b981", fontWeight: 600 }}>
                        Active
                      </span>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="radio"
                        name="isActive"
                        checked={watchEdit("isActive") === false}
                        onChange={() => setEditValue("isActive", false)}
                      />
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>
                        Archived / Inactive
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Variants Editor Section */}
              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <h4
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f8fafc",
                        margin: 0,
                      }}
                    >
                      Product Variants ({editVariants.length})
                    </h4>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      Configure sizes, colors, and variant pricing
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddVariantRow}
                  >
                    <Plus size={14} /> Add Variant
                  </button>
                </div>

                {editVariants.length === 0 ? (
                  <div
                    style={{
                      border: "1px dashed var(--border-subtle)",
                      borderRadius: 8,
                      padding: "16px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    No variants added yet. Click &quot;Add Variant&quot; if this item has multiple sizes or colors.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {editVariants.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr 1.2fr 1.2fr 0.9fr 36px",
                          gap: 8,
                          alignItems: "center",
                          background: "rgba(255,255,255,0.02)",
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <input
                          className="input"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          placeholder="Size (e.g. 42)"
                          value={v.size || ""}
                          onChange={(e) =>
                            handleVariantChange(idx, "size", e.target.value)
                          }
                        />
                        <input
                          className="input"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          placeholder="Color (e.g. Tan)"
                          value={v.color || ""}
                          onChange={(e) =>
                            handleVariantChange(idx, "color", e.target.value)
                          }
                        />
                        <input
                          className="input"
                          style={{
                            padding: "6px 8px",
                            fontSize: 12,
                            fontFamily: "monospace",
                          }}
                          placeholder="Variant SKU"
                          value={v.sku || ""}
                          onChange={(e) =>
                            handleVariantChange(idx, "sku", e.target.value)
                          }
                        />
                        <input
                          className="input"
                          style={{
                            padding: "6px 8px",
                            fontSize: 12,
                            fontFamily: "monospace",
                          }}
                          placeholder="Barcode"
                          value={v.barcode || ""}
                          onChange={(e) =>
                            handleVariantChange(idx, "barcode", e.target.value)
                          }
                        />
                        <input
                          className="input"
                          type="number"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          placeholder="+PKR"
                          value={v.additionalPrice ?? 0}
                          onChange={(e) =>
                            handleVariantChange(
                              idx,
                              "additionalPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost btn-sm"
                          style={{ color: "#ef4444" }}
                          onClick={() => handleRemoveVariantRow(idx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: 16,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isEditing}
                >
                  {isEditing ? "Saving Changes..." : "Save Product Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DELETE CONFIRMATION DIALOG (Standard Safe Workflow)       */}
      {/* ============================================================ */}
      {productToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setProductToDelete(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <AlertCircle size={26} />
            </div>
            <h3
              className="modal-title"
              style={{ margin: "0 0 8px", fontSize: 18 }}
            >
              Delete Product?
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 16px" }}>
              Are you sure you want to delete{" "}
              <strong style={{ color: "#f8fafc" }}>
                {productToDelete.name}
              </strong>
              {productToDelete.sku ? ` (SKU: ${productToDelete.sku})` : ""}?
            </p>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>
              This will remove the product from active point-of-sale registers
              and catalog queries. Existing transaction records will preserve
              historical snapshot data.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-ghost w-full"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger w-full"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ justifyContent: "center" }}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ADD PRODUCT MODAL                                         */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 className="modal-title" style={{ margin: 0 }}>
                Add New Product
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd(onAddProduct)}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Product Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Leather Chukka Boots"
                    {...registerAdd("name")}
                  />
                  {addErrors.name && (
                    <span style={{ color: "#ef4444", fontSize: 12 }}>
                      {addErrors.name.message}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Category</label>
                  <input
                    className="input"
                    placeholder="e.g. Footwear"
                    {...registerAdd("category")}
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">SKU</label>
                  <input
                    className="input"
                    placeholder="e.g. BOT-CHK-001"
                    {...registerAdd("sku")}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Barcode</label>
                  <input
                    className="input"
                    placeholder="e.g. 89640001001"
                    {...registerAdd("barcode")}
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Selling Price (PKR) *</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="e.g. 6500"
                    {...registerAdd("basePrice", { valueAsNumber: true })}
                  />
                  {addErrors.basePrice && (
                    <span style={{ color: "#ef4444", fontSize: 12 }}>
                      {addErrors.basePrice.message}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Cost Price (COGS in PKR)</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="e.g. 3200"
                    {...registerAdd("costPrice", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isAdding}
                  style={{ justifyContent: "center" }}
                >
                  <Plus size={16} />{" "}
                  {isAdding ? "Adding..." : "Add Product to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. BULK IMPORT MODAL                                         */}
      {/* ============================================================ */}
      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowImportModal(false);
            setImportPreview(null);
            setImportFile(null);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 560 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3 className="modal-title" style={{ margin: 0 }}>
                Bulk Import Products
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                  setImportFile(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
              Upload a CSV or Excel file with your products.
              <button
                className="btn btn-ghost btn-sm"
                style={{
                  display: "inline-flex",
                  padding: "2px 8px",
                  marginLeft: 8,
                }}
                onClick={async () => {
                  const res = await productApi.downloadTemplate();
                  const url = URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "product-template.xlsx";
                  a.click();
                }}
              >
                Download Template
              </button>
            </p>
            <div
              style={{
                border: "2px dashed rgba(99,102,241,0.3)",
                borderRadius: 12,
                padding: 32,
                textAlign: "center",
                marginBottom: 16,
                background: "rgba(99,102,241,0.04)",
                cursor: "pointer",
              }}
              onClick={() => document.getElementById("import-file")?.click()}
            >
              <Upload
                size={28}
                color="#6366f1"
                style={{ margin: "0 auto 12px" }}
              />
              <div style={{ color: "#818cf8", fontWeight: 600 }}>
                {importFile
                  ? importFile.name
                  : "Click to upload or drag & drop"}
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                CSV or Excel (.xlsx), max 10MB
              </div>
              <input
                id="import-file"
                type="file"
                accept=".csv,.xlsx"
                style={{ display: "none" }}
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportPreview(null);
                }}
              />
            </div>
            {importPreview && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 16px",
                  background:
                    importPreview.errorCount > 0
                      ? "rgba(245,158,11,0.08)"
                      : "rgba(16,185,129,0.08)",
                  borderRadius: 8,
                  border: `1px solid ${
                    importPreview.errorCount > 0
                      ? "rgba(245,158,11,0.2)"
                      : "rgba(16,185,129,0.2)"
                  }`,
                }}
              >
                <div
                  style={{
                    color: "#e2e8f0",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  ✅ {importPreview.validCount} valid rows &nbsp;
                  {importPreview.errorCount > 0 && (
                    <span style={{ color: "#f59e0b" }}>
                      ⚠️ {importPreview.errorCount} errors found
                    </span>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              {!importPreview ? (
                <button
                  className="btn btn-secondary w-full"
                  onClick={handleValidateImport}
                  disabled={!importFile}
                  style={{ justifyContent: "center" }}
                >
                  Validate File
                </button>
              ) : (
                <button
                  className="btn btn-primary w-full"
                  disabled={importPreview.validCount === 0 || isImporting}
                  style={{ justifyContent: "center" }}
                  onClick={async () => {
                    if (isImporting) return;
                    setIsImporting(true);
                    try {
                      const stores = await tenantApi.listStores();
                      const storeId = stores.data?.data?.[0]?._id;
                      await productApi.commitImport({
                        storeId,
                        rows: importRows,
                      });
                      toast.success(
                        `${importPreview?.validCount} products imported!`
                      );
                      setShowImportModal(false);
                      setImportPreview(null);
                      setImportFile(null);
                      fetchProducts();
                    } catch (err: unknown) {
                      const error = err as {
                        response?: { data?: { message?: string } };
                      };
                      toast.error(
                        error.response?.data?.message || "Import failed"
                      );
                    } finally {
                      setIsImporting(false);
                    }
                  }}
                >
                  {isImporting
                    ? "Importing..."
                    : `Import ${importPreview.validCount} Products`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
