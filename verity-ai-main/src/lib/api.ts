/**
 * Verity AI — Python Backend API client
 * All calls proxy through Vite → http://localhost:5000
 */

const BASE = "/api";

// ── Token storage ──────────────────────────────────────────
export const TOKEN_KEY = "verity_jwt";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch wrapper ─────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "client" | "manager" | "admin";
  auth_provider: string;
  photo_url: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  last_login: string | null;
  created_at: string;
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<AuthResponse> {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function apiLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGoogleLogin(
  idToken: string,
  role: string
): Promise<AuthResponse> {
  return apiFetch("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken, role }),
  });
}

export async function apiGetMe(): Promise<{ success: boolean; user: UserProfile }> {
  return apiFetch("/auth/me");
}

// ── Upload ─────────────────────────────────────────────────

export async function apiUploadDocuments(
  files: File[],
  loanType: string,
  processNow = true
) {
  const token = getToken();
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("loan_type", loanType);
  form.append("process_now", processNow ? "true" : "false");

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiGetUploadStatus(verificationId: string) {
  return apiFetch(`/upload/${verificationId}`);
}

// ── Verify ─────────────────────────────────────────────────

export async function apiVerify(payload: {
  verificationId?: string;
  extractedData?: Record<string, unknown>;
  loanType?: string;
}) {
  return apiFetch("/verify", {
    method: "POST",
    body: JSON.stringify({
      verification_id: payload.verificationId,
      extracted_data: payload.extractedData,
      loan_type: payload.loanType ?? "personal",
    }),
  });
}

export async function apiQuickCheck(
  extractedData: Record<string, unknown>,
  loanType: string
) {
  return apiFetch("/verify/quick-check", {
    method: "POST",
    body: JSON.stringify({ extracted_data: extractedData, loan_type: loanType }),
  });
}

// ── Manager ────────────────────────────────────────────────

export async function apiGetRequests(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch(`/manager/requests${qs}`);
}

export async function apiApprove(verificationId: string, comment?: string) {
  return apiFetch("/manager/approve", {
    method: "POST",
    body: JSON.stringify({ verification_id: verificationId, comment }),
  });
}

export async function apiReject(verificationId: string, reason: string) {
  return apiFetch("/manager/reject", {
    method: "POST",
    body: JSON.stringify({ verification_id: verificationId, reason }),
  });
}

export async function apiGetStats() {
  return apiFetch("/manager/stats");
}

// ── History ────────────────────────────────────────────────

export async function apiGetHistory(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch(`/history${qs}`);
}

export async function apiCancelApplication(recordId: string) {
  return apiFetch(`/history/${recordId}`, { method: "DELETE" });
}

// ── Health ─────────────────────────────────────────────────

export async function apiHealth() {
  return apiFetch("/health");
}
