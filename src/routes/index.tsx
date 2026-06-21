import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, CheckCircle2, Cpu, PlayCircle, Zap } from "lucide-react";
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-32 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            จัดคอร์สด้วย AI · เปิดให้ทดลองแล้ว
          </div>

          <h1 className="font-display text-5xl font-bold leading-[1.15] tracking-tight md:text-7xl">
            เชี่ยวชาญระบบ
            <br />
            <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent glow-text">
              ที่ขับเคลื่อน AI ยุคใหม่
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            บทเรียนเข้มข้น 10–15 นาที สร้างโดยวิศวกรที่ทำงานจริง ไม่มีน้ำท่วมทุ่ง
            มีแต่เส้นทางที่ตรงที่สุดจากพื้นฐานสู่การ deploy บนโปรดักชัน
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:translate-y-[-1px] hover:shadow-[0_0_50px_-8px_oklch(0.58_0.22_25/0.7)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.92h5.27c-.24 1.5-1.74 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.42l2.53-2.43C16.92 3.91 14.81 3 12.18 3 7.13 3 3 7.07 3 12.07s4.13 9.07 9.18 9.07c5.3 0 8.82-3.72 8.82-8.96 0-.6-.07-1.06-.15-1.5z"/></svg>
              เข้าสู่ระบบด้วย Google
            </Link>
            <Link
              to="/learn/$courseId"
              params={{ courseId: "ai-engineering" }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-card"
            >
              <PlayCircle className="h-4 w-4" />
              ทดลองดูบทเรียน
            </Link>
          </div>

          {/* Hero card preview */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/40 via-primary/10 to-primary/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <div className="flex items-center gap-1.5 border-b border-border bg-background/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-muted" />
                <span className="h-3 w-3 rounded-full bg-muted" />
                <span className="h-3 w-3 rounded-full bg-primary/70" />
                <span className="ml-3 text-xs text-muted-foreground">forge.ai/learn/ai-engineering</span>
              </div>
              <div className="grid gap-0 md:grid-cols-[7fr_3fr]">
                <div className="aspect-video bg-gradient-to-br from-accent/40 via-card to-background relative">
                  <div className="absolute inset-0 grid-bg opacity-40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-glow">
                      <PlayCircle className="h-10 w-10 text-primary-foreground" />
                    </div>
                  </div>
                </div>
                <div className="border-l border-border bg-sidebar p-4 text-left">
                  <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">โมดูล 02 · Transformer</div>
                  {["เขียน Attention จากศูนย์", "Multi-Head Attention", "Decoder Stacks", "Fine-tuning (LoRA)"].map((t, i) => (
                    <div key={t} className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-xs ${i === 0 ? "border-l-2 border-primary bg-accent/20 text-foreground" : "text-muted-foreground"}`}>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px]">{i + 4}</span>
                      <span className="flex-1 truncate">{t}</span>
                      <span className="tabular-nums">{12 + i}:{(15 + i * 7) % 60}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-16 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">สร้างสำหรับนักสร้าง</div>
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">ออกแบบมาให้คุณเก่งขึ้นเร็วกว่าเดิม</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Zap, title: "บทเรียนสั้นกระชับ", body: "ทุกวิดีโอยาว 10–15 นาที เรียนได้ในช่วงเวลาว่างโดยไม่เสียจังหวะ" },
              { icon: Brain, title: "เส้นทางที่ AI ช่วยคัด", body: "แนะนำบทเรียนถัดไปอัตโนมัติตามความก้าวหน้าและจุดที่คุณติด" },
              { icon: Cpu, title: "ลึกระดับโปรดักชัน", body: "ไม่ใช่ทฤษฎีลอย ๆ แต่เป็นแพตเทิร์น ทางเลือก และโค้ดจากทีมที่ deploy จริง" },
            ].map((f) => (
              <div key={f.title} className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            พร้อมจะอัพสกิลแล้วหรือยัง?
          </h2>
          <p className="mt-4 text-muted-foreground">แพ็กเกจฟรีเข้าถึงโมดูลแรกของทุกคอร์สได้แบบไม่จำกัด</p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:translate-y-[-1px]"
          >
            เข้าสู่แดชบอร์ด
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© 2026 Forge Academy · ระบบทั้งหมดทำงานปกติ</span>
          <span>v0.1 · beta</span>
        </div>
      </footer>
    </div>
  );
}
