
-- 1. Add is_activated to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_activated BOOLEAN NOT NULL DEFAULT false;

-- Auto-activate existing admin users
UPDATE public.profiles SET is_activated = true
WHERE id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');

-- 2. app_settings table (server-only, no anon/authenticated grants on read)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read/write via Data API (used by admin server fns)
CREATE POLICY "Admins manage app_settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;

-- Seed activation password
INSERT INTO public.app_settings (key, value) VALUES ('activation_password', 'FORGE2026')
ON CONFLICT (key) DO NOTHING;

-- 3. RPC: activate_account
CREATE OR REPLACE FUNCTION public.activate_account(_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT value INTO expected FROM public.app_settings WHERE key = 'activation_password';
  IF expected IS NULL OR _password IS DISTINCT FROM expected THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET is_activated = true WHERE id = auth.uid();
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_account(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_account(TEXT) TO authenticated;
