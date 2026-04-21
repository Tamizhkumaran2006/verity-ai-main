import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload, FileText, Sparkles, CheckCircle2, XCircle, Loader2, X,
  History, Image as ImageIcon, ShieldCheck, Clock,
} from "lucide-react";

type Status = "idle" | "uploading" | "extracting" | "verified" | "failed";

interface ExtractedField { label: string; value: string; }
interface HistoryItem {
  id: string;
  name: string;
  type: string;
  date: string;
  status: "verified" | "failed";
  claim: string;
}

const SAMPLE_HISTORY: HistoryItem[] = [
  { id: "1", name: "Transcript_2024.pdf", type: "Academic", date: "2 days ago", status: "verified", claim: "CGPA ≥ 3.5" },
  { id: "2", name: "Passport.jpg", type: "Identity", date: "5 days ago", status: "verified", claim: "Age ≥ 21" },
  { id: "3", name: "Payslip_Mar.pdf", type: "Financial", date: "1 week ago", status: "verified", claim: "Salary ≥ 50k" },
  { id: "4", name: "OldID.png", type: "Identity", date: "2 weeks ago", status: "failed", claim: "Tampering detected" },
];

export function ClientDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [extracted, setExtracted] = useState<ExtractedField[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setStatus("idle");
    setExtracted([]);
    setProgress(0);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
    toast.success("File ready", { description: f.name });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [] },
    maxFiles: 1,
  });

  const startVerification = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    // simulate upload
    for (let p = 0; p <= 60; p += 10) {
      await new Promise((r) => setTimeout(r, 120));
      setProgress(p);
    }
    setStatus("extracting");
    for (let p = 60; p <= 100; p += 10) {
      await new Promise((r) => setTimeout(r, 150));
      setProgress(p);
    }
    // mock extracted data
    setExtracted([
      { label: "Document type", value: "Academic Transcript" },
      { label: "Full name", value: "Alex R. Morgan" },
      { label: "Institution", value: "Stanford University" },
      { label: "CGPA", value: "3.82 / 4.00" },
      { label: "Issued", value: "May 2024" },
      { label: "Signature valid", value: "Yes" },
    ]);
    const ok = Math.random() > 0.15;
    setStatus(ok ? "verified" : "failed");
    if (ok) toast.success("Verification complete", { description: "Cryptographic proof generated" });
    else toast.error("Verification failed", { description: "Document could not be verified" });
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus("idle");
    setProgress(0);
    setExtracted([]);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Client workspace</h1>
        <p className="text-muted-foreground mt-1">Upload a document and generate a privacy-preserving proof.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload + preview */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent" />
            Upload document
          </h2>

          {!file ? (
            <div
              {...getRootProps()}
              className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer p-10 text-center ${
                isDragActive ? "border-primary bg-primary/5 shadow-glow-violet" : "border-white/15 hover:border-white/30 hover:bg-white/[0.02]"
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary/20 border border-white/10 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="font-medium">{isDragActive ? "Drop it here" : "Drag & drop your file"}</div>
              <div className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG up to 20MB</div>
              <Button type="button" variant="outline" size="sm" className="mt-4 bg-white/5 border-white/10">
                Browse files
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30 aspect-[4/3] flex items-center justify-center relative">
                {previewUrl ? (
                  <img src={previewUrl} alt={file.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">PDF preview</div>
                  </div>
                )}
                {status === "extracting" && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-shimmer" />
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="w-4 h-4 text-accent shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={reset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {(status === "uploading" || status === "extracting") && (
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {status === "uploading" ? "Encrypting & uploading…" : "AI extracting fields…"}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              {status === "idle" && (
                <Button
                  onClick={startVerification}
                  className="w-full h-11 bg-gradient-primary text-primary-foreground border-0 shadow-glow-violet hover:opacity-90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Verification
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="glass rounded-2xl p-6 min-h-[400px]">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Extracted data & verification
          </h2>

          <AnimatePresence mode="wait">
            {extracted.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16"
              >
                <Sparkles className="w-10 h-10 mb-3 opacity-40" />
                <div className="text-sm">Results will appear here</div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Status banner */}
                <div
                  className={`rounded-xl p-4 border flex items-center gap-3 ${
                    status === "verified"
                      ? "bg-success/10 border-success/30"
                      : "bg-destructive/10 border-destructive/30"
                  }`}
                >
                  {status === "verified" ? (
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  ) : (
                    <XCircle className="w-6 h-6 text-destructive" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {status === "verified" ? "Verified" : "Not verified"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {status === "verified"
                        ? "Zero-knowledge proof generated successfully"
                        : "Document signature could not be validated"}
                    </div>
                  </div>
                </div>

                {/* Extracted fields */}
                <div className="space-y-1">
                  {extracted.map((f, i) => (
                    <motion.div
                      key={f.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-white/5"
                    >
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <span className="text-sm font-medium">{f.value}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* History */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-accent" />
          Verification history
        </h2>
        <div className="space-y-1">
          {SAMPLE_HISTORY.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {h.date} · {h.type}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:block">{h.claim}</span>
                {h.status === "verified" ? (
                  <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">
                    <XCircle className="w-3 h-3 mr-1" /> Failed
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
