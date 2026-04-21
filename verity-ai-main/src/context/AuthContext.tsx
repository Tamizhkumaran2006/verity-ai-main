/**
 * AuthContext — unified auth state for Verity AI
 *
 * Strategy:
 *  - Email/password  → calls Python backend /api/auth/* directly, stores JWT
 *  - Google OAuth    → uses Google Identity Services (GSI) to get an id_token,
 *                       then sends it to Python backend /api/auth/google
 *  - Supabase        → kept for any Supabase-specific features (can be removed later)
 *
 * After sign-in the Python JWT is stored in localStorage ("verity_jwt").
 * All API calls use this token via src/lib/api.ts.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  saveToken,
  clearToken,
  getToken,
  apiGetMe,
  apiRegister,
  apiLogin,
  apiGoogleLogin,
  type UserProfile,
  type AuthResponse,
} from "@/lib/api";

export type Role = "client" | "manager" | "admin";

interface AuthContextValue {
  // Python-backend user (primary)
  user: UserProfile | null;
  role: Role;
  loading: boolean;

  // Actions
  setRole: (role: Role) => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
    role: Role
  ) => Promise<void>;
  loginWithGoogle: (idToken: string, role?: Role) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<Role>(() => {
    if (typeof window === "undefined") return "client";
    return (localStorage.getItem("veritas_role") as Role) || "client";
  });

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") {
      localStorage.setItem("veritas_role", r);
    }
  };

  // ── Restore session on mount ───────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiGetMe()
      .then(({ user: u }) => {
        setUser(u);
        setRole(u.role as Role);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Helpers ────────────────────────────────────────────
  const acceptAuth = useCallback((res: AuthResponse) => {
    saveToken(res.token);
    setUser(res.user);
    setRole(res.user.role as Role);
  }, []);

  // ── Email/password login ───────────────────────────────
  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      acceptAuth(res);
    },
    [acceptAuth]
  );

  // ── Email/password register ────────────────────────────
  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string, r: Role) => {
      const res = await apiRegister(name, email, password, r);
      acceptAuth(res);
    },
    [acceptAuth]
  );

  // ── Google OAuth ───────────────────────────────────────
  const loginWithGoogle = useCallback(
    async (idToken: string, r: Role = role) => {
      const res = await apiGoogleLogin(idToken, r);
      acceptAuth(res);
    },
    [acceptAuth, role]
  );

  // ── Sign out ───────────────────────────────────────────
  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setRole("client");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        setRole,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
