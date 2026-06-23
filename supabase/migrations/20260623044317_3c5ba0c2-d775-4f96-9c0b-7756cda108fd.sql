
-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS activation_code TEXT;

-- 2. Pending students table
CREATE TABLE IF NOT EXISTS public.pending_students (
  email TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  activation_code TEXT NOT NULL,
  course_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_students TO authenticated;
GRANT ALL ON public.pending_students TO service_role;

ALTER TABLE public.pending_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pending students"
  ON public.pending_students
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS pending_students_touch ON public.pending_students;
CREATE TRIGGER pending_students_touch
  BEFORE UPDATE ON public.pending_students
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Update handle_new_user to consume pending invites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first boolean;
  pend RECORD;
  cid UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- bootstrap admin
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;

  -- consume pending invite by email (case-insensitive)
  SELECT * INTO pend FROM public.pending_students
    WHERE lower(email) = lower(NEW.email) LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
      SET full_name = COALESCE(pend.full_name, full_name),
          phone = pend.phone,
          activation_code = pend.activation_code,
          is_activated = false
      WHERE id = NEW.id;

    FOREACH cid IN ARRAY pend.course_ids LOOP
      INSERT INTO public.course_access (user_id, course_id, granted_by)
        VALUES (NEW.id, cid, pend.created_by)
        ON CONFLICT (user_id, course_id) DO NOTHING;
    END LOOP;

    DELETE FROM public.pending_students WHERE email = pend.email;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Replace activate_account to match per-user code
CREATE OR REPLACE FUNCTION public.activate_account(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expected TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT activation_code INTO expected FROM public.profiles WHERE id = auth.uid();
  IF expected IS NULL OR _password IS DISTINCT FROM expected THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET is_activated = true WHERE id = auth.uid();
  RETURN true;
END;
$function$;
