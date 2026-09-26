"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "./api";

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  storeId: string | null;
  avatarUrl?: string | null;
}

function normalizeUser(rawUser: any): User {
  const uid = (rawUser?._id || rawUser?.id || "").toString();
  return {
    ...rawUser,
    _id: uid,
    id: uid,
    name: rawUser?.name || "",
    email: rawUser?.email || "",
    role: rawUser?.role || "cashier",
    tenantId: rawUser?.tenantId ? String(rawUser.tenantId) : null,
    storeId: rawUser?.storeId ? String(rawUser.storeId) : null,
    avatarUrl: rawUser?.avatarUrl || null,
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; tenant: Record<string, unknown> | null }>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
  isPlatformUser: () => boolean;
  isTenantUser: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PLATFORM_ROLES = ["super_admin", "platform_admin", "PLATFORM_ADMIN", "support_agent", "sales_onboarding"];
const TENANT_ROLES = ["owner", "manager", "cashier"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const storedToken = localStorage.getItem("cityrock_token");
    const storedUser = localStorage.getItem("cityrock_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(normalizeUser(JSON.parse(storedUser)));
      } catch {
        localStorage.removeItem("cityrock_token");
        localStorage.removeItem("cityrock_user");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      router.replace("/login");
    };
    window.addEventListener("cityrock_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("cityrock_unauthorized", handleUnauthorized);
  }, [router]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const { token: newToken, user: rawUser, tenant } = res.data.data;
    const normalized = normalizeUser(rawUser);
    localStorage.setItem("cityrock_token", newToken);
    localStorage.setItem("cityrock_user", JSON.stringify(normalized));
    setToken(newToken);
    setUser(normalized);
    return { user: normalized, tenant };
  };

  const logout = () => {
    localStorage.removeItem("cityrock_token");
    localStorage.removeItem("cityrock_user");
    setToken(null);
    setUser(null);
    router.replace("/login");
  };

  const isRole = (...roles: string[]) => !!user && roles.includes(user.role);
  const isPlatformUser = () => !!user && PLATFORM_ROLES.includes(user.role);
  const isTenantUser = () => !!user && TENANT_ROLES.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isRole, isPlatformUser, isTenantUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getRedirectPath(role: string): string {
  if (PLATFORM_ROLES.includes(role)) return "/admin";
  if (role === "cashier") return "/pos";
  return "/dashboard";
}
