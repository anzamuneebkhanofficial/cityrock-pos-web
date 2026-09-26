"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Save, User, Lock, Camera, Trash2, Store as StoreIcon, 
  MapPin, Phone, Receipt, FileText, CheckCircle2, Building
} from "lucide-react";
import toast from "react-hot-toast";
import api, { authApi, tenantApi, getImageUrl } from "@/lib/api";
import PasswordInput from "@/components/ui/PasswordInput";

const STORE_TYPES = [
  { value: "clothing", label: "Clothing Store 👕" },
  { value: "shoes", label: "Shoe Store 👟" },
  { value: "general_retail", label: "General Retail 🛒" },
  { value: "supermarket", label: "Supermarket / Mini-Mart 🏪" },
  { value: "pharmacy", label: "Pharmacy 💊" },
  { value: "kiryana", label: "Kiryana / Nano Shop 🧺" },
];

export default function TenantProfileSettingsPage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [userRole, setUserRole] = useState("owner");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [savingStore, setSavingStore] = useState(false);

  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    avatarUrl: string | null;
  }>({
    name: "",
    email: "",
    avatarUrl: null,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [activeStore, setActiveStore] = useState<{
    name: string;
    storeType: string;
    phone: string;
    address: string;
    city: string;
    receiptWidth: string;
    taxRate: number;
    footerNote: string;
    storeCode?: string;
  }>({
    name: "",
    storeType: "clothing",
    phone: "",
    address: "",
    city: "",
    receiptWidth: "80mm",
    taxRate: 0,
    footerNote: "Thank you for shopping with us!",
  });

  // Load User and Store Info
  const loadStoreData = useCallback(async () => {
    try {
      const res = await tenantApi.listStores();
      const storeList = res.data?.data || [];
      if (storeList.length > 0) {
        const s = storeList[0];
        setStoreId(s._id);
        setActiveStore({
          name: s.name || "",
          storeType: s.storeType || "clothing",
          phone: s.phone || "",
          address: s.address || "",
          city: s.city || "",
          receiptWidth: s.receiptWidth || "80mm",
          footerNote: s.footerNote || "Thank you for shopping with us!",
          taxRate: s.taxRate ?? 0,
          storeCode: s.storeCode || "",
        });
      }
    } catch (e) {
      console.error("Failed to load store:", e);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { router.replace("/login"); return; }
    const user = JSON.parse(stored);
    setUserRole((user.role || "owner").toLowerCase());
    setProfile({
      name: user.name || "",
      email: user.email || "",
      avatarUrl: user.avatarUrl || null,
    });
    setAvatarError(false);
    loadStoreData();
  }, [router, loadStoreData]);

  // ── Profile Update ──
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) {
      toast.error("Please fill in name and email");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", { name: profile.name.trim(), email: profile.email.trim() });
      toast.success(res.data.message || "Profile updated successfully!");
      const stored = JSON.parse(localStorage.getItem("cityrock_user") || "{}");
      localStorage.setItem("cityrock_user", JSON.stringify({ ...stored, name: profile.name.trim(), email: profile.email.trim() }));
      window.dispatchEvent(new Event("storage"));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // ── Store Settings Update ──
  const handleStoreUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error("Store record not found");
      return;
    }
    setSavingStore(true);
    try {
      await tenantApi.updateStore(storeId, {
        name: activeStore.name.trim(),
        storeType: activeStore.storeType,
        phone: activeStore.phone.trim(),
        address: activeStore.address.trim(),
        city: activeStore.city.trim(),
        receiptWidth: activeStore.receiptWidth,
        footerNote: activeStore.footerNote.trim(),
        taxRate: activeStore.taxRate || 0,
      });

      toast.success("Store details and receipt settings updated!");
      loadStoreData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update store settings");
    } finally {
      setSavingStore(false);
    }
  };

  // ── Avatar Upload Handler ──
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please select a valid image file (PNG, JPG, WEBP)");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image file size must be less than 5MB");
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingAvatar(true);
    try {
      const res = await authApi.uploadAvatar(formData);
      const newAvatarUrl = res.data?.data?.avatarUrl;
      setProfile((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
      setAvatarError(false);

      const stored = JSON.parse(localStorage.getItem("cityrock_user") || "{}");
      localStorage.setItem("cityrock_user", JSON.stringify({ ...stored, avatarUrl: newAvatarUrl }));
      window.dispatchEvent(new Event("storage"));

      toast.success("Profile photo updated successfully!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Remove Avatar ──
  const handleRemoveAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;
    setUploadingAvatar(true);
    try {
      await authApi.removeAvatar();
      setProfile((prev) => ({ ...prev, avatarUrl: null }));
      const stored = JSON.parse(localStorage.getItem("cityrock_user") || "{}");
      localStorage.setItem("cityrock_user", JSON.stringify({ ...stored, avatarUrl: null }));
      window.dispatchEvent(new Event("storage"));
      toast.success("Profile photo removed");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/auth/change-password", { 
        currentPassword: passwords.currentPassword, 
        newPassword: passwords.newPassword 
      });
      toast.success(res.data.message || "Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header" style={{ marginBottom: 28 }}>
          <h1 className="page-title">Store & Profile Settings</h1>
          <p className="page-subtitle">Manage personal account details, store information, and POS receipt branding</p>
        </div>

        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Settings Sidebar Tabs */}
          <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <button 
              className={`sidebar-nav-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
              style={{ width: "100%", justifyContent: "flex-start", borderRadius: 8, padding: "12px 16px" }}
            >
              <User size={18} /> Personal Details
            </button>

            <button 
              className={`sidebar-nav-item ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
              style={{ width: "100%", justifyContent: "flex-start", borderRadius: 8, padding: "12px 16px" }}
            >
              <Lock size={18} /> Security & Password
            </button>

            {["owner", "manager"].includes(userRole) && (
              <button 
                className={`sidebar-nav-item ${activeTab === "store" ? "active" : ""}`}
                onClick={() => setActiveTab("store")}
                style={{ width: "100%", justifyContent: "flex-start", borderRadius: 8, padding: "12px 16px" }}
              >
                <StoreIcon size={18} /> Store Information
              </button>
            )}
          </div>

          {/* Settings Content */}
          <div style={{ flex: 1, minWidth: 320, maxWidth: 680 }}>
            {/* ── TAB 1: Personal Details ── */}
            {activeTab === "profile" && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16, marginBottom: 24 }}>
                  <User size={24} color="var(--accent-primary)" />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Personal Details</h2>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Update your photo, name and personal login email</p>
                  </div>
                </div>

                {/* Avatar Upload Section */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                  <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                    {profile.avatarUrl && !avatarError ? (
                      <img 
                        src={getImageUrl(profile.avatarUrl)} 
                        alt={profile.name} 
                        style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent-primary)", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }} 
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #ea580c, #f97316)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, boxShadow: "0 4px 12px rgba(249,115,22,0.2)" }}>
                        {getInitials(profile.name)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>Profile Photo</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>PNG, JPG, or WEBP up to 5MB. Stored securely on server.</div>
                    
                    <input 
                      type="file" 
                      ref={avatarInputRef} 
                      onChange={handleAvatarFileChange} 
                      accept="image/png, image/jpeg, image/webp" 
                      style={{ display: "none" }} 
                    />

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        <Camera size={14} /> {uploadingAvatar ? "Uploading..." : profile.avatarUrl ? "Change Photo" : "Upload Photo"}
                      </button>

                      {profile.avatarUrl && (
                        <button 
                          type="button" 
                          className="btn btn-sm" 
                          onClick={handleRemoveAvatar}
                          disabled={uploadingAvatar}
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate}>
                  <div className="form-group" style={{ maxWidth: 460 }}>
                    <label className="label">Full Name</label>
                    <input 
                      className="input" 
                      required
                      value={profile.name} 
                      onChange={(e) => setProfile({...profile, name: e.target.value})} 
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: 460 }}>
                    <label className="label">Email Address (Login ID)</label>
                    <input 
                      type="email"
                      className="input" 
                      required
                      value={profile.email} 
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                    />
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <Save size={16} /> {saving ? "Saving..." : "Save Profile Details"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── TAB 2: Security & Password ── */}
            {activeTab === "security" && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16, marginBottom: 24 }}>
                  <Lock size={24} color="var(--accent-primary)" />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Change Password</h2>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Update your password regularly to keep your account safe</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange}>
                  <div className="form-group" style={{ maxWidth: 460 }}>
                    <label className="label">Current Password</label>
                    <PasswordInput 
                      required
                      value={passwords.currentPassword} 
                      onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})} 
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: 460 }}>
                    <label className="label">New Password</label>
                    <PasswordInput 
                      required
                      minLength={8}
                      value={passwords.newPassword} 
                      onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: 460 }}>
                    <label className="label">Confirm New Password</label>
                    <PasswordInput 
                      required
                      value={passwords.confirmPassword} 
                      onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} 
                    />
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <Save size={16} /> {saving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── TAB 3: Store Information & Receipt Branding ── */}
            {activeTab === "store" && ["owner", "manager"].includes(userRole) && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16, marginBottom: 24 }}>
                  <StoreIcon size={24} color="var(--accent-primary)" />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Store Details & Branding</h2>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Configure your retail outlet information, invoice headers, and receipt footer</p>
                  </div>
                </div>

                <form onSubmit={handleStoreUpdate}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="form-group">
                      <label className="label">Store / Business Name</label>
                      <input 
                        className="input" 
                        required
                        placeholder="e.g. Faizan Cloth Store"
                        value={activeStore.name} 
                        onChange={(e) => setActiveStore({ ...activeStore, name: e.target.value })} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="label">Business Category / Store Type</label>
                      <select 
                        className="input"
                        value={activeStore.storeType}
                        onChange={(e) => setActiveStore({ ...activeStore, storeType: e.target.value })}
                      >
                        {STORE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="form-group">
                      <label className="label">Store Contact Phone</label>
                      <input 
                        className="input" 
                        placeholder="e.g. 0300-1234567"
                        value={activeStore.phone} 
                        onChange={(e) => setActiveStore({ ...activeStore, phone: e.target.value })} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="label">City</label>
                      <input 
                        className="input" 
                        placeholder="e.g. Lahore, Karachi, Islamabad"
                        value={activeStore.city} 
                        onChange={(e) => setActiveStore({ ...activeStore, city: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Full Store Address (Prints on Invoices)</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Shop # 14, Liberty Market, Gulberg III"
                      value={activeStore.address} 
                      onChange={(e) => setActiveStore({ ...activeStore, address: e.target.value })} 
                    />
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid rgba(99,102,241,0.12)", margin: "24px 0" }} />
                  
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <Receipt size={16} color="#818cf8" /> Thermal Receipt & POS Settings
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="form-group">
                      <label className="label">Thermal Printer Paper Width</label>
                      <select 
                        className="input"
                        value={activeStore.receiptWidth}
                        onChange={(e) => setActiveStore({ ...activeStore, receiptWidth: e.target.value })}
                      >
                        <option value="80mm">80mm (Standard POS Thermal Roll)</option>
                        <option value="58mm">58mm (Small Mobile / Bluetooth Thermal)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Default Sales Tax Rate (%)</label>
                      <input 
                        type="number" 
                        min={0}
                        max={100}
                        step="0.1"
                        className="input" 
                        placeholder="0"
                        value={activeStore.taxRate} 
                        onChange={(e) => setActiveStore({ ...activeStore, taxRate: parseFloat(e.target.value) || 0 })} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Receipt Tagline & Footer Note</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Thank you for shopping with us! Returns accepted within 7 days."
                      value={activeStore.footerNote} 
                      onChange={(e) => setActiveStore({ ...activeStore, footerNote: e.target.value })} 
                    />
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      This message is automatically printed at the bottom of customer receipts.
                    </div>
                  </div>

                  {activeStore.storeCode && (
                    <div style={{ padding: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a5b4fc", marginTop: 8 }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>Assigned Store Code: <strong>{activeStore.storeCode}</strong> (Used automatically in invoice prefix numbering).</span>
                    </div>
                  )}

                  <div style={{ marginTop: 24 }}>
                    <button type="submit" className="btn btn-primary" disabled={savingStore}>
                      <Save size={16} /> {savingStore ? "Saving..." : "Save Store Details"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}



