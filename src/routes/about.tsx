import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand";
import { Beaker, ShieldCheck, BrainCircuit, Cpu } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About BioCalc AI" },
      { name: "description", content: "Built for biotechnology students and lab professionals — accurate, private, and AI-powered." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <BrandLockup size="lg" />
        <h1 className="mt-6 text-4xl font-display font-bold">About BioCalc AI</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          BioCalc AI brings together the calculators we open ten times a day with the AI tools that
          actually understand a wet lab. It is built for working scientists, technicians, postdocs, and
          biotechnology students.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-10">
          {[
            { i: Beaker, t: "15 accurate calculators", d: "Molarity, dilution, PCR Tm, gels, buffers, OD600, CFU, RPM↔RCF — with formulas, step-by-step math, and exports." },
            { i: BrainCircuit, t: "Four AI tools", d: "Threaded lab assistant, protocol summarizer, experiment planner, and reagent helper, all grounded in laboratory practice." },
            { i: ShieldCheck, t: "Private by default", d: "Every record is scoped to your account by Postgres row-level security. Nobody else sees your work." },
            { i: Cpu, t: "Provider-agnostic AI", d: "Uses Lovable AI Gateway and Google Gemini by default. The provider module makes it trivial to swap to Claude, GPT, or local models." },
          ].map((f) => (
            <Card key={f.t} className="p-6">
              <f.i className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-display font-semibold">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.d}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-10 p-8 bg-gradient-primary text-primary-foreground">
          <h2 className="font-display font-bold text-2xl">Open & honest</h2>
          <p className="mt-2 opacity-90">Every formula is documented. AI is here to accelerate — not replace — your scientific judgment. Always cross-check results against your lab's SOPs and reagent manufacturer guidance.</p>
          <div className="mt-4 flex gap-2">
            <Link to="/calculators"><Button variant="secondary">Browse calculators</Button></Link>
            <Link to="/assistant"><Button variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10">Open assistant</Button></Link>
          </div>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
