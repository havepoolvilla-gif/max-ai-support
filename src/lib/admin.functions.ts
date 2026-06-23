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
        course_tier: z.string().nullable().optional(),
        price: z.number().int().min(0).default(0),
        preview_video_url: z.string().nullable().optional(),
        purchase_url: z.string().nullable().optional(),
        purchase_info: z.string().nullable().optional(),
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
    const [profilesRes, accessRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, subscription_status, created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("course_access").select("user_id, course_id"),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    if (accessRes.error) throw accessRes.error;
    const byUser = new Map<string, string[]>();
    for (const row of accessRes.data ?? []) {
      const arr = byUser.get(row.user_id) ?? [];
      arr.push(row.course_id);
      byUser.set(row.user_id, arr);
    }
    return (profilesRes.data ?? []).map((p) => ({
      ...p,
      accessCourseIds: byUser.get(p.id) ?? [],
    }));
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

// ---------- COURSE ACCESS ----------
export const grantCourseAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), courseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("course_access").upsert(
      { user_id: data.userId, course_id: data.courseId, granted_by: context.userId },
      { onConflict: "user_id,course_id" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const revokeCourseAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), courseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("course_access")
      .delete()
      .eq("user_id", data.userId)
      .eq("course_id", data.courseId);
    if (error) throw error;
    return { ok: true };
  });

// ---------- PENDING STUDENTS (admin-driven pre-authorization) ----------
const codeRegex = /^[A-Za-z0-9]{10}$/;

export const upsertPendingStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        full_name: z.string().min(1),
        phone: z.string().nullable().optional(),
        activation_code: z.string().regex(codeRegex, "ต้องเป็นรหัส 10 ตัวอักษร A-Z, a-z, 0-9"),
        course_ids: z.array(z.string().uuid()).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // If a profile already exists for this email, update it directly + reset access.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing?.id) {
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: data.full_name,
          phone: data.phone ?? null,
          activation_code: data.activation_code,
          is_activated: false,
        })
        .eq("id", existing.id);
      if (upErr) throw upErr;

      await supabaseAdmin.from("course_access").delete().eq("user_id", existing.id);
      if (data.course_ids.length > 0) {
        const rows = data.course_ids.map((cid) => ({
          user_id: existing.id,
          course_id: cid,
          granted_by: context.userId,
        }));
        const { error: insErr } = await supabaseAdmin.from("course_access").insert(rows);
        if (insErr) throw insErr;
      }
      return { mode: "profile" as const, email };
    }

    const { error } = await supabaseAdmin.from("pending_students").upsert(
      {
        email,
        full_name: data.full_name,
        phone: data.phone ?? null,
        activation_code: data.activation_code,
        course_ids: data.course_ids,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
    if (error) throw error;
    return { mode: "pending" as const, email };
  });

export const listPendingStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pending_students")
      .select("email, full_name, phone, activation_code, course_ids, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const deletePendingStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("pending_students")
      .delete()
      .eq("email", data.email.trim().toLowerCase());
    if (error) throw error;
    return { ok: true };
  });

