import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiProvider, AI_MODELS } from "./ai-gateway.server";
import { generateText, Output } from "ai";
import { z } from "zod";

const ProtocolSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  steps: z.array(z.string()),
  materials: z.array(z.string()),
  reagents: z.array(z.string()),
  safety_notes: z.array(z.string()),
  time_estimate: z.string(),
  common_mistakes: z.array(z.string()),
});

export type ProtocolSummary = z.infer<typeof ProtocolSummarySchema>;

export const summarizeProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    text: z.string().min(20).max(50000),
  }).parse(d))
  .handler(async ({ data }) => {
    const provider = getAiProvider();
    const { experimental_output } = await generateText({
      model: provider(AI_MODELS.structured),
      experimental_output: Output.object({ schema: ProtocolSummarySchema }),
      system: "You are an expert biotechnology laboratory protocol analyst. Extract a structured, scientifically accurate summary of laboratory protocols. Be specific about reagent concentrations, times, and temperatures.",
      prompt: `Analyze the following laboratory protocol and produce a structured summary.\n\nPROTOCOL:\n${data.text}`,
    });
    return experimental_output;
  });

const PlanSchema = z.object({
  title: z.string(),
  overview: z.string(),
  workflow: z.array(z.object({ step: z.number(), action: z.string(), duration: z.string().optional() })),
  materials: z.array(z.string()),
  reagents: z.array(z.string()),
  controls: z.array(z.string()),
  expected_outputs: z.array(z.string()),
  troubleshooting: z.array(z.object({ issue: z.string(), solution: z.string() })),
  safety: z.array(z.string()),
  estimated_timeline: z.string(),
  estimated_cost: z.string().optional(),
});

export type ExperimentPlan = z.infer<typeof PlanSchema>;

export const planExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    goal: z.string().min(5).max(2000),
    equipment: z.string().max(2000).optional(),
    sample_type: z.string().max(500).optional(),
    budget: z.string().max(200).optional(),
    time_available: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const provider = getAiProvider();
    const { experimental_output } = await generateText({
      model: provider(AI_MODELS.structured),
      experimental_output: Output.object({ schema: PlanSchema }),
      system: "You are an expert biotechnology experimental designer. Produce realistic, college- and research-level experimental plans grounded in standard molecular biology and microbiology best practices. Always include appropriate controls.",
      prompt: `Design an experimental plan for the following.

Goal: ${data.goal}
Available equipment: ${data.equipment || "standard wet lab"}
Sample type: ${data.sample_type || "unspecified"}
Budget: ${data.budget || "moderate"}
Time available: ${data.time_available || "1-2 weeks"}

Return a structured plan.`,
    });
    return experimental_output;
  });

const ReagentSchema = z.object({
  reagent_name: z.string(),
  final_volume: z.string(),
  ingredients: z.array(z.object({ name: z.string(), amount: z.string(), notes: z.string().optional() })),
  preparation_steps: z.array(z.string()),
  storage: z.string(),
  shelf_life: z.string().optional(),
  safety: z.array(z.string()),
});

export type ReagentRecipe = z.infer<typeof ReagentSchema>;

export const reagentHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    query: z.string().min(3).max(500),
  }).parse(d))
  .handler(async ({ data }) => {
    const provider = getAiProvider();
    const { experimental_output } = await generateText({
      model: provider(AI_MODELS.structured),
      experimental_output: Output.object({ schema: ReagentSchema }),
      system: "You are a meticulous biochemistry reagent and buffer preparation expert. Provide precise quantities, accurate molecular weights, and standard preparation procedures used in working molecular biology labs.",
      prompt: `Prepare a reagent recipe for: ${data.query}`,
    });
    return experimental_output;
  });

// Generic ask used by quick-prompt cards (returns markdown text)
export const askBiotech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prompt: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    const provider = getAiProvider();
    const { text } = await generateText({
      model: provider(AI_MODELS.chat),
      system: "You are an expert biotechnology laboratory assistant. Provide concise, scientifically accurate, markdown-formatted answers.",
      prompt: data.prompt,
    });
    return { text };
  });
