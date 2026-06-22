import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LessonDTO = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  duration: number;
  sortOrder: number;
};

export type ModuleDTO = {
  id: string;
  title: string;
  sortOrder: number;
  lessons: LessonDTO[];
};

export type CourseDTO = {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  instructor: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  courseTier: string | null;
  price: number;
  previewVideoUrl: string | null;
  purchaseUrl: string | null;
  purchaseInfo: string | null;
  hasAccess: boolean;
  modules: ModuleDTO[];
};

export type ProfileDTO = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  subscriptionStatus: "free" | "pro" | "lifetime";
  isAdmin: boolean;
};

export type DashboardDTO = {
  profile: ProfileDTO;
  courses: CourseDTO[];
  completedLessonIds: string[];
  lastWatched: { courseId: string; lessonId: string } | null;
};

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardDTO> => {
    const { supabase, userId } = context;

    const [
      { data: profile },
      { data: courses },
      { data: modules },
      { data: lessons },
      { data: progress },
      { data: lastWatched },
      { data: roles },
      { data: access },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("courses").select("*").order("sort_order"),
      supabase.from("modules").select("*").order("sort_order"),
      supabase
        .from("lessons")
        .select("id, module_id, title, description, duration_seconds, sort_order, created_at")
        .order("sort_order"),
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId),
      supabase
        .from("user_last_watched")
        .select("course_id, lesson_id")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("course_access").select("course_id").eq("user_id", userId),
    ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const accessSet = new Set((access ?? []).map((a: any) => a.course_id));

    const lessonsByModule = new Map<string, LessonDTO[]>();
    for (const l of lessons ?? []) {
      const arr = lessonsByModule.get(l.module_id) ?? [];
      arr.push({
        id: l.id,
        title: l.title,
        description: l.description,
        videoUrl: null,
        duration: l.duration_seconds,
        sortOrder: l.sort_order,
      });
      lessonsByModule.set(l.module_id, arr);
    }

    const modulesByCourse = new Map<string, ModuleDTO[]>();
    for (const m of modules ?? []) {
      const arr = modulesByCourse.get(m.course_id) ?? [];
      arr.push({
        id: m.id,
        title: m.title,
        sortOrder: m.sort_order,
        lessons: lessonsByModule.get(m.id) ?? [],
      });
      modulesByCourse.set(m.course_id, arr);
    }

    const courseDtos: CourseDTO[] = (courses ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      tagline: c.tagline,
      description: c.description,
      instructor: c.instructor,
      thumbnailUrl: c.thumbnail_url,
      sortOrder: c.sort_order,
      courseTier: c.course_tier ?? null,
      price: c.price ?? 0,
      previewVideoUrl: c.preview_video_url ?? null,
      purchaseUrl: c.purchase_url ?? null,
      purchaseInfo: c.purchase_info ?? null,
      hasAccess: isAdmin || accessSet.has(c.id),
      modules: modulesByCourse.get(c.id) ?? [],
    }));

    return {
      profile: {
        id: userId,
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        subscriptionStatus: (profile?.subscription_status ?? "free") as
          | "free"
          | "pro"
          | "lifetime",
        isAdmin,
      },
      courses: courseDtos,
      completedLessonIds: (progress ?? []).map((p) => p.lesson_id),
      lastWatched: lastWatched
        ? { courseId: lastWatched.course_id, lessonId: lastWatched.lesson_id }
        : null,
    };
  });
