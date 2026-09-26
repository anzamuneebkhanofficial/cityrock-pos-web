"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, User, Lock, Shield, Camera, Trash2, Globe, Building2, UploadCloud, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api, { authApi, adminApi, getImageUrl } from "@/lib/api";
import PasswordInput from "@/components/ui/PasswordInput";

export default function AdminSettingsPage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<{ _id?: string; name: string; email: string; role: string; avatarUrl?: string | null }>({
    name: "",
    email: "",
    role: "",
    avatarUrl: null,
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  
  // Platform Branding state (Super Admin)
  const [platformSettings, setPlatformSettings] = useState({
    platformName: "CityRock",
    platformTagline: "Cloud Retail Management Platform",
    platformLogoUrl: "" as string | null,
    supportEmail: "support@cityrock.pk",
    superAdminDisplayName: "Platform Admin",
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const isSuperAdmin = ["super_admin", "platform_admin"].includes((profile.role || "").toLowerCase());

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    const user = JSON.parse(stored);
    setProfile({
      _id: user._id,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      avatarUrl: user.avatarUrl || null,
    });

    // Fetch platform branding if super admin
    if (["super_admin", "platform_admin"].includes((user.role || "").toLowerCase())) {
      adminApi.getPlatformSettings().then((res) => {
        if (res.data?.data) {
          setPlatformSettings(res.data.data);
        }
      }).catch((err) => console.warn("Failed to load platform settings:", err));
    }
  }, [router]);

  // ── Profile details update ──
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", { name: profile.name, email: profile.email });
      toast.success(res.data.message || "Profile updated");
      const stored = JSON.parse(localStorage.getItem("cityrock_user") || "{}");
      const updatedUser = { ...stored, name: profile.name, email: isSuperAdmin ? stored.email : profile.email };
      localStorage.setItem("cityrock_user", JSON.stringify(updatedUser));
      // Dispatch custom storage event for instant UI sync
      window.dispatchEvent(new Event("storage"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload avatar");
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
      setAvatarError(false);
      const stored = JSON.parse(localStorage.getItem("cityrock_user") || "{}");
      localStorage.setItem("cityrock_user", JSON.stringify({ ...stored, avatarUrl: null }));
      window.dispatchEvent(new Event("storage"));
      toast.success("Profile photo removed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Password change ──
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin) {
      return toast.error("Super Admin password is managed securely in the server .env file.");
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    setSaving(true);
    try {
      const res = await api.put("/auth/change-password", { 
        currentPassword: passwords.currentPassword, 
        newPassword: passwords.newPassword 
      });
      toast.success(res.data.message || "Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  // ── Platform Settings Update (Super Admin) ──
  const handlePlatformSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminApi.updatePlatformSettings({
        platformName: platformSettings.platformName,
        platformTagline: platformSettings.platformTagline,
        supportEmail: platformSettings.supportEmail,
      });
      toast.success("Platform branding updated successfully!");
      if (res.data?.data) {
        setPlatformSettings(res.data.data);
      }
      window.dispatchEvent(new Event("platformSettingsChanged"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update platform branding");
    } finally {
      setSaving(false);
    }
  };

  // ── Platform Logo Upload ──
  const handlePlatformLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please select a valid image file (PNG, JPG, WEBP, SVG)");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Logo file size must be less than 5MB");
    }

    const formData = new FormData();
    formData.append("logo", file);

    setUploadingLogo(true);
    try {
      const res = await adminApi.uploadPlatformLogo(formData);
      const newLogoUrl = res.data?.data?.platformLogoUrl || res.data?.data?.logoUrl || res.data?.logoUrl;
      setPlatformSettings((prev) => ({ ...prev, platformLogoUrl: newLogoUrl }));
      setLogoError(false);
      window.dispatchEvent(new Event("platformSettingsChanged"));
      toast.success("Platform logo updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload platform logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // ── Reset Platform Logo ──
  const handleRemovePlatformLogo = async () => {
    if (!confirm("Are you sure you want to reset the platform logo to default?")) return;
    setUploadingLogo(true);
    try {
      await adminApi.removePlatformLogo();
      setPlatformSettings((prev) => ({ ...prev, platformLogoUrl: null }));
      setLogoError(false);
      window.dispatchEvent(new Event("platformSettingsChanged"));
      toast.success("Platform logo reset to default");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <main className="main-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header">
          <h1 className="page-title">Platform Settings</h1>
          <p className="page-subtitle">Manage your admin profile, security, and global platform branding.</p>
        </div>

        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Settings Sidebar */}
          <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <button 
              className={`sidebar-nav-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
              style={{ width: "100%", justifyContent: "flex-start", borderRadius: 8, padding: "12px 16px" }}
            >
              <User size={18} /> Profile Details
            </button>

            <button 
              className={`sidebar-nav-item ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
              style={{ width: "100%", justifyContent: "flex-start", borderRadius: 8, padding: "12px 16px" }}
            >
              <Lock size={18} /> Security & Password
            </button>

            {isSuperAdmin && (
              <button 
                className={`sidebar-nav-item ${activeTab === "branding" ? "active" : ""}`}
                onClick={() => setActiveTab("branding")}
                style={{ width: "100%", justifyContent: "flex-start", borderRadius: 8, padding: "12px 16px" }}
              >
                <Globe size={18} /> Platform Branding
              </button>
            )}
          </div>

          {/* Settings Content */}
          <div style={{ flex: 1, minWidth: 320, maxWidth: 640 }}>
            {/* ── TAB 1: Profile Details ── */}
            {activeTab === "profile" && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16, marginBottom: 24 }}>
                  <User size={24} color="var(--accent-primary)" />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Profile Details</h2>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Update your photo and account display details</p>
                  </div>
                </div>

                {/* Avatar Upload Section */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: 16, background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                    {profile.avatarUrl && !avatarError ? (
                      <img 
                        src={getImageUrl(profile.avatarUrl)} 
                        alt={profile.name} 
                        style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-subtle)" }} 
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface-dark)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, border: "1px solid var(--border-subtle)" }}>
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
                          style={{ background: "var(--negative-bg)", color: "var(--negative)", border: "1px solid var(--negative)" }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div style={{ background: "var(--surface-dark-alt)", border: "1px solid rgba(249, 115, 22, 0.3)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
                    <Shield size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <strong style={{ color: "var(--accent-primary)" }}>Super Admin Environment:</strong> Your login email & password are protected via server environment variables. You can customize your Display Name and Photo above.
                    </div>
                  </div>
                )}

                <form onSubmit={handleProfileUpdate}>
                  <div className="form-group" style={{ maxWidth: 440 }}>
                    <label className="label">Full / Display Name</label>
                    <input 
                      className="input" 
                      value={profile.name} 
                      onChange={(e) => setProfile({...profile, name: e.target.value})} 
                      required
                    />
                  </div>

                  <div className="form-group" style={{ maxWidth: 440 }}>
                    <label className="label">Email Address</label>
                    <input 
                      type="email"
                      className="input" 
                      value={profile.email} 
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      disabled={isSuperAdmin}
                    />
                    {isSuperAdmin && (
                      <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
                        Managed in server .env (SUPER_ADMIN_EMAIL)
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <Save size={16} /> {saving ? "Saving..." : "Save Profile"}
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
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Security & Password</h2>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Manage your authentication credentials</p>
                  </div>
                </div>

                {isSuperAdmin ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
                    <Shield size={44} style={{ margin: "0 auto 16px", color: "var(--accent-primary)", opacity: 0.8 }} />
                    <h3 style={{ color: "#f8fafc", fontSize: 16, margin: "0 0 8px" }}>Super Admin Password Protected</h3>
                    <p style={{ fontSize: 13, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                      Super Admin credentials are encrypted and managed securely in the server <code style={{ background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-primary)" }}>.env</code> file (<code style={{ color: "var(--accent-primary)" }}>SUPER_ADMIN_PASSWORD</code>).
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange}>
                    <div className="form-group" style={{ maxWidth: 440 }}>
                      <label className="label">Current Password</label>
                      <PasswordInput 
                        required
                        value={passwords.currentPassword} 
                        onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})} 
                      />
                    </div>
                    <div className="form-group" style={{ maxWidth: 440 }}>
                      <label className="label">New Password</label>
                      <PasswordInput 
                        required
                        minLength={8}
                        value={passwords.newPassword} 
                        onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
                      />
                    </div>
                    <div className="form-group" style={{ maxWidth: 440 }}>
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
                )}
              </div>
            )}

            {/* ── TAB 3: Platform Branding (Super Admin Only) ── */}
            {activeTab === "branding" && isSuperAdmin && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16, marginBottom: 24 }}>
                  <Globe size={24} color="var(--accent-primary)" />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Platform Branding</h2>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Customize system name, logo, and brand identities</p>
                  </div>
                </div>

                {/* Logo Upload Section */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: 18, background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-dark)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                    {platformSettings.platformLogoUrl && !logoError ? (
                      <img 
                        src={getImageUrl(platformSettings.platformLogoUrl)} 
                        alt="Platform Logo" 
                        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }} 
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <Building2 size={36} color="var(--accent-primary)" />
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>Platform Logo / Icon</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Displays on the top-left sidebar and customer portals. (PNG, SVG, WEBP).</div>
                    
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      onChange={handlePlatformLogoChange} 
                      accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                      style={{ display: "none" }} 
                    />

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        <UploadCloud size={14} /> {uploadingLogo ? "Uploading..." : platformSettings.platformLogoUrl ? "Change Logo" : "Upload Brand Logo"}
                      </button>

                      {platformSettings.platformLogoUrl && (
                        <button 
                          type="button" 
                          className="btn btn-sm" 
                          onClick={handleRemovePlatformLogo}
                          disabled={uploadingLogo}
                          style={{ background: "var(--negative-bg)", color: "var(--negative)", border: "1px solid var(--negative)" }}
                        >
                          <Trash2 size={14} /> Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePlatformSettingsSave}>
                  <div className="form-group" style={{ maxWidth: 440 }}>
                    <label className="label">Platform Name</label>
                    <input 
                      className="input" 
                      value={platformSettings.platformName} 
                      onChange={(e) => setPlatformSettings({...platformSettings, platformName: e.target.value})} 
                      required
                      placeholder="e.g. CityRock POS"
                    />
                  </div>

                  <div className="form-group" style={{ maxWidth: 440 }}>
                    <label className="label">Platform Tagline</label>
                    <input 
                      className="input" 
                      value={platformSettings.platformTagline} 
                      onChange={(e) => setPlatformSettings({...platformSettings, platformTagline: e.target.value})} 
                      placeholder="e.g. Cloud Retail Management Platform"
                    />
                  </div>

                  <div className="form-group" style={{ maxWidth: 440 }}>
                    <label className="label">Support Contact Email</label>
                    <input 
                      type="email"
                      className="input" 
                      value={platformSettings.supportEmail} 
                      onChange={(e) => setPlatformSettings({...platformSettings, supportEmail: e.target.value})} 
                      placeholder="e.g. support@cityrock.pk"
                    />
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <Save size={16} /> {saving ? "Saving..." : "Save Platform Branding"}
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


