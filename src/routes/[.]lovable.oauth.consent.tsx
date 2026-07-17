import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLockup } from "@/components/brand";
import { Loader2 } from "lucide-react";

// Beta namespace; typed wrapper so TS doesn't complain.
type OAuthDetails = {
  client?: { name?: string; client_id?: string; redirect_uris?: string[] };
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
  requested_scopes?: string[];
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authOAuth = () => (supabase.auth as any).oauth as {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
};

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOAuth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md p-6">
        <h1 className="text-lg font-semibold mb-2">Could not load this authorization</h1>
        <p className="text-sm text-muted-foreground break-words">
          {String((error as Error)?.message ?? error)}
        </p>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as OAuthDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an external app";
  const scopes = details?.requested_scopes ?? details?.scopes ?? [];

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = authOAuth();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="flex justify-center mb-6"><BrandLockup size="lg" /></div>
        <h1 className="text-xl font-display font-semibold text-center">
          Connect {clientName} to BioCalc AI
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-2">
          {clientName} will be able to call BioCalc AI's tools as you while you are signed in.
        </p>

        <div className="mt-6 space-y-2 text-sm">
          <div className="rounded-md border p-3">
            <div className="font-medium">This lets {clientName}:</div>
            <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
              <li>Browse the available lab calculators</li>
              <li>Read your saved calculation history and AI chat threads</li>
              <li>Ask one-shot questions to the AI Lab Assistant on your behalf</li>
            </ul>
          </div>
          {scopes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Requested scopes: {scopes.join(", ")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            This does not bypass BioCalc AI's permissions or backend policies.
          </p>
        </div>

        {error && <p role="alert" className="text-sm text-destructive mt-4">{error}</p>}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-primary text-primary-foreground"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Approve
          </Button>
        </div>
      </Card>
    </main>
  );
}
