"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, UserCircle, Plus, X, Eye, Edit3, Trash2, 
  Phone, Mail, MapPin, CreditCard, Award, Calendar, 
  ShoppingBag, AlertCircle, CheckCircle2 
} from "lucide-react";
import { customerApi } from "@/lib/api";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const customerFormSchema = z.object({
  name: z.string().trim().min(2, "Customer name must be at least 2 characters"),
  phone: z.string(),
  email: z.string(),
  cnic: z.string(),
  address: z.string(),
  notes: z.string(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const editCustomerFormSchema = z.object({
  name: z.string().trim().min(2, "Customer name must be at least 2 characters"),
  phone: z.string(),
  email: z.string(),
  cnic: z.string(),
  address: z.string(),
  notes: z.string(),
  loyaltyPoints: z.number().min(0, "Loyalty points cannot be negative"),
});

type EditCustomerFormData = z.infer<typeof editCustomerFormSchema>;

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  cnic?: string;
  notes?: string;
  loyaltyPoints: number;
  totalPurchases: number;
  totalTransactions: number;
  createdAt?: string;
}

interface SaleHistoryItem {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export default function CustomersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewSales, setViewSales] = useState<SaleHistoryItem[]>([]);

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form for Add Customer
  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: isAdding },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", phone: "", email: "", cnic: "", address: "", notes: "" },
  });

  // React Hook Form for Edit Customer
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm<EditCustomerFormData>({
    resolver: zodResolver(editCustomerFormSchema),
    defaultValues: { name: "", phone: "", email: "", cnic: "", address: "", loyaltyPoints: 0, notes: "" },
  });

  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchCustomers = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const res = await customerApi.list({ search, page, limit });
      if (requestId !== latestRequestIdRef.current) return;
      setCustomers(res.data?.data || []);
      const meta = res.data?.meta || {};
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || 0) / limit) || 1);
    } catch {
      if (requestId === latestRequestIdRef.current) {
        toast.error("Failed to load customers");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, page, limit]);

  useEffect(() => { 
    fetchCustomers(); 
  }, [fetchCustomers]);

  // Open Detailed View
  const handleOpenView = async (customer: Customer) => {
    setViewCustomer(customer);
    setViewLoading(true);
    setViewSales([]);
    try {
      const res = await customerApi.get(customer._id);
      if (res.data?.data) {
        const fullCustomer = res.data.data.customer || res.data.data;
        setViewCustomer({ ...customer, ...fullCustomer });
        setViewSales(res.data.data.sales || []);
      }
    } catch {
      // Keep existing customer details if specific detail endpoint fails
    } finally {
      setViewLoading(false);
    }
  };

  // Open Edit Modal with React Hook Form population
  const handleOpenEdit = (customer: Customer) => {
    setEditCustomer(customer);
    resetEdit({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      cnic: customer.cnic || "",
      address: customer.address || "",
      loyaltyPoints: customer.loyaltyPoints || 0,
      notes: customer.notes || "",
    });
  };

  // Submit Add Customer via React Hook Form
  const onAddCustomer = async (data: CustomerFormData) => {
    try {
      await customerApi.create({
        name: data.name.trim(),
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        cnic: data.cnic?.trim() || "",
        address: data.address?.trim() || "",
        notes: data.notes?.trim() || "",
      });
      toast.success("Customer profile created!");
      setShowAddModal(false);
      resetAdd();
      setPage(1);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create customer");
    }
  };

  // Submit Edit Customer via React Hook Form
  const onEditCustomer = async (data: EditCustomerFormData) => {
    if (!editCustomer) return;
    try {
      await customerApi.update(editCustomer._id, {
        name: data.name.trim(),
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        cnic: data.cnic?.trim() || "",
        address: data.address?.trim() || "",
        loyaltyPoints: Number(data.loyaltyPoints) || 0,
        notes: data.notes?.trim() || "",
      });
      toast.success("Customer details updated successfully!");
      setEditCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update customer");
    }
  };

  // Submit Delete Customer
  const handleDeleteSubmit = async () => {
    if (isDeleting || !deleteCustomer) return;
    setIsDeleting(true);
    try {
      await customerApi.delete(deleteCustomer._id);
      toast.success(`Customer "${deleteCustomer.name}" removed successfully.`);
      setDeleteCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete customer");
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
              <h1 className="page-title">Customer Directory</h1>
              <p className="page-subtitle">Manage customer profiles, loyalty points, and purchase history ({total.toLocaleString()} total customers)</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> Add Customer
            </button>
          </div>

          {isPageLoading ? (
            <TableSkeleton rows={limit} columns={7} />
          ) : (
            <>
              <div className="card mb-4" style={{ padding: "14px 18px" }}>
                <div style={{ position: "relative" }}>
                  <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    className="input" 
                    placeholder="Search by customer name, phone number, or email..." 
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
                        <th>Customer Name</th>
                        <th>Phone Number</th>
                        <th>Email Address</th>
                        <th>Loyalty Points</th>
                        <th>Lifetime Spend</th>
                        <th>Total Visits</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
                          <UserCircle size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                          No customers found matching your search.
                        </td></tr>
                      ) : customers.map((customer) => (
                        <tr key={customer._id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{customer.name}</div>
                            {customer.cnic && (
                              <div style={{ fontSize: 11, color: "#64748b" }}>CNIC: {customer.cnic}</div>
                            )}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: 13 }}>{customer.phone || "—"}</td>
                          <td>{customer.email || "—"}</td>
                          <td>
                            <span className="badge badge-warning" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
                              {customer.loyaltyPoints || 0} pts
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: "#10b981" }}>PKR {(customer.totalPurchases || 0).toLocaleString()}</td>
                          <td>{customer.totalTransactions || 0}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="View Customer Dossier"
                                onClick={() => handleOpenView(customer)}
                                style={{ padding: "6px 8px", color: "#38bdf8" }}
                              >
                                <Eye size={15} />
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="Edit Customer Details"
                                onClick={() => handleOpenEdit(customer)}
                                style={{ padding: "6px 8px", color: "var(--accent-primary)" }}
                              >
                                <Edit3 size={15} />
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="Delete Customer"
                                onClick={() => setDeleteCustomer(customer)}
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
                  itemLabel="customers"
                />
              </div>
            </>
          )}
        </motion.div>
      </main>

      {/* View Customer Modal */}
      <AnimatePresence>
        {viewCustomer && (
          <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
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
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
                    {viewCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ margin: 0 }}>{viewCustomer.name}</h3>
                    <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <Calendar size={13} /> Customer since {viewCustomer.createdAt ? new Date(viewCustomer.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "N/A"}
                    </div>
                  </div>
                </div>
                <button className="btn btn-icon btn-ghost" onClick={() => setViewCustomer(null)}><X size={18} /></button>
              </div>

              {/* Quick Stat Tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <ShoppingBag size={12} color="#f97316" /> Total Visits
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
                    {viewCustomer.totalTransactions || 0}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <CreditCard size={12} color="#10b981" /> Lifetime Spend
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 4 }}>
                    PKR {(viewCustomer.totalPurchases || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <Award size={12} color="#eab308" /> Loyalty Points
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 4 }}>
                    {viewCustomer.loyaltyPoints || 0} pts
                  </div>
                </div>
              </div>

              {/* Contact & Profile Details */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 12 }}>Contact & Identity Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <Phone size={13} /> Phone Number:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500, fontFamily: "monospace" }}>{viewCustomer.phone || "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <Mail size={13} /> Email Address:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewCustomer.email || "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <CreditCard size={13} /> Identity Card (CNIC):
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500, fontFamily: "monospace" }}>{viewCustomer.cnic || "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={13} /> Address:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewCustomer.address || "Not specified"}</span>
                  </div>
                </div>
                {viewCustomer.notes && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Notes / Preferences:</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>{viewCustomer.notes}</p>
                  </div>
                )}
              </div>

              {/* Purchase History */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Recent Purchases & Visits</span>
                  {viewLoading && <span style={{ fontSize: 11, color: "var(--accent-primary)" }}>Loading order history...</span>}
                </div>

                {viewSales.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 16px", background: "rgba(255,255,255,0.01)", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.08)", color: "#64748b", fontSize: 13 }}>
                    No recent transaction records found for this customer.
                  </div>
                ) : (
                  <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", fontSize: 12 }}>
                      <thead style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <tr>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Invoice #</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Date</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Payment</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewSales.map((sale) => (
                          <tr key={sale._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#38bdf8" }}>{sale.invoiceNumber}</td>
                            <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: "8px 12px", textTransform: "capitalize", color: "#cbd5e1" }}>{sale.paymentMethod || "Cash"}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#10b981" }}>PKR {sale.total?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setViewCustomer(null)}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editCustomer && (
          <div className="modal-overlay" onClick={() => setEditCustomer(null)}>
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
                  <Edit3 size={18} color="var(--accent-primary)" /> Edit Customer Profile
                </h3>
                <button className="btn btn-icon btn-ghost" onClick={() => setEditCustomer(null)}><X size={18} /></button>
              </div>

              <form onSubmit={handleEditSubmit(onEditCustomer)}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label">Customer Full Name *</label>
                  <input 
                    className="input" 
                    placeholder="e.g. Ali Ahmed"
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
                    <label className="label">Phone Number</label>
                    <input 
                      className="input" 
                      placeholder="03001234567" 
                      {...registerEdit("phone")} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Email Address</label>
                    <input 
                      type="email"
                      className="input" 
                      placeholder="name@example.com" 
                      {...registerEdit("email")} 
                    />
                    {editErrors.email && (
                      <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                        {editErrors.email.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Identity Card (CNIC)</label>
                    <input 
                      className="input" 
                      placeholder="e.g. 35201-1234567-1" 
                      {...registerEdit("cnic")} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Loyalty Points</label>
                    <input 
                      type="number"
                      min={0}
                      className="input" 
                      {...registerEdit("loyaltyPoints", { valueAsNumber: true })} 
                    />
                    {editErrors.loyaltyPoints && (
                      <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                        {editErrors.loyaltyPoints.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label">Address</label>
                  <input 
                    className="input" 
                    placeholder="House / Street, City" 
                    {...registerEdit("address")} 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="label">Customer Notes / Preferences</label>
                  <input 
                    className="input" 
                    placeholder="e.g. VIP client, preferred shoe size 42" 
                    {...registerEdit("notes")} 
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditCustomer(null)} disabled={isEditing}>Cancel</button>
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
        {deleteCustomer && (
          <div className="modal-overlay" onClick={() => setDeleteCustomer(null)}>
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
                  <h3 className="modal-title" style={{ margin: 0, fontSize: 17 }}>Delete Customer Profile?</h3>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>This action cannot be undone.</div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 20 }}>
                Are you sure you want to remove <strong style={{ color: "#fff" }}>{deleteCustomer.name}</strong> from your customer directory? All contact information and loyalty balance ({deleteCustomer.loyaltyPoints} points) will be deleted.
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setDeleteCustomer(null)} disabled={isDeleting}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteSubmit} 
                  disabled={isDeleting}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Customer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Add New Customer</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSubmit(onAddCustomer)}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="label">Customer Full Name *</label>
                <input 
                  className="input" 
                  placeholder="e.g. Ali Ahmed" 
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
                  <label className="label">Phone Number</label>
                  <input 
                    className="input" 
                    placeholder="03001234567" 
                    {...registerAdd("phone")} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Email Address</label>
                  <input 
                    type="email"
                    className="input" 
                    placeholder="customer@example.com" 
                    {...registerAdd("email")} 
                  />
                  {addErrors.email && (
                    <span style={{ fontSize: 11, color: "#ef4444", marginTop: 4, display: "block" }}>
                      {addErrors.email.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Identity Card (CNIC)</label>
                  <input 
                    className="input" 
                    placeholder="35201-1234567-1" 
                    {...registerAdd("cnic")} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Address</label>
                  <input 
                    className="input" 
                    placeholder="City, Area" 
                    {...registerAdd("address")} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="label">Notes / Preferences</label>
                <input 
                  className="input" 
                  placeholder="e.g. Frequent weekend shopper" 
                  {...registerAdd("notes")} 
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={isAdding}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isAdding}>
                  {isAdding ? "Creating..." : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
