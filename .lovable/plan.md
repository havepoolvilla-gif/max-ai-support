# Commercial LMS Upgrade Plan

Transform Skill Max into an admin-managed commercial LMS. Keep the clean light-mode look and all Thai labels.

## 1. Database changes (single migration)

**Extend `courses`** (per-course tier is simpler than per-lesson and matches "AI เลขา 999 บาท"):
- `course_tier` TEXT (slug, e.g. `ai_secretary`) — unique
- `price` INTEGER (THB, default 0)
- `preview_video_url` TEXT (nullable) — for "ดูตัวอย่างคอร์ส"
- `purchase_url` TEXT (nullable) — sales/contact link for "สนใจสมัครเรียน"
- `purchase_info` TEXT (nullable) — payment info shown in popup if no URL

**New table `course_access`** — per-student grants:
- `user_id` UUID → auth.users
- `course_id` UUID → courses
- `granted_by` UUID, `granted_at` TIMESTAMPTZ
- PK (`user_id`, `course_id`)
- RLS: students read their own rows; admins manage all (`has_role`)
- GRANTs: SELECT for `authenticated`, ALL for `service_role`

**Update `get_lesson_video_url`** function: allow playback when the caller is admin OR has a `course_access` row for the lesson's course (replaces the current `subscription_status` gate, which becomes legacy).

## 2. Admin: Manage Students section

In `src/routes/_authenticated/admin.tsx`, add a "จัดการนักเรียน" tab/section:

**Create account form** (Full Name, Email, Password + "สุ่มรหัสผ่าน" button):
- Client-side generator: 8 chars, mixed upper/lower/digit/symbol, crypto-random.
- Submits to new server fn `createStudent` in `src/lib/admin.functions.ts` which:
  - Verifies caller is admin
  - Inside handler: dynamic-imports `client.server` → `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`
  - The existing `handle_new_user` trigger auto-creates the profile + student role
- Returns the email/password so admin can copy and send

**Student list** with per-course access toggles:
- Replaces the current subscription dropdown
- Shows each student with a checkbox per course (course title + tier badge)
- Toggling calls new server fns `grantCourseAccess` / `revokeCourseAccess`
- Extend `listUsers` to also return `accessCourseIds: string[]`

## 3. Auth update

Login already uses email + password (`src/routes/auth.tsx`). Action: remove/hide the public Sign-Up form so only admin-created students can log in. Keep Google sign-in only if the user wants it (see open question).

## 4. Dashboard preview/buy for locked courses

In `src/routes/_authenticated/dashboard.tsx`, `LockedCourseCard`:
- Keep current look, thumbnail, soft yellow "ยังไม่ได้เปิดสิทธิ์" badge
- Add two buttons:
  - **ดูตัวอย่างคอร์ส** → opens a Dialog with a `<video>`/iframe of `course.previewVideoUrl` (button hidden if null)
  - **สนใจสมัครเรียน** (primary) → opens a Dialog showing `purchase_info` and, if `purchase_url` set, a "ติดต่อสมัคร" link button

"Locked" logic changes from `subscription_status` to: `isAdmin || course_access row exists for this course`. Update `getDashboard` to fetch `course_access` for the user and compute access per course, plus expose `previewVideoUrl`, `purchaseUrl`, `purchaseInfo`, `price`, `courseTier` on `CourseDTO`. `learn.$courseId.tsx` gate uses the same rule.

## Files touched

- New migration (schema + RLS + grants + updated `get_lesson_video_url`)
- `src/lib/admin.functions.ts` — `createStudent`, `grantCourseAccess`, `revokeCourseAccess`, expand `listUsers`, expand `upsertCourse` for new fields
- `src/lib/courses.functions.ts` — extend `CourseDTO` and `getDashboard` with access list + new course fields
- `src/routes/_authenticated/admin.tsx` — Manage Students UI, course fields in course form
- `src/routes/_authenticated/dashboard.tsx` — preview/buy dialogs, access-based lock
- `src/routes/_authenticated/learn.$courseId.tsx` — access check based on `course_access`
- `src/routes/auth.tsx` — hide public sign-up

## Open questions

1. Keep Google sign-in available, or restrict to admin-created email+password only?
2. For "สนใจสมัครเรียน" — do you want a single global contact link (e.g. LINE/Messenger) used for all courses, or per-course `purchase_url`/`purchase_info` set in the admin panel? (Plan currently assumes per-course.)
