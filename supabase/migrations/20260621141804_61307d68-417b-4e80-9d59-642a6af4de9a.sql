
-- 1. Lock down user_roles writes (privilege escalation fix)
CREATE POLICY "Admins insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Allow users to create their own profile row
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Gate premium lesson video URLs behind subscription
REVOKE SELECT (video_url) ON public.lessons FROM authenticated;
REVOKE SELECT (video_url) ON public.lessons FROM anon;

CREATE OR REPLACE FUNCTION public.get_lesson_video_url(_lesson_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.video_url
  FROM public.lessons l
  WHERE l.id = _lesson_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.subscription_status IN ('pro'::subscription_status, 'lifetime'::subscription_status)
      )
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_lesson_video_url(uuid) TO authenticated;
