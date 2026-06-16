import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiProvider, AI_MODELS } from "./ai-gateway.server";
import { generateText } from "ai";
import { z } from "zod";

// ---- Lenient schemas: every list defaults to [], optionals stay optional.
// This prevents Zod parse failures when the model omits a field that the user
// can live without, and keeps the UI from showing "Something went wrong".

const ProtocolSummarySchema = z.object({
  title: z.string().default("Protocol"),
  summary: z.string().default(""),
  steps: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  reagents: z.array(z.string()).default([]),
  safety_notes: z.array(z.string()).default([]),
  time_estimate: z.string().default(""),
  common_mistakes: z.array(z.string()).default([]),
});
export type ProtocolSummary = z.infer<typeof ProtocolSummarySchema>;

const PlanSchema = z.object({
  title: z.string().default("Experimental Plan"),
  overview: z.string().default(""),
  workflow: z
    .array(
      z.object({
        step: z.coerce.number().default(0),
        action: z.string().default(""),
        duration: z.string().optional(),
      }),
    )
    .default([]),
  materials: z.array(z.string()).default([]),
  reagents: z.array(z.string()).default([]),
  controls: z.array(z.string()).default([]),
  expected_outputs: z.array(z.string()).default([]),
  troubleshooting: z
    .array(z.object({ issue: z.string().default(""), solution: z.string().default("") }))
    .default([]),
  safety: z.array(z.string()).default([]),
  estimated_timeline: z.string().default(""),
  estimated_cost: z.string().optional(),
});
export type ExperimentPlan = z.infer<typeof PlanSchema>;

const ReagentSchema = z.object({
  reagent_name: z.string().default("Reagent"),
  final_volume: z.string().default(""),
  ingredients: z
    .array(
      z.object({
        name: z.string().default(""),
        amount: z.string().default(""),
        notes: z.string().optional(),
      }),
    )
    .default([]),
  preparation_steps: z.array(z.string()).default([]),
  storage: z.string().default(""),
  shelf_life: z.string().optional(),
  safety: z.array(z.string()).default([]),
});
export type ReagentRecipe = z.infer<typeof ReagentSchema>;

// ---- Robust JSON extraction (handles markdown fences, prose preamble, trailing commas)
function extractJson(text: string): unknown {
  if (!text) throw new Error("Empty AI response");
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  const candidates = [firstObj, firstArr].filter((i) => i >= 0);
  if (candidates.length === 0) throw new Error("No JSON found in AI response");
  const start = Math.min(...candidates);
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  const end = cleaned.lastIndexOf(close);
  if (end <= start) throw new Error("Incomplete JSON in AI response");
  let candidate = cleaned.slice(start, end + 1);
  // Strip trailing commas + control characters
  candidate = candidate.replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  try {
    return JSON.parse(candidate);
  } catch {
    // Last-resort: balance braces/brackets
    let braces = 0;
    let brackets = 0;
    for (const ch of candidate) {
      if (ch === "{") braces++;
      else if (ch === "}") braces--;
      else if (ch === "[") brackets++;
      else if (ch === "]") brackets--;
    }
    let repaired = candidate;
    while (brackets-- > 0) repaired += "]";
    while (braces-- > 0) repaired += "}";
    return JSON.parse(repaired);
  }
}

async function generateStructured<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
): Promise<T> {
  const provider = getAiProvider();
  const fullSystem = `${system}

You MUST return ONLY a single valid JSON object containing every requested field.
- Do not wrap the JSON in markdown fences.
- Do not include any prose before or after the JSON.
- Use empty arrays ([]) when a list has no items, never omit list fields.
- All string values must use double quotes and be valid JSON strings.`;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text } = await generateText({
        model: provider(AI_MODELS.structured),
        system: fullSystem,
        prompt,
        temperature: attempt === 0 ? 0.3 : 0.1,
      });
      const json = extractJson(text);
      return schema.parse(json);
    } catch (err) {
      lastErr = err;
      console.error(`[AI structured] attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : "AI generation failed";
  throw new Error(`AI generation failed: ${msg}`);
}

export const summarizeProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ text: z.string().min(20).max(50000) }).parse(d),
  )
  .handler(async ({ data }) => {
    return generateStructured(
      ProtocolSummarySchema,
      "You are an expert biotechnology laboratory protocol analyst. Extract a structured, scientifically accurate summary of laboratory protocols. Be specific about reagent concentrations, times, and temperatures.",
      `Analyze the following laboratory protocol and return JSON with keys: title (string), summary (string), steps (string[]), materials (string[]), reagents (string[]), safety_notes (string[]), time_estimate (string), common_mistakes (string[]).

PROTOCOL:
${data.text}`,
    );
  });

export const planExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      goal: z.string().min(5).max(2000),
      equipment: z.string().max(2000).optional(),
      sample_type: z.string().max(500).optional(),
      budget: z.string().max(200).optional(),
      time_available: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    return generateStructured(
      PlanSchema,
      "You are an expert biotechnology experimental designer. Produce realistic, college- and research-level experimental plans grounded in standard molecular biology and microbiology best practices. Always include appropriate controls.",
      `Design an experimental plan and return JSON with keys: title (string), overview (string), workflow (array of {step: number, action: string, duration?: string}), materials (string[]), reagents (string[]), controls (string[]), expected_outputs (string[]), troubleshooting (array of {issue, solution}), safety (string[]), estimated_timeline (string), estimated_cost (string).

Goal: ${data.goal}
Available equipment: ${data.equipment || "standard wet lab"}
Sample type: ${data.sample_type || "unspecified"}
Budget: ${data.budget || "moderate"}
Time available: ${data.time_available || "1-2 weeks"}`,
    );
  });

export const reagentHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    return generateStructured(
      ReagentSchema,
      "You are a meticulous biochemistry reagent and buffer preparation expert. Provide precise quantities, accurate molecular weights, and standard preparation procedures used in working molecular biology labs.",
      `Prepare a reagent recipe and return JSON with keys: reagent_name (string), final_volume (string), ingredients (array of {name, amount, notes?}), preparation_steps (string[]), storage (string), shelf_life (string), safety (string[]).

Request: ${data.query}`,
    );
  });

// Generic ask used by quick-prompt cards (returns markdown text)
export const askBiotech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prompt: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    const provider = getAiProvider();
    const { text } = await generateText({
      model: provider(AI_MODELS.chat),
      system:
        "You are an expert biotechnology laboratory assistant. Provide concise, scientifically accurate, markdown-formatted answers.",
      prompt: data.prompt,
    });
    return { text };
  });
