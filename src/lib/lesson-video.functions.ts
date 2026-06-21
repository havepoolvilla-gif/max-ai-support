import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    return { videoUrl: (url as string | null) ?? null };
  });
