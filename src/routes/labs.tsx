import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, Plus, Copy, Trash2, Loader2, Mail } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthUser } from "@/hooks/use-auth-user";
import { NeedAuth, AuthLoading } from "./protocols";
import {
  listMyLabs, createLab, listLabMembers, listInvites, inviteToLab,
  revokeInvite, updateMemberRole, removeMember,
} from "@/lib/labs.functions";

export const Route = createFileRoute("/labs")({
  head: () => ({
    meta: [
      { title: "Lab Workspaces – BioCalc AI" },
      { name: "description", content: "Create a shared lab workspace, invite colleagues by email, and manage PI, member, and viewer roles." },
      { property: "og:title", content: "Lab Workspaces – BioCalc AI" },
      { property: "og:description", content: "Share protocols, plans, and calculations with your lab team using role-based access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LabsPage,
});

const ROLES = ["pi", "member", "viewer"] as const;
type Role = (typeof ROLES)[number];

function LabsPage() {
  const { user, loading } = useAuthUser();
  const authed = !!user;
  const qc = useQueryClient();

  const listLabsFn = useServerFn(listMyLabs);
  const createLabFn = useServerFn(createLab);
  const membersFn = useServerFn(listLabMembers);
  const invitesFn = useServerFn(listInvites);
  const inviteFn = useServerFn(inviteToLab);
  const revokeFn = useServerFn(revokeInvite);
  const roleFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);

  const [labName, setLabName] = useState("");
  const [activeLab, setActiveLab] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);

  const labs = useQuery({ queryKey: ["labs"], queryFn: () => listLabsFn({}), enabled: authed });

  useEffect(() => {
    if (!activeLab && labs.data && labs.data.length > 0) setActiveLab(labs.data[0]!.id);
  }, [labs.data, activeLab]);

  const current = labs.data?.find((l) => l.id === activeLab) ?? null;
  const isPi = current?.role === "pi";

  const members = useQuery({
    queryKey: ["lab-members", activeLab],
    queryFn: () => membersFn({ data: { labId: activeLab! } }),
    enabled: authed && !!activeLab,
  });

  const invites = useQuery({
    queryKey: ["lab-invites", activeLab],
    queryFn: () => invitesFn({ data: { labId: activeLab! } }),
    enabled: authed && !!activeLab && isPi,
  });

  if (loading) return <AuthLoading />;
  if (!authed) return <NeedAuth title="Lab Workspaces" />;

  async function handleCreate() {
    if (labName.trim().length < 2) { toast.error("Give your lab a name."); return; }
    setBusy(true);
    try {
      const lab = await createLabFn({ data: { name: labName.trim() } });
      setLabName("");
      setActiveLab(lab.id);
      await qc.invalidateQueries({ queryKey: ["labs"] });
      toast.success("Lab created.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the lab.");
    } finally { setBusy(false); }
  }

  async function handleInvite() {
    if (!activeLab) return;
    setBusy(true);
    try {
      const { token } = await inviteFn({ data: { labId: activeLab, email: inviteEmail, role: inviteRole } });
      setInviteEmail("");
      await qc.invalidateQueries({ queryKey: ["lab-invites", activeLab] });
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`).catch(() => {});
      toast.success("Invite created — link copied to your clipboard.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the invite.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">
        <Badge variant="secondary">Collaboration</Badge>
        <h1 className="text-3xl font-display font-bold mt-2">Lab workspaces</h1>
        <p className="text-muted-foreground mt-2">
          Create a lab, invite colleagues, and control who can view or edit shared work. Your private work stays private.
        </p>

        <Card className="mt-8 p-6">
          <Label htmlFor="lab-name">Create a new lab</Label>
          <div className="flex gap-2 mt-2">
            <Input id="lab-name" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="e.g., Sharma Molecular Biology Lab" />
            <Button onClick={handleCreate} disabled={busy} className="bg-gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Create
            </Button>
          </div>
        </Card>

        {labs.isLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your labs…</div>
        ) : (labs.data ?? []).length === 0 ? (
          <Card className="mt-8 p-8 text-center">
            <Users className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">You aren&apos;t in a lab yet. Create one above, or open an invite link a colleague sent you.</p>
          </Card>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              {labs.data!.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLab(l.id)}
                  className={`px-3 py-2 rounded-md text-sm border transition-colors ${l.id === activeLab ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"}`}
                >
                  {l.name} <span className="text-xs text-muted-foreground ml-1">{l.role}</span>
                </button>
              ))}
            </div>

            {current && (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                  <h2 className="font-display font-semibold">Members</h2>
                  {members.isLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {(members.data ?? []).map((m) => (
                        <li key={m.id} className="flex items-center gap-2 text-sm">
                          <span className="truncate flex-1" title={m.email}>{m.email}{m.is_you ? " (you)" : ""}</span>
                          {isPi && !m.is_you ? (
                            <>
                              <select
                                aria-label={`Role for ${m.email}`}
                                value={m.role}
                                onChange={async (e) => {
                                  try {
                                    await roleFn({ data: { memberId: m.id, role: e.target.value as Role } });
                                    await qc.invalidateQueries({ queryKey: ["lab-members", activeLab] });
                                    toast.success("Role updated.");
                                  } catch { toast.error("Could not update that role."); }
                                }}
                                className="text-xs border rounded-md px-2 py-1 bg-background"
                              >
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <Button
                                size="sm" variant="ghost" className="text-destructive" aria-label={`Remove ${m.email}`}
                                onClick={async () => {
                                  try {
                                    await removeFn({ data: { memberId: m.id } });
                                    await qc.invalidateQueries({ queryKey: ["lab-members", activeLab] });
                                  } catch { toast.error("Could not remove that member."); }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant="secondary">{m.role}</Badge>
                          )}
                        </li>
                      ))}
                      {members.data?.length === 0 && <li className="text-sm text-muted-foreground">No members yet.</li>}
                    </ul>
                  )}
                </Card>

                <Card className="p-6">
                  <h2 className="font-display font-semibold">Invites</h2>
                  {!isPi ? (
                    <p className="text-sm text-muted-foreground mt-3">Only the lab PI can invite people.</p>
                  ) : (
                    <>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="invite-email">Invite by email</Label>
                        <div className="flex flex-wrap gap-2">
                          <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@university.edu" className="flex-1 min-w-[180px]" />
                          <select
                            aria-label="Invite role"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as Role)}
                            className="text-sm border rounded-md px-2 bg-background"
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <Button onClick={handleInvite} disabled={busy || !inviteEmail}>
                            <Mail className="h-4 w-4 mr-1" /> Invite
                          </Button>
                        </div>
                      </div>

                      <ul className="mt-5 space-y-3 text-sm">
                        {(invites.data ?? []).map((inv) => (
                          <li key={inv.id} className="flex items-center gap-2">
                            <span className="truncate flex-1" title={inv.email}>{inv.email}</span>
                            <Badge variant={inv.accepted_at ? "secondary" : "outline"}>{inv.accepted_at ? "joined" : inv.role}</Badge>
                            {!inv.accepted_at && (
                              <>
                                <Button
                                  size="sm" variant="ghost" aria-label={`Copy invite link for ${inv.email}`}
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                                    toast.success("Invite link copied.");
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm" variant="ghost" className="text-destructive" aria-label={`Revoke invite for ${inv.email}`}
                                  onClick={async () => {
                                    try {
                                      await revokeFn({ data: { id: inv.id } });
                                      await qc.invalidateQueries({ queryKey: ["lab-invites", activeLab] });
                                    } catch { toast.error("Could not revoke that invite."); }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </li>
                        ))}
                        {invites.data?.length === 0 && <li className="text-muted-foreground">No invites yet.</li>}
                      </ul>
                    </>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
