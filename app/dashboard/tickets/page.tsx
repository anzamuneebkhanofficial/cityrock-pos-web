"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, Plus, Send, Clock, CheckCircle, AlertCircle, 
  HelpCircle, X, MessageCircle
} from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { tenantApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Pagination from "@/components/ui/Pagination";
import { Search } from "lucide-react";

const ticketSchema = z.object({
  category: z.string(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Detailed description is required"),
});
type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketMessage {
  _id?: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  messages?: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export default function TenantTicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const latestRequestIdRef = useRef(0);

  // New Ticket Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const {
    register: registerTicket,
    handleSubmit: handleSubmitTicket,
    reset: resetTicket,
    formState: { isSubmitting, errors: ticketErrors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      category: "general",
      subject: "",
      body: "",
    },
  });

  // View Ticket Thread State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchTickets = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    try {
      const res = await tenantApi.listTickets({
        search,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit
      });
      if (requestId !== latestRequestIdRef.current) return;
      setTickets(res.data?.data || []);
      const meta = res.data?.meta || {};
      setTotal(meta.total || res.data?.data?.length || 0);
      setTotalPages(meta.totalPages || Math.ceil((meta.total || res.data?.data?.length || 0) / limit) || 1);
    } catch {
      if (requestId === latestRequestIdRef.current) {
        toast.error("Failed to load tickets");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, statusFilter, page, limit]);

  useEffect(() => { 
    if (user) fetchTickets(); 
  }, [user, fetchTickets]);

  const onCreateTicket = async (data: TicketFormData) => {
    try {
      await tenantApi.createTicket({
        category: data.category,
        subject: data.subject.trim(),
        body: data.body.trim(),
      });
      toast.success("Support ticket opened successfully!");
      setIsNewModalOpen(false);
      resetTicket();
      fetchTickets();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create ticket");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReplying) return;
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsReplying(true);
    try {
      const res = await tenantApi.replyToTicket(selectedTicket._id, replyMessage.trim());
      toast.success("Reply sent to support team!");
      setReplyMessage("");
      setSelectedTicket(res.data?.data || null);
      fetchTickets();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to send reply");
    } finally {
      setIsReplying(false);
    }
  };

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
        {/* Header */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MessageSquare size={28} color="var(--accent-primary)" /> Support & Assistance
            </h1>
            <p className="page-subtitle">Get direct help from the CityRock platform team</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsNewModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={16} /> Open Support Ticket
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="card mb-4" style={{ padding: "14px 18px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              className="input" 
              placeholder="Search by ticket number or subject..." 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
              style={{ paddingLeft: 38 }} 
            />
          </div>

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
        </div>

        {/* Tickets Table */}
        {isLoading ? (
          <TableSkeleton rows={limit} columns={6} />
        ) : (
          <div className="card card-table">
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Ticket No.</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "54px 20px", color: "#64748b" }}>
                        <HelpCircle size={40} style={{ margin: "0 auto 12px", opacity: 0.4, display: "block", color: "var(--accent-primary)" }} />
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>No support tickets found</div>
                        <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 400, margin: "0 auto 16px" }}>
                          Need help with hardware, payments, or product sync? Open a ticket and our platform team will assist you.
                        </div>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setIsNewModalOpen(true)}
                        >
                          <Plus size={14} /> Open Your First Ticket
                        </button>
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr key={ticket._id} style={{ cursor: "pointer" }} onClick={() => setSelectedTicket(ticket)}>
                        <td style={{ fontWeight: 700, color: "var(--accent-primary)" }}>
                          {ticket.ticketNumber || `#${ticket._id.substring(ticket._id.length - 6).toUpperCase()}`}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#f8fafc" }}>{ticket.subject}</div>
                          {ticket.messages && ticket.messages.length > 1 && (
                            <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <MessageCircle size={12} /> {ticket.messages.length} messages
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ textTransform: "capitalize", fontSize: 12, color: "#cbd5e1", background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: 6 }}>
                            {ticket.category?.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td style={{ fontSize: 13, color: "#94a3b8" }}>
                          {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                          >
                            View Conversation
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
              itemLabel="tickets"
            />
          </div>
        )}

        {/* Create New Ticket Modal */}
        <AnimatePresence>
          {isNewModalOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="card" 
                style={{ width: "100%", maxWidth: 520, padding: 28, position: "relative" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <HelpCircle size={20} color="var(--accent-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Open Support Ticket</h2>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Our platform team responds within a few hours</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsNewModalOpen(false)}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitTicket(onCreateTicket)}>
                  <div className="form-group">
                    <label className="label">Category</label>
                    <select 
                      className="input"
                      {...registerTicket("category")}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="payment_issue">Payment & Subscription Issue</option>
                      <option value="bug">Technical Bug / Error</option>
                      <option value="product_sync">Barcode & Hardware Setup</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Receipt printer not detecting"
                      className="input" 
                      {...registerTicket("subject")}
                    />
                    {ticketErrors.subject && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {ticketErrors.subject.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="label">Detailed Description</label>
                    <textarea 
                      rows={4}
                      placeholder="Explain the issue clearly and steps to reproduce..."
                      className="input" 
                      style={{ resize: "vertical" }}
                      {...registerTicket("body")}
                    />
                    {ticketErrors.body && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {ticketErrors.body.message}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setIsNewModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Ticket"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* View Conversation Modal */}
        <AnimatePresence>
          {selectedTicket && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="card" 
                style={{ width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0, position: "relative", overflow: "hidden" }}
              >
                {/* Modal Header */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(14,20,35,0.9)" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)" }}>
                        {selectedTicket.ticketNumber || `#${selectedTicket._id.substring(selectedTicket._id.length - 6).toUpperCase()}`}
                      </span>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 0", color: "#f8fafc" }}>
                      {selectedTicket.subject}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Messages List */}
                <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "rgba(8,12,26,0.6)" }}>
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg, idx) => {
                      const isSupport = ["super_admin", "support_agent", "platform_admin"].includes(msg.senderRole);
                      return (
                        <div 
                          key={msg._id || idx}
                          style={{
                            alignSelf: isSupport ? "flex-start" : "flex-end",
                            maxWidth: "80%",
                            padding: "14px 18px",
                            borderRadius: 14,
                            background: isSupport ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${isSupport ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.1)"}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isSupport ? "var(--accent-primary)" : "#10b981" }}>
                              {msg.senderName} {isSupport && "(CityRock Support)"}
                            </span>
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
                {selectedTicket.status !== "closed" ? (
                  <form onSubmit={handleSendReply} style={{ padding: "16px 20px", borderTop: "1px solid var(--glass-border)", background: "rgba(14,20,35,0.9)", display: "flex", gap: 10 }}>
                    <input 
                      type="text" 
                      required
                      placeholder="Type your response to support..." 
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
                      <Send size={15} /> {isReplying ? "Sending..." : "Reply"}
                    </button>
                  </form>
                ) : (
                  <div style={{ padding: 14, textAlign: "center", color: "#94a3b8", fontSize: 12, background: "rgba(255,255,255,0.02)" }}>
                    This ticket is closed. Open a new ticket if you have further inquiries.
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

