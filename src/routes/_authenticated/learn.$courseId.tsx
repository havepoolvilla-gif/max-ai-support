import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, ListVideo, PlayCircle,
} from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { getDashboard, type CourseDTO, type LessonDTO } from "@/lib/courses.functions";
import { getLessonVideo } from "@/lib/lesson-video.functions";
import { toggleLessonComplete, setLastWatched } from "@/lib/progress.functions";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const searchSchema = z.object({ lesson: z.string().optional() });

export const Route = createFileRoute("/_authenticated/learn/$courseId")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "บทเรียน · Forge" }] }),
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
  const { lesson: lessonParam } = Route.useSearch();
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

  const toggleMut = useMutation({
    mutationFn: (lessonId: string) => toggleLessonComplete({ data: { lessonId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const lastWatchedMut = useMutation({
    mutationFn: (vars: { courseId: string; lessonId: string }) =>
      setLastWatched({ data: vars }),
  });

  useEffect(() => {
    if (active && course) {
      lastWatchedMut.mutate({ courseId: course.id, lessonId: active.lesson.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.lesson.id, course?.id]);

  useEffect(() => {
    videoRef.current?.load();
  }, [active?.lesson.id]);

  if (!course || !active) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">ไม่พบคอร์สนี้</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-primary">
            กลับไปแดชบอร์ด
          </Link>
        </div>
      </div>
    );
  }

  const total = flatLessons.length;
  const completedCount = flatLessons.filter((x) => completedSet.has(x.lesson.id)).length;
  const totalDuration = flatLessons.reduce((sum, x) => sum + x.lesson.duration, 0);
  const stats = { total, completed: completedCount, totalDuration };
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const goTo = (lessonId: string) =>
    navigate({ to: "/learn/$courseId", params: { courseId }, search: { lesson: lessonId } });
  const prev = activeIndex > 0 ? flatLessons[activeIndex - 1] : null;
  const next = activeIndex < flatLessons.length - 1 ? flatLessons[activeIndex + 1] : null;
  const isDone = completedSet.has(active.lesson.id);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            แดชบอร์ด
          </Link>
          <span>/</span>
          <span className="text-foreground">{course.title}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-xl border border-border bg-black shadow-elevated">
              <div className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
              {active.lesson.videoUrl ? (
                <video
                  ref={videoRef}
                  key={active.lesson.id}
                  controls
                  className="aspect-video w-full bg-black"
                  poster={`https://placehold.co/1280x720/0a0a0a/dc2626?text=${encodeURIComponent(active.lesson.title)}`}
                >
                  <source src={active.lesson.videoUrl} />
                </video>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-black text-sm text-muted-foreground">
                  ยังไม่มีลิงก์วิดีโอสำหรับบทเรียนนี้
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                {active.moduleTitle}
              </div>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                <h1 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                  {active.lesson.title}
                </h1>
                <button
                  onClick={() => toggleMut.mutate(active.lesson.id)}
                  disabled={toggleMut.isPending}
                  className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                    isDone
                      ? "border border-primary/40 bg-primary/10 text-primary"
                      : "bg-primary text-primary-foreground hover:shadow-glow"
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

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(active.lesson.duration)} นาที
                </span>
                <span>·</span>
                <span>
                  บทที่ {activeIndex + 1} จาก {flatLessons.length}
                </span>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {active.lesson.description}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                <button
                  onClick={() => prev && goTo(prev.lesson.id)}
                  disabled={!prev}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" /> บทก่อนหน้า
                </button>

                <Sheet>
                  <SheetTrigger className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium lg:hidden">
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
                      stats={stats}
                    />
                  </SheetContent>
                </Sheet>

                <button
                  onClick={() => next && goTo(next.lesson.id)}
                  disabled={!next}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
                >
                  บทถัดไป <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-xl border border-border bg-card overflow-hidden">
              <Playlist
                course={course}
                activeId={active.lesson.id}
                onSelect={(id) => goTo(id)}
                completedSet={completedSet}
                pct={pct}
                stats={stats}
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
  const activeModuleId = course.modules.find((m) =>
    m.lessons.some((l) => l.id === activeId),
  )?.id;

  return (
    <div>
      <div className="border-b border-border bg-sidebar p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          คอร์ส
        </div>
        <h2 className="mt-1 font-display text-lg font-bold leading-tight">{course.title}</h2>
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            เรียนจบ {stats.completed} / {stats.total} บท
          </span>
          <span className="font-semibold text-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={activeModuleId ? [activeModuleId] : []}
        className="p-2"
      >
        {course.modules.map((module, mIdx) => {
          const moduleDuration = module.lessons.reduce((sum, l) => sum + l.duration, 0);
          const moduleDone =
            module.lessons.length > 0 && module.lessons.every((l) => completedSet.has(l.id));

          return (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border-b border-border/60 last:border-0"
            >
              <AccordionTrigger className="px-3 py-3 hover:no-underline">
                <div className="flex w-full items-center gap-3 text-left">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                      moduleDone
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {moduleDone ? <Check className="h-4 w-4" /> : (mIdx + 1).toString().padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{module.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>{module.lessons.length} บท</span>
                      <span>·</span>
                      <span>{formatDuration(moduleDuration)} นาที</span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <ul className="space-y-0.5 pl-2">
                  {module.lessons.map((lesson, idx) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      number={idx + 1}
                      active={lesson.id === activeId}
                      done={completedSet.has(lesson.id)}
                      onSelect={() => onSelect(lesson.id)}
                    />
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function LessonRow({
  lesson, number, active, done, onSelect,
}: {
  lesson: LessonDTO;
  number: number;
  active: boolean;
  done: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={`group flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left transition-all ${
          active
            ? "border-primary bg-accent/30 text-foreground shadow-[inset_0_0_20px_oklch(0.58_0.22_25/0.08)]"
            : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : active ? (
            <PlayCircle className="h-5 w-5 text-primary" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-medium tabular-nums">
              {number}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm ${active ? "font-semibold" : "font-medium"}`}>
            {lesson.title}
          </div>
        </div>
        <div className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {formatDuration(lesson.duration)}
        </div>
      </button>
    </li>
  );
}
