import { motion } from "framer-motion";
import { GraduationCap, CalendarCheck2, Banknote, Building2, Plane, Vote } from "lucide-react";

const cases = [
  { icon: GraduationCap, title: "CGPA Verification", desc: "Prove GPA ≥ 3.5 to recruiters without sharing your full transcript.", tag: "Universities" },
  { icon: CalendarCheck2, title: "Age Verification", desc: "Prove you're over 18 or 21 without revealing your birthday.", tag: "Compliance" },
  { icon: Banknote, title: "Salary Verification", desc: "Prove income range to landlords without exposing exact paystubs.", tag: "Finance" },
  { icon: Building2, title: "KYC for Banks", desc: "Onboard customers with cryptographic ID checks in under a second.", tag: "Banking" },
  { icon: Plane, title: "Travel & Visa", desc: "Share verified residence, employment and assets with consulates.", tag: "Government" },
  { icon: Vote, title: "Citizenship Claims", desc: "Prove eligibility for benefits or voting without document leaks.", tag: "Public Sector" },
];

export function UseCases() {
  return (
    <section id="use-cases" className="py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Use cases</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Built for the <span className="gradient-text">real world</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="glass rounded-2xl p-6 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-cyan/30 border border-accent/20 flex items-center justify-center">
                  <c.icon className="w-5 h-5 text-accent" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                  {c.tag}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2 group-hover:gradient-text transition-all">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 relative rounded-3xl glass-strong p-10 md:p-14 overflow-hidden text-center"
        >
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <div className="relative">
            <h3 className="font-display text-3xl md:text-4xl font-bold">
              Ready to verify <span className="gradient-text">privately</span>?
            </h3>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Join the platform that decouples proof from disclosure.
            </p>
            <a href="/auth" className="inline-flex mt-7 items-center gap-2 px-7 h-12 rounded-xl bg-gradient-primary text-primary-foreground font-medium shadow-glow-violet hover:opacity-90 transition-opacity">
              Start free
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
