"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, UserPlus, Shield, Store, CheckCircle, XCircle, 
  Search, Key, Mail, Lock, UserCheck, AlertTriangle, X,
  Eye, Edit3, Trash2, Phone, CreditCard, DollarSign, Calendar,
  Briefcase, FileText, ShoppingBag, BadgePercent
} from "lucide-react";
import { tenantApi } from "@/lib/api";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import PasswordInput from "@/components/ui/PasswordInput";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inviteStaffSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string(),
  role: z.enum(["manager", "cashier", "inventory", "accountant"]),
  storeId: z.string(),
  salary: z.number().min(0, "Salary must be >= 0"),
  cnic: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type InviteStaffFormData = z.infer<typeof inviteStaffSchema>;

const editStaffSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string(),
  role: z.enum(["manager", "cashier", "inventory", "accountant"]),
  storeId: z.string(),
  salary: z.number().min(0, "Salary must be >= 0"),
  cnic: z.string(),
  isActive: z.boolean(),
  notes: z.string(),
});
type EditStaffFormData = z.infer<typeof editStaffSchema>;

interface StoreItem {
  _id: string;
  name: string;
  code: string;
}

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: "manager" | "cashier" | "inventory" | "accountant";
  storeId?: { _id: string; name: string } | string | null;
  phone?: string;
  salary?: number;
  cnic?: string;
  hireDate?: string;
  notes?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  salesCount?: number;
  totalSalesAmount?: number;
}

export default function TenantStaffPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ role?: string; name?: string } | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const latestRequestIdRef = useRef(0);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // RHF for Invite Staff
  const {
    register: registerInvite,
    handleSubmit: handleSubmitInvite,
    reset: resetInvite,
    setValue: setInviteValue,
    watch: watchInvite,
    formState: { isSubmitting: isInviting, errors: inviteErrors },
  } = useForm<InviteStaffFormData>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "cashier",
      storeId: "",
      salary: 0,
      cnic: "",
      password: "",
    },
  });

  // RHF for Edit Staff
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    watch: watchEdit,
    formState: { isSubmitting: isEditing, errors: editErrors },
  } = useForm<EditStaffFormData>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "cashier",
      storeId: "",
      salary: 0,
      cnic: "",
      isActive: true,
      notes: "",
    },
  });

  // Guard: Only owner can access staff management
  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    const user = JSON.parse(stored);
    setCurrentUser(user);

    if (user.role?.toLowerCase() !== "owner") {
      toast.error("Access Restricted: Only the Store Owner can manage staff.");
      router.replace("/dashboard");
    }
  }, [router]);

  const loadData = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const [staffRes, storesRes] = await Promise.all([
        tenantApi.listStaff({ 
          search: searchQuery, 
          role: roleFilter !== "all" ? roleFilter : undefined,
          storeId: storeFilter !== "all" ? storeFilter : undefined,
          page, 
          limit 
        }),
        tenantApi.listStores(),
      ]);
      if (requestId !== latestRequestIdRef.current) return;
      setStaffList(staffRes.data?.data || []);
      const meta = staffRes.data?.meta || {};
      setTotal(meta.total || staffRes.data?.data?.length || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || staffRes.data?.data?.length || 0) / limit) || 1);

      const storeData = storesRes.data?.data || [];
      setStores(storeData);
      if (storeData.length > 0 && !watchInvite("storeId")) {
        setInviteValue("storeId", storeData[0]._id);
      }
    } catch (err: unknown) {
      if (requestId === latestRequestIdRef.current) {
        console.error("Failed to load staff:", err);
        toast.error("Failed to load staff list");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [searchQuery, roleFilter, storeFilter, page, limit, watchInvite, setInviteValue]);

  useEffect(() => {
    if (currentUser?.role?.toLowerCase() === "owner") {
      loadData();
    }
  }, [currentUser, loadData]);

  // Open View Staff Modal
  const handleOpenView = async (member: StaffMember) => {
    setViewStaff(member);
    setViewLoading(true);
    try {
      const res = await tenantApi.getStaffDetails(member._id);
      if (res.data?.data) {
        setViewStaff(res.data.data);
      }
    } catch {
      // keep existing staff item
    } finally {
      setViewLoading(false);
    }
  };

  // Open Edit Staff Modal
  const handleOpenEdit = (member: StaffMember) => {
    const storeIdVal = typeof member.storeId === "object" && member.storeId !== null
      ? member.storeId._id
      : member.storeId || "";

    setEditStaff(member);
    resetEdit({
      name: member.name || "",
      email: member.email || "",
      role: member.role || "cashier",
      storeId: storeIdVal,
      phone: member.phone || "",
      salary: member.salary || 0,
      cnic: member.cnic || "",
      isActive: member.isActive ?? true,
      notes: member.notes || "",
    });
  };

  // Submit Invite Staff
  const onInviteSubmit = async (data: InviteStaffFormData) => {
    try {
      await tenantApi.inviteStaff({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        role: data.role,
        storeId: data.storeId || null,
        phone: data.phone.trim(),
        salary: data.salary || 0,
        cnic: data.cnic.trim(),
        password: data.password,
      });

      toast.success(`${getRoleLabel(data.role)} invited successfully!`);
      setIsModalOpen(false);
      resetInvite({
        name: "",
        email: "",
        role: "cashier",
        storeId: stores[0]?._id || "",
        phone: "",
        salary: 0,
        cnic: "",
        password: "",
      });
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to invite staff member");
    }
  };

  // Submit Edit Staff
  const onEditSubmit = async (data: EditStaffFormData) => {
    if (!editStaff) return;
    try {
      await tenantApi.updateStaff(editStaff._id, {
        name: data.name.trim(),
        email: data.email.trim(),
        role: data.role,
        storeId: data.storeId || null,
        phone: data.phone.trim(),
        salary: data.salary || 0,
        cnic: data.cnic.trim(),
        isActive: data.isActive,
        notes: data.notes.trim(),
      });

      toast.success("Employee details updated successfully!");
      setEditStaff(null);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update staff member");
    }
  };

  // Handle Delete Staff
  const handleDeleteSubmit = async () => {
    if (isDeleting || !deleteStaff) return;
    setIsDeleting(true);
    try {
      await tenantApi.deleteStaff(deleteStaff._id);
      toast.success(`Staff member "${deleteStaff.name}" has been removed.`);
      setDeleteStaff(null);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to delete staff member");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivate = async (staffId: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate ${name}? They will not be able to log in to POS or Dashboard.`)) return;
    try {
      await tenantApi.deactivateStaff(staffId);
      toast.success(`${name} has been deactivated.`);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to deactivate staff member");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "manager": return "Store Manager";
      case "cashier": return "Cashier";
      case "inventory": return "Inventory Specialist";
      case "accountant": return "Accountant";
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "manager":
        return { bg: "rgba(249,115,22,0.12)", color: "var(--accent-primary)", border: "rgba(249,115,22,0.25)" };
      case "cashier":
        return { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" };
      case "inventory":
        return { bg: "rgba(14,165,233,0.12)", color: "#38bdf8", border: "rgba(14,165,233,0.25)" };
      case "accountant":
        return { bg: "rgba(168,85,247,0.12)", color: "#c084fc", border: "rgba(168,85,247,0.25)" };
      default:
        return { bg: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "rgba(255,255,255,0.1)" };
    }
  };

  const totalManagers = staffList.filter((s) => s.role === "manager" && s.isActive).length;
  const totalCashiers = staffList.filter((s) => s.role === "cashier" && s.isActive).length;
  const totalPayrollAll = staffList.reduce((acc, s) => acc + (s.salary || 0), 0);

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={28} color="var(--accent-primary)" /> Store Staff & Cashiers
            </h1>
            <p className="page-subtitle">Manage store managers, cashiers, specialists, salaries, and branch assignments</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <UserPlus size={16} /> Add Staff Member
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Total Team</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 4 }}>{staffList.length}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={22} color="var(--accent-primary)" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Store Managers</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-primary)", marginTop: 4 }}>{totalManagers}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={22} color="var(--accent-primary)" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Active Cashiers</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", marginTop: 4 }}>{totalCashiers}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserCheck size={22} color="#10b981" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Monthly Payroll</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>PKR {totalPayrollAll.toLocaleString()}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(56,189,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={22} color="#38bdf8" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={16} color="#64748b" style={{ position: "absolute", left: 14, top: 12 }} />
            <input 
              type="text" 
              placeholder="Search staff by name or email..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="input" 
              style={{ paddingLeft: 38 }}
            />
          </div>

          <div style={{ minWidth: 160 }}>
            <select 
              value={roleFilter} 
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} 
              className="input"
            >
              <option value="all">All Roles</option>
              <option value="manager">Store Managers</option>
              <option value="cashier">Cashiers</option>
              <option value="inventory">Inventory Specialists</option>
              <option value="accountant">Accountants</option>
            </select>
          </div>

          {stores.length > 0 && (
            <div style={{ minWidth: 160 }}>
              <select 
                value={storeFilter} 
                onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }} 
                className="input"
              >
                <option value="all">All Stores</option>
                {stores.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Staff Table */}
        {isLoading ? (
          <TableSkeleton rows={limit} columns={7} />
        ) : (
          <div className="card card-table">
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role</th>
                    <th>Assigned Store</th>
                    <th>Phone / Contact</th>
                    <th>Monthly Salary</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                        <Users size={36} style={{ margin: "0 auto 12px", opacity: 0.4, display: "block" }} />
                        No staff members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((member) => {
                      const storeName = typeof member.storeId === "object" && member.storeId !== null 
                        ? member.storeId.name 
                        : stores.find(st => st._id === member.storeId)?.name || "All Stores";

                      const badgeStyle = getRoleBadgeStyle(member.role);

                      return (
                        <tr key={member._id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ 
                                width: 34, 
                                height: 34, 
                                borderRadius: "50%", 
                                background: member.role === "manager" 
                                  ? "linear-gradient(135deg, #ea580c, #f97316)" 
                                  : "linear-gradient(135deg, #10b981, #059669)", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                fontSize: 13, 
                                fontWeight: 700, 
                                color: "#fff" 
                              }}>
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "#f8fafc" }}>{member.name}</div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={{
                              background: badgeStyle.bg,
                              color: badgeStyle.color,
                              border: `1px solid ${badgeStyle.border}`,
                              textTransform: "capitalize",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5
                            }}>
                              {member.role === "manager" ? <Shield size={12} /> : <Store size={12} />}
                              {getRoleLabel(member.role)}
                            </span>
                          </td>
                          <td style={{ color: "#cbd5e1" }}>
                            {storeName}
                          </td>
                          <td>
                            <div style={{ fontSize: 13, fontFamily: "monospace", color: "#e2e8f0" }}>{member.phone || "—"}</div>
                            {member.cnic && (
                              <div style={{ fontSize: 11, color: "#64748b" }}>CNIC: {member.cnic}</div>
                            )}
                          </td>
                          <td style={{ fontWeight: 600, color: member.salary ? "#38bdf8" : "#64748b" }}>
                            {member.salary ? `PKR ${member.salary.toLocaleString()}` : "Not set"}
                          </td>
                          <td>
                            <span className={`badge badge-${member.isActive ? "active" : "suspended"}`}>
                              {member.isActive ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="View Employee Dossier"
                                onClick={() => handleOpenView(member)}
                                style={{ padding: "6px 8px", color: "#38bdf8" }}
                              >
                                <Eye size={15} />
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="Edit Staff Member"
                                onClick={() => handleOpenEdit(member)}
                                style={{ padding: "6px 8px", color: "var(--accent-primary)" }}
                              >
                                <Edit3 size={15} />
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                title="Delete Staff Member"
                                onClick={() => setDeleteStaff(member)}
                                style={{ padding: "6px 8px", color: "#ef4444" }}
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
              itemLabel="team members"
            />
          </div>
        )}

        {/* View Staff Dossier Modal */}
        <AnimatePresence>
          {viewStaff && (
            <div className="modal-overlay" onClick={() => setViewStaff(null)}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal" 
                onClick={(e) => e.stopPropagation()} 
                style={{ maxWidth: 620, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
                      {viewStaff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="modal-title" style={{ margin: 0 }}>{viewStaff.name}</h3>
                      <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span className="badge" style={{ ...getRoleBadgeStyle(viewStaff.role), fontSize: 11 }}>
                          {getRoleLabel(viewStaff.role)}
                        </span>
                        <span>•</span>
                        <span style={{ color: viewStaff.isActive ? "#10b981" : "#ef4444" }}>
                          {viewStaff.isActive ? "Active Employee" : "Inactive / Suspended"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-icon btn-ghost" onClick={() => setViewStaff(null)}><X size={18} /></button>
                </div>

                {/* Quick Info Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <DollarSign size={12} color="#38bdf8" /> Monthly Salary
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#38bdf8", marginTop: 4 }}>
                      {viewStaff.salary ? `PKR ${viewStaff.salary.toLocaleString()}` : "Not Set"}
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <Store size={12} color="var(--accent-primary)" /> Assigned Store
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {typeof viewStaff.storeId === "object" && viewStaff.storeId !== null ? viewStaff.storeId.name : "All Stores"}
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <CheckCircle size={12} color="#10b981" /> Verification
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: viewStaff.isEmailVerified ? "#10b981" : "#f59e0b", marginTop: 4 }}>
                      {viewStaff.isEmailVerified ? "Verified" : "Pending OTP"}
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 12 }}>Employee Dossier & Identification</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <Mail size={13} /> Email:
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{viewStaff.email}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <Phone size={13} /> Phone:
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500, fontFamily: "monospace" }}>{viewStaff.phone || "Not specified"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <CreditCard size={13} /> National ID (CNIC):
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500, fontFamily: "monospace" }}>{viewStaff.cnic || "Not specified"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                        <Calendar size={13} /> Joined Date:
                      </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 500 }}>
                        {viewStaff.createdAt ? new Date(viewStaff.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                      </span>
                    </div>
                  </div>

                  {viewStaff.notes && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Employee Notes:</span>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>{viewStaff.notes}</p>
                    </div>
                  )}
                </div>

                {/* Cashier Performance if Cashier */}
                {viewStaff.role === "cashier" && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <ShoppingBag size={14} color="#10b981" /> Cashier Register Performance
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Sales Transactions Processed</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
                          {viewStaff.salesCount || 0}
                        </div>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Sales Value Handled</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 4 }}>
                          PKR {(viewStaff.totalSalesAmount || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setViewStaff(null)}>Close</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Staff Modal */}
        <AnimatePresence>
          {editStaff && (
            <div className="modal-overlay" onClick={() => setEditStaff(null)}>
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
                    <Edit3 size={18} color="var(--accent-primary)" /> Edit Employee Details
                  </h3>
                  <button className="btn btn-icon btn-ghost" onClick={() => setEditStaff(null)}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmitEdit(onEditSubmit)}>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="label">Full Name *</label>
                    <input 
                      className="input" 
                      {...registerEdit("name")}
                    />
                    {editErrors.name && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {editErrors.name.message}
                      </span>
                    )}
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="label">Email Address</label>
                      <input 
                        type="email"
                        className="input" 
                        {...registerEdit("email")}
                      />
                      {editErrors.email && (
                        <span style={{ color: "#ef4444", fontSize: 12 }}>
                          {editErrors.email.message}
                        </span>
                      )}
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
                      <label className="label">Assigned Role</label>
                      <select 
                        className="input" 
                        {...registerEdit("role")}
                      >
                        <option value="manager">Store Manager</option>
                        <option value="cashier">Cashier</option>
                        <option value="inventory">Inventory Specialist</option>
                        <option value="accountant">Accountant</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Assigned Branch</label>
                      <select 
                        className="input" 
                        {...registerEdit("storeId")}
                      >
                        <option value="">All Branches</option>
                        {stores.map(st => (
                          <option key={st._id} value={st._id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="label">Monthly Salary (PKR)</label>
                      <input 
                        type="number"
                        min={0}
                        className="input" 
                        placeholder="e.g. 45000" 
                        {...registerEdit("salary", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">National ID (CNIC)</label>
                      <input 
                        className="input" 
                        placeholder="35201-1234567-1" 
                        {...registerEdit("cnic")}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="label">Status</label>
                    <select 
                      className="input" 
                      value={watchEdit("isActive") ? "active" : "inactive"} 
                      onChange={(e) => setEditValue("isActive", e.target.value === "active")}
                    >
                      <option value="active">Active (Can log in)</option>
                      <option value="inactive">Deactivated (Access blocked)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="label">Internal Notes / Terms</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Shift 9 AM - 6 PM" 
                      {...registerEdit("notes")}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditStaff(null)} disabled={isEditing}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={isEditing}>
                      {isEditing ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteStaff && (
            <div className="modal-overlay" onClick={() => setDeleteStaff(null)}>
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
                    <h3 className="modal-title" style={{ margin: 0, fontSize: 17 }}>Remove Staff Member?</h3>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Permanent removal from organization</div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 20 }}>
                  Are you sure you want to remove <strong style={{ color: "#fff" }}>{deleteStaff.name}</strong> ({getRoleLabel(deleteStaff.role)})? Their account access will be revoked immediately.
                </p>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setDeleteStaff(null)} disabled={isDeleting}>Cancel</button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDeleteSubmit} 
                    disabled={isDeleting}
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    {isDeleting ? "Removing..." : "Yes, Remove Employee"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Invite Staff Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="card" 
                style={{ width: "100%", maxWidth: 500, padding: 28, position: "relative" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <UserPlus size={20} color="var(--accent-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Staff Member</h2>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Add employee profile, role, salary, and store assignment</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-icon btn-ghost"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmitInvite(onInviteSubmit)}>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="label">Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tariq Mahmood" 
                      {...registerInvite("name")}
                      className="input" 
                    />
                    {inviteErrors.name && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {inviteErrors.name.message}
                      </span>
                    )}
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="label">Email Address *</label>
                      <input 
                        type="email" 
                        placeholder="tariq@store.pk" 
                        {...registerInvite("email")}
                        className="input" 
                      />
                      {inviteErrors.email && (
                        <span style={{ color: "#ef4444", fontSize: 12 }}>
                          {inviteErrors.email.message}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Phone Number</label>
                      <input 
                        type="text" 
                        placeholder="03001234567" 
                        {...registerInvite("phone")}
                        className="input" 
                      />
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="label">Role Assignment *</label>
                      <select 
                        {...registerInvite("role")}
                        className="input"
                      >
                        <option value="cashier">Cashier</option>
                        <option value="manager">Store Manager</option>
                        <option value="inventory">Inventory Specialist</option>
                        <option value="accountant">Accountant</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Assigned Store Branch</label>
                      <select 
                        {...registerInvite("storeId")}
                        className="input"
                      >
                        <option value="">All Branches</option>
                        {stores.map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="label">Monthly Salary (PKR)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 40000" 
                        {...registerInvite("salary", { valueAsNumber: true })}
                        className="input" 
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">National ID (CNIC)</label>
                      <input 
                        type="text" 
                        placeholder="35201-1234567-1" 
                        {...registerInvite("cnic")}
                        className="input" 
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="label">Initial Login Password *</label>
                    <PasswordInput 
                      placeholder="Min 8 characters" 
                      {...registerInvite("password")}
                    />
                    {inviteErrors.password && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {inviteErrors.password.message}
                      </span>
                    )}
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      The employee will use this password alongside their email to log into POS / Dashboard.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="btn btn-ghost"
                      disabled={isInviting}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={isInviting}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {isInviting ? "Adding..." : "Add Staff Member"}
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
