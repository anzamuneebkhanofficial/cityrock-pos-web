"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; tenantStatus?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cityrock_user");
    if (!stored) { 
      router.replace("/login"); 
      return; 
    }
    const parsedUser = JSON.parse(stored);
    const role = (parsedUser.role || "").toLowerCase();
    if (!["super_admin", "platform_admin", "support_agent", "sales_onboarding"].includes(role)) {
      if (role === "cashier") {
        router.replace("/pos");
      } else {
        router.replace("/dashboard");
      }
      return;
    }
    setUser(parsedUser);
  }, [router]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100vw", overflow: "hidden" }}>
      <Sidebar 
        variant="admin" 
        userName={user?.name} 
        userRole={user?.role} 
        onLogout={() => { localStorage.clear(); router.replace("/login"); }} 
      />
      {children}
    </div>
  );
}
