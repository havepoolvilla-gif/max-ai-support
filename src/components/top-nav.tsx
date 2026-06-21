import { Link, useRouterState } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent shadow-glow">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight">FORGE</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Academy</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" label="หน้าแรก" active={pathname === "/"} />
          <NavLink to="/dashboard" label="แดชบอร์ด" active={pathname.startsWith("/dashboard")} />
          <NavLink to="/learn/$courseId" params={{ courseId: "ai-engineering" }} label="คลังคอร์ส" active={pathname.startsWith("/learn")} />
        </nav>

        <div className="flex items-center gap-3">
          {onLanding ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
            >
              เข้าสู่ระบบ
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-tight">อเล็กซ์ เรเยส</div>
                <div className="text-[10px] uppercase tracking-wider text-primary">แพ็กเกจฟรี</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground ring-2 ring-primary/30">
                AR
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, label, active, params }: { to: string; label: string; active: boolean; params?: Record<string, string> }) {
  return (
    <Link
      to={to as any}
      params={params as any}
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
