import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LogoMarquee } from "@/components/site/LogoMarquee";
import { Stats } from "@/components/site/Stats";
import { Features } from "@/components/site/Features";
import { HowItWorks } from "@/components/site/HowItWorks";
import { UseCases } from "@/components/site/UseCases";
import { Testimonials } from "@/components/site/Testimonials";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <LogoMarquee />
        <Features />
        <HowItWorks />
        <Stats />
        <UseCases />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
