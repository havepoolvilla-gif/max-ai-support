import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Lock, AlertCircle } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { StudentSidebar } from "@/components/student-sidebar";
import { getDashboard, type CourseDTO } from "@/lib/courses.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "ห้องเรียนของฉัน · Skill Max" },
      { name: "description", content: "ศูนย์ควบคุมการเรียนรู้ของคุณ" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["dashboard"],
      queryFn: () => getDashboard(),
    });
  },
  component: Dashboard,
});

function courseStats(course: CourseDTO, completedSet: Set<string>) {
  let total = 0, completed = 0;
  for (const m of course.modules) {
    for (const l of m.lessons) {
      total++;
      if (completedSet.has(l.id)) completed++;
    }
  }
  return { total, completed };
}

function Dashboard() {
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });
  const completedSet = useMemo(() => new Set(data.completedLessonIds), [data.completedLessonIds]);
  const firstName = (data.profile.fullName ?? data.profile.email ?? "นักเรียน").split(" ")[0];

  const enriched = data.courses.map((c) => {
    const s = courseStats(c, completedSet);
    const pct = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100);
    return { course: c, ...s, pct };
  });

  // Demo: locked card to demonstrate access-control state
  const showLockedDemo = true;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto flex max-w-[1400px]">
        <StudentSidebar isAdmin={data.profile.isAdmin} />

        <main className="flex-1 px-6 py-10 lg:px-10">
          <header className="mb-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              ห้องเรียนของฉัน
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              ยินดีต้อนรับกลับมา {firstName} — เลือกคอร์สเพื่อเรียนต่อจากจุดที่ค้างไว้
            </p>
          </header>

          {enriched.length === 0 && !showLockedDemo ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
              ยังไม่มีคอร์สในระบบ — ให้ผู้ดูแลสร้างคอร์สแรกในแอดมินแพแนล
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {enriched.map((e) => (
                <CourseCard key={e.course.id} item={e} />
              ))}
              {showLockedDemo && <LockedCourseCard />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function CourseCard({
  item,
}: {
  item: { course: CourseDTO; total: number; completed: number; pct: number };
}) {
  const { course, pct, total, completed } = item;
  const firstLesson = course.modules[0]?.lessons[0]?.id;
  const initial = (course.title?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover">
      <div className="relative aspect-video w-full overflow-hidden bg-secondary">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
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
        <span className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
          เริ่มเรียน
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          คอร์สเรียน
        </p>
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
          {course.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {course.tagline ?? "คอร์สบทเรียนแบบ bite-sized สำหรับการเรียนรู้ที่มีประสิทธิภาพ"}
        </p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{pct}% complete</span>
            <span className="tabular-nums">
              {completed}/{total} บท
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Link
          to="/learn/$courseId"
          params={{ courseId: course.id }}
          search={firstLesson ? { lesson: firstLesson } : {}}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow"
        >
          เรียนต่อ
        </Link>
      </div>
    </article>
  );
}

function LockedCourseCard() {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-secondary to-muted">
        <div className="flex h-full w-full items-center justify-center">
          <Lock className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-notice px-3 py-1 text-xs font-semibold text-notice-foreground shadow-sm">
          <AlertCircle className="h-3 w-3" />
          ยังไม่ได้เปิดสิทธิ์
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          คอร์สเรียน
        </p>
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
          Advanced Prompt Engineering
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          คอร์สนี้สงวนสำหรับสมาชิก Pro — ติดต่อผู้ดูแลเพื่อขอเปิดสิทธิ์การเข้าถึง
        </p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>รออนุมัติ</span>
            <span className="tabular-nums">0/8 บท</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: "0%" }} />
          </div>
        </div>

        <button
          disabled
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground"
        >
          <Lock className="h-4 w-4" />
          รออนุมัติสิทธิ์
        </button>
      </div>
    </article>
  );
}

