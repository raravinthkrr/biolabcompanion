import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { AuthLoading } from "./protocols";
import { getInvite, acceptInvite } from "@/lib/labs.functions";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Lab invitation – BioCalc AI" },
      { name: "description", content: "Accept an invitation to join a shared lab workspace on BioCalc AI." },
      { property: "og:title", content: "Lab invitation – BioCalc AI" },
      { property: "og:description", content: "Join your colleagues' lab workspace to share protocols, plans, and calculations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitePage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 max-w-md w-full text-center shadow-elegant">{children}</Card>
      </div>
      <SiteFooter />
    </div>
  );
}

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const getFn = useServerFn(getInvite);
  const acceptFn = useServerFn(acceptInvite);
  const [busy, setBusy] = useState(false);

  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: () => getFn({ data: { token } }),
    enabled: !!user,
    retry: false,
  });

  if (loading) return <AuthLoading />;

  if (!user) {
    return (
      <Shell>
        <Users className="h-6 w-6 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-display font-bold mt-3">You&apos;ve been invited to a lab</h1>
        <p className="text-muted-foreground mt-2">Sign in with the email address the invite was sent to, then open this link again.</p>
        <div className="mt-6">
          <Link to="/auth" search={{ next: `/invite/${token}` }}>
            <Button className="bg-gradient-primary text-primary-foreground">Sign in</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (invite.isLoading) {
    return <Shell><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></Shell>;
  }

  const data = invite.data;
  if (!data || data.status === "invalid") {
    return (
      <Shell>
        <h1 className="text-2xl font-display font-bold">Invite link not valid</h1>
        <p className="text-muted-foreground mt-2">Ask the lab PI to send you a fresh invitation.</p>
      </Shell>
    );
  }
  if (data.status === "used") {
    return (
      <Shell>
        <h1 className="text-2xl font-display font-bold">Invite already used</h1>
        <p className="text-muted-foreground mt-2">If you already joined {data.labName}, you can open it from your labs.</p>
        <div className="mt-6"><Link to="/labs"><Button variant="outline">Go to my labs</Button></Link></div>
      </Shell>
    );
  }
  if (data.status === "expired") {
    return (
      <Shell>
        <h1 className="text-2xl font-display font-bold">Invite expired</h1>
        <p className="text-muted-foreground mt-2">This invitation to {data.labName} is no longer valid. Ask for a new one.</p>
      </Shell>
    );
  }
  if (data.status === "wrong_account") {
    return (
      <Shell>
        <h1 className="text-2xl font-display font-bold">Different email address</h1>
        <p className="text-muted-foreground mt-2">This invite was sent to {data.invitedEmail}. Sign in with that address to join {data.labName}.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Users className="h-6 w-6 mx-auto text-primary" />
      <h1 className="text-2xl font-display font-bold mt-3">Join {data.labName}</h1>
      <p className="text-muted-foreground mt-2">You&apos;ll join as <strong>{data.role}</strong> and can see work your lab chooses to share.</p>
      <div className="mt-6">
        <Button
          className="bg-gradient-primary text-primary-foreground"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await acceptFn({ data: { token } });
              toast.success("You joined the lab.");
              navigate({ to: "/labs" });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not join the lab.");
            } finally { setBusy(false); }
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Accept invitation
        </Button>
      </div>
    </Shell>
  );
}
