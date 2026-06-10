import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---- Calculation history ----

const SaveCalcInput = z.object({
  calculator_slug: z.string().min(1),
  calculator_label: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()),
  outputs: z.record(z.string(), z.unknown()),
  summary: z.string().optional(),
});

export const saveCalculation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveCalcInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("calculation_history")
      .insert({ ...data, user_id: context.userId } as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listCalculations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("calculation_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const toggleFavoriteCalc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), favorite: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calculation_history")
      .update({ favorite: data.favorite })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCalculation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("calculation_history").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Chat threads ----

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string().min(1).max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: data.title ?? "New chat" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads").update({ title: data.title }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---- Protocols ----

export const saveProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1).max(200),
    source_text: z.string().min(1),
    summary: z.record(z.string(), z.unknown()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("saved_protocols").insert({ ...data, user_id: context.userId } as never).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listProtocols = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_protocols").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_protocols").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Experiment plans ----

export const savePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1).max(200),
    inputs: z.record(z.string(), z.unknown()),
    plan: z.record(z.string(), z.unknown()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("experiment_plans").insert({ ...data, user_id: context.userId } as never).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("experiment_plans").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("experiment_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
