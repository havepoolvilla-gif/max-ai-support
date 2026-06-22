
-- 1) Extend courses table with tier/pricing/preview/purchase fields
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_tier TEXT,
  ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
  ADD COLUMN IF NOT EXISTS purchase_url TEXT,
  ADD COLUMN IF NOT EXISTS purchase_info TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS courses_course_tier_unique
  ON public.courses(course_tier) WHERE course_tier IS NOT NULL;

-- 2) course_access table — per-student grants
CREATE TABLE IF NOT EXISTS public.course_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

GRANT SELECT ON public.course_access TO authenticated;
GRANT ALL ON public.course_access TO service_role;

ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own access"
  ON public.course_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage access"
  ON public.course_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Update get_lesson_video_url to use course_access
CREATE OR REPLACE FUNCTION public.get_lesson_video_url(_lesson_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.video_url
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = _lesson_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.course_access ca
        WHERE ca.user_id = auth.uid() AND ca.course_id = m.course_id
      )
    )
$function$;
