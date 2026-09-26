"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, CreditCard,
  Banknote, Wallet, Check, Printer, X, Wifi, WifiOff,
  ChevronLeft, Receipt, AlertTriangle, RefreshCw, User,
  UserPlus, Award, ChevronDown, Store, Tag
} from "lucide-react";
import { salesApi, productApi, customerApi, tenantApi, API_BASE } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBarcodeScanner } from "@/lib/hardware/BarcodeScannerAdapter";
import { getConfiguredPrinter, ReceiptData } from "@/lib/hardware/ReceiptPrinterAdapter";

const posCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string(),
  email: z.string(),
});
type PosCustomerFormData = z.infer<typeof posCustomerSchema>;

interface CartItem {
  productId: string;
  productName: string;
  variantSku: string | null;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  basePrice: number;
  variants: { size: string; color: string; sku: string; _id: string }[];
}

interface CustomerOption {
  _id: string;
  name: string;
  phone?: string;
  loyaltyPoints?: number;
}

interface CompletedSale {
  _id: string;
  invoiceNumber: string;
  total: number;
  changeGiven: number;
  items: CartItem[];
  cartDiscount?: number;
  amountPaid?: number;
  paymentMethod?: string;
  createdAt?: string;
  customerSnapshot?: { name: string; phone?: string };
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: <Banknote size={18} /> },
  { value: "card", label: "Card", icon: <CreditCard size={18} /> },
  { value: "wallet", label: "Wallet", icon: <Wallet size={18} /> },
];

// Offline Queue
const OFFLINE_STORE = "cityrock_offline_sales";
const queueOfflineSale = (sale: Record<string, unknown>) => {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_STORE) || "[]");
  queue.push({ ...sale, _offlineId: Date.now() });
  localStorage.setItem(OFFLINE_STORE, JSON.stringify(queue));
};
const getOfflineQueue = (): Record<string, unknown>[] => JSON.parse(localStorage.getItem(OFFLINE_STORE) || "[]");

export default function POSPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; tenantId: string } | null>(null);
  
  // Store state
  const [availableStores, setAvailableStores] = useState<Array<{ _id: string; name: string }>>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("Store");

  // Products and Category State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");

  // Customer State
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // RHF for Quick Add Customer
  const {
    register: registerQuickCustomer,
    handleSubmit: handleSubmitQuickCustomer,
    reset: resetQuickCustomer,
    formState: { isSubmitting: isCreatingCustomer, errors: quickCustomerErrors },
  } = useForm<PosCustomerFormData>({
    resolver: zodResolver(posCustomerSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  // Cart & Checkout State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [variantModal, setVariantModal] = useState<Product | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    const role = (u?.role || "").toLowerCase();
    if (["super_admin", "platform_admin", "support_agent", "sales_onboarding"].includes(role)) {
      router.replace("/admin");
      return;
    }
    if (!["cashier", "manager", "owner"].includes(role)) {
      router.replace("/dashboard");
      return;
    }
    setUser(u);

    // Load store locations
    tenantApi.listStores().then((res) => {
      const storeList = res.data?.data || [];
      setAvailableStores(storeList);
      if (storeList.length > 0) {
        setStoreId(storeList[0]._id);
        setStoreName(storeList[0].name);
      }
    }).catch(() => {
      const storedStores = localStorage.getItem("cityrock_stores");
      if (storedStores) {
        const parsed = JSON.parse(storedStores);
        setAvailableStores(parsed);
        if (parsed[0]) {
          setStoreId(parsed[0]._id);
          setStoreName(parsed[0].name);
        }
      }
    });

    // Load customer directory for customer selection
    customerApi.list({ limit: 100 }).then((res) => {
      setCustomers(res.data?.data || []);
    }).catch(() => {});

    // Online/offline detection
    const handleOnline = () => { setIsOnline(true); flushOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    setOfflineQueueCount(getOfflineQueue().length);

    // Focus search
    searchRef.current?.focus();
    return () => { 
      window.removeEventListener("online", handleOnline); 
      window.removeEventListener("offline", handleOffline); 
    };
  }, [router]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await productApi.list({ search: "", limit: 200 });
      setProducts(res.data.data);
      setFilteredProducts(res.data.data);
    } catch {
      // offline — products cached
    }
  }, []);

  useEffect(() => { if (storeId) loadProducts(); }, [storeId, loadProducts]);

  // Dynamic Categories from loaded products
  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  // Filtering by search and category
  useEffect(() => {
    let result = products;
    if (selectedCategory !== "all") {
      result = result.filter((p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => 
        p.name.toLowerCase().includes(q) || 
        p.sku?.toLowerCase().includes(q) || 
        p.barcode?.includes(q)
      );
    }
    setFilteredProducts(result);
  }, [search, selectedCategory, products]);

  const addToCart = (product: Product, variantSku?: string, variantLabel?: string) => {
    setCart((prev) => {
      const key = product._id + (variantSku || "");
      const existing = prev.find((i) => i.productId + i.variantSku === key);
      if (existing) {
        return prev.map((i) => i.productId + i.variantSku === key
          ? { ...i, quantity: i.quantity + 1, lineTotal: i.unitPrice * (i.quantity + 1) - i.discount }
          : i
        );
      }
      return [...prev, {
        productId: product._id,
        productName: product.name,
        variantSku: variantSku || null,
        variantLabel: variantLabel || null,
        unitPrice: product.basePrice,
        quantity: 1,
        discount: 0,
        lineTotal: product.basePrice,
      }];
    });
    setSearch("");
    searchRef.current?.focus();
  };

  // Hardware Scanner Integration
  useBarcodeScanner({
    onScan: (barcode) => {
      const product = products.find(p => p.barcode === barcode || p.sku === barcode);
      if (product) {
        if (product.variants && product.variants.length > 0) {
          setVariantModal(product);
        } else {
          addToCart(product);
          toast.success(`Scanned: ${product.name}`);
        }
        return;
      }

      for (const p of products) {
        const v = p.variants?.find(v => v.sku === barcode);
        if (v) {
          addToCart(p, v.sku, `${v.size ? "Size: " + v.size : ""}${v.size && v.color ? " / " : ""}${v.color ? "Color: " + v.color : ""}`);
          toast.success(`Scanned: ${p.name} Variant`);
          return;
        }
      }

      toast.error("Unrecognized barcode", { icon: "⚠️" });
    },
    disabled: isProcessing || !!completedSale || !!variantModal
  });

  const removeFromCart = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));
  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const qty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: qty, lineTotal: item.unitPrice * qty - item.discount };
    }));
  };

  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0);
  const tax = 0;
  const total = Math.max(0, subtotal - cartDiscount + tax);
  const change = paymentMethod === "cash" && amountPaid ? Math.max(0, parseFloat(amountPaid) - total) : 0;

  const flushOfflineQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    const remaining: Record<string, unknown>[] = [];
    let flushed = 0;

    for (const sale of queue) {
      try {
        await salesApi.create(sale);
        flushed++;
      } catch (err: unknown) {
        const error = err as { response?: { status?: number; data?: { code?: string } } };
        if (error.response?.status === 409 || error.response?.data?.code === "DUPLICATE_SALE") {
          flushed++;
        } else {
          remaining.push(sale);
        }
      }
    }

    localStorage.setItem(OFFLINE_STORE, JSON.stringify(remaining));
    setOfflineQueueCount(remaining.length);
    if (flushed > 0) toast.success(`${flushed} offline sale(s) synced successfully ✓`);
  };

  const onQuickAddCustomer = async (data: PosCustomerFormData) => {
    try {
      const res = await customerApi.create({
        name: data.name.trim(),
        phone: data.phone.trim() || undefined,
        email: data.email.trim() || undefined,
      });
      const created = res.data?.data;
      if (created) {
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomer(created);
        toast.success(`Customer ${created.name} added!`);
      }
      setShowAddCustomerModal(false);
      resetQuickCustomer();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to add customer");
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (!storeId) { toast.error("No store location selected"); return; }
    setIsProcessing(true);

    const idempotencyKey = `pos_${storeId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const saleData = {
      storeId,
      items: cart.map((i) => ({
        productId: i.productId,
        variantSku: i.variantSku,
        variantLabel: i.variantLabel,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        discount: i.discount,
      })),
      paymentMethod,
      cartDiscount,
      amountPaid: amountPaid ? parseFloat(amountPaid) : total,
      idempotencyKey,
      customerId: selectedCustomer?._id || null,
      customerName: selectedCustomer?.name || "Walk-in Customer",
      customerPhone: selectedCustomer?.phone || "",
    };

    try {
      if (!isOnline) {
        queueOfflineSale(saleData);
        setOfflineQueueCount((n) => n + 1);
        toast.success("Sale queued offline — will sync automatically when reconnected", { icon: "📶" });
        setCart([]); setCartDiscount(0); setAmountPaid("");
        setIsProcessing(false);
        return;
      }
      const res = await salesApi.create(saleData);
      setCompletedSale({
        ...res.data.data,
        customerSnapshot: {
          name: selectedCustomer?.name || "Walk-in Customer",
          phone: selectedCustomer?.phone || "",
        }
      });
      setCart([]);
      setCartDiscount(0);
      setAmountPaid("");
      // Refresh customer loyalty points in state
      if (selectedCustomer) {
        setSelectedCustomer((prev) => prev ? {
          ...prev,
          loyaltyPoints: (prev.loyaltyPoints || 0) + Math.floor(total / 100)
        } : null);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; code?: string } } };
      if (error.response?.data?.code === "ACCOUNT_SUSPENDED") {
        toast.error("Account suspended. Please renew your subscription.", { duration: 6000 });
      } else {
        toast.error(error.response?.data?.message || "Sale failed");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="pos-screen" style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* Left Panel — Product Search + Category Tabs + Grid */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
        {/* Top bar with store switcher and connection indicator */}
        <div style={{ padding: "12px 20px", background: "var(--surface-dark)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {user.role === "cashier" ? (
            <button
              onClick={() => { localStorage.clear(); router.replace("/login"); }}
              style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: 0 }}
            >
              <ChevronLeft size={16} /> Sign Out
            </button>
          ) : (
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
          )}

          {/* Store Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Store size={18} color="var(--accent-primary)" />
            {availableStores.length > 1 && user.role !== "cashier" ? (
              <select
                value={storeId || ""}
                onChange={(e) => {
                  const s = availableStores.find(st => st._id === e.target.value);
                  if (s) {
                    setStoreId(s._id);
                    setStoreName(s.name);
                  }
                }}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {availableStores.map((st) => (
                  <option key={st._id} value={st._id} style={{ background: "#18181b", color: "#fff" }}>
                    {st.name}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>{storeName}</div>
            )}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {!isOnline && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--warning)", fontSize: 13, fontWeight: 600, background: "var(--warning-bg)", padding: "4px 10px", borderRadius: 20 }}>
                <WifiOff size={14} /> Offline Mode
              </div>
            )}
            {offlineQueueCount > 0 && (
              <button onClick={flushOfflineQueue} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--info)", fontSize: 13, fontWeight: 600, background: "var(--info-bg)", padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer" }}>
                <RefreshCw size={14} /> Sync {offlineQueueCount} sales
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
              {isOnline ? <Wifi size={14} color="var(--positive)" /> : <WifiOff size={14} color="var(--warning)" />}
              <span>{user.name}</span>
              <button
                onClick={() => { localStorage.clear(); router.replace("/login"); }}
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: "4px 8px", marginLeft: 8, height: "auto" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Search bar & Category Pills */}
        <div style={{ padding: "14px 20px 8px", background: "var(--surface-dark)", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={18} color="#94a3b8" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products by name, SKU, or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "11px 14px 11px 44px", fontSize: 14, border: "2px solid var(--border-subtle)", borderRadius: 10, outline: "none", fontFamily: "inherit", color: "var(--text-primary)", background: "var(--bg-secondary)",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: selectedCategory === cat ? "1px solid var(--accent-primary)" : "1px solid rgba(255,255,255,0.08)",
                  background: selectedCategory === cat ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.03)",
                  color: selectedCategory === cat ? "var(--accent-primary)" : "#94a3b8",
                  transition: "all 0.15s ease"
                }}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {filteredProducts.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)" }}>
              <Search size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>No products found matching &quot;{search}&quot;</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {filteredProducts.map((p) => (
                <button
                  key={p._id}
                  className="pos-product-card"
                  onClick={() => {
                    if (p.variants && p.variants.length > 0) {
                      setVariantModal(p);
                    } else {
                      addToCart(p);
                    }
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, fontSize: 18 }}>
                    📦
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 4, textAlign: "left" }}>{p.name}</div>
                  {p.sku && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.sku}</div>}
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent-primary)", marginTop: 6 }}>PKR {p.basePrice?.toLocaleString()}</div>
                  {p.variants?.length > 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{p.variants.length} variants</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel — Customer Info + Order Summary + Checkout */}
      <div className="pos-cart" style={{ width: 390, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--surface-dark)", borderLeft: "1px solid var(--border-subtle)" }}>
        {/* Customer Selector Bar */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <User size={13} color="var(--accent-primary)" /> Customer Details
            </div>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-primary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <UserPlus size={13} /> + New
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={selectedCustomer?._id || ""}
              onChange={(e) => {
                const found = customers.find(c => c._id === e.target.value);
                setSelectedCustomer(found || null);
              }}
              style={{
                flex: 1,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: "8px 10px",
                color: selectedCustomer ? "#fff" : "#94a3b8",
                fontSize: 13,
                fontWeight: 500,
                outline: "none"
              }}
            >
              <option value="">Walk-in Customer (Guest)</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <span className="badge badge-warning" style={{ fontSize: 11, padding: "5px 8px", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                <Award size={12} /> {selectedCustomer.loyaltyPoints || 0} pts
              </span>
            )}
          </div>
        </div>

        {/* Cart header */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
          <ShoppingCart size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Current Order</span>
          {cart.length > 0 && (
            <span style={{ marginLeft: "auto", background: "var(--accent-primary)", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
              {cart.length}
            </span>
          )}
        </div>

        {/* Cart items list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <AnimatePresence>
            {cart.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, color: "var(--text-muted)" }}>
                <ShoppingCart size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 14 }}>Cart is empty</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Select products or scan barcodes to begin</div>
              </div>
            ) : cart.map((item, idx) => (
              <motion.div
                key={item.productId + (item.variantSku || "")}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ padding: "10px 18px", borderBottom: "1px solid var(--bg-primary)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.productName}</div>
                    {item.variantLabel && <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{item.variantLabel}</div>}
                    <div style={{ fontSize: 12, color: "var(--accent-primary)", fontWeight: 700 }}>PKR {item.unitPrice.toLocaleString()}</div>
                  </div>
                  <button onClick={() => removeFromCart(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, marginLeft: 8 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--border-subtle)", borderRadius: 6, overflow: "hidden" }}>
                    <button onClick={() => updateQty(idx, -1)} style={{ width: 28, height: 28, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Minus size={13} />
                    </button>
                    <span style={{ padding: "0 10px", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{item.quantity}</span>
                    <button onClick={() => updateQty(idx, 1)} style={{ width: 28, height: 28, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Plus size={13} />
                    </button>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>PKR {item.lineTotal.toLocaleString()}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary & Payment Footer */}
        {cart.length > 0 && (
          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
              <span>Subtotal</span><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>PKR {subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
              <span>Cart Discount</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12 }}>PKR</span>
                <input
                  type="number" min="0" value={cartDiscount || ""} onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                  style={{ width: 75, padding: "3px 6px", border: "1px solid var(--border-subtle)", borderRadius: 6, textAlign: "right", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                  placeholder="0"
                />
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
              <span>Total Payable</span><span style={{ color: "var(--accent-primary)" }}>PKR {total.toLocaleString()}</span>
            </div>

            {/* Payment method selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {PAYMENT_METHODS.map((m) => (
                <button key={m.value} onClick={() => setPaymentMethod(m.value)} style={{
                  flex: 1, padding: "7px 4px", borderRadius: 8, border: `2px solid ${paymentMethod === m.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  background: paymentMethod === m.value ? "rgba(249,115,22,0.12)" : "var(--surface-dark-alt)",
                  color: paymentMethod === m.value ? "var(--accent-primary)" : "#64748b",
                  cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all 0.15s",
                }}>
                  {m.icon}<span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Amount paid (for cash change calculation) */}
            {paymentMethod === "cash" && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>Amount Tendered / Cash Received</div>
                <input
                  type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "right", outline: "none", fontFamily: "inherit" }}
                  placeholder={`PKR ${total.toLocaleString()}`}
                />
                {change > 0 && (
                  <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--positive-bg)", borderRadius: 6, display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--positive)", fontWeight: 700 }}>
                    <span>Change Due</span><span>PKR {change.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCompleteSale}
              disabled={isProcessing || cart.length === 0}
              style={{
                width: "100%", padding: "13px", background: isProcessing ? "rgba(249,115,22,0.5)" : "linear-gradient(135deg, #ea580c, #f97316)",
                color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s",
              }}
            >
              {isProcessing ? (
                <><span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />Processing...</>
              ) : (
                <><Check size={18} /> Complete Sale — PKR {total.toLocaleString()}</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
          <div className="modal" style={{ maxWidth: 400, background: "var(--surface-dark)", color: "var(--text-primary)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus size={18} color="var(--accent-primary)" /> Register Customer
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="btn btn-icon btn-ghost"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitQuickCustomer(onQuickAddCustomer)}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Customer Full Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Tariq Mehmood"
                  {...registerQuickCustomer("name")}
                />
                {quickCustomerErrors.name && (
                  <span style={{ color: "#ef4444", fontSize: 12 }}>
                    {quickCustomerErrors.name.message}
                  </span>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Phone Number</label>
                <input
                  className="input"
                  placeholder="03001234567"
                  {...registerQuickCustomer("phone")}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="customer@example.com"
                  {...registerQuickCustomer("email")}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddCustomerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingCustomer}>
                  {isCreatingCustomer ? "Saving..." : "Add & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant selection modal */}
      {variantModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ background: "var(--surface-dark)", color: "var(--text-primary)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{variantModal.name}</h3>
              <button onClick={() => setVariantModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={20} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {variantModal.variants.map((v) => (
                <button
                  key={v._id || v.sku}
                  onClick={() => { addToCart(variantModal, v.sku, `${v.size ? "Size: " + v.size : ""}${v.size && v.color ? " / " : ""}${v.color ? "Color: " + v.color : ""}`); setVariantModal(null); }}
                  style={{ padding: "14px", border: "2px solid var(--border-subtle)", borderRadius: 10, background: "var(--bg-secondary)", cursor: "pointer", textAlign: "left", transition: "all 0.15s", fontFamily: "inherit" }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-primary)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(249,115,22,0.12)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-secondary)"; }}
                >
                  {v.size && <div style={{ fontSize: 15, fontWeight: 700 }}>Size {v.size}</div>}
                  {v.color && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{v.color}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontFamily: "monospace" }}>{v.sku}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sale Complete Modal */}
      {completedSale && (
        <div className="modal-overlay">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal" style={{ background: "var(--surface-dark)", color: "var(--text-primary)", textAlign: "center", maxWidth: 420 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              style={{ width: 64, height: 64, background: "linear-gradient(135deg, var(--positive), var(--positive))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Check size={32} color="#fff" />
            </motion.div>
            <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>Sale Completed!</h3>
            <div style={{ color: "var(--text-secondary)", marginBottom: 12, fontSize: 14 }}>{completedSale.invoiceNumber}</div>
            
            {completedSale.customerSnapshot?.name && completedSale.customerSnapshot.name !== "Walk-in Customer" && (
              <div style={{ fontSize: 13, color: "var(--accent-primary)", marginBottom: 16, fontWeight: 600 }}>
                Customer: {completedSale.customerSnapshot.name}
              </div>
            )}

            <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: 16, marginBottom: 20, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                <span>Total Paid</span><span style={{ color: "var(--accent-primary)" }}>PKR {completedSale.total?.toLocaleString()}</span>
              </div>
              {completedSale.changeGiven > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--positive)", marginTop: 8, fontWeight: 700 }}>
                  <span>Change Given</span><span>PKR {completedSale.changeGiven?.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={async () => {
                const receiptData: ReceiptData = {
                  businessName: "CityRock POS",
                  storeName: storeName,
                  invoiceNumber: completedSale.invoiceNumber,
                  date: new Date(completedSale.createdAt || Date.now()).toLocaleString(),
                  cashier: user?.name || "Cashier",
                  customer: completedSale.customerSnapshot?.name ? {
                    name: completedSale.customerSnapshot.name,
                    phone: completedSale.customerSnapshot.phone
                  } : undefined,
                  items: completedSale.items.map(i => ({
                    productName: i.productName,
                    variantLabel: i.variantLabel,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    lineTotal: i.lineTotal
                  })),
                  subtotal: completedSale.items.reduce((s, i) => s + i.lineTotal, 0),
                  discount: completedSale.cartDiscount || 0,
                  tax: 0,
                  total: completedSale.total,
                  amountPaid: completedSale.amountPaid || completedSale.total,
                  changeGiven: completedSale.changeGiven || 0,
                  paymentMethod: completedSale.paymentMethod || "cash"
                };
                const printer = getConfiguredPrinter();
                const success = await printer.print(receiptData);
                if (!success) toast.error("Printing failed or printer offline.");
              }} className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", color: "var(--accent-primary)", borderColor: "var(--accent-primary)" }}>
                <Printer size={16} /> Print Receipt
              </button>
              <button onClick={() => { window.open(`${API_BASE}/sales/${completedSale._id}/invoice/pdf`, "_blank"); }} className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }}>
                <Receipt size={16} /> PDF Invoice
              </button>
              <button onClick={() => setCompletedSale(null)} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                New Sale
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
