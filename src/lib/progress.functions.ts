import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const toggleLessonComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("lesson_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("lesson_id", data.lessonId)
      .maybeSingle();

    if (existing) {
      await supabase.from("lesson_progress").delete().eq("id", existing.id);
      return { completed: false };
    }
    await supabase
      .from("lesson_progress")
      .insert({ user_id: userId, lesson_id: data.lessonId });
    return { completed: true };
  });

export const setLastWatched = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ courseId: z.string().uuid(), lessonId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("user_last_watched").upsert(
      {
        user_id: userId,
        course_id: data.courseId,
        lesson_id: data.lessonId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    return { ok: true };
  });
