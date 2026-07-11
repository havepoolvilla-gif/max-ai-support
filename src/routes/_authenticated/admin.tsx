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
  upsertPendingStudent, listPendingStudents, deletePendingStudent,
  grantCourseAccess, revokeCourseAccess,
  uploadCourseThumbnail, clearCourseThumbnail,
} from "@/lib/admin.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SupportConsole } from "@/components/admin/support-console";

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
            <TabsTrigger value="students">จัดการนักเรียน</TabsTrigger>
            <TabsTrigger value="users">ผู้ใช้</TabsTrigger>
            <TabsTrigger value="support">กล่องข้อความช่วยเหลือ</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="mt-6">
            <ContentManager />
          </TabsContent>
          <TabsContent value="students" className="mt-6">
            <StudentsManager />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersManager />
          </TabsContent>
          <TabsContent value="support" className="mt-6">
            <SupportConsole />
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
  const [sortOrder, setSortOrder] = useState(initial.sortOrder ?? 0);
  const [courseTier, setCourseTier] = useState(initial.courseTier ?? "");
  const [price, setPrice] = useState(initial.price ?? 0);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(initial.previewVideoUrl ?? "");
  const [purchaseUrl, setPurchaseUrl] = useState(initial.purchaseUrl ?? "");
  const [purchaseInfo, setPurchaseInfo] = useState(initial.purchaseInfo ?? "");

  const save = useMutation({
    mutationFn: () =>
      upsertCourse({
        data: {
          id: initial.id,
          title,
          tagline: tagline || null,
          description: description || null,
          instructor: instructor || null,
          sort_order: Number(sortOrder) || 0,
          course_tier: courseTier || null,
          price: Number(price) || 0,
          preview_video_url: previewVideoUrl || null,
          purchase_url: purchaseUrl || null,
          purchase_info: purchaseInfo || null,
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={initial.id ? "แก้ไขคอร์ส" : "เพิ่มคอร์ส"} onClose={onClose}>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <Field label="ชื่อคอร์ส"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Tagline"><input className={inputCls} value={tagline ?? ""} onChange={(e) => setTagline(e.target.value)} /></Field>
        <Field label="รายละเอียด"><textarea className={inputCls} rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="ผู้สอน"><input className={inputCls} value={instructor ?? ""} onChange={(e) => setInstructor(e.target.value)} /></Field>
        <ThumbnailUploader
          courseId={initial.id}
          initialPreviewUrl={initial.thumbnailUrl ?? null}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Course Tier (slug เช่น ai_secretary)"><input className={inputCls} value={courseTier ?? ""} onChange={(e) => setCourseTier(e.target.value)} placeholder="ai_secretary" /></Field>
          <Field label="ราคา (บาท)"><input type="number" className={inputCls} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field>
        </div>
        <Field label="Preview Video URL (ตัวอย่างคอร์ส)"><input className={inputCls} value={previewVideoUrl ?? ""} onChange={(e) => setPreviewVideoUrl(e.target.value)} placeholder="https://..." /></Field>
        <Field label="Purchase URL (ลิงก์ติดต่อสมัคร)"><input className={inputCls} value={purchaseUrl ?? ""} onChange={(e) => setPurchaseUrl(e.target.value)} placeholder="https://line.me/..." /></Field>
        <Field label="ข้อมูลการชำระเงิน (แสดงในป๊อปอัพ)"><textarea className={inputCls} rows={3} value={purchaseInfo ?? ""} onChange={(e) => setPurchaseInfo(e.target.value)} placeholder="บัญชี ธ.กสิกร XXX-X-XXXXX-X ชื่อ ..." /></Field>
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

function ThumbnailUploader({
  courseId, initialPreviewUrl,
}: { courseId: string | undefined; initialPreviewUrl: string | null }) {
  const qc = useQueryClient();
  const onChanged = () => qc.invalidateQueries({ queryKey: ["dashboard"] });
  const [preview, setPreview] = useState<string | null>(initialPreviewUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (!courseId) {
      setError("กรุณาบันทึกคอร์สก่อน แล้วจึงอัพโหลดรูปปก");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 5MB");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const dataBase64 = btoa(binary);
      const res = await uploadCourseThumbnail({
        data: { courseId, filename: file.name, contentType: file.type, dataBase64 },
      });
      setPreview(res.previewUrl ?? null);
      onChanged();
    } catch (e: any) {
      setError(e?.message ?? "อัพโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!courseId) return;
    setUploading(true);
    setError(null);
    try {
      await clearCourseThumbnail({ data: { courseId } });
      setPreview(null);
      onChanged();
    } catch (e: any) {
      setError(e?.message ?? "ลบรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        รูปปกคอร์ส
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={`relative flex items-center gap-4 rounded-lg border-2 border-dashed p-4 transition ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-background"
        }`}
      >
        <div className="h-24 w-40 shrink-0 overflow-hidden rounded-md bg-muted">
          {preview ? (
            <img src={preview} alt="thumbnail" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              ไม่มีรูปปก
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-xs text-muted-foreground">
            ลากไฟล์รูปมาวางที่นี่ หรือกดเลือกไฟล์ (PNG / JPG / WEBP ≤ 5MB)
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
              {uploading ? "กำลังอัพโหลด..." : "เลือกรูปภาพ"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || !courseId}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {preview && (
              <button
                type="button"
                onClick={remove}
                disabled={uploading}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                ลบรูปปก
              </button>
            )}
          </div>
          {!courseId && (
            <div className="text-[11px] text-muted-foreground">
              * บันทึกคอร์สก่อน แล้วจึงอัพโหลดรูปปกได้
            </div>
          )}
          {error && <div className="text-[11px] text-destructive">{error}</div>}
        </div>
      </div>
    </div>
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

// ---------- STUDENTS MANAGER (pre-authorize students + per-course access) ----------

function generateCode10() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const cryptoObj =
    typeof globalThis !== "undefined" && (globalThis as any).crypto
      ? (globalThis as any).crypto
      : null;
  const out: string[] = [];
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(10);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < 10; i++) out.push(alphabet[buf[i] % alphabet.length]);
  } else {
    for (let i = 0; i < 10; i++)
      out.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
  }
  return out.join("");
}

function StudentsManager() {
  const qc = useQueryClient();
  const { data: dash } = useSuspenseQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });
  const { data: users } = useSuspenseQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsers(),
  });
  const { data: pending } = useSuspenseQuery({
    queryKey: ["admin", "pending-students"],
    queryFn: () => listPendingStudents(),
  });

  const courses = dash.courses;
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
    qc.invalidateQueries({ queryKey: ["admin", "pending-students"] });
  };

  // Create form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createMut = useMutation({
    mutationFn: () =>
      upsertPendingStudent({
        data: {
          email,
          full_name: fullName,
          phone: phone || null,
          activation_code: code,
          course_ids: Array.from(selectedCourses),
        },
      }),
    onSuccess: (res: any) => {
      const where =
        res?.mode === "profile"
          ? "อัปเดตบัญชีนักเรียนที่มีอยู่แล้ว"
          : "บันทึกข้อมูลรอเปิดใช้งาน";
      setCreateMsg({
        ok: true,
        text: `${where} — อีเมล: ${res?.email ?? email} · รหัส 10 หลัก: ${code} (กรุณาคัดลอกส่งให้นักเรียน)`,
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setCode("");
      setSelectedCourses(new Set());
      invalidateAll();
    },
    onError: (err: any) => {
      setCreateMsg({ ok: false, text: err?.message ?? "บันทึกไม่สำเร็จ" });
    },
  });

  const deletePendingMut = useMutation({
    mutationFn: (em: string) => deletePendingStudent({ data: { email: em } }),
    onSuccess: invalidateAll,
  });

  const grantMut = useMutation({
    mutationFn: (v: { userId: string; courseId: string }) => grantCourseAccess({ data: v }),
    onSuccess: invalidateAll,
  });
  const revokeMut = useMutation({
    mutationFn: (v: { userId: string; courseId: string }) => revokeCourseAccess({ data: v }),
    onSuccess: invalidateAll,
  });

  const codeValid = /^[A-Za-z0-9]{10}$/.test(code);
  const canSubmit = fullName && email && phone && codeValid && !createMut.isPending;

  return (
    <div className="space-y-6">
      {/* Create account card */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-base font-bold">สร้างบัญชีนักเรียนใหม่</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          กรอกข้อมูลนักเรียน เลือกคอร์สที่อนุญาต และสร้างรหัสผ่าน 10 หลัก — นักเรียนจะใช้รหัสนี้เปิดใช้งานเมื่อล็อกอินด้วย Google ครั้งแรก
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="ชื่อ-นามสกุล">
            <input
              className={inputCls}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="สมชาย ใจดี"
            />
          </Field>
          <Field label="Email (Gmail นักเรียน)">
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@gmail.com"
            />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <input
              type="tel"
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08X-XXX-XXXX"
            />
          </Field>
          <Field label="รหัสผ่าน 10 หลัก">
            <div className="flex gap-2">
              <input
                className={`${inputCls} font-mono tracking-widest`}
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 10))}
                maxLength={10}
                placeholder="A1B2C3D4E5"
              />
              <button
                type="button"
                onClick={() => setCode(generateCode10())}
                className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
              >
                สุ่มรหัสผ่าน
              </button>
            </div>
            {code && !codeValid && (
              <div className="mt-1 text-[11px] text-destructive">ต้องเป็น A-Z, a-z, 0-9 จำนวน 10 ตัว</div>
            )}
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            สิทธิ์เข้าถึงคอร์ส
          </div>
          {courses.length === 0 ? (
            <div className="text-xs text-muted-foreground">ยังไม่มีคอร์สในระบบ</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {courses.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary/40"
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.has(c.id)}
                    onChange={() => toggleCourse(c.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="truncate">{c.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex-1">
            {createMsg && (
              <div
                className={`rounded-md border px-3 py-2 text-xs ${
                  createMsg.ok
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {createMsg.text}
              </div>
            )}
          </div>
          <button
            disabled={!canSubmit}
            onClick={() => {
              setCreateMsg(null);
              createMut.mutate();
            }}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {createMut.isPending ? "กำลังบันทึก..." : "สร้างบัญชี"}
          </button>
        </div>
      </section>

      {/* Pending students */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-base font-bold">นักเรียนที่รอเปิดใช้งาน</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            รายชื่อนักเรียนที่แอดมินสร้างไว้ล่วงหน้า แต่ยังไม่ได้ล็อกอินด้วย Google
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sidebar text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">ชื่อ</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">เบอร์โทร</th>
                <th className="px-4 py-3 text-left">รหัส 10 หลัก</th>
                <th className="px-4 py-3 text-center">จำนวนคอร์ส</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pending.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    ยังไม่มีรายการรอเปิดใช้งาน
                  </td>
                </tr>
              )}
              {pending.map((p: any) => (
                <tr key={p.email}>
                  <td className="px-4 py-3 font-medium">{p.full_name}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{p.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "-"}</td>
                  <td className="px-4 py-3 font-mono tracking-widest">{p.activation_code}</td>
                  <td className="px-4 py-3 text-center">{p.course_ids?.length ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deletePendingMut.mutate(p.email)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" /> ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active students list with per-course access toggles */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-base font-bold">รายชื่อนักเรียน · สิทธิ์การเข้าถึงคอร์ส</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            ติ๊กถูกหน้าคอร์สเพื่ออนุญาตให้นักเรียนเข้าถึง — เอาออกเพื่อยกเลิกสิทธิ์
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sidebar text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">นักเรียน</th>
                {courses.map((c) => (
                  <th key={c.id} className="px-3 py-3 text-center">
                    <div className="font-display text-xs font-semibold normal-case text-foreground">
                      {c.title}
                    </div>
                    {c.courseTier && (
                      <div className="mt-0.5 text-[9px] text-muted-foreground">
                        {c.courseTier}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={courses.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    ยังไม่มีนักเรียน
                  </td>
                </tr>
              )}
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name ?? "-"}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {u.email ?? "-"}
                    </div>
                  </td>
                  {courses.map((c) => {
                    const granted = (u.accessCourseIds as string[] | undefined)?.includes(c.id);
                    return (
                      <td key={c.id} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!granted}
                          onChange={(e) => {
                            if (e.target.checked) {
                              grantMut.mutate({ userId: u.id, courseId: c.id });
                            } else {
                              revokeMut.mutate({ userId: u.id, courseId: c.id });
                            }
                          }}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
