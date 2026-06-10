import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/calculators", label: "Calculators" },
  { to: "/assistant", label: "AI Assistant" },
  { to: "/protocols", label: "Protocols" },
  { to: "/planner", label: "Planner" },
  { to: "/reagents", label: "Reagents" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b backdrop-blur transition-colors",
        scrolled ? "bg-background/85 border-border" : "bg-background/40 border-transparent"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center" aria-label="BioCalc AI home">
          <BrandLockup />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => {
            const active = path === item.to || (item.to !== "/" && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          {userEmail ? (
            <>
              <Link to="/history">
                <Button variant="ghost" size="sm" className="gap-1">
                  <UserIcon className="h-4 w-4" /> History
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>
                <LogOut className="h-4 w-4 mr-1" /> Sign out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant">
                <LogIn className="h-4 w-4 mr-1" /> Sign in
              </Button>
            </Link>
          )}
        </div>

        <button
          className="lg:hidden p-2 rounded-md hover:bg-muted"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t mt-2">
              <ThemeToggle />
              {userEmail ? (
                <Button variant="outline" size="sm" className="flex-1" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>
                  Sign out
                </Button>
              ) : (
                <Link to="/auth" className="flex-1" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-gradient-primary text-primary-foreground" size="sm">Sign in</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-card mt-16">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <BrandLockup />
          <p className="text-sm text-muted-foreground mt-4 max-w-md">
            BioCalc AI is your AI-powered biotechnology laboratory companion — accurate calculators, an expert lab assistant, and intelligent protocol &amp; experiment tools, all in one place.
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">Tools</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/calculators" className="hover:text-foreground">Calculators</Link></li>
            <li><Link to="/assistant" className="hover:text-foreground">AI Assistant</Link></li>
            <li><Link to="/protocols" className="hover:text-foreground">Protocol Summarizer</Link></li>
            <li><Link to="/planner" className="hover:text-foreground">Experiment Planner</Link></li>
            <li><Link to="/reagents" className="hover:text-foreground">Reagent Helper</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">Project</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/history" className="hover:text-foreground">My History</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto px-4 py-4 text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} BioCalc AI. Built for laboratory professionals and students.</span>
          <span>Educational use; verify all results before lab application.</span>
        </div>
      </div>
    </footer>
  );
}
