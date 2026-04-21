import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShieldCheck, Lock, Eye, Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-40 pb-24 overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      <div className="glow-orb w-[600px] h-[600px] -top-40 -left-40 bg-primary animate-float-slow" />
      <div className="glow-orb w-[500px] h-[500px] top-20 right-0 bg-accent animate-float" />
      <div className="glow-orb w-[400px] h-[400px] bottom-0 left-1/3 bg-neon-pink opacity-30" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <div className="glass rounded-full pl-1.5 pr-4 py-1 flex items-center gap-2 text-xs">
            <span className="bg-gradient-primary text-primary-foreground rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">New</span>
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-muted-foreground">Agentic AI · Zero-Knowledge OCR</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-center leading-[1.02] text-balance"
        >
          Privacy-Preserving
          <br />
          <span className="gradient-text-aurora">AI Verification</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground text-center max-w-2xl mx-auto text-balance"
        >
          Verify credentials, age, income and more — without ever exposing the
          underlying documents. Cryptographic guarantees, AI-grade accuracy.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 text-primary-foreground border-0 shadow-glow-violet h-12 px-7 text-base group">
            <Link to="/auth">
              Get Started <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="glass border-white/10 hover:bg-white/5 h-12 px-7 text-base">
            <Link to="/auth">Watch demo</Link>
          </Button>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap"
        >
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-gradient-primary" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
            <span>Trusted by 12k+ verifiers</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />)}
            <span className="ml-1">4.9 / 5 on G2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            SOC 2 Type II compliant
          </div>
        </motion.div>

        {/* Floating proof card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mt-20 relative max-w-4xl mx-auto"
        >
          <div className="absolute -inset-4 bg-gradient-aurora blur-3xl opacity-30 rounded-full animate-aurora" />
          <div className="relative glass-strong rounded-3xl p-6 md:p-8 shadow-elegant neon-border">
            {/* fake terminal header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">veritas://verify/zk-proof</div>
              <div className="w-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, label: "Identity verified", value: "Age ≥ 21", color: "text-success", bg: "bg-success/10", glow: "shadow-glow-violet" },
                { icon: Lock, label: "Underlying data", value: "Never exposed", color: "text-accent", bg: "bg-accent/10", glow: "shadow-glow-cyan" },
                { icon: Eye, label: "Verifier sees", value: "Yes / No only", color: "text-primary", bg: "bg-primary/10", glow: "shadow-glow-pink" },
              ].map((it, i) => (
                <motion.div
                  key={it.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl bg-card/40 border border-white/5 p-5 hover:border-white/15 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl ${it.bg} flex items-center justify-center mb-3`}>
                    <it.icon className={`w-5 h-5 ${it.color}`} />
                  </div>
                  <div className="text-xs text-muted-foreground">{it.label}</div>
                  <div className="text-lg font-semibold mt-0.5">{it.value}</div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Live verification stream · 0.43s avg latency
              </div>
              <div className="font-mono text-[11px]">proof_8a2f...e91c ✓</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
