"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Truck, Plus, X, Eye, Edit3, Trash2, 
  Phone, Mail, MapPin, Building, FileText, 
  DollarSign, AlertCircle, Calendar, Package 
} from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { supplierApi } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const supplierFormSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters"),
  contactPerson: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  taxNumber: z.string(),
  notes: z.string(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

const editSupplierFormSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters"),
  contactPerson: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  taxNumber: z.string(),
  notes: z.string(),
  outstandingBalance: z.number().min(0, "Balance cannot be negative"),
});

type EditSupplierFormData = z.infer<typeof editSupplierFormSchema>;

interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
  outstandingBalance: number;
  createdAt?: string;
}

interface PurchaseOrderSummary {
  _id: string;
  orderNumber?: string;
  poNumber?: string;
  createdAt: string;
  status: string;
  total: number;
  items?: Array<{ name: string; quantity: number; cost: number }>;
}

export default function SuppliersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewOrders, setViewOrders] = useState<PurchaseOrderSummary[]>([]);

  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form for Add Supplier
  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: isAdding },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: "", contactPerson: "", phone: "", email: "", address: "", taxNumber: "", notes: "" },
  });

  // React Hook Form for Edit Supplier
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm<EditSupplierFormData>({
    resolver: zodResolver(editSupplierFormSchema),
    defaultValues: { name: "", contactPerson: "", phone: "", email: "", address: "", taxNumber: "", outstandingBalance: 0, notes: "" },
  });

  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchSuppliers = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const res = await supplierApi.list({ search, page, limit });
      if (requestId !== latestRequestIdRef.current) return;
      setSuppliers(res.data?.data || []);
      const meta = res.data?.meta || {};
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || 0) / limit) || 1);
    } catch {
      if (requestId === latestRequestIdRef.current) {
        toast.error("Failed to load suppliers");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, page, limit]);

  useEffect(() => { 
    fetchSuppliers(); 
  }, [fetchSuppliers]);

  // Open View Modal
  const handleOpenView = async (sup: Supplier) => {
    setViewSupplier(sup);
    setViewLoading(true);
    setViewOrders([]);
    try {
      const res = await supplierApi.get(sup._id);
      if (res.data?.data) {
        const full = res.data.data.supplier || res.data.data;
        setViewSupplier({ ...sup, ...full });
        setViewOrders(res.data.data.purchaseOrders || res.data.data.orders || []);
      }
    } catch {
      // Keep existing supplier item if extra details fail
    } finally {
      setViewLoading(false);
    }
  };

  // Open Edit Modal with React Hook Form population
  const handleOpenEdit = (sup: Supplier) => {
    setEditSupplier(sup);
    resetEdit({
      name: sup.name || "",
      contactPerson: sup.contactPerson || "",
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
      taxNumber: sup.taxNumber || "",
      outstandingBalance: sup.outstandingBalance || 0,
      notes: sup.notes || "",
    });
  };

  // Handle Add Supplier via React Hook Form
  const onAddSupplier = async (data: SupplierFormData) => {
    try {
      await supplierApi.create({
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || "",
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        address: data.address?.trim() || "",
        taxNumber: data.taxNumber?.trim() || "",
        notes: data.notes?.trim() || "",
      });
      toast.success("Supplier registered successfully!");
      setShowAddModal(false);
      resetAdd();
      setPage(1);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add supplier");
    }
  };

  // Handle Edit Submit via React Hook Form
  const onEditSupplier = async (data: EditSupplierFormData) => {
    if (!editSupplier) return;
    try {
      await supplierApi.update(editSupplier._id, {
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || "",
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        address: data.address?.trim() || "",
        taxNumber: data.taxNumber?.trim() || "",
        outstandingBalance: Number(data.outstandingBalance) || 0,
        notes: data.notes?.trim() || "",
      });
      toast.success("Supplier updated successfully!");
      setEditSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update supplier");
    }
  };

  // Handle Delete Supplier
  const handleDeleteSubmit = async () => {
    if (isDeleting || !deleteSupplier) return;
    setIsDeleting(true);
    try {
      await supplierApi.delete(deleteSupplier._id);
      toast.success(`Supplier "${deleteSupplier.name}" deleted successfully.`);
      setDeleteSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete supplier");
    } finally {
      setIsDeleting(false);
    }
  };

  const isPageLoading = !user || isLoading;

  return (
    <>
      <main className="main-content">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="page-title">Suppliers & Vendors</h1>
              <p className="page-subtitle">Manage wholesale suppliers, contact information, and outstanding balances ({total.toLocaleString()} total)</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> Add Supplier
            </button>
          </div>

          {isPageLoading ? (
            <TableSkeleton rows={limit} columns={6} />
          ) : (
            <>
              <div className="card mb-4" style={{ padding: "14px 18px" }}>
                <div style={{ position: "relative" }}>
                  <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    className="input" 
                    placeholder="Search by supplier name, contact person, phone, or email..." 
                    value={search} 
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
                    style={{ paddingLeft: 38 }} 
                  />
                </div>
              </div>

              <div className="card card-table">
                <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier / Company Name</th>
                        <th>Contact Person</th>
                        <th>Phone Number</th>
                        <th>Email Address</th>
                        <th>Outstanding Balance</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
                          <Truck size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                          No suppliers found matching your search.
                        </td></tr>
                      ) : suppliers.map((supplier) => (
                        <tr key={supplier._id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{supplier.name}</div>
                            {supplier.taxNumber && (
                              <div style={{ fontSize: 11, color: "#64748b" }}>NTN: {supplier.taxNumber}</div>
                            )}
                          </td>
                          <td>{supplier.contactPerson || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 13 }}>{supplier.phone || "—"}</td>
                          <td>{supplier.email || "—"}</td>
                          <td style={{ fontWeight: 700, color: (supplier.outstandingBalance || 0) > 0 ? "#ef4444" : "#10b981" }}>
                            PKR {Number(supplier.outstandingBalance || 0).toLocaleString()}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="View Supplier Dossier"
                                onClick={() => handleOpenView(supplier)}
                                style={{ padding: "6px 8px", color: "#38bdf8" }}
                              >
                                <Eye size={15} />
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="Edit Supplier"
                                onClick={() => handleOpenEdit(supplier)}
                                style={{ padding: "6px 8px", color: "var(--accent-primary)" }}
                              >
                                <Edit3 size={15} />
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="Delete Supplier"
                                onClick={() => setDeleteSupplier(supplier)}
                                style={{ padding: "6px 8px", color: "#ef4444" }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Universal Pagination Component */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  limit={limit}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                  itemLabel="suppliers"
                />
              </div>
            </>
          )}
        </motion.div>
      </main>

      {/* View Supplier Modal */}
      <AnimatePresence>
        {viewSupplier && (
          <div className="modal-overlay" onClick={() => setViewSupplier(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal" 
              onClick={(e) => e.stopPropagation()} 
              style={{ maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #0284c7, #0369a1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ margin: 0 }}>{viewSupplier.name}</h3>
                    <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <Calendar size={13} /> Registered {viewSupplier.createdAt ? new Date(viewSupplier.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "N/A"}
                    </div>
                  </div>
                </div>
                <button className="btn btn-icon btn-ghost" onClick={() => setViewSupplier(null)}><X size={18} /></button>
              </div>

              {/* Outstanding Balance Banner */}
              <div style={{ 
                background: (viewSupplier.outstandingBalance || 0) > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", 
                border: `1px solid ${(viewSupplier.outstandingBalance || 0) > 0 ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`, 
                borderRadius: 12, 
                padding: "16px 20px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                marginBottom: 20 
              }}>
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Outstanding Balance Payable</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: (viewSupplier.outstandingBalance || 0) > 0 ? "#ef4444" : "#10b981", marginTop: 4 }}>
                    PKR {Number(viewSupplier.outstandingBalance || 0).toLocaleString()}
                  </div>
                </div>
                <span className={`badge ${(viewSupplier.outstandingBalance || 0) > 0 ? "badge-danger" : "badge-active"}`} style={{ fontSize: 12, padding: "6px 12px" }}>
                  {(viewSupplier.outstandingBalance || 0) > 0 ? "Payment Due" : "Clear / Settled"}
                </span>
              </div>

              {/* Contact & Legal Info */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 12 }}>Vendor Contact & Tax Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <Building size={13} /> Contact Person:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewSupplier.contactPerson || "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <Phone size={13} /> Phone:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500, fontFamily: "monospace" }}>{viewSupplier.phone || "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <Mail size={13} /> Email:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewSupplier.email || "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <FileText size={13} /> Tax / NTN / STRN:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500, fontFamily: "monospace" }}>{viewSupplier.taxNumber || "Not registered"}</span>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={13} /> Warehouse / Office Address:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewSupplier.address || "Not specified"}</span>
                  </div>
                </div>
                {viewSupplier.notes && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Vendor Notes:</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>{viewSupplier.notes}</p>
                  </div>
                )}
              </div>

              {/* Purchase Orders History */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Recent Purchase Orders (Procurement)</span>
                  {viewLoading && <span style={{ fontSize: 11, color: "var(--accent-primary)" }}>Loading procurement orders...</span>}
                </div>

                {viewOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 16px", background: "rgba(255,255,255,0.01)", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.08)", color: "#64748b", fontSize: 13 }}>
                    No purchase orders recorded for this supplier yet.
                  </div>
                ) : (
                  <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", fontSize: 12 }}>
                      <thead style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <tr>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>PO Number</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Date</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Status</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewOrders.map((po) => (
                          <tr key={po._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#38bdf8" }}>{po.poNumber || po.orderNumber || po._id.slice(-6)}</td>
                            <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span className="badge badge-warning" style={{ fontSize: 11, textTransform: "capitalize" }}>
                                {po.status || "Received"}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#f8fafc" }}>
                              PKR {(po.total || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setViewSupplier(null)}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Supplier Modal */}
      <AnimatePresence>
        {editSupplier && (
          <div className="modal-overlay" onClick={() => setEditSupplier(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal" 
              onClick={(e) => e.stopPropagation()} 
              style={{ maxWidth: 500, width: "100%" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 className="modal-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Edit3 size={18} color="var(--accent-primary)" /> Edit Supplier Details
                </h3>
                <button className="btn btn-icon btn-ghost" onClick={() => setEditSupplier(null)}><X size={18} /></button>
              </div>

              <form onSubmit={handleEditSubmit(onEditSupplier)}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label">Company / Supplier Name *</label>
                  <input 
                    className="input" 
                    placeholder="e.g. Al-Madina Wholesalers"
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
                    <label className="label">Contact Person</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Tariq Mehmood"
                      {...registerEdit("contactPerson")} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Phone Number</label>
                    <input 
                      className="input" 
                      placeholder="03001234567"
                      {...registerEdit("phone")} 
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Email Address</label>
                    <input 
                      type="email"
                      className="input" 
                      placeholder="supplier@example.com"
                      {...registerEdit("email")} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Tax NTN / STRN</label>
                    <input 
                      className="input" 
                      placeholder="e.g. 1234567-8" 
                      {...registerEdit("taxNumber")} 
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Outstanding Balance (PKR)</label>
                    <input 
                      type="number"
                      min={0}
                      className="input" 
                      {...registerEdit("outstandingBalance", { valueAsNumber: true })} 
                    />
                    {editErrors.outstandingBalance && (
                      <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                        {editErrors.outstandingBalance.message}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="label">Office / Warehouse Address</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Shah Alam Market, Lahore"
                      {...registerEdit("address")} 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="label">Internal Notes / Terms</label>
                  <input 
                    className="input" 
                    placeholder="e.g. Payment terms Net 30 days" 
                    {...registerEdit("notes")} 
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditSupplier(null)} disabled={isEditing}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isEditing}>
                    {isEditing ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteSupplier && (
          <div className="modal-overlay" onClick={() => setDeleteSupplier(null)}>
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
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: 17 }}>Delete Supplier / Vendor?</h3>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>This action cannot be undone.</div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 20 }}>
                Are you sure you want to delete <strong style={{ color: "#fff" }}>{deleteSupplier.name}</strong>? 
                {Number(deleteSupplier.outstandingBalance || 0) > 0 && (
                  <span style={{ display: "block", marginTop: 8, color: "#ef4444", fontWeight: 600 }}>
                    Notice: This vendor currently has an outstanding balance of PKR {Number(deleteSupplier.outstandingBalance).toLocaleString()}.
                  </span>
                )}
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setDeleteSupplier(null)} disabled={isDeleting}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteSubmit} 
                  disabled={isDeleting}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Supplier"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Register New Supplier</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSubmit(onAddSupplier)}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="label">Company / Supplier Name *</label>
                <input 
                  className="input" 
                  placeholder="e.g. Al-Madina Wholesalers" 
                  {...registerAdd("name")} 
                />
                {addErrors.name && (
                  <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                    {addErrors.name.message}
                  </span>
                )}
              </div>

              <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Contact Person</label>
                  <input 
                    className="input" 
                    placeholder="e.g. Tariq Mehmood" 
                    {...registerAdd("contactPerson")} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Phone Number</label>
                  <input 
                    className="input" 
                    placeholder="03001234567" 
                    {...registerAdd("phone")} 
                  />
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Email Address</label>
                  <input 
                    type="email"
                    className="input" 
                    placeholder="supplier@example.com" 
                    {...registerAdd("email")} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Tax NTN / STRN</label>
                  <input 
                    className="input" 
                    placeholder="e.g. 1234567-8" 
                    {...registerAdd("taxNumber")} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="label">Office / Warehouse Address</label>
                <input 
                  className="input" 
                  placeholder="e.g. Shah Alam Market, Lahore" 
                  {...registerAdd("address")} 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="label">Notes / Terms</label>
                <input 
                  className="input" 
                  placeholder="e.g. 15 days credit terms" 
                  {...registerAdd("notes")} 
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={isAdding}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isAdding}>
                  {isAdding ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
