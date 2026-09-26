"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; tenantStatus?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { 
      router.replace("/login"); 
      return; 
    }
    const u = JSON.parse(stored);
    const role = (u.role || "").toLowerCase();
    if (["super_admin", "platform_admin", "support_agent", "sales_onboarding"].includes(role)) {
      router.replace("/admin");
      return;
    }
    if (role === "cashier") {
      router.replace("/pos");
      return;
    }
    setUser(u);
  }, [router]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100vw", overflow: "hidden" }}>
      <Sidebar 
        variant="dashboard" 
        userName={user?.name} 
        userRole={user?.role} 
        tenantStatus={user?.tenantStatus}
        onLogout={() => { localStorage.clear(); router.replace("/login"); }} 
      />
      {/* We let the children handle the <main className="main-content"> wrapper 
          so that pages can customize their padding if needed. */}
      {children}
    </div>
  );
}
