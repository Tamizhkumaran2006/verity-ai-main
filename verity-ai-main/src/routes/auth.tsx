import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, FormEvent, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { useAuth, type Role } from "@/context/AuthContext";
import { toast } from "sonner";
import { Mail, Lock, User, Shield, Briefcase, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// ── Declare global google GSI type ─────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const { loginWithEmail, registerWithEmail, loginWithGoogle, setRole, role, user } =
    useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Redirect if already signed in
  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  // ── Load Google Identity Services script ──────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const scriptId = "gsi-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initGSI();
      document.head.appendChild(script);
    } else if (window.google) {
      initGSI();
    }
  }, [role]); // re-init when role changes so the token carries the right role

  function initGSI() {
    if (!window.google || !googleBtnRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: googleBtnRef.current.offsetWidth || 340,
    });
  }

  async function handleGoogleCredential(response: { credential: string }) {
    setLoading(true);
    try {
      await loginWithGoogle(response.credential, role as Role);
      toast.success("Signed in with Google");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Email / Password submit ────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await registerWithEmail(name, email, password, role as Role);
        toast.success("Account created", { description: "Welcome to VeritasAI" });
      } else {
        await loginWithEmail(email, password);
        toast.success("Welcome back");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="glow-orb w-[500px] h-[500px] -top-40 -left-40 bg-primary" />
      <div className="glow-orb w-[400px] h-[400px] bottom-0 right-1/2 bg-accent" />
      <div className="glow-orb w-[400px] h-[400px] top-20 right-0 bg-neon-pink opacity-40" />

      {/* Left: brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 border-r border-white/5">
        <Logo />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6 max-w-md"
        >
          <h2 className="font-display text-4xl font-bold leading-tight text-balance">
            Verify anything.<br />
            <span className="gradient-text-aurora">Reveal nothing.</span>
          </h2>
          <p className="text-muted-foreground">
            Join 12,000+ teams using VeritasAI to issue and consume cryptographic
            proofs without ever exposing the underlying documents.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "End-to-end encrypted document vault",
              "Agentic AI extraction in 0.43s",
              "Zero-knowledge proofs out of the box",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                  <Shield className="w-3 h-3 text-primary-foreground" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </motion.div>
        <div className="text-xs text-muted-foreground">© 2026 VeritasAI · SOC 2 Type II</div>
      </div>

      {/* Right: form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center px-4 py-12 w-full"
      >
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="glass-strong rounded-3xl p-8 shadow-elegant">
            {/* Mode switcher */}
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-6">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    mode === m
                      ? "bg-gradient-primary text-primary-foreground shadow-glow-violet"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <h1 className="font-display text-2xl font-bold text-center">
              {mode === "login" ? "Welcome back" : "Get started"}
            </h1>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
              {mode === "login"
                ? "Sign in to your VeritasAI account"
                : "Create your VeritasAI account"}
            </p>

            {/* Role selector */}
            <div className="mb-5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                I am a
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "client", label: "Client", icon: User, desc: "Submit documents" },
                    { id: "manager", label: "Manager", icon: Briefcase, desc: "Verify requests" },
                  ] as const
                ).map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as Role)}
                      className={`relative rounded-xl p-3 text-left border transition-all ${
                        active
                          ? "border-primary/60 bg-primary/10 shadow-glow-violet"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <r.icon
                        className={`w-4 h-4 mb-1.5 ${active ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <div className="text-sm font-semibold">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence mode="wait">
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 h-11"
                        required={mode === "register"}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 h-11"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 h-11"
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-primary text-primary-foreground border-0 shadow-glow-violet hover:opacity-90"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "login" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google Sign-In button rendered by GSI */}
            {GOOGLE_CLIENT_ID ? (
              <div
                ref={googleBtnRef}
                id="google-signin-btn"
                className="w-full flex justify-center"
              />
            ) : (
              <p className="text-center text-xs text-destructive">
                VITE_GOOGLE_CLIENT_ID not set
              </p>
            )}

            <p className="text-center text-xs text-muted-foreground mt-6">
              <Link to="/" className="hover:text-foreground">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
