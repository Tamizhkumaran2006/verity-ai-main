import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, FileText, Eye, TrendingUp, Users, ShieldCheck, AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

type ReqStatus = "pending" | "approved" | "rejected";

interface VerifyRequest {
  id: string;
  user: string;
  email: string;
  document: string;
  type: string;
  claim: string;
  submitted: string;
  status: ReqStatus;
  fields: { label: string; value: string }[];
}

const INITIAL: VerifyRequest[] = [
  {
    id: "REQ-2841", user: "Alex Morgan", email: "alex@stanford.edu", document: "Transcript_2024.pdf",
    type: "Academic", claim: "CGPA ≥ 3.5", submitted: "2 min ago", status: "pending",
    fields: [
      { label: "Institution", value: "Stanford University" },
      { label: "CGPA", value: "3.82 / 4.00" },
      { label: "Issued", value: "May 2024" },
      { label: "Signature", value: "Valid" },
    ],
  },
  {
    id: "REQ-2840", user: "Sara Chen", email: "sara.c@gmail.com", document: "Passport.jpg",
    type: "Identity", claim: "Age ≥ 21", submitted: "12 min ago", status: "pending",
    fields: [
      { label: "Country", value: "Singapore" },
      { label: "DOB year", value: "1998" },
      { label: "Expiry", value: "2031" },
      { label: "Tamper score", value: "0.02 (clean)" },
    ],
  },
  {
    id: "REQ-2839", user: "Marcus Hill", email: "marcus@acme.io", document: "Payslip.pdf",
    type: "Financial", claim: "Salary ≥ 80k", submitted: "1 hr ago", status: "pending",
    fields: [
      { label: "Employer", value: "Acme Corp" },
      { label: "Gross income", value: "$94,200" },
      { label: "Period", value: "March 2026" },
      { label: "Signature", value: "Valid" },
    ],
  },
  {
    id: "REQ-2838", user: "Priya Patel", email: "priya@nyu.edu", document: "DriverID.png",
    type: "Identity", claim: "Age ≥ 18", submitted: "3 hr ago", status: "approved",
    fields: [{ label: "State", value: "NY" }, { label: "DOB year", value: "2001" }],
  },
  {
    id: "REQ-2837", user: "Jordan Kim", email: "jkim@outlook.com", document: "Diploma.pdf",
    type: "Academic", claim: "Bachelor's degree", submitted: "5 hr ago", status: "rejected",
    fields: [{ label: "Institution", value: "Unknown" }, { label: "Tamper score", value: "0.78 (high)" }],
  },
];

const TREND = [
  { day: "Mon", v: 42 }, { day: "Tue", v: 58 }, { day: "Wed", v: 51 },
  { day: "Thu", v: 73 }, { day: "Fri", v: 89 }, { day: "Sat", v: 64 }, { day: "Sun", v: 78 },
];

const TYPE_DATA = [
  { name: "Identity", value: 42, color: "oklch(0.72 0.22 295)" },
  { name: "Academic", value: 28, color: "oklch(0.82 0.18 200)" },
  { name: "Financial", value: 22, color: "oklch(0.74 0.22 350)" },
  { name: "Other", value: 8, color: "oklch(0.78 0.19 155)" },
];

export function ManagerDashboard() {
  const [requests, setRequests] = useState(INITIAL);
  const [selected, setSelected] = useState<VerifyRequest | null>(INITIAL[0]);

  const act = (id: string, status: ReqStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) setSelected({ ...selected, status });
    toast[status === "approved" ? "success" : "error"](
      `Request ${id} ${status}`,
      { description: status === "approved" ? "Proof issued to user" : "User notified" }
    );
  };

  const stats = [
    { label: "Pending", value: requests.filter((r) => r.status === "pending").length, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Approved today", value: 184, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Active users", value: "2.4k", icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { label: "Fraud blocked", value: 12, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Manager console</h1>
        <p className="text-muted-foreground mt-1">Review verification requests and approve cryptographic proofs.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-5"
          >
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Verifications this week
              </h3>
              <div className="text-xs text-muted-foreground mt-0.5">+24% vs. last week</div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.22 295)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.22 295)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
                <XAxis dataKey="day" stroke="oklch(0.72 0.03 270)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.72 0.03 270)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.2 0.04 270)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "oklch(0.72 0.03 270)" }}
                />
                <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.22 295)" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            By document type
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={TYPE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                  {TYPE_DATA.map((d) => <Cell key={d.name} fill={d.color} stroke="transparent" />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.2 0.04 270)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-3">
            {TYPE_DATA.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Requests + detail */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-3">
          <h3 className="font-semibold mb-4">Verification requests</h3>
          <div className="space-y-1">
            {requests.map((r) => {
              const isSelected = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-primary/20 border border-white/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.user} <span className="text-muted-foreground font-normal">· {r.id}</span></div>
                        <div className="text-xs text-muted-foreground truncate">{r.claim} · {r.submitted}</div>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent" />
            Request detail
          </h3>
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">User</div>
                <div className="text-sm font-medium">{selected.user}</div>
                <div className="text-xs text-muted-foreground">{selected.email}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Claim</div>
                <div className="text-sm font-medium">{selected.claim}</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Extracted</div>
                <div className="space-y-1.5">
                  {selected.fields.map((f) => (
                    <div key={f.label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-medium">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.status === "pending" ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => act(selected.id, "approved")}
                    className="flex-1 bg-success/20 hover:bg-success/30 text-success border border-success/30"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                  <Button
                    onClick={() => act(selected.id, "rejected")}
                    variant="outline"
                    className="flex-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                </div>
              ) : (
                <div className="pt-2">
                  <StatusBadge status={selected.status} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a request</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReqStatus }) {
  if (status === "approved")
    return (
      <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">
        <XCircle className="w-3 h-3 mr-1" /> Rejected
      </Badge>
    );
  return (
    <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 hover:bg-amber-400/20">
      <Clock className="w-3 h-3 mr-1" /> Pending
    </Badge>
  );
}
