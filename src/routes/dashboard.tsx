import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, PlayCircle, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { COURSES, CURRENT_USER, courseStats, findLesson, formatDuration } from "@/data/mock-courses";
import { useProgress } from "@/lib/progress-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "แดชบอร์ด · Forge" },
      { name: "description", content: "ศูนย์ควบคุมการเรียนรู้ของคุณ" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const completed = useProgress((s) => s.completed);
  const lastWatched = useProgress((s) => s.lastWatched) ?? CURRENT_USER.lastWatched;
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const [tab, setTab] = useState<"all" | "in-progress" | "completed">("all");

  const enriched = COURSES.map((c) => {
    const s = courseStats(c.id, completedSet);
    const pct = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100);
    const status: "not-started" | "in-progress" | "completed" =
      s.completed === 0 ? "not-started" : s.completed === s.total ? "completed" : "in-progress";
    return { course: c, ...s, pct, status };
  });

  const filtered = enriched.filter((e) => {
    if (tab === "all") return true;
    if (tab === "in-progress") return e.status === "in-progress" || e.status === "not-started";
    return e.status === "completed";
  });

  const resume = lastWatched ? findLesson(lastWatched.courseId, lastWatched.lessonId) : null;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-background p-8">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3 w-3" />
                {CURRENT_USER.subscription_status === "free" ? "แพ็กเกจฟรี" : "แพ็กเกจ " + CURRENT_USER.subscription_status.toUpperCase()}
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                ยินดีต้อนรับกลับมา, <span className="text-primary">{CURRENT_USER.name.split(" ")[0]}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                คุณเรียนจบไปแล้ว {completed.length} บทเรียน รักษาโมเมนตัมเอาไว้
              </p>
            </div>
            <div className="flex gap-8">
              <Stat label="บทเรียนที่จบ" value={completed.length} />
              <Stat label="คอร์สที่กำลังเรียน" value={enriched.filter(e => e.status !== "not-started").length} />
            </div>
          </div>
        </div>

        {/* Continue learning */}
        {resume && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">เรียนต่อจากที่ค้างไว้</h2>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">เริ่มจากจุดที่หยุดไว้</span>
            </div>
            <Link
              to="/learn/$courseId"
              params={{ courseId: resume.course.id }}
              search={{ lesson: resume.lesson.id }}
              className="group relative grid overflow-hidden rounded-xl border border-border bg-card shadow-elevated transition-all hover:border-primary/50 hover:shadow-glow md:grid-cols-[1fr_2fr]"
            >
              <div className="relative aspect-video md:aspect-auto bg-gradient-to-br from-accent/50 via-card to-background">
                <div className="absolute inset-0 grid-bg opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-glow transition-transform group-hover:scale-110">
                    <PlayCircle className="h-9 w-9 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{resume.module.title}</div>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">{resume.lesson.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{resume.lesson.description}</p>
                <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {formatDuration(resume.lesson.duration)} นาที</span>
                  <span>·</span>
                  <span>{resume.course.title}</span>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  ดูบทเรียนต่อ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Library */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold tracking-tight">คลังของคุณ</h2>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="in-progress">กำลังเรียน</TabsTrigger>
              <TabsTrigger value="completed">เรียนจบแล้ว</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-6">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
                  ยังไม่มีคอร์สในหมวดนี้
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((e) => (
                    <CourseCard key={e.course.id} item={e} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
    </div>
  );
}

function CourseCard({ item }: { item: ReturnType<typeof courseStats> & { course: typeof COURSES[number]; pct: number; status: string } }) {
  const { course, pct, total, completed, status } = item;
  const firstLesson = course.modules[0]?.lessons[0]?.id;

  return (
    <Link
      to="/learn/$courseId"
      params={{ courseId: course.id }}
      search={firstLesson ? { lesson: firstLesson } : undefined}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-glow"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-accent/40 via-card to-background">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute right-3 top-3">
          <StatusChip status={status} />
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {course.modules.length} โมดูล · {total} บทเรียน
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-tight tracking-tight">{course.title}</h3>
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{course.tagline}</p>

        <div className="mt-auto pt-5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>เรียนจบ {completed} / {total} บท</span>
            <span className="font-semibold text-foreground tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
        <CheckCircle2 className="h-3 w-3" /> เรียนจบ
      </span>
    );
  if (status === "in-progress")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
        กำลังเรียน
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
      ใหม่
    </span>
  );
}
