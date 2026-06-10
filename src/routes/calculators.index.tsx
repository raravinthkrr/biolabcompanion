import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CALCULATORS, type CalculatorCategory } from "@/lib/calculators/registry";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/calculators/")({
  head: () => ({
    meta: [
      { title: "Biotech Calculators – BioCalc AI" },
      { name: "description", content: "All 15 biotechnology laboratory calculators in one place: molarity, dilution, PCR Tm, gels, buffers, media, OD600, RPM/RCF, CFU and more." },
    ],
  }),
  component: CalculatorsIndex,
});

const CATS: CalculatorCategory[] = ["Solutions", "Molecular Biology", "Microbiology", "Tools"];

function CalculatorsIndex() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return CALCULATORS;
    return CALCULATORS.filter((c) =>
      [c.label, c.short, c.description, c.category].join(" ").toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <Badge variant="secondary" className="mb-3">Calculator library</Badge>
          <h1 className="text-4xl font-display font-bold">All 15 biotech calculators</h1>
          <p className="mt-3 text-muted-foreground">
            Every calculator shows its formula, step-by-step math, and can save to your history. Sign in to save and export results.
          </p>
        </motion.div>

        <div className="mt-8 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search calculators…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        {CATS.map((cat) => {
          const items = filtered.filter((c) => c.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="mt-12">
              <h2 className="text-xl font-display font-semibold mb-4">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((c) => (
                  <Link key={c.slug} to="/calculators/$slug" params={{ slug: c.slug }} className="group">
                    <Card className="p-5 h-full hover:shadow-elegant hover:border-primary/40 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
                          <c.icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold">{c.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </div>
  );
}
