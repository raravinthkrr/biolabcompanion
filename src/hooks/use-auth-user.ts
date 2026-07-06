import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Module-level singleton so every component shares the same session snapshot
// and we don't fire a fresh /auth/v1/user request on every page navigation.
type AuthSnapshot = { user: User | null; loading: boolean };

let snapshot: AuthSnapshot = { user: null, loading: true };
const listeners = new Set<(s: AuthSnapshot) => void>();
let initialized = false;

function emit(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l(next));
}

function init() {
  if (initialized) return;
  initialized = true;
  // getSession() reads from localStorage (no network) — fast and reliable
  // for restoring the session after a refresh or navigation.
  supabase.auth.getSession().then(({ data }) => {
    emit({ user: data.session?.user ?? null, loading: false });
  }).catch(() => emit({ user: null, loading: false }));

  supabase.auth.onAuthStateChange((_event, session) => {
    emit({ user: session?.user ?? null, loading: false });
  });
}

export function useAuthUser() {
  const [state, setState] = useState<AuthSnapshot>(snapshot);
  useEffect(() => {
    init();
    setState(snapshot);
    const l = (s: AuthSnapshot) => setState(s);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}
