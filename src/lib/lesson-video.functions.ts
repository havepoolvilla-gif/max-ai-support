import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VIDEO_BUCKET = "lesson-videos";

export const getLessonVideo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) =>
    z.object({ lessonId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ videoUrl: string | null }> => {
    const { data: url, error } = await context.supabase.rpc("get_lesson_video_url", {
      _lesson_id: data.lessonId,
    });
    if (error) throw error;
    const raw = (url as string | null) ?? null;
    if (!raw) return { videoUrl: null };
    if (!raw.startsWith(`${VIDEO_BUCKET}/`)) return { videoUrl: raw };

    const key = raw.slice(VIDEO_BUCKET.length + 1);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(VIDEO_BUCKET)
      .createSignedUrl(key, 60 * 60 * 2);
    if (sErr) throw sErr;
    return { videoUrl: signed?.signedUrl ?? null };
  });
