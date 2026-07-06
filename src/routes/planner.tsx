import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BrainCircuit, Save, Trash2, FileDown, Loader2 } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthUser } from "@/hooks/use-auth-user";
import { planExperiment, type ExperimentPlan } from "@/lib/ai.functions";
import { listPlans, savePlan, deletePlan } from "@/lib/data.functions";
import { exportPlanPdf } from "@/lib/export";
import { NeedAuth, AuthLoading } from "./protocols";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Experiment Planner – BioCalc AI" },
      { name: "description", content: "Describe your goal, available equipment, and budget — get a complete experimental plan with workflow, controls, and troubleshooting." },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const { user, loading: authLoading } = useAuthUser();
  const authed = !!user;
  const [goal, setGoal] = useState("Quantify expression of GFP in transfected HEK293 cells");
  const [equipment, setEquipment] = useState("Fluorescence microscope, flow cytometer, plate reader, standard wet lab");
  const [sample, setSample] = useState("Adherent HEK293 cells");
  const [budget, setBudget] = useState("Moderate");
  const [time, setTime] = useState("2 weeks");
  const [plan, setPlan] = useState<ExperimentPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const planFn = useServerFn(planExperiment);
  const listFn = useServerFn(listPlans);
  const saveFn = useServerFn(savePlan);
  const delFn = useServerFn(deletePlan);
  const qc = useQueryClient();

  const saved = useQuery({ queryKey: ["plans"], queryFn: () => listFn({}), enabled: authed });

  if (authLoading) return <AuthLoading />;
  if (!authed) return <NeedAuth title="Experiment Planner" />;

  async function generate() {
    if (goal.trim().length < 5) { toast.error("Describe your goal."); return; }
    setBusy(true);
    try {
      const r = await planFn({ data: { goal, equipment, sample_type: sample, budget, time_available: time } });
      setPlan(r);
      toast.success("Plan ready.");
    } catch (e) {
      console.error("planExperiment failed:", e);
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg.includes("AI") ? "The AI service is temporarily unavailable. Please try again in a few seconds." : msg || "Something went wrong. Please try again.");
    }
    finally { setBusy(false); }
  }
  async function save() {
    if (!plan) return;
    await saveFn({ data: { title: plan.title, inputs: { goal, equipment, sample, budget, time }, plan } });
    qc.invalidateQueries({ queryKey: ["plans"] });
    toast.success("Plan saved.");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-6xl">
        <Badge variant="secondary">AI tool</Badge>
        <h1 className="text-3xl font-display font-bold mt-2">Experiment Planner</h1>
        <p className="text-muted-foreground mt-2">Describe your experiment. Get a complete plan with controls and troubleshooting.</p>

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-3">
            <div><Label>Experiment goal</Label><Textarea rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
            <div><Label>Available equipment</Label><Textarea rows={2} value={equipment} onChange={(e) => setEquipment(e.target.value)} /></div>
            <div><Label>Sample type</Label><Input value={sample} onChange={(e) => setSample(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget</Label><Input value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
              <div><Label>Time available</Label><Input value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <Button onClick={generate} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BrainCircuit className="h-4 w-4 mr-2" />} Generate plan
            </Button>
          </Card>

          <Card className="p-6 min-h-[400px]">
            {!plan ? <p className="text-sm text-muted-foreground italic">Your experimental plan will appear here.</p> : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm space-y-4">
                <h2 className="text-xl font-display font-bold">{plan.title}</h2>
                <p className="text-muted-foreground">{plan.overview}</p>
                <div>
                  <div className="font-display font-semibold mb-1">Workflow</div>
                  <ol className="space-y-2">
                    {plan.workflow.map((w) => (
                      <li key={w.step} className="border-l-2 border-primary pl-3">
                        <div className="font-medium">Step {w.step}: {w.action}</div>
                        {w.duration && <div className="text-xs text-muted-foreground">⏱ {w.duration}</div>}
                      </li>
                    ))}
                  </ol>
                </div>
                <ListSection title="Materials" items={plan.materials} />
                <ListSection title="Reagents" items={plan.reagents} />
                <ListSection title="Controls" items={plan.controls} />
                <ListSection title="Expected outputs" items={plan.expected_outputs} />
                <ListSection title="Safety" items={plan.safety} />
                {plan.troubleshooting.length > 0 && (
                  <div>
                    <div className="font-display font-semibold mb-1">Troubleshooting</div>
                    <div className="space-y-2">
                      {plan.troubleshooting.map((t, i) => (
                        <div key={i} className="p-2 bg-muted rounded-md">
                          <div className="font-medium">{t.issue}</div>
                          <div className="text-muted-foreground">{t.solution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs"><strong>Timeline:</strong> {plan.estimated_timeline}{plan.estimated_cost ? ` · ${plan.estimated_cost}` : ""}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportPlanPdf(plan.title, plan as unknown as Record<string, unknown>)}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
                </div>
              </motion.div>
            )}
          </Card>
        </div>

        <h2 className="mt-12 font-display font-bold text-xl">Saved plans</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {(saved.data ?? []).map((p) => (
            <Card key={p.id} className="p-4">
              <div className="font-display font-semibold">{p.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString()}</div>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" onClick={() => setPlan(p.plan as ExperimentPlan)}>Open</Button>
                <Button size="sm" variant="ghost" onClick={() => exportPlanPdf(p.title, p.plan as Record<string, unknown>)}><FileDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={async () => { await delFn({ data: { id: p.id } }); qc.invalidateQueries({ queryKey: ["plans"] }); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {saved.data?.length === 0 && <p className="text-sm text-muted-foreground">No saved plans yet.</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="font-display font-semibold mb-1">{title}</div>
      <ul className="list-disc pl-5 text-muted-foreground space-y-1">{items.map((i, n) => <li key={n}>{i}</li>)}</ul>
    </div>
  );
}
