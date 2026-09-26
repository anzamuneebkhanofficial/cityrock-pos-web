"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare, Settings,
  LogOut, ShoppingBag, Package, BarChart2, ShoppingCart, Truck,
  UserCircle, Store, Receipt, FileText, AlertTriangle, Shield
} from "lucide-react";
import { getImageUrl, adminApi } from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface SidebarProps {
  variant: "admin" | "dashboard" | "pos";
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  tenantStatus?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const adminSections: NavSection[] = [
  {
    title: "Platform",
    items: [
      { label: "Overview", href: "/admin", icon: <LayoutDashboard size={18} /> },
      { label: "Tenants", href: "/admin/tenants", icon: <Users size={18} /> },
      { label: "Billing & Plans", href: "/admin/billing", icon: <CreditCard size={18} />, roles: ["super_admin", "platform_admin", "sales_onboarding"] },
      { label: "Support Tickets", href: "/admin/tickets", icon: <MessageSquare size={18} />, roles: ["super_admin", "platform_admin", "support_agent"] },
      { label: "Team Management", href: "/admin/staff", icon: <Shield size={18} />, roles: ["super_admin", "platform_admin"] },
      { label: "Settings", href: "/admin/settings", icon: <Settings size={18} /> },
    ]
  }
];

const dashboardSections: NavSection[] = [
  {
    title: "Store Operations",
    items: [
      { label: "Overview", href: "/dashboard", icon: <LayoutDashboard size={18} />, roles: ["owner", "manager"] },
      { label: "Products", href: "/dashboard/products", icon: <Package size={18} />, roles: ["owner", "manager", "cashier"] },
      { label: "Inventory", href: "/dashboard/inventory", icon: <Store size={18} />, roles: ["owner", "manager"] },
      { label: "Sales & Orders", href: "/dashboard/sales", icon: <ShoppingCart size={18} />, roles: ["owner", "manager", "cashier"] },
      { label: "Reports", href: "/dashboard/reports", icon: <BarChart2 size={18} />, roles: ["owner", "manager"] },
      { label: "Customers", href: "/dashboard/customers", icon: <UserCircle size={18} />, roles: ["owner", "manager", "cashier"] },
      { label: "Suppliers", href: "/dashboard/suppliers", icon: <Truck size={18} />, roles: ["owner", "manager"] },
    ]
  },
  {
    title: "Store Administration",
    items: [
      { label: "Staff & Cashiers", href: "/dashboard/staff", icon: <Users size={18} />, roles: ["owner"] },
      { label: "Store Branches", href: "/dashboard/stores", icon: <Store size={18} />, roles: ["owner"] },
      { label: "Billing & Plans", href: "/dashboard/billing", icon: <CreditCard size={18} />, roles: ["owner"] },
    ]
  },
  {
    title: "Configuration",
    items: [
      { label: "Hardware & POS", href: "/dashboard/settings/hardware", icon: <Settings size={18} />, roles: ["owner", "manager"] },
      { label: "Support Tickets", href: "/dashboard/tickets", icon: <MessageSquare size={18} />, roles: ["owner", "manager"] },
      { label: "Profile Settings", href: "/dashboard/settings/profile", icon: <UserCircle size={18} /> },
    ]
  }
];

function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    active: "#34C759",
    trial: "#F7931A",
    grace_period: "#FFA733",
    suspended: "#FF5A5F",
  };
  if (!status) return null;
  return (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors[status] || "#6B6B70", display: "inline-block", marginRight: 6 }} />
  );
}

export default function Sidebar({ variant, userName: initialUserName, userRole: initialUserRole, onLogout, tenantStatus }: SidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<{ name?: string; role?: string; avatarUrl?: string | null }>({
    name: initialUserName,
    role: initialUserRole,
    avatarUrl: null,
  });

  const [platformBranding, setPlatformBranding] = useState<{ platformName: string; platformLogoUrl?: string | null }>({
    platformName: "CityRock",
    platformLogoUrl: null,
  });

  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Sync user state from localStorage and listen to updates
  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem("cityrock_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser({
            name: parsed.name || initialUserName,
            role: parsed.role || initialUserRole,
            avatarUrl: parsed.avatarUrl || null,
          });
          setAvatarError(false);
        } catch (e) {}
      }
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, [initialUserName, initialUserRole]);

  // Sync platform branding
  useEffect(() => {
    const loadBranding = () => {
      adminApi.getPlatformSettings()
        .then((res) => {
          if (res.data?.data) {
            setPlatformBranding({
              platformName: res.data.data.platformName || "CityRock",
              platformLogoUrl: res.data.data.platformLogoUrl || null,
            });
            setLogoError(false);
          }
        })
        .catch(() => {});
    };

    loadBranding();
    window.addEventListener("platformSettingsChanged", loadBranding);
    return () => window.removeEventListener("platformSettingsChanged", loadBranding);
  }, []);

  const normalizedRole = (currentUser.role || initialUserRole || "").toLowerCase();
  const rawSections = variant === "admin" ? adminSections : dashboardSections;
  
  // Filter sections and items based on role
  const sections = rawSections.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(normalizedRole);
    })
  })).filter(sec => sec.items.length > 0);

  const isActive = (href: string) => {
    if (href === "/admin" || href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const displayName = currentUser.name || initialUserName || "User";
  const displayRole = currentUser.role || initialUserRole || "";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href={variant === "admin" ? "/admin" : "/dashboard"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          {platformBranding.platformLogoUrl && !logoError ? (
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0, background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img 
                src={getImageUrl(platformBranding.platformLogoUrl)} 
                alt={platformBranding.platformName} 
                style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div style={{ width: 36, height: 36, background: "var(--accent-primary)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShoppingBag size={18} color="oklch(0.14 0 0)" />
            </div>
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
              {platformBranding.platformName || "CityRock"}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {variant === "admin" ? "Platform Admin" : "Store Dashboard"}
            </div>
          </div>
        </Link>
      </div>

      {/* Suspension warning */}
      {tenantStatus === "suspended" && (
        <div style={{ margin: "0 12px 10px" }}>
          <div className="suspension-banner" style={{ margin: 0, padding: "10px 12px", fontSize: 12 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>Account suspended.<br />POS is locked.</span>
          </div>
        </div>
      )}
      {tenantStatus === "grace_period" && (
        <div style={{ margin: "0 12px 10px" }}>
          <div className="grace-banner" style={{ margin: 0, padding: "10px 12px", fontSize: 12 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>Grace period active.<br />Please renew now.</span>
          </div>
        </div>
      )}

      {/* Scrollable Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section, secIdx) => (
          <div key={section.title || secIdx} style={{ marginBottom: 6 }}>
            {section.title && (
              <span className="sidebar-section-label">{section.title}</span>
            )}
            {section.items.map((item) => (
              <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive(item.href) ? "active" : ""}`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}

        {variant === "dashboard" && (
          <div style={{ marginTop: 8, padding: "0 4px" }}>
            <span className="sidebar-section-label">POS Terminal</span>
            <Link href="/pos" className="sidebar-nav-item" style={{ color: "var(--warning)", background: "var(--warning-bg)", border: "1px solid var(--warning)" }}>
              <Receipt size={18} />
              <span style={{ fontWeight: 600 }}>Open POS Terminal</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Pinned User footer */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {currentUser.avatarUrl && !avatarError ? (
            <img 
              src={getImageUrl(currentUser.avatarUrl)} 
              alt={displayName} 
              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--accent-primary)" }} 
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--surface-dark-alt)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <StatusDot status={tenantStatus} />
              <span style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                {displayRole.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
            <LogOut size={14} /> Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}

