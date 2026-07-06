import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FlaskConical, Loader2, Copy, FileDown } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthUser } from "@/hooks/use-auth-user";
import { reagentHelper, type ReagentRecipe } from "@/lib/ai.functions";
import { exportReagentPdf } from "@/lib/export";
import { NeedAuth, AuthLoading } from "./protocols";

export const Route = createFileRoute("/reagents")({
  head: () => ({
    meta: [
      { title: "AI Reagent & Buffer Helper – BioCalc AI" },
      { name: "description", content: "Natural-language reagent and buffer prep: quantities, steps, storage, and safety, instantly." },
    ],
  }),
  component: ReagentPage,
});

const QUICK = [
  "Prepare 500 mL of 1X TAE buffer",
  "100 mL of 1X PBS",
  "1 L of LB broth with 100 µg/mL ampicillin",
  "10 mL of 50% glycerol stock buffer",
  "200 mL of SDS-PAGE running buffer",
];

function ReagentPage() {
  const { user, loading: authLoading } = useAuthUser();
  const authed = !!user;
  const [q, setQ] = useState("Prepare 500 mL of 1X TAE buffer");
  const [out, setOut] = useState<ReagentRecipe | null>(null);
  const [busy, setBusy] = useState(false);
  const fn = useServerFn(reagentHelper);

  if (authLoading) return <AuthLoading />;
  if (!authed) return <NeedAuth title="Reagent Helper" />;

  async function ask(query: string) {
    setBusy(true); setQ(query); setOut(null);
    try { setOut(await fn({ data: { query } })); }
    catch (e) {
      console.error("reagentHelper failed:", e);
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg.includes("AI") ? "The AI service is temporarily unavailable. Please try again in a few seconds." : msg || "Something went wrong. Please try again.");
    }
    finally { setBusy(false); }
  }

  function copyAll() {
    if (!out) return;
    const t = [
      `${out.reagent_name} (${out.final_volume})`,
      "",
      "Ingredients:",
      ...out.ingredients.map((i) => `  - ${i.name}: ${i.amount}${i.notes ? ` (${i.notes})` : ""}`),
      "",
      "Preparation:",
      ...out.preparation_steps.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      `Storage: ${out.storage}`,
      out.shelf_life ? `Shelf life: ${out.shelf_life}` : "",
      "",
      "Safety:",
      ...out.safety.map((s) => `  - ${s}`),
    ].join("\n");
    navigator.clipboard.writeText(t);
    toast.success("Copied recipe.");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-4xl">
        <Badge variant="secondary">AI tool</Badge>
        <h1 className="text-3xl font-display font-bold mt-2">Reagent &amp; Buffer Helper</h1>
        <p className="text-muted-foreground mt-2">Ask for any reagent or buffer in plain language. Get a complete, ready-to-use recipe.</p>

        <Card className="mt-8 p-6">
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder='e.g., "Prepare 250 mL of 0.5 M EDTA pH 8.0"' />
            <Button type="submit" disabled={busy} className="bg-gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />} Get recipe
            </Button>
          </form>
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK.map((p) => (
              <button key={p} type="button" onClick={() => ask(p)} className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted">
                {p}
              </button>
            ))}
          </div>
        </Card>

        {out && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mt-6 p-6 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-display font-bold">{out.reagent_name}</h2>
                  <p className="text-muted-foreground">Final volume: {out.final_volume}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportReagentPdf(out)}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={copyAll}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
                </div>
              </div>
              <div>
                <div className="font-display font-semibold mb-2">Ingredients</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Amount</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                  <TableBody>{out.ingredients.map((i, n) => (
                    <TableRow key={n}><TableCell>{i.name}</TableCell><TableCell className="font-mono">{i.amount}</TableCell><TableCell className="text-muted-foreground">{i.notes ?? ""}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
              <div>
                <div className="font-display font-semibold mb-2">Preparation</div>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">{out.preparation_steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </div>
              <p><strong>Storage:</strong> {out.storage}{out.shelf_life ? ` · Shelf life: ${out.shelf_life}` : ""}</p>
              <div>
                <div className="font-display font-semibold mb-2">Safety</div>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">{out.safety.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
