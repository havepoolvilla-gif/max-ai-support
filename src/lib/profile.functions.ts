import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudentProfileDTO = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  activationCode: string | null;
  isAdmin: boolean;
  courses: { id: string; title: string; tagline: string | null; courseTier: string | null }[];
  totalLessons: number;
  completedLessons: number;
};

export const getStudentProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StudentProfileDTO> => {
    const { supabase, userId } = context;

    const [
      { data: profile },
      { data: roles },
      { data: access },
      { data: courses },
      { data: modules },
      { data: lessons },
      { data: progress },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("course_access").select("course_id").eq("user_id", userId),
      supabase.from("courses").select("id, title, tagline, course_tier").order("sort_order"),
      supabase.from("modules").select("id, course_id"),
      supabase.from("lessons").select("id, module_id"),
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId),
    ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const accessSet = new Set((access ?? []).map((a: any) => a.course_id));

    const enrolled = (courses ?? [])
      .filter((c: any) => isAdmin || accessSet.has(c.id))
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        tagline: c.tagline,
        courseTier: c.course_tier ?? null,
      }));

    const moduleToCourse = new Map<string, string>();
    for (const m of modules ?? []) moduleToCourse.set(m.id, (m as any).course_id);

    const enrolledCourseIds = new Set(enrolled.map((c) => c.id));
    let totalLessons = 0;
    const enrolledLessonIds = new Set<string>();
    for (const l of lessons ?? []) {
      const courseId = moduleToCourse.get((l as any).module_id);
      if (courseId && enrolledCourseIds.has(courseId)) {
        totalLessons++;
        enrolledLessonIds.add(l.id);
      }
    }
    const completedLessons = (progress ?? []).filter((p) =>
      enrolledLessonIds.has(p.lesson_id),
    ).length;

    return {
      id: userId,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      phone: profile?.phone ?? null,
      activationCode: profile?.activation_code ?? null,
      isAdmin,
      courses: enrolled,
      totalLessons,
      completedLessons,
    };
  });

export const updateStudentPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        phone: z
          .string()
          .trim()
          .max(30)
          .regex(/^[0-9+\-\s()]*$/, "เบอร์โทรศัพท์ไม่ถูกต้อง"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ phone: data.phone || null })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
