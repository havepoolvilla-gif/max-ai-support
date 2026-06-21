import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin only");
}

// ---------- COURSES ----------
export const upsertCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1),
        tagline: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        instructor: z.string().nullable().optional(),
        thumbnail_url: z.string().nullable().optional(),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("courses").update(rest).eq("id", id);
      if (error) throw error;
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("courses")
      .insert(rest)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("courses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- MODULES ----------
export const upsertModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        course_id: z.string().uuid(),
        title: z.string().min(1),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("modules").update(rest).eq("id", id);
      if (error) throw error;
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("modules")
      .insert(rest)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const deleteModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("modules").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- LESSONS ----------
export const upsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        module_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        video_url: z.string().nullable().optional(),
        duration_seconds: z.number().int().min(0).default(0),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("lessons").update(rest).eq("id", id);
      if (error) throw error;
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("lessons")
      .insert(rest)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("lessons").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- USERS ----------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, subscription_status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const updateUserSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        status: z.enum(["free", "pro", "lifetime"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("profiles")
      .update({ subscription_status: data.status })
      .eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });
