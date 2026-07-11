import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/skill-max-logo.png.asset.json";


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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3.5 group">
          <img
            src={logoAsset.url}
            alt="Skill Max"
            className="h-14 w-14 object-contain"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Skill Max
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              AI Academy
            </span>
          </div>
        </Link>


        <div className="flex items-center gap-3">
          {onLanding && !user ? (
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-glow"
            >
              เข้าสู่ระบบ
            </Link>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-tight text-foreground">
                  {displayName}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  เข้าสู่ระบบแล้ว
                </div>
              </div>
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground ring-1 ring-border">
                  {initials}
                </div>
              )}
              <button
                onClick={handleSignOut}
                title="ออกจากระบบ"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
