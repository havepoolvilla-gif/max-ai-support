import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Brain, Zap } from "lucide-react";
import { TopNav } from "@/components/top-nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge — คอร์สสั้นสำหรับวิศวกร AI" },
      { name: "description", content: "เข้มข้น ตรงประเด็น และออกแบบมาเพื่อนักสร้าง เรียนรู้ระบบ AI ผ่านบทเรียน 10–15 นาที" },
      { property: "og:title", content: "Forge — คอร์สสั้นสำหรับวิศวกร AI" },
      { property: "og:description", content: "เรียนรู้ระบบ AI ผ่านบทเรียน 10–15 นาที จากผู้ปฏิบัติงานจริงในอุตสาหกรรม" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            แพลตฟอร์มเรียนรู้ขับเคลื่อนด้วย AI · เปิดให้ทดลองแล้ว
          </div>

          <h1 className="font-display text-4xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-6xl">
            เรียนรู้ระบบ AI ยุคใหม่
            <br />
            <span className="text-muted-foreground">อย่างเป็นระบบ</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            บทเรียนเข้มข้น 10–15 นาที สร้างโดยวิศวกรที่ทำงานจริง ไม่มีน้ำท่วมทุ่ง
            มีแต่เส้นทางที่ตรงที่สุดจากพื้นฐานสู่การ deploy บนโปรดักชัน
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.35 11.1h-9.17v2.92h5.27c-.24 1.5-1.74 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.42l2.53-2.43C16.92 3.91 14.81 3 12.18 3 7.13 3 3 7.07 3 12.07s4.13 9.07 9.18 9.07c5.3 0 8.82-3.72 8.82-8.96 0-.6-.07-1.06-.15-1.5z" />
              </svg>
              เข้าสู่ระบบด้วย Google
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              เริ่มทดลองใช้
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              ออกแบบสำหรับผู้สร้าง
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              เครื่องมือที่ทำให้คุณเก่งขึ้นเร็วกว่าเดิม
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Zap, title: "บทเรียนสั้นกระชับ", body: "ทุกวิดีโอยาว 10–15 นาที เรียนได้ในช่วงเวลาว่างโดยไม่เสียจังหวะ" },
              { icon: Brain, title: "เส้นทางที่ AI ช่วยคัด", body: "แนะนำบทเรียนถัดไปอัตโนมัติตามความก้าวหน้าและจุดที่คุณติด" },
              { icon: BookOpen, title: "ลึกระดับโปรดักชัน", body: "ไม่ใช่ทฤษฎีลอย ๆ แต่เป็นแพตเทิร์น ทางเลือก และโค้ดจากทีมที่ deploy จริง" },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            พร้อมจะอัพสกิลแล้วหรือยัง?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            แพ็กเกจฟรีเข้าถึงโมดูลแรกของทุกคอร์สได้แบบไม่จำกัด
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow"
          >
            เข้าสู่ระบบเพื่อเริ่ม
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© 2026 Forge Academy · ระบบทั้งหมดทำงานปกติ</span>
          <span>v0.1 · beta</span>
        </div>
      </footer>
    </div>
  );
}
