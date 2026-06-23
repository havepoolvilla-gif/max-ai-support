## Goal
After Google sign-in, gate the dashboard with a full-screen blur overlay that asks first-time users for a universal activation password. Once correct, persist `is_activated=true` and never show it again.

## 1. Database (single migration)
- Add `is_activated BOOLEAN NOT NULL DEFAULT false` to `public.profiles`.
- Add `public.app_settings` table (singleton key/value) to store the activation password set by admins:
  - columns: `key TEXT PRIMARY KEY`, `value TEXT NOT NULL`, `updated_at`
  - GRANTs: `SELECT` to authenticated is NOT given (password stays server-only); `ALL` to `service_role`. Admins read/write only through server functions.
  - Seed initial row: `('activation_password', 'FORGE2026')`.
- Add server-side RPC `activate_account(_password text)` (SECURITY DEFINER):
  - Compares against `app_settings.activation_password`.
  - If match: sets `profiles.is_activated = true` for `auth.uid()` and returns `true`. Otherwise returns `false`.
- Grant EXECUTE on the RPC to `authenticated`.

## 2. Server functions (`src/lib/activation.functions.ts`)
- `getActivationStatus` (auth) → returns `{ isActivated: boolean }` from `profiles`.
- `activateAccount` (auth, input `{ password }`) → calls the RPC, returns `{ ok: boolean }`.
- `getActivationPassword` (auth + admin check) → returns current password (admin panel only).
- `setActivationPassword` (auth + admin check, input `{ password }`) → upserts into `app_settings`.

## 3. Auth page (`src/routes/auth.tsx`)
- Remove email/password form and all related state. Keep only the "เข้าสู่ระบบด้วย Google" button (and existing error display).
- Keep the existing `handle_new_user` trigger — it already saves email + full_name from Google metadata into `profiles`.

## 4. Activation overlay
- New component `src/components/activation-gate.tsx`:
  - Uses `useQuery(getActivationStatus)` after sign-in.
  - While loading: render children hidden behind a skeleton.
  - If `isActivated === false`: render children with a backdrop-blur, non-dismissible dialog centered on top:
    - Title: "ยืนยันสิทธิ์เข้าใช้งานครั้งแรก"
    - Copy: "กรุณากรอกรหัสผ่านเพื่อยืนยันสิทธิ์เข้าใช้งานครั้งแรก (รับรหัสจากแอดมิน)"
    - Single password input + submit button "ยืนยัน"
    - On submit → `activateAccount`; on success invalidate the status query so overlay disappears; on failure show "รหัสไม่ถูกต้อง".
  - If `isActivated === true`: render children normally.
- Mount the gate inside `src/routes/_authenticated/route.tsx` wrapping `<Outlet />` so every authenticated page is protected (dashboard, learn, admin).

## 5. Admin panel
- In `src/routes/_authenticated/admin.tsx`, add a small "รหัสเปิดใช้งานระบบ" card in the existing settings area:
  - Loads current password via `getActivationPassword`.
  - Input + "บันทึก" button calls `setActivationPassword`.

## 6. Styling
- Reuse existing shadcn `Dialog`/`Card`/`Input`/`Button` to keep the minimalist light theme and Thai typography intact. Backdrop uses `backdrop-blur-md bg-background/70`.

## Technical notes
- The activation password is never sent to the client by default — only the admin-only `getActivationPassword` returns it. Students POST their attempt to the server function which calls the SECURITY DEFINER RPC.
- `is_activated` defaults to `false` for existing rows; admins can be auto-activated by the migration (`UPDATE profiles SET is_activated = true WHERE id IN (SELECT user_id FROM user_roles WHERE role='admin')`).

## Files
- new: `supabase/migrations/<ts>_activation.sql`
- new: `src/lib/activation.functions.ts`
- new: `src/components/activation-gate.tsx`
- edit: `src/routes/auth.tsx` (Google-only)
- edit: `src/routes/_authenticated/route.tsx` (mount gate)
- edit: `src/routes/_authenticated/admin.tsx` (password setting)
