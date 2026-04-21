import { motion } from "framer-motion";

const STATS = [
  { value: "12M+", label: "Documents verified" },
  { value: "99.4%", label: "Field accuracy" },
  { value: "0.43s", label: "Avg proof latency" },
  { value: "Zero", label: "Data breaches" },
];

export function Stats() {
  return (
    <section className="py-20 relative">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative glass-strong rounded-3xl p-8 md:p-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-aurora opacity-[0.06] animate-aurora" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-display text-4xl md:text-5xl font-bold gradient-text">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-2">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
