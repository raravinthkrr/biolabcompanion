import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider, AI_MODELS } from "@/lib/ai-gateway.server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are BioCalc AI, a professional biotechnology laboratory assistant. You help biotechnology students, researchers, and laboratory professionals. Your answers should be accurate, practical, concise, and easy to understand. Do not write like a research paper unless explicitly requested. Prefer structured sections, bullet points, numbered protocols, and simple explanations. Never expose raw markdown or LaTeX formatting. Always produce human-readable output.

Formatting rules (critical):
- Never use LaTeX delimiters ($$, $, \\(, \\), \\[, \\]).
- Never use \\frac, \\text, \\mathrm, \\sqrt, or other TeX commands.
- Write Greek letters and math symbols directly (μ, α, β, ×, °, ±, ≥, ≤, →, ≈).
- Render formulas as plain readable text inside a fenced code block, for example:
  \`\`\`
  pmol = DNA mass (ng) / (0.66 × DNA length in bp)
  \`\`\`
- Use markdown headings, bullet lists, numbered lists, tables, and bold/italic — but no raw tokens.

Default answer structure (adapt as needed):
1. Short overview (1–3 sentences).
2. Step-by-step explanation or numbered protocol.
3. Practical tips.
4. Common mistakes / pitfalls.
5. Optional: extra notes, references, or safety info.

For protocols, structure as a laboratory SOP with these sections when relevant: Overview, Materials Required (Reagents, Equipment), Step-by-Step Procedure, Incubation Conditions, Expected Results, Troubleshooting, Safety Notes. Keep paragraphs short.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require a valid Supabase JWT (the client attaches it via attachSupabaseAuth on serverFns,
        // but useChat hits /api/chat directly, so we read the Authorization header here).
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice(7);
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server not configured", { status: 500 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await sb.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub as string;

        // Enforce payload size limit (256 KB) before parsing.
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        const MAX_BYTES = 256 * 1024;
        if (contentLength && contentLength > MAX_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }
        const rawText = await request.text();
        if (rawText.length > MAX_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }
        type Body = { messages?: UIMessage[]; threadId?: string };
        let body: Body | null = null;
        try { body = JSON.parse(rawText) as Body; } catch { body = null; }
        if (!body || !Array.isArray(body.messages) || !body.threadId || typeof body.threadId !== "string") {
          return new Response("Missing messages or threadId", { status: 400 });
        }
        const MAX_MESSAGES = 100;
        const MAX_PARTS_PER_MSG = 50;
        const MAX_TEXT_PER_PART = 32 * 1024;
        if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
          return new Response("Invalid message count", { status: 400 });
        }
        for (const m of body.messages) {
          if (!m || typeof m !== "object" || !Array.isArray((m as UIMessage).parts)) {
            return new Response("Invalid message shape", { status: 400 });
          }
          const parts = (m as UIMessage).parts;
          if (parts.length > MAX_PARTS_PER_MSG) {
            return new Response("Too many parts", { status: 400 });
          }
          for (const p of parts) {
            if (!p || typeof p !== "object" || typeof (p as { type?: unknown }).type !== "string") {
              return new Response("Invalid part shape", { status: 400 });
            }
            const text = (p as { text?: unknown }).text;
            if (text !== undefined && (typeof text !== "string" || text.length > MAX_TEXT_PER_PART)) {
              return new Response("Part text too large", { status: 400 });
            }
          }
        }
        const messages: UIMessage[] = body.messages;
        const threadId: string = body.threadId;

        // Verify the thread belongs to this user
        const { data: thread, error: threadErr } = await sb
          .from("chat_threads")
          .select("id, user_id")
          .eq("id", body.threadId)
          .single();
        if (threadErr || !thread) {
          return new Response("Thread not found", { status: 404 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway(AI_MODELS.chat);

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              // Persist any new messages: those with IDs we haven't seen in DB.
              // Simplest: insert the last user message (if not already saved) and the assistant reply.
              const lastUser = [...messages].reverse().find((m) => m.role === "user");
              const lastAssistant = finalMessages[finalMessages.length - 1];

              const rowsToInsert: Array<{ thread_id: string; user_id: string; role: string; parts: unknown }> = [];
              if (lastUser) {
                rowsToInsert.push({ thread_id: threadId, user_id: userId, role: "user", parts: lastUser.parts });
              }
              if (lastAssistant && lastAssistant.role === "assistant") {
                rowsToInsert.push({ thread_id: threadId, user_id: userId, role: "assistant", parts: lastAssistant.parts });
              }
              // Only insert the user msg if this thread has no messages OR last DB message is assistant (avoid dupes).
              const { data: existing } = await sb
                .from("chat_messages")
                .select("id, role, created_at")
                .eq("thread_id", threadId)
                .order("created_at", { ascending: false })
                .limit(1);
              const lastDbRole = existing?.[0]?.role;

              const filtered = rowsToInsert.filter((r, i) => {
                if (r.role === "user" && lastDbRole === "user") return false;
                if (i === 0 && r.role === "user" && lastDbRole === "user") return false;
                return true;
              });
              if (filtered.length > 0) {
                const { error: insErr } = await sb.from("chat_messages").insert(filtered as never);
                if (insErr) console.error("chat_messages insert error:", insErr.message);
              }
              // Bump thread updated_at + auto-title from first user msg
              const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
              if (lastUser && (!existing || existing.length === 0)) {
                const text = lastUser.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
                if (text) updates.title = text.slice(0, 60);
              }
              await sb.from("chat_threads").update(updates as never).eq("id", threadId);
            } catch (e) {
              console.error("onFinish persist failed:", e);
            }
          },
          headers: getLovableAiGatewayResponseHeaders(undefined),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
