import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "VeritasAI replaced 3 vendors and our compliance team finally sleeps. The ZK proofs are mathematically airtight.",
    author: "Maya Chen",
    role: "Head of Risk",
    company: "OpenBank",
    avatar: "from-primary to-accent",
  },
  {
    quote: "We onboarded 40,000 students in a weekend. The agentic OCR caught forgeries our human reviewers missed.",
    author: "Dr. Rahul Iyer",
    role: "Registrar",
    company: "MIT Online",
    avatar: "from-accent to-neon-pink",
  },
  {
    quote: "Best privacy-preserving stack we've seen. The verifier API dropped into our existing flow in two hours.",
    author: "Jordan Reid",
    role: "Staff Engineer",
    company: "Stripe",
    avatar: "from-neon-pink to-primary",
  },
];

export function Testimonials() {
  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 dot-bg opacity-50" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Loved by teams</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-balance">
            Trusted where <span className="gradient-text">trust matters most</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-6 relative group"
            >
              <Quote className="absolute top-5 right-5 w-8 h-8 text-primary/20 group-hover:text-primary/40 transition-colors" />
              <p className="text-sm leading-relaxed mb-6 relative">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatar}`} />
                <div>
                  <div className="text-sm font-semibold">{t.author}</div>
                  <div className="text-xs text-muted-foreground">{t.role} · {t.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
