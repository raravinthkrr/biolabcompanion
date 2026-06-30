import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Star, Trash2, FileDown, Search, RotateCcw, FlaskConical } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listCalculations, toggleFavoriteCalc, deleteCalculation } from "@/lib/data.functions";
import { exportToCsv, exportCalculationPdf } from "@/lib/export";
import { flattenForDisplay, type KV } from "@/lib/format";
import { NeedAuth } from "./protocols";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Saved History – BioCalc AI" },
      { name: "description", content: "All your saved calculations, favorites, with CSV export." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);

  const listFn = useServerFn(listCalculations);
  const favFn = useServerFn(toggleFavoriteCalc);
  const delFn = useServerFn(deleteCalculation);
  const qc = useQueryClient();

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user)); }, []);
  const history = useQuery({ queryKey: ["history"], queryFn: () => listFn({}), enabled: authed === true });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (history.data ?? []).filter((r) => {
      if (onlyFav && !r.favorite) return false;
      if (!s) return true;
      const hay = [r.calculator_label, r.summary ?? "", JSON.stringify(r.inputs ?? {}), JSON.stringify(r.outputs ?? {})].join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [history.data, q, onlyFav]);

  if (authed === false) return <NeedAuth title="Saved history" />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-6xl">
        <Badge variant="secondary">Your library</Badge>
        <h1 className="text-3xl font-display font-bold mt-2">Saved history</h1>
        <p className="text-muted-foreground mt-2">Your calculation record book. Search, favorite, export, or revisit.</p>

        <div className="mt-6 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search calculations…" className="pl-9" />
          </div>
          <Button variant={onlyFav ? "default" : "outline"} size="sm" onClick={() => setOnlyFav((v) => !v)}>
            <Star className={"h-4 w-4 mr-1 " + (onlyFav ? "fill-current" : "")} /> Favorites
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered.map((r) => ({
            id: r.id, calculator: r.calculator_label, summary: r.summary ?? "",
            inputs: flattenForDisplay(r.inputs).map((kv) => `${kv.label}: ${kv.value}`).join("; "),
            outputs: flattenForDisplay(r.outputs).map((kv) => `${kv.label}: ${kv.value}`).join("; "),
            favorite: r.favorite, created_at: r.created_at,
          })), `biocalc-history-${Date.now()}.csv`)}>
            <FileDown className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              No saved calculations match your filter.{" "}
              <Link to="/calculators" className="text-primary underline">Open a calculator</Link>.
            </p>
          )}
          {filtered.map((r) => {
            const inputs = flattenForDisplay(r.inputs);
            const outputs = flattenForDisplay(r.outputs);
            return (
              <Card key={r.id} className="p-5 flex flex-col">
                <div className="flex items-start gap-3">
                  <button
                    onClick={async () => { await favFn({ data: { id: r.id, favorite: !r.favorite } }); qc.invalidateQueries({ queryKey: ["history"] }); }}
                    title="Toggle favorite"
                    className="mt-0.5"
                  >
                    <Star className={"h-4 w-4 " + (r.favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                      <Link
                        to="/calculators/$slug"
                        params={{ slug: r.calculator_slug }}
                        className="font-display font-semibold hover:text-primary truncate"
                      >
                        {r.calculator_label}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                </div>

                {r.summary && (
                  <p className="text-sm text-muted-foreground mt-3 italic">{r.summary}</p>
                )}

                <KVList title="Inputs" items={inputs} />
                <KVList title="Results" items={outputs} highlight />

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <Link to="/calculators/$slug" params={{ slug: r.calculator_slug }}>
                    <Button size="sm" variant="outline">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Recalculate
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => exportCalculationPdf({
                      label: r.calculator_label,
                      summary: r.summary ?? undefined,
                      inputs: (r.inputs ?? {}) as Record<string, unknown>,
                      outputs: (r.outputs ?? {}) as Record<string, unknown>,
                    })}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (!confirm("Delete this entry?")) return;
                      await delFn({ data: { id: r.id } });
                      qc.invalidateQueries({ queryKey: ["history"] });
                      toast.success("Deleted.");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function KVList({ title, items, highlight }: { title: string; items: KV[]; highlight?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{title}</div>
      <ul className="space-y-1 text-sm">
        {items.map((kv, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground">•</span>
            <span className="flex-1 min-w-0">
              <span className="text-muted-foreground">{kv.label}:</span>{" "}
              <span className={highlight ? "font-semibold text-foreground" : "text-foreground"}>{kv.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
