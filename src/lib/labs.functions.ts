import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Role = z.enum(["pi", "member", "viewer"]);
const uuid = z.string().uuid();

function fail(msg: string, err?: unknown): never {
  if (err) console.error("[labs]", err);
  throw new Error(msg);
}

/** Labs the signed-in user owns or belongs to, with their role. */
export const listMyLabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: labs, error } = await context.supabase
      .from("labs")
      .select("id, name, owner_id, created_at")
      .order("created_at", { ascending: true });
    if (error) fail("Could not load your labs.", error);

    const { data: memberships } = await context.supabase
      .from("lab_members")
      .select("lab_id, role")
      .eq("user_id", context.userId);

    const roleByLab = new Map((memberships ?? []).map((m) => [m.lab_id, m.role as string]));
    return (labs ?? []).map((l) => ({
      ...l,
      role: l.owner_id === context.userId ? "pi" : (roleByLab.get(l.id) ?? "viewer"),
    }));
  });

export const createLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(2).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lab, error } = await context.supabase
      .from("labs")
      .insert({ name: data.name, owner_id: context.userId })
      .select("id, name, owner_id, created_at")
      .single();
    if (error || !lab) fail("Could not create the lab.", error);

    const { error: mErr } = await context.supabase
      .from("lab_members")
      .insert({ lab_id: lab.id, user_id: context.userId, role: "pi" });
    if (mErr) console.error("[labs] owner membership", mErr);

    return { ...lab, role: "pi" as const };
  });

export const renameLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, name: z.string().trim().min(2).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("labs").update({ name: data.name }).eq("id", data.id);
    if (error) fail("Could not rename the lab.", error);
    return { ok: true };
  });

/** Members of a lab (membership enforced by RLS), with emails resolved server-side. */
export const listLabMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ labId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lab_members")
      .select("id, user_id, role, joined_at")
      .eq("lab_id", data.labId)
      .order("joined_at", { ascending: true });
    if (error) fail("Could not load lab members.", error);
    if (!rows || rows.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emails = new Map<string, string>();
    await Promise.all(
      rows.map(async (r) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        if (u?.user?.email) emails.set(r.user_id, u.user.email);
      }),
    );

    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role as z.infer<typeof Role>,
      joined_at: r.joined_at,
      email: emails.get(r.user_id) ?? "Unknown member",
      is_you: r.user_id === context.userId,
    }));
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: uuid, role: Role }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lab_members")
      .update({ role: data.role })
      .eq("id", data.memberId);
    if (error) fail("Only the PI can change roles.", error);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lab_members").delete().eq("id", data.memberId);
    if (error) fail("Could not remove that member.", error);
    return { ok: true };
  });

// ---- Invites ----

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const inviteToLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ labId: uuid, email: z.string().trim().toLowerCase().email().max(200), role: Role.default("member") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const token = newToken();
    const { error } = await context.supabase.from("lab_invites").insert({
      lab_id: data.labId,
      email: data.email,
      role: data.role,
      token,
      invited_by: context.userId,
    });
    if (error) fail("Only the PI can invite members.", error);
    return { token };
  });

export const listInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ labId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lab_invites")
      .select("id, email, role, token, created_at, expires_at, accepted_at")
      .eq("lab_id", data.labId)
      .order("created_at", { ascending: false });
    if (error) fail("Could not load invites.", error);
    return rows ?? [];
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lab_invites").delete().eq("id", data.id);
    if (error) fail("Could not revoke that invite.", error);
    return { ok: true };
  });

const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) });

/** Details of an invite for the signed-in user, without joining. */
export const getInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("lab_invites")
      .select("id, lab_id, email, role, expires_at, accepted_at, labs(name)")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return { status: "invalid" as const };

    const email = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    const labName = (invite.labs as { name: string } | null)?.name ?? "this lab";
    if (invite.accepted_at) return { status: "used" as const, labName };
    if (new Date(invite.expires_at).getTime() < Date.now()) return { status: "expired" as const, labName };
    if (email && email !== invite.email.toLowerCase()) {
      return { status: "wrong_account" as const, labName, invitedEmail: invite.email };
    }
    return { status: "ok" as const, labName, role: invite.role as z.infer<typeof Role> };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("lab_invites")
      .select("id, lab_id, email, role, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) fail("This invite link is not valid.");
    if (invite.accepted_at) fail("This invite has already been used.");
    if (new Date(invite.expires_at).getTime() < Date.now()) fail("This invite has expired.");

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = (authUser?.user?.email ?? "").toLowerCase();
    if (email !== invite.email.toLowerCase()) fail("This invite was sent to a different email address.");

    const { error: mErr } = await supabaseAdmin
      .from("lab_members")
      .upsert({ lab_id: invite.lab_id, user_id: context.userId, role: invite.role }, { onConflict: "lab_id,user_id" });
    if (mErr) fail("Could not add you to the lab.", mErr);

    await supabaseAdmin
      .from("lab_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: context.userId })
      .eq("id", invite.id);

    return { ok: true, labId: invite.lab_id };
  });
