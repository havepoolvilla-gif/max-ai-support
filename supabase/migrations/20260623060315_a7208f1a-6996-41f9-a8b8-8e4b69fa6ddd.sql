
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('student','admin')),
  message_text TEXT,
  attachment_path TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image','video','file')),
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_student ON public.support_messages(student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Students: read messages in their own thread
CREATE POLICY "Students read own thread"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Students: send their own messages
CREATE POLICY "Students send own messages"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (student_id = auth.uid() AND sender_id = auth.uid() AND sender_role = 'student')
    OR (public.has_role(auth.uid(), 'admin') AND sender_id = auth.uid() AND sender_role = 'admin')
  );

-- Mark read
CREATE POLICY "Mark messages read"
  ON public.support_messages FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins delete"
  ON public.support_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Storage RLS for support-attachments bucket
CREATE POLICY "support attachments student insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "support attachments student read own folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "support attachments admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments' AND public.has_role(auth.uid(),'admin')
  );
