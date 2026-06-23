import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { StudentSidebar } from "@/components/student-sidebar";
import { getDashboard, type CourseDTO } from "@/lib/courses.functions";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "คอร์สของฉัน · Skill Max" },
      { name: "description", content: "ห้องสมุดคอร์สเรียนของคุณ" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["dashboard"],
      queryFn: () => getDashboard(),
    });
  },
  component: CoursesPage,
});

function stats(course: CourseDTO, completed: Set<string>) {
  let total = 0, done = 0;
  for (const m of course.modules) for (const l of m.lessons) {
    total++;
    if (completed.has(l.id)) done++;
  }
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function CoursesPage() {
  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const completedSet = useMemo(() => new Set(data.completedLessonIds), [data.completedLessonIds]);
  const enrolled = data.courses.filter((c) => c.hasAccess);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto flex max-w-[1400px]">
        <StudentSidebar isAdmin={data.profile.isAdmin} />
        <main className="flex-1 px-6 py-10 lg:px-10">
          <header className="mb-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              คอร์สของฉัน
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              ห้องสมุดส่วนตัว — คอร์สทั้งหมดที่คุณได้รับสิทธิ์เข้าถึงแล้ว
            </p>
          </header>

          {enrolled.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-4 text-sm text-muted-foreground">
                ยังไม่มีคอร์สที่เปิดสิทธิ์ — ติดต่อผู้ดูแลเพื่อเปิดใช้งานคอร์สของคุณ
              </p>
              <Link
                to="/dashboard"
                className="mt-6 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                ดูคอร์สทั้งหมด
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {enrolled.map((c) => {
                const s = stats(c, completedSet);
                const firstLesson = c.modules[0]?.lessons[0]?.id;
                const initial = (c.title?.trim()?.[0] ?? "?").toUpperCase();
                return (
                  <article
                    key={c.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-secondary">
                      {c.thumbnailUrl ? (
                        <img
                          src={c.thumbnailUrl}
                          alt={c.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-secondary to-primary/5">
                          <span className="font-display text-5xl font-semibold text-primary/40">
                            {initial}
                          </span>
                        </div>
                      )}
                      {c.courseTier && (
                        <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-background/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur">
                          {c.courseTier}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
                        {c.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {c.tagline ?? "เปิดคอร์สเพื่อดูสารบัญและเริ่มเรียนตั้งแต่บทแรก"}
                      </p>
                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="tabular-nums">{s.pct}% เรียนจบ</span>
                          <span className="tabular-nums">{s.done}/{s.total} บท</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                      <Link
                        to="/learn/$courseId"
                        params={{ courseId: c.id }}
                        search={firstLesson ? { lesson: firstLesson } : {}}
                        className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow"
                      >
                        เปิดคอร์ส
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
