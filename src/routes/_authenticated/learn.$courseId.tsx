import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, ListVideo, PlayCircle, Lock,
} from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { getDashboard, type CourseDTO, type LessonDTO } from "@/lib/courses.functions";
import { getLessonVideo } from "@/lib/lesson-video.functions";
import { toggleLessonComplete, setLastWatched } from "@/lib/progress.functions";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const searchSchema = z.object({
  lesson: z.string().optional(),
  t: z.coerce.number().int().min(0).optional(),
});

export const Route = createFileRoute("/_authenticated/learn/$courseId")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "บทเรียน · Skill Max" }] }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["dashboard"],
      queryFn: () => getDashboard(),
    });
  },
  component: Player,
});

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Player() {
  const { courseId } = Route.useParams();
  const { lesson: lessonParam, t: tParam } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const course = data.courses.find((c) => c.id === courseId);
  const completedSet = useMemo(() => new Set(data.completedLessonIds), [data.completedLessonIds]);

  const flatLessons = useMemo(
    () =>
      course?.modules.flatMap((m) =>
        m.lessons.map((l) => ({ lesson: l, moduleId: m.id, moduleTitle: m.title })),
      ) ?? [],
    [course],
  );

  const activeId = lessonParam ?? flatLessons[0]?.lesson.id;
  const activeIndex = flatLessons.findIndex((x) => x.lesson.id === activeId);
  const active = flatLessons[activeIndex];
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedSecondRef = useRef<number>(-1);

  const videoQuery = useQuery({
    queryKey: ["lesson-video", active?.lesson.id],
    queryFn: () => getLessonVideo({ data: { lessonId: active!.lesson.id } }),
    enabled: !!active?.lesson.id,
    staleTime: 5 * 60 * 1000,
  });
  const videoUrl = videoQuery.data?.videoUrl ?? null;
  const canWatch = !!videoUrl;
  const isLocked = !videoQuery.isLoading && !videoUrl;

  const toggleMut = useMutation({
    mutationFn: (lessonId: string) => toggleLessonComplete({ data: { lessonId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const lastWatchedMut = useMutation({
    mutationFn: (vars: { courseId: string; lessonId: string; positionSeconds?: number }) =>
      setLastWatched({ data: vars }),
  });

  // Reset on lesson change: register lesson + read localStorage fallback for resume
  useEffect(() => {
    if (active && course) {
      lastWatchedMut.mutate({ courseId: course.id, lessonId: active.lesson.id, positionSeconds: 0 });
      lastSavedSecondRef.current = -1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.lesson.id, course?.id]);

  useEffect(() => {
    videoRef.current?.load();
  }, [active?.lesson.id]);

  // Seek to resume timestamp once metadata is ready or url changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !canWatch || !active) return;
    const localKey = `lastWatched:${active.lesson.id}`;
    const local = Number(localStorage.getItem(localKey) ?? "0");
    const startAt = Math.max(tParam ?? 0, isNaN(local) ? 0 : local);
    if (startAt <= 0) return;
    const seek = () => {
      try {
        if (v.duration && startAt < v.duration - 2) v.currentTime = startAt;
      } catch {}
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    return () => v.removeEventListener("loadedmetadata", seek);
  }, [active?.lesson.id, canWatch, videoUrl, tParam]);

  // Persist playback position
  const persist = (sec: number) => {
    if (!active || !course) return;
    const rounded = Math.floor(sec);
    if (rounded === lastSavedSecondRef.current) return;
    lastSavedSecondRef.current = rounded;
    try {
      localStorage.setItem(`lastWatched:${active.lesson.id}`, String(rounded));
    } catch {}
    lastWatchedMut.mutate({ courseId: course.id, lessonId: active.lesson.id, positionSeconds: rounded });
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const sec = Math.floor(v.currentTime);
    if (sec > 0 && sec % 10 === 0) persist(sec);
  };
  const onPause = () => {
    const v = videoRef.current;
    if (v) persist(v.currentTime);
  };

  useEffect(() => {
    const onHide = () => {
      const v = videoRef.current;
      if (v && !v.paused) persist(v.currentTime);
    };
    const onVis = () => { if (document.visibilityState === "hidden") onHide(); };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.lesson.id, course?.id]);

  if (!course || !active) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="font-display text-2xl font-semibold">ไม่พบคอร์สนี้</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-primary underline">
            กลับไปแดชบอร์ด
          </Link>
        </div>
      </div>
    );
  }

  const total = flatLessons.length;
  const completedCount = flatLessons.filter((x) => completedSet.has(x.lesson.id)).length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const goTo = (lessonId: string) =>
    navigate({ to: "/learn/$courseId", params: { courseId }, search: { lesson: lessonId } });
  const prev = activeIndex > 0 ? flatLessons[activeIndex - 1] : null;
  const next = activeIndex < flatLessons.length - 1 ? flatLessons[activeIndex + 1] : null;
  const isDone = completedSet.has(active.lesson.id);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="mx-auto max-w-[1500px] px-4 py-8 lg:px-8">
        {/* Breadcrumb + lesson header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              ห้องเรียนของฉัน
            </Link>
            <span>/</span>
            <span>{course.title}</span>
            <span>/</span>
            <span className="text-foreground">{active.moduleTitle}</span>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {active.moduleTitle}
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
              บทที่ {activeIndex + 1}: {active.lesson.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              ดูวิดีโอบทเรียนและทำเครื่องหมายเมื่อเรียนจบเพื่อบันทึกความก้าวหน้า
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
          {/* LEFT 70% */}
          <div className="space-y-5">
            {/* Video player */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              {canWatch ? (
                <video
                  ref={videoRef}
                  key={active.lesson.id}
                  controls
                  onTimeUpdate={onTimeUpdate}
                  onPause={onPause}
                  className="aspect-video w-full bg-black"
                  poster={`https://placehold.co/1280x720/F8F9FA/0F172A?text=${encodeURIComponent(active.lesson.title)}`}
                >
                  <source src={videoUrl ?? undefined} />
                </video>
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-secondary px-6 text-center">
                  {isLocked ? (
                    <>
                      <Lock className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        คุณยังไม่ได้รับสิทธิ์เข้าถึงคอร์สนี้ — ติดต่อผู้ดูแลเพื่อสมัครเรียน
                      </p>
                      <Link
                        to="/dashboard"
                        className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        กลับไปดูคอร์ส
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">กำลังโหลดวิดีโอ...</p>
                  )}
                </div>
              )}
            </div>

            {/* Tasks for this lesson */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                    สิ่งที่ต้องทำในบทนี้
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ทำตามขั้นตอนด้านล่างเพื่อเก็บผลการเรียน
                  </p>
                </div>
                <button
                  onClick={() => toggleMut.mutate(active.lesson.id)}
                  disabled={toggleMut.isPending}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                    isDone
                      ? "border border-border bg-secondary text-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary-glow"
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> เรียนจบแล้ว
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> ทำเครื่องหมายว่าจบ
                    </>
                  )}
                </button>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {active.lesson.description ||
                  "อ่านคำอธิบายบทเรียน ดูวิดีโอจนจบ และทดลองปฏิบัติตามขั้นตอนที่แสดงในตัวอย่าง"}
              </p>

              <ul className="mt-5 space-y-2.5 text-sm text-foreground">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground">
                    1
                  </span>
                  ดูวิดีโอบทเรียนให้จบ
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground">
                    2
                  </span>
                  จดบันทึกประเด็นสำคัญที่ต้องนำไปใช้งานจริง
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground">
                    3
                  </span>
                  กดปุ่ม "ทำเครื่องหมายว่าจบ" เพื่อบันทึกความก้าวหน้า
                </li>
              </ul>

              <div className="mt-6 flex items-center gap-4 border-t border-border pt-5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(active.lesson.duration)} นาที
                </span>
                <span>·</span>
                <span>
                  บทที่ {activeIndex + 1} จาก {flatLessons.length}
                </span>
              </div>
            </section>

            {/* Prev/Next */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => prev && goTo(prev.lesson.id)}
                disabled={!prev}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> บทก่อนหน้า
              </button>

              <Sheet>
                <SheetTrigger className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium lg:hidden">
                  <ListVideo className="h-4 w-4" /> รายการบทเรียน
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
                  <SheetTitle className="sr-only">รายการบทเรียน</SheetTitle>
                  <Playlist
                    course={course}
                    activeId={active.lesson.id}
                    onSelect={(id) => goTo(id)}
                    completedSet={completedSet}
                    pct={pct}
                    stats={{ total, completed: completedCount }}
                  />
                </SheetContent>
              </Sheet>

              <button
                onClick={() => next && goTo(next.lesson.id)}
                disabled={!next}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-40"
              >
                บทถัดไป <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* RIGHT 30% — Playlist */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <Playlist
                course={course}
                activeId={active.lesson.id}
                onSelect={(id) => goTo(id)}
                completedSet={completedSet}
                pct={pct}
                stats={{ total, completed: completedCount }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Playlist({
  course, activeId, onSelect, completedSet, pct, stats,
}: {
  course: CourseDTO;
  activeId: string;
  onSelect: (id: string) => void;
  completedSet: Set<string>;
  pct: number;
  stats: { total: number; completed: number };
}) {
  // Flatten lessons into a single chronological list
  const items = course.modules.flatMap((m, mIdx) =>
    m.lessons.map((l, lIdx) => ({
      lesson: l,
      moduleTitle: m.title,
      number: mIdx * 100 + lIdx + 1,
      globalIdx: 0, // filled below
    })),
  );
  items.forEach((it, i) => (it.globalIdx = i + 1));

  return (
    <div className="space-y-3">
      {/* Progress header card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          ความก้าวหน้าของคอร์ส
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {stats.completed} / {stats.total} บท
          </span>
          <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Lesson list — separate white rectangular cards */}
      <ul className="space-y-2">
        {items.map((it) => (
          <LessonCardRow
            key={it.lesson.id}
            lesson={it.lesson}
            moduleTitle={it.moduleTitle}
            number={it.globalIdx}
            active={it.lesson.id === activeId}
            done={completedSet.has(it.lesson.id)}
            onSelect={() => onSelect(it.lesson.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function LessonCardRow({
  lesson, moduleTitle, number, active, done, onSelect,
}: {
  lesson: LessonDTO;
  moduleTitle: string;
  number: number;
  active: boolean;
  done: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={`group flex w-full items-start gap-3 rounded-lg border bg-card p-3.5 text-left transition-all ${
          active
            ? "border-primary shadow-card-hover ring-1 ring-primary/15"
            : "border-border shadow-card hover:border-foreground/20 hover:shadow-card-hover"
        }`}
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold">
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : active ? (
            <PlayCircle className="h-5 w-5 text-primary" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground tabular-nums">
              {number}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            บทที่ {number}
          </div>
          <div
            className={`mt-0.5 truncate text-sm ${
              active ? "font-semibold text-foreground" : "font-medium text-foreground"
            }`}
          >
            {lesson.title}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{moduleTitle}</div>
        </div>
        <div className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {formatDuration(lesson.duration)}
        </div>
      </button>
    </li>
  );
}
