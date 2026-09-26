"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Search, X, Send, CheckCircle, Clock, AlertCircle, MessageCircle, ShieldCheck } from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { adminApi } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";

interface TicketMessage {
  _id?: string;
  senderName: string;
  senderRole: string;
  body: string;
  isInternal?: boolean;
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  tenantId?: { businessName: string; ownerEmail?: string };
  messages?: TicketMessage[];
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Conversation Modal State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    const role = (u?.role || "").toLowerCase();
    if (!["super_admin", "platform_admin", "support_agent"].includes(role)) {
      toast.error("Access Denied: Ticket management is restricted to Support Agents & Admins.");
      router.replace("/admin");
      return;
    }
    setUser(u);
  }, [router]);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listTickets({
        search,
        status: statusFilter !== "all" ? statusFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        page,
        limit
      });
      let fetched = res.data?.data || [];
      if (search.trim()) {
        const s = search.toLowerCase();
        fetched = fetched.filter((t: Ticket) =>
          (t.ticketNumber || "").toLowerCase().includes(s) ||
          (t.subject || "").toLowerCase().includes(s) ||
          (t.tenantId?.businessName || "").toLowerCase().includes(s)
        );
      }
      if (categoryFilter !== "all") {
        fetched = fetched.filter((t: Ticket) => t.category === categoryFilter);
      }
      setTickets(fetched);
      const meta = res.data?.meta || {};
      setTotal(meta.total || fetched.length || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || fetched.length || 0) / limit) || 1);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, categoryFilter, page, limit]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsReplying(true);
    try {
      const res = await adminApi.replyToTicket(selectedTicket._id, replyMessage.trim(), isInternal);
      toast.success(isInternal ? "Internal note added" : "Reply sent to tenant!");
      setReplyMessage("");
      if (res.data?.data) {
        setSelectedTicket(res.data.data);
      }
      fetchTickets();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to send reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    setIsUpdatingStatus(true);
    try {
      const res = await adminApi.updateTicketStatus(selectedTicket._id, newStatus);
      toast.success(`Ticket marked as ${newStatus.replace("_", " ")}`);
      if (res.data?.data) {
        setSelectedTicket(res.data.data);
      }
      fetchTickets();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isPageLoading = !user || isLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <span className="badge badge-trial"><Clock size={12} /> Open</span>;
      case "in_progress":
        return <span className="badge badge-grace"><AlertCircle size={12} /> In Progress</span>;
      case "resolved":
        return <span className="badge badge-confirmed"><CheckCircle size={12} /> Resolved</span>;
      case "closed":
        return <span className="badge badge-cancelled">Closed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header">
          <h1 className="page-title">Platform Support Tickets</h1>
          <p className="page-subtitle">Manage tenant issues, queries, and assistance ({total.toLocaleString()} total tickets)</p>
        </div>

        {isPageLoading ? (
          <TableSkeleton rows={limit} columns={7} />
        ) : (
          <>
            {/* Search & Filter Bar */}
            <div className="card mb-4" style={{ padding: "14px 18px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  className="input"
                  placeholder="Search by ticket number, business, or subject..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{ paddingLeft: 38 }}
                />
              </div>

              {/* Status Filter */}
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ width: "auto", minWidth: 150 }}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              {/* Category Filter */}
              <select
                className="input"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                style={{ width: "auto", minWidth: 150 }}
              >
                <option value="all">All Categories</option>
                <option value="billing">Billing & Plan</option>
                <option value="hardware">Hardware / Printer</option>
                <option value="bug">Technical Bug</option>
                <option value="feature">Feature Request</option>
                <option value="general">General Query</option>
              </select>
            </div>

            <div className="card card-table">
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Ticket No.</th>
                      <th>Tenant Business</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
                        <MessageSquare size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                        No support tickets found matching your filters.
                      </td></tr>
                    ) : tickets.map((ticket) => (
                      <tr
                        key={ticket._id}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <td style={{ fontWeight: 700, color: "var(--accent-primary)", fontFamily: "monospace" }}>{ticket.ticketNumber}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{ticket.tenantId?.businessName || "Unknown"}</div>
                          {ticket.tenantId?.ownerEmail && <div style={{ fontSize: 11, color: "#64748b" }}>{ticket.tenantId.ownerEmail}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#f8fafc" }}>{ticket.subject}</div>
                          {ticket.messages && ticket.messages.length > 1 && (
                            <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <MessageCircle size={12} /> {ticket.messages.length} replies
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ textTransform: "capitalize", background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", padding: "3px 8px", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                            {ticket.category?.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: 13 }}>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                          >
                            Manage / Reply
                          </button>
                        </td>
                      </tr>
                    ))}
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
                itemLabel="tickets"
              />
            </div>
          </>
        )}

        {/* View / Reply / Manage Conversation Modal */}
        <AnimatePresence>
          {selectedTicket && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="card"
                style={{ width: "100%", maxWidth: 680, maxHeight: "88vh", display: "flex", flexDirection: "column", padding: 0, position: "relative", overflow: "hidden" }}
              >
                {/* Modal Header */}
                <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-dark)" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "monospace" }}>
                        {selectedTicket.ticketNumber}
                      </span>
                      {getStatusBadge(selectedTicket.status)}
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                        {selectedTicket.tenantId?.businessName || "Tenant"}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0 0", color: "#f8fafc" }}>
                      {selectedTicket.subject}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 6 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Status Quick Action Bar */}
                <div style={{ padding: "10px 24px", background: "var(--surface-dark-alt)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Change Status:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      disabled={isUpdatingStatus || selectedTicket.status === "in_progress"}
                      onClick={() => handleStatusChange("in_progress")}
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: 11, padding: "4px 10px" }}
                    >
                      In Progress
                    </button>
                    <button
                      disabled={isUpdatingStatus || selectedTicket.status === "resolved"}
                      onClick={() => handleStatusChange("resolved")}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: 11, padding: "4px 10px", background: "#10b981", borderColor: "#10b981" }}
                    >
                      Mark Resolved
                    </button>
                    <button
                      disabled={isUpdatingStatus || selectedTicket.status === "closed"}
                      onClick={() => handleStatusChange("closed")}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 11, padding: "4px 10px" }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Messages List */}
                <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "var(--bg-primary)" }}>
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg, idx) => {
                      const isSupport = ["super_admin", "support_agent", "platform_admin"].includes(msg.senderRole);
                      return (
                        <div
                          key={msg._id || idx}
                          style={{
                            alignSelf: isSupport ? "flex-end" : "flex-start",
                            maxWidth: "82%",
                            padding: "14px 18px",
                            borderRadius: "var(--radius-md)",
                            background: msg.isInternal
                              ? "var(--surface-dark-alt)"
                              : isSupport
                                ? "var(--surface-dark)"
                                : "var(--surface-dark-alt)",
                            border: `1px solid ${msg.isInternal
                                ? "var(--warning)"
                                : "var(--border-subtle)"
                              }`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isSupport ? "var(--accent-primary)" : "var(--text-primary)" }}>
                              {msg.senderName} {isSupport && "(Support)"}
                            </span>
                            {msg.isInternal && (
                              <span style={{ fontSize: 10, color: "var(--warning)", background: "var(--warning-bg)", border: "1px solid var(--warning)", padding: "2px 6px", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: 3 }}>
                                <ShieldCheck size={10} /> Internal Note
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#e2e8f0", whiteSpace: "pre-wrap" }}>
                            {msg.body}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: "center", color: "#64748b", padding: 24 }}>No messages recorded yet.</div>
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-dark)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="text"
                      required
                      placeholder="Type official response to tenant..."
                      className="input"
                      style={{ flex: 1 }}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isReplying}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Send size={15} /> {isReplying ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    Save as Internal Staff Note (visible only to platform team)
                  </label>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

