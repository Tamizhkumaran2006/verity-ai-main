const LOGOS = [
  "Stanford", "Goldman", "Acme Corp", "Lufthansa", "OpenBank",
  "Coinbase", "MIT", "Visa", "Stripe", "Linear",
];

export function LogoMarquee() {
  return (
    <section className="py-16 relative overflow-hidden border-y border-white/5">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Powering verification for the world's most demanding teams
        </p>
      </div>
      <div className="relative">
        <div
          className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, var(--background), transparent)" }}
        />
        <div
          className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(-90deg, var(--background), transparent)" }}
        />
        <div className="flex animate-marquee gap-16 w-max">
          {[...LOGOS, ...LOGOS].map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="font-display text-2xl font-bold text-muted-foreground/60 hover:text-foreground transition-colors whitespace-nowrap"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
