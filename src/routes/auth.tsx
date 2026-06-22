import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/skill-max-logo.png.asset.json";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ · Skill Max" },
      { name: "description", content: "เข้าสู่ระบบเพื่อเริ่มเรียน" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : err.message);
      setLoading(false);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setError(
        typeof result.error === "object" && result.error && "message" in result.error
          ? String((result.error as any).message)
          : "เข้าสู่ระบบไม่สำเร็จ",
      );
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="Skill Max"
            className="h-10 w-10 object-contain"
          />
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Skill Max
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              AI Academy
            </span>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            เข้าสู่ระบบ
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            พร้อมเริ่มเรียนแล้วหรือยัง?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ใช้อีเมลและรหัสผ่านที่ได้รับจากผู้ดูแลเพื่อเข้าสู่บัญชีของคุณ
          </p>

          <form onSubmit={onLogin} className="mt-6 space-y-3">
            <label className="block">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email (Gmail)
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                รหัสผ่าน
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow disabled:opacity-60"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            หรือ
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={onGoogle}
            disabled={googleLoading}
            className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1h-9.17v2.92h5.27c-.24 1.5-1.74 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.42l2.53-2.43C16.92 3.91 14.81 3 12.18 3 7.13 3 3 7.07 3 12.07s4.13 9.07 9.18 9.07c5.3 0 8.82-3.72 8.82-8.96 0-.6-.07-1.06-.15-1.5z" />
            </svg>
            {googleLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
          </button>

          {error && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ยังไม่มีบัญชี? โปรดติดต่อผู้ดูแลเพื่อขอเปิดบัญชีและรับรหัสผ่าน
          </p>
        </div>
      </div>
    </div>
  );
}
