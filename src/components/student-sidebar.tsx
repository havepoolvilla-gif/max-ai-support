import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, GraduationCap, User as UserIcon, Settings } from "lucide-react";
import type { ReactNode } from "react";

type Item = { to: string; label: string; icon: ReactNode };

export function StudentSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: Item[] = [
    { to: "/dashboard", label: "ห้องเรียนของฉัน", icon: <GraduationCap className="h-4.5 w-4.5" /> },
    { to: "/courses", label: "คอร์สของฉัน", icon: <BookOpen className="h-4.5 w-4.5" /> },
    { to: "/profile", label: "โปรไฟล์", icon: <UserIcon className="h-4.5 w-4.5" /> },
  ];

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
      <nav className="flex h-full flex-col p-4">
        <div className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          เมนู
        </div>
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              item.to === "/profile"
                ? pathname.startsWith("/profile")
                : item.to === "/courses"
                  ? pathname.startsWith("/courses") || pathname.startsWith("/learn")
                  : pathname === "/dashboard" || pathname === "/";
            return (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <span className={active ? "text-foreground" : "text-muted-foreground"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {isAdmin && (
          <div className="mt-auto border-t border-border pt-4">
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
