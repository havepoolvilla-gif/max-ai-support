# Per-Student Pre-Authorization & Activation

Replace the shared activation password with a per-student flow. The admin pre-registers each student (name, Gmail, phone, courses, 10-char code) before they ever log in. On first Google sign-in, the system matches the student's Gmail to the admin's pre-auth record, prompts once for the 10-char code, then unlocks the pre-ticked courses. Returning logins skip the popup entirely.

## 1. Database (single migration)

**`public.profiles` — add columns**
- `phone TEXT NULL`
- `activation_code TEXT NULL` (the 10-char code the admin generated for this Gmail)

**New table `public.pending_students`** — holds pre-auth records for Gmails that have not yet logged in:
- `email TEXT PRIMARY KEY` (lowercased)
- `full_name TEXT NOT NULL`
- `phone TEXT NULL`
- `activation_code TEXT NOT NULL` (10 chars)
- `course_ids UUID[] NOT NULL DEFAULT '{}'`
- `created_by UUID NULL`, `created_at`, `updated_at`
- GRANTs + RLS: admins only (no anon, no authenticated SELECT for non-admins). Service role full.

**Update trigger `handle_new_user`** — when an auth user first appears:
1. Insert profile as today.
2. Look up `pending_students` by lowercased email.
3. If found: copy `full_name`, `phone`, `activation_code` onto the profile, leave `is_activated = false`, insert `course_access` rows for every `course_id` in `course_ids`, then `DELETE` the pending row.
4. If not found: profile created with `activation_code = NULL` (the student has no pre-auth and stays gated).

**Replace `public.activate_account(_password TEXT)`** — compare against the per-user `profiles.activation_code` instead of `app_settings`:
- Return `true` and set `is_activated = true` only when the supplied code matches `profiles.activation_code` for `auth.uid()`.
- Return `false` if the profile has no code (no pre-auth) or the code mismatches.

`app_settings.activation_password` is no longer used by the activation flow; the row stays in place but the gate ignores it.

## 2. Server functions

**`src/lib/admin.functions.ts`** — replace `createStudent`:
- New `upsertPendingStudent({ email, full_name, phone, activation_code, course_ids[] })`: admin-only, validates code is exactly 10 alphanumeric chars, upserts into `pending_students` keyed by lowercased email.
- New `listPendingStudents()`: admin-only, returns pending rows for display.
- New `deletePendingStudent({ email })`: admin-only.
- If the Gmail already has a profile (student already logged in), the function instead updates `profiles.full_name/phone/activation_code` and writes the `course_access` rows directly, then resets `is_activated = false` so the new code must be entered. This keeps the "admin sets up everything beforehand" promise working even after first login.

**`src/lib/activation.functions.ts`** — `activateAccount` already calls the RPC; no signature change. Drop the admin-only `getActivationPassword`/`setActivationPassword` UI usage (functions can stay but are unused).

## 3. Admin UI (`src/routes/_authenticated/admin.tsx`)

Rebuild the "สร้างบัญชีนักเรียนใหม่" card:
- Fields: `ชื่อ-นามสกุล`, `Email (Gmail นักเรียน)`, `เบอร์โทรศัพท์`, `รหัสผ่าน 10 หลัก` (with a "สุ่มรหัสผ่าน" button that calls a new `generateCode10()` producing exactly 10 alphanumeric chars `A-Z a-z 0-9`, cryptographically random).
- Course access checkbox grid (one checkbox per course from `dash.courses`) directly inside this form.
- Submit button "สร้างบัญชี" → calls `upsertPendingStudent` with all fields + selected course IDs. Success message shows the Gmail + the 10-char code with a "คัดลอก" hint.
- Add a "นักเรียนที่รอเปิดใช้งาน" (pending) table below the existing students table showing email / name / phone / code / course count, with a delete action.

The existing "รายชื่อนักเรียน · สิทธิ์การเข้าถึงคอร์ส" table (live students) remains unchanged.

The "ตั้งค่า · รหัสเปิดใช้งานระบบ" tab is removed (shared password is obsolete).

## 4. Student activation overlay (`src/components/activation-gate.tsx`)

- Update the prompt copy to: `กรุณากรอกรหัสผ่าน 10 หลักที่ได้รับจากแอดมินเพื่อยืนยันสิทธิ์เข้าเรียนครั้งแรก`.
- Input restricted to 10 characters, alphanumeric, monospace.
- On submit → `activateAccount({ password: code })`. On `ok: true`, invalidate `activation-status` and `dashboard` queries so unlocked courses appear immediately. On `ok: false`, show "รหัสไม่ถูกต้อง — กรุณาตรวจสอบกับแอดมิน".
- If profile has no `activation_code` at all, show "บัญชีนี้ยังไม่ได้รับสิทธิ์ — กรุณาติดต่อแอดมิน" instead of the input.

## 5. Auth page

No change — Google-only sign-in stays as-is.

## Files touched

- New migration under `supabase/migrations/`
- Edit `src/lib/admin.functions.ts`, `src/lib/activation.functions.ts`
- Edit `src/routes/_authenticated/admin.tsx`, `src/components/activation-gate.tsx`

## Technical notes

- Email matching is case-insensitive (`lower(email)`) everywhere — pending lookup, profile lookup, admin upsert.
- `activation_code` is stored in plaintext on `profiles` because the RPC must compare it; access is locked down by RLS (user can read only their own profile; admins via `has_role`).
- The trigger uses `SECURITY DEFINER` and runs on `auth.users` insert as today; the new logic is appended inside the existing function body.
