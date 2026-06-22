import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { getDashboard, type CourseDTO, type ModuleDTO, type LessonDTO } from "@/lib/courses.functions";
import { getLessonVideo } from "@/lib/lesson-video.functions";
import {
  upsertCourse, deleteCourse,
  upsertModule, deleteModule,
  upsertLesson, deleteLesson,
  listUsers, updateUserSubscription,
  createStudent, grantCourseAccess, revokeCourseAccess,
} from "@/lib/admin.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Skill Max" }] }),
  loader: async ({ context }) => {
    const dash = await context.queryClient.ensureQueryData({
      queryKey: ["dashboard"],
      queryFn: () => getDashboard(),
    });
    if (!dash.profile.isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminPanel,
});

function AdminPanel() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Admin Console
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            จัดการเนื้อหาและผู้ใช้
          </h1>
        </div>

        <Tabs defaultValue="content">
          <TabsList className="border border-border bg-card">
            <TabsTrigger value="content">เนื้อหา (Courses)</TabsTrigger>
            <TabsTrigger value="users">ผู้ใช้</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="mt-6">
            <ContentManager />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ContentManager() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

  const [editCourse, setEditCourse] = useState<Partial<CourseDTO> | null>(null);
  const [editModule, setEditModule] = useState<{ courseId: string; module?: ModuleDTO } | null>(null);
  const [editLesson, setEditLesson] = useState<{ moduleId: string; lesson?: LessonDTO } | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dashboard"] });

  const delCourse = useMutation({
    mutationFn: (id: string) => deleteCourse({ data: { id } }),
    onSuccess: invalidate,
  });
  const delModule = useMutation({
    mutationFn: (id: string) => deleteModule({ data: { id } }),
    onSuccess: invalidate,
  });
  const delLesson = useMutation({
    mutationFn: (id: string) => deleteLesson({ data: { id } }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setEditCourse({})}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" /> เพิ่มคอร์ส
        </button>
      </div>

      {data.courses.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          ยังไม่มีคอร์ส — เริ่มสร้างคอร์สแรก
        </div>
      )}

      {data.courses.map((course) => (
        <div key={course.id} className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                คอร์ส · sort {course.sortOrder}
              </div>
              <h3 className="mt-1 font-display text-xl font-bold">{course.title}</h3>
              <p className="text-xs text-muted-foreground">{course.tagline}</p>
            </div>
            <div className="flex items-center gap-2">
              <IconBtn onClick={() => setEditCourse(course)}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => confirm("ลบคอร์สนี้?") && delCourse.mutate(course.id)} danger>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
              <button
                onClick={() => setEditModule({ courseId: course.id })}
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <Plus className="h-3 w-3" /> โมดูล
              </button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {course.modules.map((mod) => (
              <div key={mod.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      โมดูล · sort {mod.sortOrder}
                    </div>
                    <div className="text-sm font-semibold">{mod.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconBtn onClick={() => setEditModule({ courseId: course.id, module: mod })}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn
                      onClick={() => confirm("ลบโมดูล?") && delModule.mutate(mod.id)}
                      danger
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                    <button
                      onClick={() => setEditLesson({ moduleId: mod.id })}
                      className="ml-2 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                    >
                      <Plus className="h-3 w-3" /> บทเรียน
                    </button>
                  </div>
                </div>

                <ul className="mt-3 space-y-1">
                  {mod.lessons.map((les) => (
                    <li
                      key={les.id}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">
                          [{les.sortOrder}] {les.title}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {les.duration}s · วิดีโอจัดการในแบบฟอร์มแก้ไข
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconBtn onClick={() => setEditLesson({ moduleId: mod.id, lesson: les })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          onClick={() => confirm("ลบบทเรียน?") && delLesson.mutate(les.id)}
                          danger
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}

      {editCourse && (
        <CourseDialog
          initial={editCourse}
          onClose={() => setEditCourse(null)}
          onSaved={() => {
            setEditCourse(null);
            invalidate();
          }}
        />
      )}
      {editModule && (
        <ModuleDialog
          courseId={editModule.courseId}
          initial={editModule.module}
          onClose={() => setEditModule(null)}
          onSaved={() => {
            setEditModule(null);
            invalidate();
          }}
        />
      )}
      {editLesson && (
        <LessonDialog
          moduleId={editLesson.moduleId}
          initial={editLesson.lesson}
          onClose={() => setEditLesson(null)}
          onSaved={() => {
            setEditLesson(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, danger,
}: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        danger
          ? "border-destructive/30 text-destructive hover:bg-destructive/10"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-elevated">
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

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

function CourseDialog({
  initial, onClose, onSaved,
}: { initial: Partial<CourseDTO>; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [instructor, setInstructor] = useState(initial.instructor ?? "");
  const [thumbnail, setThumbnail] = useState(initial.thumbnailUrl ?? "");
  const [sortOrder, setSortOrder] = useState(initial.sortOrder ?? 0);

  const save = useMutation({
    mutationFn: () =>
      upsertCourse({
        data: {
          id: initial.id,
          title,
          tagline: tagline || null,
          description: description || null,
          instructor: instructor || null,
          thumbnail_url: thumbnail || null,
          sort_order: Number(sortOrder) || 0,
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={initial.id ? "แก้ไขคอร์ส" : "เพิ่มคอร์ส"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="ชื่อคอร์ส"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Tagline"><input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field>
        <Field label="รายละเอียด"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="ผู้สอน"><input className={inputCls} value={instructor} onChange={(e) => setInstructor(e.target.value)} /></Field>
        <Field label="Thumbnail URL"><input className={inputCls} value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} /></Field>
        <Field label="Sort Order"><input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">ยกเลิก</button>
        <button
          disabled={!title || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {save.isPending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </Modal>
  );
}

function ModuleDialog({
  courseId, initial, onClose, onSaved,
}: { courseId: string; initial?: ModuleDTO; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  const save = useMutation({
    mutationFn: () =>
      upsertModule({
        data: {
          id: initial?.id,
          course_id: courseId,
          title,
          sort_order: Number(sortOrder) || 0,
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={initial ? "แก้ไขโมดูล" : "เพิ่มโมดูล"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="ชื่อโมดูล"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Sort Order"><input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">ยกเลิก</button>
        <button
          disabled={!title || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {save.isPending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </Modal>
  );
}

function LessonDialog({
  moduleId, initial, onClose, onSaved,
}: { moduleId: string; initial?: LessonDTO; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(initial?.duration ?? 0);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  useEffect(() => {
    if (initial?.id) {
      getLessonVideo({ data: { lessonId: initial.id } })
        .then((r) => setVideoUrl(r.videoUrl ?? ""))
        .catch(() => setVideoUrl(""));
    }
  }, [initial?.id]);


  const save = useMutation({
    mutationFn: () =>
      upsertLesson({
        data: {
          id: initial?.id,
          module_id: moduleId,
          title,
          description: description || null,
          video_url: videoUrl || null,
          duration_seconds: Number(duration) || 0,
          sort_order: Number(sortOrder) || 0,
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={initial ? "แก้ไขบทเรียน" : "เพิ่มบทเรียน"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="ชื่อบทเรียน"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="คำอธิบาย"><textarea className={inputCls} rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Video URL (mp4, HLS หรือลิงก์อื่น)"><input className={inputCls} value={videoUrl ?? ""} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ความยาว (วินาที)"><input type="number" className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></Field>
          <Field label="Sort Order"><input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">ยกเลิก</button>
        <button
          disabled={!title || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {save.isPending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </Modal>
  );
}

function UsersManager() {
  const qc = useQueryClient();
  const { data: users } = useSuspenseQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsers(),
  });

  const update = useMutation({
    mutationFn: (vars: { userId: string; status: "free" | "pro" | "lifetime" }) =>
      updateUserSubscription({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-sidebar text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">อีเมล</th>
            <th className="px-4 py-3 text-left">ชื่อ</th>
            <th className="px-4 py-3 text-left">สมัครเมื่อ</th>
            <th className="px-4 py-3 text-left">แพ็กเกจ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                ยังไม่มีผู้ใช้
              </td>
            </tr>
          )}
          {users.map((u: any) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-mono text-xs">{u.email ?? "-"}</td>
              <td className="px-4 py-3">{u.full_name ?? "-"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString("th-TH")}
              </td>
              <td className="px-4 py-3">
                <select
                  value={u.subscription_status}
                  onChange={(e) =>
                    update.mutate({ userId: u.id, status: e.target.value as any })
                  }
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
                >
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                  <option value="lifetime">lifetime</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
