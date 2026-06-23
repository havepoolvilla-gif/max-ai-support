import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "support-attachments";
const SIGNED_TTL = 60 * 60; // 1 hour

export type SupportMessageDTO = {
  id: string;
  studentId: string;
  senderId: string;
  senderRole: "student" | "admin";
  text: string | null;
  attachmentUrl: string | null;
  attachmentType: "image" | "video" | "file" | null;
  attachmentName: string | null;
  isRead: boolean;
  createdAt: string;
};

export type SupportThreadDTO = {
  studentId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  unreadCount: number;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

async function signRow(supabase: any, row: any): Promise<SupportMessageDTO> {
  let url: string | null = null;
  if (row.attachment_path) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.attachment_path, SIGNED_TTL);
    url = data?.signedUrl ?? null;
  }
  return {
    id: row.id,
    studentId: row.student_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    text: row.message_text,
    attachmentUrl: url,
    attachmentType: row.attachment_type,
    attachmentName: row.attachment_name,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

// ---------- STUDENT ----------
export const listMyMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupportMessageDTO[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return Promise.all((data ?? []).map((r) => signRow(supabase, r)));
  });

export const sendMyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        text: z.string().trim().max(4000).optional(),
        attachmentPath: z.string().optional(),
        attachmentType: z.enum(["image", "video", "file"]).optional(),
        attachmentName: z.string().optional(),
      })
      .refine((v) => !!v.text || !!v.attachmentPath, {
        message: "empty message",
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<SupportMessageDTO> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("support_messages")
      .insert({
        student_id: userId,
        sender_id: userId,
        sender_role: "student",
        message_text: data.text ?? null,
        attachment_path: data.attachmentPath ?? null,
        attachment_type: data.attachmentType ?? null,
        attachment_name: data.attachmentName ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return signRow(supabase, row);
  });

export const markMyThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("student_id", userId)
      .eq("sender_role", "admin")
      .eq("is_read", false);
    return { ok: true };
  });

export const createMyUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        filename: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const safe = data.filename.replace(/[^\w.\-]/g, "_");
    const path = `${userId}/${crypto.randomUUID()}-${safe}`;
    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// ---------- ADMIN ----------
export const listSupportThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupportThreadDTO[]> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: msgs, error } = await supabase
      .from("support_messages")
      .select("student_id, message_text, attachment_type, created_at, sender_role, is_read")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const byStudent = new Map<
      string,
      { last: any; unread: number }
    >();
    for (const m of msgs ?? []) {
      const existing = byStudent.get(m.student_id);
      if (!existing) {
        byStudent.set(m.student_id, { last: m, unread: 0 });
      }
      const entry = byStudent.get(m.student_id)!;
      if (m.sender_role === "student" && !m.is_read) entry.unread += 1;
    }

    const ids = Array.from(byStudent.keys());
    if (ids.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url")
      .in("id", ids);

    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return ids.map((id) => {
      const entry = byStudent.get(id)!;
      const p: any = pmap.get(id) ?? {};
      const preview =
        entry.last.message_text ??
        (entry.last.attachment_type ? `[${entry.last.attachment_type}]` : "");
      return {
        studentId: id,
        fullName: p.full_name ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        avatarUrl: p.avatar_url ?? null,
        lastMessage: preview,
        lastAt: entry.last.created_at,
        unreadCount: entry.unread,
      };
    });
  });

export const listThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<SupportMessageDTO[]> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: rows, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("student_id", data.studentId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return Promise.all((rows ?? []).map((r) => signRow(supabase, r)));
  });

export const adminSendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        studentId: z.string().uuid(),
        text: z.string().trim().max(4000).optional(),
        attachmentPath: z.string().optional(),
        attachmentType: z.enum(["image", "video", "file"]).optional(),
        attachmentName: z.string().optional(),
      })
      .refine((v) => !!v.text || !!v.attachmentPath)
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<SupportMessageDTO> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: row, error } = await supabase
      .from("support_messages")
      .insert({
        student_id: data.studentId,
        sender_id: userId,
        sender_role: "admin",
        message_text: data.text ?? null,
        attachment_path: data.attachmentPath ?? null,
        attachment_type: data.attachmentType ?? null,
        attachment_name: data.attachmentName ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return signRow(supabase, row);
  });

export const adminMarkThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("student_id", data.studentId)
      .eq("sender_role", "student")
      .eq("is_read", false);
    return { ok: true };
  });

export const adminCreateUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        studentId: z.string().uuid(),
        filename: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const safe = data.filename.replace(/[^\w.\-]/g, "_");
    const path = `${data.studentId}/${crypto.randomUUID()}-${safe}`;
    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });
