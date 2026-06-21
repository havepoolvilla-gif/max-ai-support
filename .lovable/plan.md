## Plan: Wire LMS to Lovable Cloud (Supabase) with Google Auth + Admin CMS

### 1. Enable Lovable Cloud & Schema

Enable Cloud, then create migration with these tables (all in `public`, with GRANTs + RLS):

- **`profiles`** — `id uuid PK → auth.users`, `email`, `full_name`, `avatar_url`, `subscription_status` (enum: `free` | `pro` | `lifetime`, default `free`), `created_at`. Auto-created via `handle_new_user()` trigger on `auth.users` insert.
- **`app_role`** enum (`admin`, `student`) + **`user_roles`** table + `has_role(uuid, app_role)` security-definer function.
- **`courses`** — `id`, `title`, `description`, `thumbnail_url`, `instructor`, `sort_order`, `created_at`.
- **`modules`** — `id`, `course_id FK`, `title`, `sort_order`, `created_at`.
- **`lessons`** — `id`, `module_id FK`, `title`, `description`, `video_url`, `duration_seconds`, `sort_order`, `created_at`.
- **`lesson_progress`** — `id`, `user_id FK → auth.users`, `lesson_id FK`, `completed_at`, unique(`user_id`, `lesson_id`).

**RLS policies:**
- `profiles`: user can select/update own row; admins can select all.
- `courses` / `modules` / `lessons`: `SELECT` to `authenticated` (any signed-in user can view); `INSERT/UPDATE/DELETE` only via `has_role(auth.uid(),'admin')`.
- `lesson_progress`: user can CRUD own rows; admins can read all.
- `user_roles`: user can read own; only admins write.

### 2. Google Authentication

- Configure Google provider via `supabase--configure_social_auth`.
- Create `/auth` public route — branded dark-tech sign-in card with single **"เข้าสู่ระบบด้วย Google"** button calling `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" })`.
- Root route: wire single `onAuthStateChange` listener (filtered to SIGNED_IN/OUT/USER_UPDATED) to invalidate router + queries.
- Move `dashboard`, `learn.$courseId`, and new `admin` route under `src/routes/_authenticated/` (managed gate redirects unauthenticated → `/auth`).
- TopNav: show real user email/avatar from session; sign-out button follows hygiene (cancel queries → clear cache → signOut → navigate `/auth`).
- Landing CTA → `/auth`.

### 3. Server Functions (TanStack `createServerFn`)

Client-safe `.functions.ts` files under `src/lib/`:

- `courses.functions.ts` — `listCoursesWithProgress()` (auth required): returns courses → modules → lessons + current user's `completed` set in one shape matching existing mock structure. Used by dashboard + player.
- `progress.functions.ts` — `toggleLessonComplete({ lessonId })`, `setLastWatched({ courseId, lessonId })`.
- `admin.functions.ts` — protected by `requireSupabaseAuth` + inline `has_role('admin')` check:
  - `upsertCourse`, `deleteCourse`
  - `upsertModule`, `deleteModule`
  - `upsertLesson`, `deleteLesson`
  - `listUsers`, `updateUserSubscription({ userId, status })`
- First signed-in user is auto-granted `admin` role via a one-time bootstrap server fn (or seeded by user email in migration if user provides email).

### 4. Replace Mock Data with Live Queries

- Swap `src/data/mock-courses.ts` consumers to use TanStack Query + the server fns above.
- Dashboard: `useSuspenseQuery(['courses'])` → renders course library with real progress %.
- Player: loads course by `courseId`, sidebar accordion built from DB modules/lessons, `<video src={lesson.video_url}>` plays the DB URL. "Mark complete" calls `toggleLessonComplete` → invalidates `['courses']`.
- Zustand `progress-store` deprecated for completion (server is source of truth); kept only for client-side "last watched" UX hint or removed.

### 5. Admin Panel (`/_authenticated/_admin/admin`)

Pathless `_admin` layout with `has_role('admin')` gate via `beforeLoad` server-fn check; non-admins → `/dashboard`.

Tabs:
- **Courses** — list + create/edit dialog (title, description, thumbnail URL, instructor, sort order).
- **Modules** — select course → list modules → create/edit (title, sort order).
- **Lessons** — select module → list lessons → create/edit (title, description, video URL, duration, sort order).
- **Users** — data table: email, registered date, subscription status dropdown (free/pro/lifetime) calling `updateUserSubscription`.

All mutations use `useMutation` → invalidate `['courses']` and `['admin', ...]` so Dashboard + Playlist update immediately.

### Technical notes
- All `*.functions.ts` live in `src/lib/`, never import `client.server` at module scope.
- Public landing stays SSR-on; auth-protected routes under `_authenticated/`.
- Video URLs are plain strings (any CDN/mp4/HLS URL); no upload UI in this pass.
- Thai UI strings preserved across new screens (auth, admin).
