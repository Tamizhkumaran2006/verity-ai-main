import { Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary rounded-lg blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </div>
      <span className="font-display font-bold text-lg tracking-tight">
        Veritas<span className="gradient-text">AI</span>
      </span>
    </Link>
  );
}
