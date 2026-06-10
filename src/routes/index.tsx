import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  FlaskConical, MessageSquare, FileText, BrainCircuit, BookOpen,
  Calculator as CalcIcon, ChevronRight, ShieldCheck, Sparkles, Cpu, Layers, Atom,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CALCULATORS } from "@/lib/calculators/registry";
import { BrandLockup } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BioCalc AI – Your AI-Powered Biotech Lab Companion" },
      { name: "description", content: "15 accurate biotech calculators plus an AI lab assistant, protocol summarizer, experiment planner, and reagent helper." },
      { property: "og:title", content: "BioCalc AI" },
      { property: "og:description", content: "AI-powered toolkit for molecular biology, microbiology, and biochemistry." },
    ],
  }),
  component: Landing,
});

const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
        <div className="absolute top-20 -right-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-primary-glow/15 blur-3xl" aria-hidden />

        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <motion.div {...fade} className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3 mr-1 inline" /> AI-powered laboratory toolkit
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold tracking-tight">
              Your AI-powered <br className="hidden sm:block" />
              <span className="text-gradient-primary">biotechnology lab</span> companion
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              15 scientifically accurate calculators, an expert AI lab assistant, intelligent protocol &amp; experiment tools — built for working scientists and students.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/calculators">
                <Button size="xl" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow transition-shadow">
                  Open calculators <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link to="/assistant">
                <Button size="xl" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" /> Ask the AI Assistant
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stat cards */}
          <motion.div {...fade} transition={{ duration: 0.5, delay: 0.15 }} className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { v: "15", l: "Lab Calculators", i: CalcIcon },
              { v: "4", l: "AI Tools", i: BrainCircuit },
              { v: "100%", l: "Open & Private", i: ShieldCheck },
              { v: "∞", l: "Saved History", i: Layers },
            ].map((s) => (
              <Card key={s.l} className="p-5 text-center shadow-card border-border/60 bg-card/70 backdrop-blur">
                <s.i className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-display font-bold">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quick calculator access */}
      <section className="container mx-auto px-4 py-20">
        <motion.div {...fade} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Calculators built for the bench</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Quick, accurate, and reproducible — with formulas, step-by-step math, and saved history.</p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CALCULATORS.map((c, i) => (
            <motion.div key={c.slug} {...fade} transition={{ duration: 0.4, delay: i * 0.03 }}>
              <Link to="/calculators/$slug" params={{ slug: c.slug }} className="group block">
                <Card className="p-4 h-full hover:shadow-elegant hover:border-primary/40 transition-all">
                  <c.icon className="h-6 w-6 text-primary mb-3" />
                  <div className="font-display font-semibold text-sm">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.short}</div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section className="bg-card border-y">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              { i: MessageSquare, t: "AI Lab Assistant", d: "ChatGPT-style assistant trained for molecular biology, microbiology, biochemistry, cloning, CRISPR, cell culture and more.", to: "/assistant" },
              { i: FileText, t: "Protocol Summarizer", d: "Paste or upload PDF/DOCX/TXT protocols. Get steps, materials, reagents, safety notes, and common mistakes.", to: "/protocols" },
              { i: BrainCircuit, t: "Experiment Planner", d: "Describe your goal, equipment, and budget. Get a structured plan with workflow, controls, and troubleshooting.", to: "/planner" },
              { i: FlaskConical, t: "Reagent Helper", d: "Natural-language reagent recipes — quantities, prep steps, storage conditions, and safety in seconds.", to: "/reagents" },
              { i: BookOpen, t: "Saved History", d: "Every calculation, chat, and protocol is saved to your private library — searchable and exportable.", to: "/history" },
              { i: Cpu, t: "Provider-agnostic AI", d: "Uses Lovable AI Gateway by default. Swap models or providers in one line of code.", to: "/about" },
            ].map((f) => (
              <Link key={f.t} to={f.to}>
                <Card className="p-6 h-full hover:shadow-elegant transition-shadow group">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 shadow-glow group-hover:scale-105 transition-transform">
                    <f.i className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg">{f.t}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{f.d}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI preview */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fade}>
            <Badge variant="outline" className="mb-4">AI Preview</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold">Talk to a lab expert, instantly</h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Threaded conversations, markdown answers, math and code rendering, and saved history. Ask anything from PCR setup to enzyme kinetics.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/assistant"><Button className="bg-gradient-primary text-primary-foreground">Start a chat</Button></Link>
              <Link to="/reagents"><Button variant="outline">Try Reagent Helper</Button></Link>
            </div>
          </motion.div>
          <motion.div {...fade}>
            <Card className="p-6 shadow-elegant">
              <div className="space-y-4">
                <div className="bg-muted rounded-2xl rounded-tl-sm p-3 text-sm max-w-[80%]">
                  How do I set up a 25 µL PCR with Taq polymerase, primers at 10 µM, and 100 ng template?
                </div>
                <div className="text-sm space-y-2 pl-1">
                  <div className="font-display font-semibold text-primary">BioCalc AI</div>
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    For a 25 µL Taq reaction: 2.5 µL 10X buffer, 0.5 µL dNTPs (10 mM each), 0.5 µL each primer (10 µM → 0.2 µM final), 0.125 µL Taq (5 U/µL → 0.025 U/µL), 1 µL template (100 ng), and 19.875 µL nuclease-free water…
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Why */}
      <section className="bg-gradient-hero">
        <div className="container mx-auto px-4 py-20">
          <motion.div {...fade} className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold">Why BioCalc AI</h2>
            <p className="text-muted-foreground mt-3">Built by people who know what it feels like to redo a calculation at midnight.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { t: "Scientifically accurate", d: "Every formula is open, displayed, and reviewable." },
              { t: "Cross-disciplinary", d: "Molecular biology, microbiology, biochemistry — one toolkit." },
              { t: "Private by default", d: "Your work stays in your account. RLS-secured." },
              { t: "Built for speed", d: "Live calculation, instant exports, keyboard shortcuts." },
            ].map((w) => (
              <Card key={w.t} className="p-6 bg-card/80 backdrop-blur">
                <Atom className="h-5 w-5 text-primary mb-3" />
                <div className="font-display font-semibold">{w.t}</div>
                <div className="text-sm text-muted-foreground mt-2">{w.d}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (illustrative) */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-display font-bold text-center mb-10">What lab folks say</h2>
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { q: "Replaced four bookmarks and a sticky note on my monitor.", n: "Postdoc, molecular virology" },
            { q: "The protocol summarizer is a study aid and a lab aid in one.", n: "Final-year biotech student" },
            { q: "I keep the assistant open while pipetting. It's like a TA in my browser.", n: "Lab technician, biochem" },
          ].map((t) => (
            <Card key={t.n} className="p-6">
              <p className="text-base">“{t.q}”</p>
              <p className="text-xs text-muted-foreground mt-3">— {t.n} (illustrative)</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-10">Frequently asked</h2>
          <div className="space-y-3">
            {[
              { q: "Is BioCalc AI free to use?", a: "Yes — calculators are free. AI features run on Lovable AI Gateway with a generous free allowance." },
              { q: "Are my calculations and chats private?", a: "Yes. Data is scoped to your account with row-level security; no one else can see it." },
              { q: "Can I export results?", a: "Yes — every calculator supports copy, PDF export, and Save to History. History exports to CSV." },
              { q: "Which AI model powers the assistant?", a: "By default we use Google Gemini 3 Flash via Lovable AI Gateway. The provider module makes it easy to swap to Claude, GPT, or local models." },
              { q: "Should I trust AI answers for lab work?", a: "Always verify against authoritative protocols and your lab's SOPs. BioCalc AI is a productivity tool, not a substitute for scientific judgment." },
            ].map((f) => (
              <details key={f.q} className="group rounded-xl border bg-card p-5 open:shadow-card">
                <summary className="cursor-pointer font-display font-semibold flex items-center justify-between">
                  {f.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-sm text-muted-foreground mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <Card className="p-10 sm:p-16 text-center bg-gradient-primary text-primary-foreground shadow-elegant">
          <BrandLockup size="lg" />
          <h2 className="text-3xl sm:text-4xl font-display font-bold mt-4">Ready when you are.</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Sign in to save calculations, chat threads, plans and protocols across devices.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="xl" variant="secondary">Get started — free</Button></Link>
            <Link to="/calculators"><Button size="xl" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10">Browse calculators</Button></Link>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}
