import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Star, Trash2, FileDown, Search } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listCalculations, toggleFavoriteCalc, deleteCalculation } from "@/lib/data.functions";
import { exportToCsv } from "@/lib/export";
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
      return JSON.stringify(r).toLowerCase().includes(s);
    });
  }, [history.data, q, onlyFav]);

  if (authed === false) return <NeedAuth title="Saved history" />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-6xl">
        <Badge variant="secondary">Your library</Badge>
        <h1 className="text-3xl font-display font-bold mt-2">Saved history</h1>
        <p className="text-muted-foreground mt-2">All your saved calculations. Search, favorite, export, or delete.</p>

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
            inputs: JSON.stringify(r.inputs), outputs: JSON.stringify(r.outputs),
            favorite: r.favorite, created_at: r.created_at,
          })), `biocalc-history-${Date.now()}.csv`)}>
            <FileDown className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No saved calculations match your filter. <Link to="/calculators" className="text-primary underline">Open a calculator</Link>.</p>}
          {filtered.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <button onClick={async () => { await favFn({ data: { id: r.id, favorite: !r.favorite } }); qc.invalidateQueries({ queryKey: ["history"] }); }} title="Toggle favorite">
                  <Star className={"h-4 w-4 " + (r.favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link to="/calculators/$slug" params={{ slug: r.calculator_slug }} className="font-display font-semibold hover:text-primary">{r.calculator_label}</Link>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  {r.summary && <p className="text-sm text-muted-foreground mt-1">{r.summary}</p>}
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Inputs &amp; outputs</summary>
                    <pre className="mt-2 p-3 bg-muted rounded text-[11px] overflow-x-auto">
{JSON.stringify({ inputs: r.inputs, outputs: r.outputs }, null, 2)}
                    </pre>
                  </details>
                </div>
                <Button size="icon-sm" variant="ghost" className="text-destructive"
                  onClick={async () => { if (!confirm("Delete this entry?")) return; await delFn({ data: { id: r.id } }); qc.invalidateQueries({ queryKey: ["history"] }); toast.success("Deleted."); }}
                ><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
