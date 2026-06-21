import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/" || pathname === "/auth";
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "";
  const initials = displayName
    ? displayName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent shadow-glow">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight">FORGE</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              AI Academy
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" label="หน้าแรก" active={pathname === "/"} />
          {user && (
            <NavLink to="/dashboard" label="แดชบอร์ด" active={pathname.startsWith("/dashboard")} />
          )}
        </nav>

        <div className="flex items-center gap-3">
          {onLanding && !user ? (
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
            >
              เข้าสู่ระบบ
            </Link>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-tight">{displayName}</div>
                <div className="text-[10px] uppercase tracking-wider text-primary">
                  เข้าสู่ระบบแล้ว
                </div>
              </div>
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-primary-foreground ring-2 ring-primary/30">
                  {initials}
                </div>
              )}
              <button
                onClick={handleSignOut}
                title="ออกจากระบบ"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  to, label, active,
}: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to as any}
      className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {active && (
        <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-primary shadow-glow" />
      )}
    </Link>
  );
}
