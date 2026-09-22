-- 1. Role enum
CREATE TYPE public.lab_role AS ENUM ('pi', 'member', 'viewer');

-- 2. Labs
CREATE TABLE public.labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.labs TO authenticated;
GRANT ALL ON public.labs TO service_role;

-- 3. Members
CREATE TABLE public.lab_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.lab_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lab_id, user_id)
);

CREATE INDEX lab_members_user_idx ON public.lab_members (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_members TO authenticated;
GRANT ALL ON public.lab_members TO service_role;

-- 4. Invites
CREATE TABLE public.lab_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.lab_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX lab_invites_lab_idx ON public.lab_invites (lab_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_invites TO authenticated;
GRANT ALL ON public.lab_invites TO service_role;

-- 5. Security-definer helpers (must exist before policies reference them)
CREATE OR REPLACE FUNCTION public.is_lab_member(_lab_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lab_members WHERE lab_id = _lab_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.labs WHERE id = _lab_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_lab_role(_lab_id uuid, _user_id uuid)
RETURNS public.lab_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role FROM public.lab_members WHERE lab_id = _lab_id AND user_id = _user_id),
    (SELECT 'pi'::public.lab_role FROM public.labs WHERE id = _lab_id AND owner_id = _user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_lab(_lab_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_lab_role(_lab_id, _user_id) IN ('pi', 'member');
$$;

-- 6. RLS: labs
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY labs_select ON public.labs FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_lab_member(id, auth.uid()));
CREATE POLICY labs_insert ON public.labs FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY labs_update ON public.labs FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.get_lab_role(id, auth.uid()) = 'pi')
  WITH CHECK (owner_id = auth.uid() OR public.get_lab_role(id, auth.uid()) = 'pi');
CREATE POLICY labs_delete ON public.labs FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- 7. RLS: lab_members
ALTER TABLE public.lab_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY lab_members_select ON public.lab_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_lab_member(lab_id, auth.uid()));
CREATE POLICY lab_members_insert ON public.lab_members FOR INSERT TO authenticated
  WITH CHECK (public.get_lab_role(lab_id, auth.uid()) = 'pi');
CREATE POLICY lab_members_update ON public.lab_members FOR UPDATE TO authenticated
  USING (public.get_lab_role(lab_id, auth.uid()) = 'pi')
  WITH CHECK (public.get_lab_role(lab_id, auth.uid()) = 'pi');
CREATE POLICY lab_members_delete ON public.lab_members FOR DELETE TO authenticated
  USING (public.get_lab_role(lab_id, auth.uid()) = 'pi' OR user_id = auth.uid());

-- 8. RLS: lab_invites (PI only; acceptance happens server-side via service role)
ALTER TABLE public.lab_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY lab_invites_select ON public.lab_invites FOR SELECT TO authenticated
  USING (public.get_lab_role(lab_id, auth.uid()) = 'pi');
CREATE POLICY lab_invites_insert ON public.lab_invites FOR INSERT TO authenticated
  WITH CHECK (public.get_lab_role(lab_id, auth.uid()) = 'pi' AND invited_by = auth.uid());
CREATE POLICY lab_invites_delete ON public.lab_invites FOR DELETE TO authenticated
  USING (public.get_lab_role(lab_id, auth.uid()) = 'pi');

-- 9. Shared-content columns
ALTER TABLE public.saved_protocols ADD COLUMN lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL;
ALTER TABLE public.experiment_plans ADD COLUMN lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL;
ALTER TABLE public.calculation_history ADD COLUMN lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL;

CREATE INDEX saved_protocols_lab_idx ON public.saved_protocols (lab_id);
CREATE INDEX experiment_plans_lab_idx ON public.experiment_plans (lab_id);
CREATE INDEX calculation_history_lab_idx ON public.calculation_history (lab_id);

-- 10. Replace owner-only ALL policies with owner-or-lab policies
DROP POLICY IF EXISTS protocols_own ON public.saved_protocols;
CREATE POLICY protocols_select ON public.saved_protocols FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.is_lab_member(lab_id, auth.uid())));
CREATE POLICY protocols_insert ON public.saved_protocols FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (lab_id IS NULL OR public.can_write_lab(lab_id, auth.uid())));
CREATE POLICY protocols_update ON public.saved_protocols FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.can_write_lab(lab_id, auth.uid())))
  WITH CHECK (lab_id IS NULL OR public.can_write_lab(lab_id, auth.uid()));
CREATE POLICY protocols_delete ON public.saved_protocols FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.get_lab_role(lab_id, auth.uid()) = 'pi'));

DROP POLICY IF EXISTS plans_own ON public.experiment_plans;
CREATE POLICY plans_select ON public.experiment_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.is_lab_member(lab_id, auth.uid())));
CREATE POLICY plans_insert ON public.experiment_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (lab_id IS NULL OR public.can_write_lab(lab_id, auth.uid())));
CREATE POLICY plans_update ON public.experiment_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.can_write_lab(lab_id, auth.uid())))
  WITH CHECK (lab_id IS NULL OR public.can_write_lab(lab_id, auth.uid()));
CREATE POLICY plans_delete ON public.experiment_plans FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.get_lab_role(lab_id, auth.uid()) = 'pi'));

DROP POLICY IF EXISTS calc_history_own ON public.calculation_history;
CREATE POLICY calc_history_select ON public.calculation_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.is_lab_member(lab_id, auth.uid())));
CREATE POLICY calc_history_insert ON public.calculation_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (lab_id IS NULL OR public.can_write_lab(lab_id, auth.uid())));
CREATE POLICY calc_history_update ON public.calculation_history FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.can_write_lab(lab_id, auth.uid())))
  WITH CHECK (lab_id IS NULL OR public.can_write_lab(lab_id, auth.uid()));
CREATE POLICY calc_history_delete ON public.calculation_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR (lab_id IS NOT NULL AND public.get_lab_role(lab_id, auth.uid()) = 'pi'));
