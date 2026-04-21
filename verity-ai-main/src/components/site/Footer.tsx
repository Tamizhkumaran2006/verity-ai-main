import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/50 mt-32">
      <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <Logo />
        <p className="text-sm text-muted-foreground">
          © 2026 VeritasAI · Privacy-preserving verification
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Docs</a>
        </div>
      </div>
    </footer>
  );
}
