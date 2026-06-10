import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password – BioCalc AI" }] }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    // Recovery link puts type=recovery in URL hash; Supabase parses it.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setRecovery(true);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full shadow-elegant">
        <div className="flex justify-center mb-6"><BrandLockup size="lg" /></div>
        <h1 className="text-2xl font-display font-bold text-center">Reset your password</h1>
        {!recovery ? (
          <p className="mt-3 text-sm text-muted-foreground text-center">
            This page expects a password recovery link. Use the "Forgot password" flow from the sign-in page.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-6">
            <div><Label htmlFor="np">New password (min 6)</Label><Input id="np" type="password" minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} required /></div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Update password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
