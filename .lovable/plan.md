## Goal

Make `/dashboard` ("ห้องเรียนของฉัน") the post-login home with a "Continue from where you left off" hero, split out a separate "คอร์สของฉัน" library route, and persist video playback position so the resume button jumps to the exact timestamp.

## 1. Database — add playback position

Single migration adds one column:

- `public.user_last_watched.position_seconds INTEGER NOT NULL DEFAULT 0`

No RLS changes; existing policies already cover the row.

## 2. Server functions (`src/lib/progress.functions.ts` & `courses.functions.ts`)

- `setLastWatched` — extend input with optional `positionSeconds` (int ≥ 0) and upsert it. Stays a single row per user (`onConflict: "user_id"`).
- `getDashboard` — extend the `lastWatched` DTO to include `positionSeconds`, plus the resolved `courseTitle`, `moduleTitle`, `lessonTitle`, and `thumbnailUrl` for the resume card (computed server-side from the already-fetched courses/modules/lessons; no extra query).

## 3. Routing — split dashboard vs library

- Keep `/dashboard` as "ห้องเรียนของฉัน" (the landing page).
- Add new route `src/routes/_authenticated/courses.tsx` → `/courses` for "คอร์สของฉัน" (library of unlocked tiers only).
- Update `StudentSidebar`: "ห้องเรียนของฉัน" → `/dashboard`, "คอร์สของฉัน" → `/courses`, with correct active-state matching (currently both items point at `/dashboard`).

## 4. `/dashboard` page — "ห้องเรียนของฉัน"

Top of page, before the course grid:

- **Continue card** ("เริ่มเรียนต่อจากคอร์สเดิม"). Shows course thumbnail, course title, module + lesson title, formatted resume timestamp (e.g. "เล่นต่อจาก 4:32"), and a primary button "เรียนต่อ" linking to `/learn/$courseId?lesson=<id>&t=<sec>`.
- Hidden when `lastWatched` is null — falls back to a neutral "เลือกคอร์สด้านล่างเพื่อเริ่มเรียน" hero.

Course grid below stays as today (all courses, locked + unlocked).

## 5. `/courses` page — "คอร์สของฉัน" (library)

- Reuses `getDashboard` data; filters to `course.hasAccess === true`.
- Clean card grid: thumbnail, tier badge, progress bar, "เปิดคอร์ส" button → `/learn/$courseId` (first lesson) so users can browse the syllabus from the start.
- Empty state: "ยังไม่มีคอร์สที่เปิดสิทธิ์ — ติดต่อผู้ดูแลเพื่อเปิดใช้งาน".

## 6. Player — persist + resume timestamp (`learn.$courseId.tsx`)

- Extend `validateSearch` with optional `t: number` (start seconds).
- On lesson load, seek `videoRef.current.currentTime = t ?? 0` once metadata is ready (`onLoadedMetadata`).
- Save position via `setLastWatched({ courseId, lessonId, positionSeconds })`:
  - Throttled every ~10s during `onTimeUpdate` (skip if same second).
  - On `onPause`.
  - On `visibilitychange === "hidden"` and `beforeunload` (use `navigator.sendBeacon`-style best-effort; fall back to fire-and-forget mutation).
- Local mirror in `localStorage` keyed by `lastWatched:<lessonId>` so resume works instantly even before the server roundtrip; server value wins on next dashboard load.

## 7. Files touched

```text
supabase/migrations/<ts>_last_watched_position.sql   (new)
src/lib/progress.functions.ts                        (edit — positionSeconds)
src/lib/courses.functions.ts                         (edit — enriched lastWatched DTO)
src/routes/_authenticated/dashboard.tsx              (edit — resume hero)
src/routes/_authenticated/courses.tsx                (new — library)
src/routes/_authenticated/learn.$courseId.tsx       (edit — t param, save/resume)
src/components/student-sidebar.tsx                   (edit — /courses link + active state)
```

No styling system changes; reuses existing tokens, cards, and Thai copy.
