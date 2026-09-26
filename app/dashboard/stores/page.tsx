"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, Plus, Shield, MapPin, Search, AlertTriangle, X, Info,
  UserCheck, Mail, Phone, Edit, CheckCircle2, Lock, ArrowRight, Building2,
  Eye, Trash2, Users, DollarSign, Package, ShoppingBag, Receipt, FileText
} from "lucide-react";
import { tenantApi } from "@/lib/api";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import PasswordInput from "@/components/ui/PasswordInput";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createStoreSchema = z.object({
  name: z.string().trim().min(2, "Branch name must be at least 2 characters"),
  storeType: z.string(),
  city: z.string().trim().min(2, "City is required"),
  address: z.string(),
  phone: z.string(),
  managerName: z.string(),
  managerEmail: z.string(),
  managerPassword: z.string(),
});

type CreateStoreFormData = z.infer<typeof createStoreSchema>;

const editStoreSchema = z.object({
  name: z.string().trim().min(2, "Branch name must be at least 2 characters"),
  city: z.string().trim().min(2, "City is required"),
  address: z.string(),
  phone: z.string(),
  managerName: z.string(),
  managerEmail: z.string(),
  receiptWidth: z.string(),
  taxRate: z.number().min(0),
  footerNote: z.string(),
});

type EditStoreFormData = z.infer<typeof editStoreSchema>;

interface StoreStaffItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  salary?: number;
  isActive: boolean;
}

interface StoreItem {
  _id: string;
  name: string;
  storeCode: string;
  storeType: string;
  city: string;
  address: string;
  phone?: string;
  receiptWidth?: string;
  taxRate?: number;
  footerNote?: string;
  isMainStore: boolean;
  parentStoreId?: { _id: string; name: string; storeCode: string; city: string } | null;
  managerId?: { _id: string; name: string; email: string; isEmailVerified: boolean } | null;
  managerName?: string;
  managerEmail?: string;
  isActive: boolean;
  createdAt: string;
  staffCount?: number;
  totalPayroll?: number;
  inventoryCount?: number;
  totalStockUnits?: number;
  totalSales?: number;
  staffMembers?: StoreStaffItem[];
}

export default function TenantStoresPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ role?: string; name?: string } | null>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [capacity, setCapacity] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const latestRequestIdRef = useRef(0);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalStore, setViewModalStore] = useState<StoreItem | null>(null);
  const [deleteModalStore, setDeleteModalStore] = useState<StoreItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalStore, setEditModalStore] = useState<StoreItem | null>(null);

  // React Hook Form for Create Branch
  const {
    register: registerCreate,
    handleSubmit: handleCreateFormSubmit,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: "",
      storeType: "general_retail",
      city: "",
      address: "",
      phone: "",
      managerName: "",
      managerEmail: "",
      managerPassword: "",
    },
  });

  // React Hook Form for Edit Branch
  const {
    register: registerEdit,
    handleSubmit: handleEditFormSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm<EditStoreFormData>({
    resolver: zodResolver(editStoreSchema),
    defaultValues: {
      name: "",
      city: "",
      address: "",
      phone: "",
      managerName: "",
      managerEmail: "",
      receiptWidth: "80mm",
      taxRate: 0,
      footerNote: "Thank you for shopping with us!",
    },
  });

  // Guard: Only owner can access branch management
  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    const user = JSON.parse(stored);
    setCurrentUser(user);

    if (user.role?.toLowerCase() !== "owner") {
      toast.error("Access Restricted: Only the Store Owner can manage branches.");
      router.replace("/dashboard");
    }
  }, [router]);

  const loadData = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const [storesRes, subRes] = await Promise.all([
        tenantApi.listStores({ search: searchQuery, page, limit }),
        tenantApi.getSubscription(),
      ]);
      if (requestId !== latestRequestIdRef.current) return;
      const fetchedStores = storesRes.data?.data || [];
      setStores(fetchedStores);
      const meta = storesRes.data?.meta || {};
      setTotal(meta.total || fetchedStores.length || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || fetchedStores.length || 0) / limit) || 1);
      setCapacity(subRes.data?.data?.capacity || null);
    } catch (err: unknown) {
      if (requestId === latestRequestIdRef.current) {
        console.error("Failed to load stores:", err);
        toast.error("Failed to load store branches");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [searchQuery, page, limit]);

  useEffect(() => {
    if (currentUser?.role?.toLowerCase() === "owner") {
      loadData();
    }
  }, [currentUser, loadData]);

  const mainStore = stores.find(s => s.isMainStore) || (stores.length > 0 ? stores[0] : null);
  const branchesCount = stores.filter(s => !s.isMainStore).length;

  const onCreateStore = async (data: CreateStoreFormData) => {
    if (data.managerEmail && data.managerPassword && data.managerPassword.length < 8) {
      toast.error("Manager password must be at least 8 characters.");
      return;
    }

    try {
      await tenantApi.createStore({
        name: data.name.trim(),
        storeType: data.storeType || (mainStore ? mainStore.storeType : "general_retail"),
        city: data.city.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        managerName: data.managerName.trim(),
        managerEmail: data.managerEmail.toLowerCase().trim(),
        managerPassword: data.managerPassword,
      });

      toast.success("Branch created and linked to Main Store successfully!");
      setIsModalOpen(false);
      resetCreate();
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create store branch");
    }
  };

  const openEditModal = (store: StoreItem) => {
    setEditModalStore(store);
    resetEdit({
      name: store.name || "",
      city: store.city || "",
      address: store.address || "",
      phone: store.phone || "",
      managerName: store.managerName || store.managerId?.name || "",
      managerEmail: store.managerEmail || store.managerId?.email || "",
      receiptWidth: store.receiptWidth || "80mm",
      taxRate: store.taxRate || 0,
      footerNote: store.footerNote || "Thank you for shopping with us!",
    });
  };

  const onEditStore = async (data: EditStoreFormData) => {
    if (!editModalStore) return;

    try {
      await tenantApi.updateStore(editModalStore._id, {
        name: data.name.trim(),
        city: data.city.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        managerName: data.managerName.trim(),
        managerEmail: data.managerEmail.toLowerCase().trim(),
        receiptWidth: data.receiptWidth,
        taxRate: Number(data.taxRate) || 0,
        footerNote: data.footerNote.trim(),
      });

      toast.success("Branch details updated successfully!");
      setEditModalStore(null);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update branch details");
    }
  };

  const handleDeleteSubmit = async () => {
    if (isDeleting || !deleteModalStore) return;
    if (deleteModalStore.isMainStore || deleteModalStore._id === mainStore?._id) {
      toast.error("Cannot delete the Primary Flagship Store.");
      return;
    }

    setIsDeleting(true);
    try {
      await tenantApi.deleteStore(deleteModalStore._id);
      toast.success(`Branch "${deleteModalStore.name}" deleted successfully.`);
      setDeleteModalStore(null);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to delete branch");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Store size={28} color="var(--accent-primary)" /> Store Branches
            </h1>
            <p className="page-subtitle">Manage your main store and additional branch locations ({total} total)</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={16} /> Add New Branch
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Total Stores</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 4 }}>
                  {stores.length} <span style={{ fontSize: 16, color: "#64748b", fontWeight: 500 }}>/ {((capacity as any)?.maxStores || 5)}</span>
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Store size={22} color="var(--accent-primary)" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Main Store (Parent)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-primary)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 190 }}>
                  {mainStore ? mainStore.name : "Primary Store"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {mainStore?.city} ({mainStore?.storeCode})
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={22} color="var(--accent-primary)" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Active Branches</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981", marginTop: 4 }}>{branchesCount}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Operationally isolated branches</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={22} color="#10b981" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card mb-4" style={{ padding: "14px 18px" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search by branch name, city, store code, or manager..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ paddingLeft: 38 }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="card card-table">
          <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            {isLoading ? (
              <TableSkeleton rows={limit} columns={7} />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Store / Branch Name</th>
                    <th>Store Code</th>
                    <th>Location</th>
                    <th>Hierarchy</th>
                    <th>Branch Manager</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
                        <Store size={36} style={{ margin: "0 auto 12px", opacity: 0.4, display: "block" }} />
                        No store branches found matching your search.
                      </td>
                    </tr>
                  ) : (
                    stores.map((s) => {
                      const isMain = s.isMainStore || s._id === mainStore?._id;
                      const managerDisplayName = s.managerName || s.managerId?.name || (isMain ? "Business Owner" : "Not Assigned");
                      const managerEmail = s.managerEmail || s.managerId?.email || "";
                      const isManagerVerified = s.managerId?.isEmailVerified;

                      return (
                        <tr key={s._id}>
                          <td>
                            <div style={{ fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                              {s.name}
                              {isMain && (
                                <span className="badge" style={{ background: "rgba(249,115,22,0.15)", color: "var(--accent-primary)", border: "1px solid rgba(249,115,22,0.3)", padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                                  MAIN STORE
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, textTransform: "capitalize" }}>
                              {s.storeType ? s.storeType.replace("_", " ") : "Retail Store"}
                            </div>
                          </td>
                          <td style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 13 }}>{s.storeCode}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#cbd5e1", fontSize: 13 }}>
                              <MapPin size={14} color="var(--accent-primary)" /> {s.city || "—"}
                            </div>
                            {s.address && (
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.address}</div>
                            )}
                          </td>
                          <td>
                            {isMain ? (
                              <span className="badge" style={{ background: "rgba(249,115,22,0.12)", color: "var(--accent-primary)", border: "1px solid rgba(249,115,22,0.25)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <Shield size={12} /> Root Business Group
                              </span>
                            ) : (
                              <div>
                                <span className="badge" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                                  <Store size={12} /> Branch Location
                                </span>
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                                  Parent: {s.parentStoreId?.name || mainStore?.name || "Main Store"}
                                </div>
                              </div>
                            )}
                          </td>
                          <td>
                            {isMain ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #ea580c, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "O"}
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{currentUser?.name || "Business Owner"}</div>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>Overall Administrator</div>
                                </div>
                              </div>
                            ) : managerEmail ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #334155, #475569)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                                  {managerDisplayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{managerDisplayName}</div>
                                  <div style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                                    {managerEmail}
                                    {isManagerVerified && <CheckCircle2 size={11} color="#10b981" />}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                                No manager assigned
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${s.isActive ? "badge-active" : "badge-suspended"}`}>
                              {s.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <button 
                                className="btn btn-sm btn-ghost"
                                title="View Branch Dossier"
                                onClick={() => setViewModalStore(s)}
                                style={{ padding: "6px 8px", color: "#38bdf8" }}
                              >
                                <Eye size={15} />
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost"
                                title="Edit Branch"
                                onClick={() => openEditModal(s)}
                                style={{ padding: "6px 8px", color: "var(--accent-primary)" }}
                              >
                                <Edit size={15} />
                              </button>
                              {!isMain && (
                                <button 
                                  className="btn btn-sm btn-ghost"
                                  title="Delete Branch"
                                  onClick={() => setDeleteModalStore(s)}
                                  style={{ padding: "6px 8px", color: "#ef4444" }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Universal Pagination Component */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemLabel="store branches"
          />
        </div>

        {/* View Branch Dossier Modal */}
        <AnimatePresence>
          {viewModalStore && (
            <div className="modal-overlay" onClick={() => setViewModalStore(null)}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal" 
                onClick={(e) => e.stopPropagation()} 
                style={{ maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: viewModalStore.isMainStore ? "linear-gradient(135deg, #f97316, #ea580c)" : "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
                      <Store size={24} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h3 className="modal-title" style={{ margin: 0 }}>{viewModalStore.name}</h3>
                        {viewModalStore.isMainStore && (
                          <span className="badge" style={{ background: "rgba(249,115,22,0.15)", color: "var(--accent-primary)", fontSize: 10, fontWeight: 700 }}>
                            MAIN HEADQUARTERS
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>{viewModalStore.storeCode}</span>
                        <span>•</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={12} color="var(--accent-primary)" /> {viewModalStore.city || "Pakistan"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-icon btn-ghost" onClick={() => setViewModalStore(null)}><X size={18} /></button>
                </div>

                {/* Branch KPI Metric Tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={12} color="var(--accent-primary)" /> Staff Count
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>
                      {viewModalStore.staffCount || viewModalStore.staffMembers?.length || 0}
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <DollarSign size={12} color="#38bdf8" /> Monthly Payroll
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>
                      PKR {(viewModalStore.totalPayroll || 0).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <Package size={12} color="#eab308" /> Stock Inventory
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
                      {viewModalStore.inventoryCount || 0} SKUs
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      ({(viewModalStore.totalStockUnits || 0).toLocaleString()} units)
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <ShoppingBag size={12} color="#10b981" /> Total Sales
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
                      PKR {(viewModalStore.totalSales || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Location & Contact Info */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 12 }}>Location & Hardware Configuration</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <MapPin size={13} /> Physical Address:
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewModalStore.address || "No street address specified"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <Phone size={13} /> Contact Phone:
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500, fontFamily: "monospace" }}>{viewModalStore.phone || "Not set"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <Receipt size={13} /> Thermal Receipt Width:
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewModalStore.receiptWidth || "80mm"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <FileText size={13} /> Default Sales Tax:
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewModalStore.taxRate || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Staff Roster stationed at this branch */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Employees Stationed at this Branch</span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      {viewModalStore.staffMembers?.length || 0} active members
                    </span>
                  </div>

                  {!viewModalStore.staffMembers || viewModalStore.staffMembers.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 16px", background: "rgba(255,255,255,0.01)", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.08)", color: "#64748b", fontSize: 13 }}>
                      No staff members currently assigned to this branch location. You can assign cashiers and managers from the Store Staff & Cashiers page.
                    </div>
                  ) : (
                    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                      <table style={{ width: "100%", fontSize: 12 }}>
                        <thead style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <tr>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Employee</th>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Role</th>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Contact</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Monthly Salary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewModalStore.staffMembers.map((staff) => (
                            <tr key={staff._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                              <td style={{ padding: "8px 12px" }}>
                                <div style={{ fontWeight: 600, color: "#f8fafc" }}>{staff.name}</div>
                                <div style={{ fontSize: 11, color: "#64748b" }}>{staff.email}</div>
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                <span className="badge badge-warning" style={{ fontSize: 11, textTransform: "capitalize" }}>
                                  {staff.role}
                                </span>
                              </td>
                              <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#cbd5e1" }}>
                                {staff.phone || "—"}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#38bdf8" }}>
                                {staff.salary ? `PKR ${staff.salary.toLocaleString()}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setViewModalStore(null)}>Close</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteModalStore && (
            <div className="modal-overlay" onClick={() => setDeleteModalStore(null)}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal" 
                onClick={(e) => e.stopPropagation()} 
                style={{ maxWidth: 440, width: "100%" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ margin: 0, fontSize: 17 }}>Delete Store Branch?</h3>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Operationally isolates this location</div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 20 }}>
                  Are you sure you want to delete <strong style={{ color: "#fff" }}>{deleteModalStore.name}</strong> ({deleteModalStore.city})? Any staff members currently assigned to this branch will need to be reassigned.
                </p>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setDeleteModalStore(null)} disabled={isDeleting}>Cancel</button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDeleteSubmit} 
                    disabled={isDeleting}
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete Branch"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── MODAL: CREATE NEW BRANCH ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isModalOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="card"
                style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Store size={20} color="#fff" />
                    </div>
                    <div>
                      <h3 className="modal-title" style={{ margin: 0 }}>Add New Branch</h3>
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Create an operationally isolated branch under your Main Store</p>
                    </div>
                  </div>
                  <button className="btn btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Hierarchy Info Box */}
                <div style={{ padding: 14, background: "rgba(56,189,248,0.06)", borderRadius: 10, border: "1px solid rgba(56,189,248,0.18)", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Building2 size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12, color: "#bae6fd", lineHeight: 1.5 }}>
                    <strong>Parent Store:</strong> {mainStore ? mainStore.name : "Main Store"} ({mainStore?.city || "Headquarters"}).
                    <br />
                    This branch will operate independently with its own stock and cashier sales, while remaining connected to your business group.
                  </div>
                </div>

                <form onSubmit={handleCreateFormSubmit(onCreateStore)}>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="label">Branch Name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Footandstep - Lahore Branch" 
                      {...registerCreate("name")}
                    />
                    {createErrors.name && (
                      <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                        {createErrors.name.message}
                      </span>
                    )}
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="label">City <span style={{ color: "#ef4444" }}>*</span></label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="e.g. Lahore" 
                        {...registerCreate("city")}
                      />
                      {createErrors.city && (
                        <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                          {createErrors.city.message}
                        </span>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label className="label">Phone / Contact</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="03001234567" 
                        {...registerCreate("phone")}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="label">Branch Street Address</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. 14-B Mall Road, Near City Center" 
                      {...registerCreate("address")}
                    />
                  </div>

                  {/* Branch Manager Assignment Section */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18, marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <UserCheck size={16} color="#818cf8" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>Assign Branch Manager (Optional)</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 14px" }}>
                      The assigned manager will receive login credentials to access this branch dashboard.
                    </p>

                    <div className="grid-2" style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="form-group">
                        <label className="label">Manager Full Name</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="e.g. Bilal Ahmed" 
                          {...registerCreate("managerName")}
                        />
                      </div>

                      <div className="form-group">
                        <label className="label">Manager Email Address</label>
                        <input 
                          type="email" 
                          className="input" 
                          placeholder="manager.lahore@example.com" 
                          {...registerCreate("managerEmail")}
                        />
                      </div>
                    </div>

                    {watchCreate("managerEmail") && (
                      <div className="form-group">
                        <label className="label">Initial Password (Min 8 characters)</label>
                        <PasswordInput 
                          placeholder="Set password for branch manager" 
                          value={watchCreate("managerPassword") || ""}
                          onChange={(e) => setCreateValue("managerPassword", e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isCreating}>
                      {isCreating ? "Creating Branch..." : "Create Branch"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── MODAL: EDIT BRANCH ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {editModalStore && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="card"
                style={{ width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #0284c7, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Edit size={18} color="#fff" />
                    </div>
                    <div>
                      <h3 className="modal-title" style={{ margin: 0 }}>Edit Branch Details</h3>
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{editModalStore.name} ({editModalStore.storeCode})</p>
                    </div>
                  </div>
                  <button className="btn btn-icon btn-ghost" onClick={() => setEditModalStore(null)}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleEditFormSubmit(onEditStore)}>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="label">Branch Name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Footandstep - Lahore Branch"
                      {...registerEdit("name")}
                    />
                    {editErrors.name && (
                      <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                        {editErrors.name.message}
                      </span>
                    )}
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="label">City <span style={{ color: "#ef4444" }}>*</span></label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="e.g. Lahore"
                        {...registerEdit("city")}
                      />
                      {editErrors.city && (
                        <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                          {editErrors.city.message}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Phone / Contact</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="03001234567"
                        {...registerEdit("phone")}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 18 }}>
                    <label className="label">Street Address</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. 14-B Mall Road, Near City Center"
                      {...registerEdit("address")}
                    />
                  </div>

                  {/* Manager Section */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <UserCheck size={16} color="#38bdf8" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>Branch Manager Assignment</span>
                    </div>
                    
                    <div className="grid-2" style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="form-group">
                        <label className="label">Manager Name</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="Manager Name"
                          {...registerEdit("managerName")}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Manager Email</label>
                        <input 
                          type="email" 
                          className="input" 
                          placeholder="manager@example.com"
                          {...registerEdit("managerEmail")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Receipt & POS Settings */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Receipt size={16} color="#10b981" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>Receipt & Sales Tax</span>
                    </div>
                    
                    <div className="grid-2" style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="form-group">
                        <label className="label">Printer Width</label>
                        <select 
                          className="input"
                          {...registerEdit("receiptWidth")}
                        >
                          <option value="80mm">80mm (Standard POS)</option>
                          <option value="58mm">58mm (Compact POS)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="label">Sales Tax %</label>
                        <input 
                          type="number" 
                          className="input" 
                          {...registerEdit("taxRate", { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="label">Receipt Footer Note</label>
                      <input 
                        type="text" 
                        className="input" 
                        {...registerEdit("footerNote")}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditModalStore(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isEditing}>
                      {isEditing ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
