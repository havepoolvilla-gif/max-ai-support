
## Scope (this iteration)

Per your direction, this first pass focuses on the **frontend foundation**: design system, landing/dashboard layout, and the bite-sized course player — all driven by mock data. Authentication, Lovable Cloud, admin CMS, and the subscription schema are scoped but **deferred to the next iteration** so we can lock the look and player UX first.

## 1. Design system (dark-tech, crimson)

Update `src/styles.css` tokens (oklch):
- `--background` deep black (~oklch(0.14 0 0))
- `--card` / `--popover` elevated dark grey (~oklch(0.18 0.01 260))
- `--foreground` near-white, `--muted-foreground` cool grey
- `--primary` crimson red (~oklch(0.55 0.22 25)), `--primary-foreground` white
- `--accent` subtle crimson tint, `--border` low-opacity white
- Add `--gradient-primary` (crimson → darker crimson), `--gradient-hero` (black → crimson glow), `--shadow-glow` (crimson 30% blur), `--shadow-elevated`
- Force dark by default (apply `.dark` class on `<html>` in `__root.tsx`)
- Typography: load Space Grotesk (display) + Inter (body) via `<link>` in `__root.tsx` head, register as `--font-display` / `--font-sans` in `@theme`

Reusable primitives:
- `GlowCard` (card with crimson edge glow on hover)
- `StatusBadge` (Free / Pro variants)
- `ProgressBar` (crimson fill)

## 2. Routes

```
src/routes/
  __root.tsx           (force dark, fonts, nav shell)
  index.tsx            (landing: hero, features, CTA)
  dashboard.tsx        (student dashboard)
  learn.$courseId.tsx  (course player)
```

All routes use top-level (public) for now; once auth lands, `dashboard` and `learn.*` move under `_authenticated/`.

## 3. Landing page (`/`)

- Hero: bold headline, crimson glow, subtle animated grid/scanline background, "Sign in with Google" CTA (visual only this pass, routes to `/dashboard`)
- Feature grid: bite-sized lessons, progress tracking, AI-curated paths
- Footer

## 4. Student dashboard (`/dashboard`)

- Top bar: logo, user avatar mock, "Free Plan" crimson-outlined badge
- Welcome banner: "Welcome back, Alex" + subscription status
- **Continue Learning** hero card: thumbnail of last in-progress lesson, course/module name, progress bar, "Resume" button → deep-links to `/learn/$courseId` at that lesson
- Course library grid with tabs: **All / In Progress / Completed** (shadcn `Tabs`)
- Each course card: thumbnail, title, module count, progress %, status chip

## 5. Course player (`/learn/$courseId`)

Two-column layout (desktop ≥ lg):

- **Left 70%**: 16:9 video container (HTML5 `<video>` with mock mp4 / poster), under it: lesson title (h1), module name (muted), description, "Mark complete" button, prev/next controls
- **Right 30%**: sticky sidebar — course title + overall progress bar, then shadcn `Accordion` of Modules. Each module shows lesson count + duration sum. Each lesson row:
  - Left: number circle OR `Check` icon (crimson) when completed
  - Middle: lesson title + duration (e.g. `12:45`)
  - Active lesson: crimson left border + crimson-tinted background
- Clicking a lesson swaps the video and updates active state
- "Mark complete" toggles the checkmark in the sidebar (local state)

Mobile: sidebar collapses into a `Sheet` triggered by a "Lessons" button.

## 6. Mock data

`src/data/mock-courses.ts`:
- 2 courses, each with 3 modules, each module with 3–5 lessons
- Per lesson: `id, number, title, duration (sec), videoUrl, completed`
- Per course: `id, title, instructor, thumbnail, modules[]`
- A `currentUser` mock with `name`, `subscription_status: 'free'`, `lastWatched: { courseId, lessonId }`

State lives in a small Zustand store (or React context) so "mark complete" reflects on both dashboard and player without a backend.

## Deferred to next iteration (called out so nothing is forgotten)

- Enable Lovable Cloud
- Google sign-in via the Lovable broker + `supabase--configure_social_auth`
- Tables: `profiles (subscription_status enum: free | 3m | 6m | 1y, expires_at)`, `courses`, `modules`, `lessons`, `lesson_progress`, plus `user_roles` + `has_role` for admin gating
- Move `/dashboard` and `/learn/*` under `_authenticated/`
- Admin panel at `/_authenticated/_admin/admin` with CMS forms and user management table
- Swap mock data for server functions

## Technical notes

- Stack: TanStack Start (already scaffolded), Tailwind v4, shadcn/ui
- All colors via semantic tokens — no hardcoded hex in components
- Video player: native `<video>` with custom crimson controls overlay (no extra dep this pass)
- Icons: `lucide-react` (already available)

Approve and I'll build this pass; then we'll wire Cloud + auth + admin in the next.
