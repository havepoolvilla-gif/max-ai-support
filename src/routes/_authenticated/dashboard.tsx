import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Lock, AlertCircle, PlayCircle, X, ExternalLink } from "lucide-react";
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

  const [previewCourse, setPreviewCourse] = useState<CourseDTO | null>(null);
  const [buyCourse, setBuyCourse] = useState<CourseDTO | null>(null);

  const enriched = data.courses.map((c) => {
    const s = courseStats(c, completedSet);
    const pct = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100);
    return { course: c, ...s, pct };
  });

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

          {enriched.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
              ยังไม่มีคอร์สในระบบ — ให้ผู้ดูแลสร้างคอร์สแรกในแอดมินแพแนล
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {enriched.map((e) =>
                e.course.hasAccess ? (
                  <CourseCard key={e.course.id} item={e} />
                ) : (
                  <LockedCourseCard
                    key={e.course.id}
                    course={e.course}
                    onPreview={() => setPreviewCourse(e.course)}
                    onBuy={() => setBuyCourse(e.course)}
                  />
                ),
              )}
            </div>
          )}
        </main>
      </div>

      {previewCourse && (
        <PreviewDialog course={previewCourse} onClose={() => setPreviewCourse(null)} />
      )}
      {buyCourse && <BuyDialog course={buyCourse} onClose={() => setBuyCourse(null)} />}
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

function LockedCourseCard({
  course,
  onPreview,
  onBuy,
}: {
  course: CourseDTO;
  onPreview: () => void;
  onBuy: () => void;
}) {
  const initial = (course.title?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="relative aspect-video w-full overflow-hidden bg-secondary">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover opacity-80"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="font-display text-5xl font-semibold text-muted-foreground/40">
              {initial}
            </span>
          </div>
        )}
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
          {course.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {course.tagline ?? "ติดต่อผู้ดูแลเพื่อขอเปิดสิทธิ์การเข้าถึงคอร์สนี้"}
        </p>

        {course.price > 0 && (
          <div className="mt-4 text-sm">
            <span className="font-display text-2xl font-bold text-foreground tabular-nums">
              ฿{course.price.toLocaleString("th-TH")}
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onBuy}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow"
          >
            สนใจสมัครเรียน
          </button>
          {course.previewVideoUrl && (
            <button
              onClick={onPreview}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <PlayCircle className="h-4 w-4" />
              ดูตัวอย่างคอร์ส
            </button>
          )}
          {!course.previewVideoUrl && (
            <button
              disabled
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground"
            >
              <Lock className="h-4 w-4" />
              ยังไม่มีตัวอย่าง
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-xl border border-border bg-card p-6 shadow-elevated`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PreviewDialog({ course, onClose }: { course: CourseDTO; onClose: () => void }) {
  const url = course.previewVideoUrl!;
  const isYoutube = /youtu\.?be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);
  const isIframe = isYoutube || isVimeo;
  return (
    <ModalShell title={`ตัวอย่างคอร์ส · ${course.title}`} onClose={onClose} wide>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        {isIframe ? (
          <iframe
            src={url}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={url} controls className="h-full w-full" autoPlay />
        )}
      </div>
    </ModalShell>
  );
}

function BuyDialog({ course, onClose }: { course: CourseDTO; onClose: () => void }) {
  return (
    <ModalShell title="สนใจสมัครเรียน" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            คอร์ส
          </div>
          <div className="mt-1 font-display text-lg font-semibold">{course.title}</div>
          {course.price > 0 && (
            <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
              ฿{course.price.toLocaleString("th-TH")}
            </div>
          )}
        </div>
        {course.purchaseInfo && (
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/50 p-4 text-sm leading-relaxed text-foreground">
            {course.purchaseInfo}
          </div>
        )}
        {!course.purchaseInfo && !course.purchaseUrl && (
          <p className="text-sm text-muted-foreground">
            กรุณาติดต่อผู้ดูแลเพื่อสมัครเรียนและรับสิทธิ์เข้าถึงคอร์สนี้
          </p>
        )}
        {course.purchaseUrl && (
          <a
            href={course.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow"
          >
            <ExternalLink className="h-4 w-4" />
            ติดต่อสมัครเรียน
          </a>
        )}
      </div>
    </ModalShell>
  );
}
