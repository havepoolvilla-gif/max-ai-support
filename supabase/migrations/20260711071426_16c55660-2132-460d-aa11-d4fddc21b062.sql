
-- RLS policies for lesson-videos bucket
-- Path convention: {courseId}/{lessonId}/{uuid}-filename

-- Admin: full manage
CREATE POLICY "lesson_videos_admin_all"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'));

-- Students: read if they have access to the course (first folder = courseId)
CREATE POLICY "lesson_videos_student_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-videos'
  AND EXISTS (
    SELECT 1 FROM public.course_access ca
    WHERE ca.user_id = auth.uid()
      AND ca.course_id::text = (storage.foldername(name))[1]
  )
);
