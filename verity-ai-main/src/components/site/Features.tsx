import { motion } from "framer-motion";
import { ScanText, Bot, ShieldCheck, Fingerprint, Database, Workflow } from "lucide-react";

const features = [
  {
    icon: ScanText,
    title: "AI OCR Engine",
    desc: "Extract structured data from passports, transcripts, payslips and IDs with 99.4% field accuracy.",
    glow: "shadow-glow-violet",
    iconBg: "bg-gradient-primary",
  },
  {
    icon: Bot,
    title: "Agentic AI Workflows",
    desc: "Autonomous agents reason about documents, cross-check signals, and detect tampering in real time.",
    glow: "shadow-glow-cyan",
    iconBg: "bg-gradient-cyan",
  },
  {
    icon: ShieldCheck,
    title: "Zero-Knowledge Proofs",
    desc: "Prove a fact about your data without revealing the data itself. Verifiers see only yes/no.",
    glow: "shadow-glow-pink",
    iconBg: "bg-gradient-violet-pink",
  },
  {
    icon: Fingerprint,
    title: "Tamper Detection",
    desc: "Pixel-level forensics, EXIF analysis and signature checking flag forged documents instantly.",
    glow: "shadow-glow-violet",
    iconBg: "bg-gradient-primary",
  },
  {
    icon: Database,
    title: "Encrypted Vault",
    desc: "Documents are end-to-end encrypted at rest. Only the user holds the keys.",
    glow: "shadow-glow-cyan",
    iconBg: "bg-gradient-cyan",
  },
  {
    icon: Workflow,
    title: "Verifier API",
    desc: "Drop-in REST/SDK for banks, employers and universities to issue and consume proofs.",
    glow: "shadow-glow-pink",
    iconBg: "bg-gradient-violet-pink",
  },
];

export function Features() {
  return (
    <section id="features" className="py-32 relative">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Capabilities</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-balance">
            Everything you need to <span className="gradient-text">prove anything</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            A complete stack for private verification — from raw document to cryptographic proof.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -6 }}
              className="group relative rounded-2xl glass p-6 overflow-hidden hover:border-white/20 transition-all"
            >
              {/* Hover glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative">
                <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-5 group-hover:${f.glow} transition-shadow`}>
                  <f.icon className="w-5 h-5 text-primary-foreground" strokeWidth={2.2} />
                </div>
                <h3 className="font-semibold text-lg mb-2 group-hover:gradient-text transition-all">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-accent font-medium">Learn more →</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
