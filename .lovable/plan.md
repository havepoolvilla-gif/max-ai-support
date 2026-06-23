## In-App Live Chat Support System

A floating student chat widget plus an Admin support console, backed by a new `support_messages` table and a Supabase Storage bucket for attachments. Realtime updates via Supabase Realtime.

---

### 1. Database (single migration)

`public.support_messages`
- `id uuid pk`
- `student_id uuid` — the student the thread belongs to (always the student, even for admin replies). Indexed.
- `sender_id uuid` — `auth.users.id` of whoever sent the message.
- `sender_role text` — `'student' | 'admin'`.
- `message_text text` (nullable when attachment-only)
- `attachment_url text` (nullable)
- `attachment_type text` (`'image' | 'video' | 'file'`, nullable)
- `attachment_name text` (nullable)
- `is_read boolean default false` — read by the *other* party.
- `created_at timestamptz default now()`

GRANTs to `authenticated` + `service_role`. RLS:
- Student: select/insert where `student_id = auth.uid()` and sender is themselves.
- Admin (`has_role(auth.uid(),'admin')`): select/insert/update all rows; can set `sender_role='admin'` and `student_id` to any user.
- Update `is_read`: student can mark admin messages in their own thread read; admin can mark student messages read.

Enable Realtime on the table (`alter publication supabase_realtime add table public.support_messages`).

### 2. Storage

New private bucket `support-attachments` via `supabase--storage_create_bucket` (public=false). RLS on `storage.objects`:
- Path convention: `{student_id}/{uuid}-{filename}`.
- Insert: student into own folder; admin anywhere in bucket.
- Select: student own folder; admin all.
Use signed URLs (created server-side) for rendering attachments in bubbles.

### 3. Server functions (`src/lib/support.functions.ts`)

All `requireSupabaseAuth`:
- `listMyMessages()` — student's own thread, ordered asc, attachments resolved to signed URLs.
- `sendMessage({ text?, attachmentPath?, attachmentType?, attachmentName? })` — student sends; sets `student_id = auth.uid()`, `sender_role='student'`.
- `markThreadRead()` — student marks admin→student messages read.
- `createUploadUrl({ filename, contentType })` — returns a signed upload URL into `support-attachments/{auth.uid()}/...`.

Admin-only (verify `has_role`):
- `listThreads()` — returns one row per `student_id` with profile (full_name, email, phone, avatar), last message preview, last timestamp, unread count (student→admin where `is_read=false`). Sorted by latest message desc.
- `listThreadMessages({ studentId })` — full thread, attachments → signed URLs.
- `adminSendMessage({ studentId, text?, attachmentPath?, ... })`.
- `adminMarkRead({ studentId })`.
- `adminCreateUploadUrl({ studentId, filename, contentType })`.

### 4. Student widget — `src/components/support-chat-widget.tsx`

- Floating circular button fixed bottom-right (z-50), `MessageCircle` icon, unread badge.
- Mounted once in `src/routes/_authenticated/route.tsx` so it appears on every student page. Hidden on the `/admin` route to avoid overlap.
- Expanded panel: clean light card (~380×560), header "ฝ่ายช่วยเหลือ Max AI", scrollable message list (student bubbles right=primary, admin left=muted), composer with textarea + paperclip attach button + send.
- Attachments: click clip → file picker (images/videos/files, ≤25 MB). Flow: `createUploadUrl` → PUT to signed URL → `sendMessage` with returned path. Inline preview: `<img>` for images, `<video controls>` for videos, file chip for others.
- Realtime: subscribe to `support_messages` filtered by `student_id=eq.<me>`; on insert, append and (if panel open) call `markThreadRead`.
- Placeholders: "พิมพ์ข้อความ...", empty state "เริ่มต้นแชทกับทีมงานได้เลย".

### 5. Admin console — `src/routes/_authenticated/admin.tsx`

Add new top tab **"กล่องข้อความช่วยเหลือ"** alongside existing admin tabs. Two-pane layout:

- Left sidebar: ticket list from `listThreads()`. Each item shows avatar, full name, gmail, phone, last-message snippet, timestamp, red "ใหม่" badge when `unreadCount>0`. Sorted by latest desc. Search input on top.
- Right pane: when a ticket is selected, full thread workspace — header with student info, scrollable messages with inline image/video playback, composer with attach + send (uses `adminSendMessage` / `adminCreateUploadUrl`). On open, call `adminMarkRead`.
- Realtime: subscribe to all `support_messages` (admin RLS allows); on insert, refresh thread list + active thread.

### 6. Files touched

**New**
- `supabase/migrations/<ts>_support_messages.sql`
- `src/lib/support.functions.ts`
- `src/components/support-chat-widget.tsx`
- `src/components/admin/support-console.tsx` (extracted for clarity)

**Edited**
- `src/routes/_authenticated/route.tsx` — mount `<SupportChatWidget />` (hidden on `/admin`).
- `src/routes/_authenticated/admin.tsx` — add "กล่องข้อความช่วยเหลือ" tab rendering `<SupportConsole />`.
- `src/integrations/supabase/types.ts` — regenerated after migration.

### 7. Design

Reuses existing light minimalist tokens (`bg-card`, `bg-muted`, `text-primary`, `border-border`, rounded-2xl bubbles, subtle shadow). Thai labels throughout. Lucide `MessageCircle`, `Paperclip`, `Send`, `X`, `Image`, `Video`, `FileText`.
