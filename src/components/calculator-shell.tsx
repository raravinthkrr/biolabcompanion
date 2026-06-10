import { ReactNode, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Copy, RotateCcw, Save, FileDown, History as HistoryIcon, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveCalculation } from "@/lib/data.functions";
import { exportCalculationPdf } from "@/lib/export";
import { supabase } from "@/integrations/supabase/client";

export interface CalcShellProps {
  slug: string;
  label: string;
  category: string;
  description: string;
  formula?: string;
  explanation?: ReactNode;
  inputs: ReactNode;
  result: ReactNode | null;
  /** A flat object describing inputs, used for saving + exporting */
  inputsRecord?: Record<string, unknown>;
  /** A flat object describing outputs */
  outputsRecord?: Record<string, unknown>;
  /** Summary text used for history search and export */
  summary?: string;
  onReset?: () => void;
}

export function CalculatorShell(props: CalcShellProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const saveFn = useServerFn(saveCalculation);
  const [saving, setSaving] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      if (!props.inputsRecord || !props.outputsRecord) return;
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Sign in to save calculations.");
        router.navigate({ to: "/auth" });
        return;
      }
      setSaving(true);
      await saveFn({
        data: {
          calculator_slug: props.slug,
          calculator_label: props.label,
          inputs: props.inputsRecord,
          outputs: props.outputsRecord,
          summary: props.summary,
        },
      });
    },
    onSuccess: () => {
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Saved to history.");
    },
    onError: (e) => { setSaving(false); toast.error((e as Error).message); },
  });

  function copy() {
    if (!props.outputsRecord) return;
    const text = `${props.label}\n${props.summary ?? ""}\n\nInputs:\n${formatRec(props.inputsRecord ?? {})}\n\nResults:\n${formatRec(props.outputsRecord)}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied result.");
  }

  function exportPdf() {
    if (!props.outputsRecord) return;
    exportCalculationPdf({
      label: props.label,
      formula: props.formula,
      inputs: props.inputsRecord ?? {},
      outputs: props.outputsRecord,
      summary: props.summary,
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/calculators" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" /> All calculators
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Badge variant="secondary">{props.category}</Badge>
        <h1 className="text-3xl font-display font-bold mt-2">{props.label}</h1>
        <p className="text-muted-foreground mt-2">{props.description}</p>
        {props.formula && (
          <div className="mt-3 inline-block rounded-md bg-muted px-3 py-1.5 font-mono text-sm">{props.formula}</div>
        )}
      </motion.div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Inputs
          </h2>
          <div className="space-y-4">{props.inputs}</div>
          <div className="flex gap-2 mt-6">
            {props.onReset && (
              <Button variant="outline" size="sm" onClick={props.onReset}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-secondary/40">
          <h2 className="font-display font-semibold mb-4">Result</h2>
          {props.result ?? (
            <p className="text-sm text-muted-foreground italic">Enter inputs above to see results.</p>
          )}
          {props.outputsRecord && (
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
              <Button variant="outline" size="sm" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save to history"}
              </Button>
              <Link to="/history" className="ml-auto">
                <Button variant="ghost" size="sm"><HistoryIcon className="h-4 w-4 mr-1" /> History</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {props.explanation && (
        <Card className="mt-6 p-6">
          <h2 className="font-display font-semibold mb-2">How it works</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">{props.explanation}</div>
        </Card>
      )}
    </div>
  );
}

function formatRec(r: Record<string, unknown>): string {
  return Object.entries(r).map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n");
}
