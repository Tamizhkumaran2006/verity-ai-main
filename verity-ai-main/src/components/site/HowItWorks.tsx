import { motion } from "framer-motion";
import { Upload, Cpu, ShieldCheck, Send } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload", desc: "Drop a document — passport, transcript, payslip. End-to-end encrypted." },
  { icon: Cpu, title: "Extract", desc: "Agentic AI parses fields, validates signatures and detects tampering." },
  { icon: ShieldCheck, title: "Prove", desc: "Generate a zero-knowledge proof for the exact claim you want to share." },
  { icon: Send, title: "Verify", desc: "Send the proof. The verifier learns only the answer — never the data." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 relative">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Process</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            How it <span className="gradient-text-pink">works</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Four steps from raw document to private, verifiable proof.
          </p>
        </div>

        <div className="relative grid md:grid-cols-4 gap-5">
          {/* connector line */}
          <div className="hidden md:block absolute top-12 left-12 right-12 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative glass rounded-2xl p-6 text-center"
            >
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-primary rounded-full blur-lg opacity-50" />
                <div className="relative w-full h-full rounded-full bg-gradient-primary flex items-center justify-center">
                  <s.icon className="w-7 h-7 text-primary-foreground" />
                </div>
              </div>
              <div className="text-xs font-mono text-accent mb-1">STEP {String(i + 1).padStart(2, "0")}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
