import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Phone, KeyRound, Mail, User as UserIcon, BookOpen, CheckCircle2, Copy, Check } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { StudentSidebar } from "@/components/student-sidebar";
import { getStudentProfile, updateStudentPhone } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "โปรไฟล์ · Skill Max" },
      { name: "description", content: "ข้อมูลบัญชีและความคืบหน้าของคุณ" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["student-profile"],
      queryFn: () => getStudentProfile(),
    });
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { data } = useSuspenseQuery({
    queryKey: ["student-profile"],
    queryFn: () => getStudentProfile(),
  });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(data.phone ?? "");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setPhone(data.phone ?? ""), [data.phone]);

  const saveMut = useMutation({
    mutationFn: (newPhone: string) => updateStudentPhone({ data: { phone: newPhone } }),
    onSuccess: () => {
      setSavedMsg("บันทึกข้อมูลเรียบร้อยแล้ว");
      qc.invalidateQueries({ queryKey: ["student-profile"] });
      setTimeout(() => setSavedMsg(null), 2500);
    },
    onError: (e: any) => setSavedMsg(e?.message ?? "บันทึกไม่สำเร็จ"),
  });

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const copyCode = async () => {
    if (!data.activationCode) return;
    await navigator.clipboard.writeText(data.activationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const initial = (data.fullName ?? data.email ?? "?").trim()[0]?.toUpperCase() ?? "?";
  const pct =
    data.totalLessons === 0
      ? 0
      : Math.round((data.completedLessons / data.totalLessons) * 100);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto flex max-w-[1400px]">
        <StudentSidebar isAdmin={data.isAdmin} />

        <main className="flex-1 px-6 py-10 lg:px-10">
          <header className="mb-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              โปรไฟล์
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              จัดการข้อมูลบัญชีและดูสถานะการเรียนของคุณ
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* LEFT — student info */}
            <section className="lg:col-span-2 space-y-6">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                <div className="flex flex-col items-center gap-4 border-b border-border bg-gradient-to-br from-secondary/60 via-card to-card px-6 py-8 sm:flex-row sm:items-center sm:gap-6 sm:py-7">
                  {data.avatarUrl ? (
                    <img
                      src={data.avatarUrl}
                      alt={data.fullName ?? ""}
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-card shadow-card"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary ring-2 ring-card shadow-card">
                      {initial}
                    </div>
                  )}
                  <div className="text-center sm:text-left">
                    <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                      {data.fullName ?? "ไม่ระบุชื่อ"}
                    </h2>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {data.email ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <ReadOnlyField
                    icon={<UserIcon className="h-4 w-4" />}
                    label="ชื่อ-นามสกุล"
                    value={data.fullName ?? "—"}
                  />
                  <ReadOnlyField
                    icon={<Mail className="h-4 w-4" />}
                    label="อีเมล (Gmail)"
                    value={data.email ?? "—"}
                  />

                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      maxLength={30}
                      className="block w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <KeyRound className="h-3.5 w-3.5" />
                      รหัสผ่านเข้าใช้งานระบบของคุณ
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={data.activationCode ?? "— ยังไม่ได้รับสิทธิ์ —"}
                        className="block w-full cursor-text rounded-md border border-border bg-secondary/40 px-3.5 py-2.5 font-mono text-sm tracking-[0.18em] text-foreground"
                      />
                      {data.activationCode && (
                        <button
                          type="button"
                          onClick={copyCode}
                          title="คัดลอกรหัส"
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      เก็บรหัสนี้ไว้เป็นความลับ — ใช้สำหรับเปิดใช้งานบัญชีครั้งแรก
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-muted-foreground">
                      {savedMsg && (
                        <span className="inline-flex items-center gap-1.5 text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {savedMsg}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => saveMut.mutate(phone.trim())}
                      disabled={saveMut.isPending || phone.trim() === (data.phone ?? "")}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saveMut.isPending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </button>
            </section>

            {/* RIGHT — learning summary */}
            <aside className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h3 className="font-display text-base font-semibold text-foreground">
                  ความคืบหน้าการเรียน
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold tabular-nums text-foreground">
                    {pct}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data.completedLessons}/{data.totalLessons} บท
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <Stat label="คอร์สที่ปลดล็อก" value={data.courses.length} />
                  <Stat label="บทที่เรียนจบ" value={data.completedLessons} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  คอร์สเรียนทั้งหมดของคุณ
                </h3>
                {data.courses.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    ยังไม่มีคอร์สที่เปิดสิทธิ์ — ติดต่อผู้ดูแลเพื่อขอเข้าถึง
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {data.courses.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-border bg-secondary/30 px-3.5 py-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {c.title}
                            </div>
                            {c.tagline && (
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {c.tagline}
                              </div>
                            )}
                          </div>
                          {c.courseTier && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                              {c.courseTier}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function ReadOnlyField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </label>
      <div className="rounded-md border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-3">
      <div className="font-display text-xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
