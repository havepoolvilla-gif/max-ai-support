export type Lesson = {
  id: string;
  number: number;
  title: string;
  duration: number; // seconds
  description: string;
  videoUrl: string;
};

export type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  tagline: string;
  instructor: string;
  thumbnail: string;
  modules: Module[];
};

export type CurrentUser = {
  name: string;
  email: string;
  subscription_status: "free" | "3m" | "6m" | "1y";
  lastWatched: { courseId: string; lessonId: string } | null;
};

const sampleVideo =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export const COURSES: Course[] = [
  {
    id: "ai-engineering",
    title: "พื้นฐานวิศวกรรม AI",
    tagline: "สร้างระบบ AI ระดับโปรดักชันตั้งแต่หลักการแรก",
    instructor: "มาร์คัส เวล",
    thumbnail: "ai",
    modules: [
      {
        id: "m1",
        title: "โมดูล 01 · พื้นฐาน Neural Network",
        lessons: [
          { id: "l1", number: 1, title: "Tensors, Gradients และ Compute Graphs", duration: 765, description: "ทำความเข้าใจว่าเฟรมเวิร์กสมัยใหม่แทนค่าและคำนวณอนุพันธ์อย่างไรเบื้องหลัง", videoUrl: sampleVideo },
          { id: "l2", number: 2, title: "การทำงานของ Forward และ Backward Pass", duration: 842, description: "ติดตามขั้นตอนการเทรนทั้งหมดผ่าน MLP ขนาดเล็กพร้อมตรวจสอบค่า gradient", videoUrl: sampleVideo },
          { id: "l3", number: 3, title: "Optimizers: ตั้งแต่ SGD ถึง AdamW", duration: 705, description: "เปรียบเทียบพฤติกรรมของ optimizer บนพื้นผิว loss แบบ non-convex", videoUrl: sampleVideo },
        ],
      },
      {
        id: "m2",
        title: "โมดูล 02 · สถาปัตยกรรม Transformer",
        lessons: [
          { id: "l4", number: 4, title: "เขียน Attention จากศูนย์", duration: 890, description: "สร้าง scaled dot-product attention โดยไม่พึ่งฟังก์ชันสำเร็จรูป", videoUrl: sampleVideo },
          { id: "l5", number: 5, title: "Multi-Head และ Positional Encoding", duration: 612, description: "ทำไมต้องมีหลาย head และข้อมูลตำแหน่งถูกใส่เข้าไปอย่างไร", videoUrl: sampleVideo },
          { id: "l6", number: 6, title: "Decoder Stacks และการทำ Masking", duration: 738, description: "Causal masking, KV caching และการเพิ่มประสิทธิภาพตอน inference", videoUrl: sampleVideo },
          { id: "l7", number: 7, title: "กลยุทธ์ Fine-tuning (LoRA, QLoRA)", duration: 925, description: "การ fine-tune แบบประหยัดพารามิเตอร์สำหรับใช้งานจริง", videoUrl: sampleVideo },
        ],
      },
      {
        id: "m3",
        title: "โมดูล 03 · Deploy LLM ในสเกลใหญ่",
        lessons: [
          { id: "l8", number: 8, title: "Inference Server: vLLM vs TGI", duration: 680, description: "Benchmark throughput, latency และโปรไฟล์การใช้หน่วยความจำ", videoUrl: sampleVideo },
          { id: "l9", number: 9, title: "Observability และ Eval Harnesses", duration: 595, description: "สร้าง pipeline ประเมินผลแบบ offline และ online", videoUrl: sampleVideo },
          { id: "l10", number: 10, title: "Routing และ Caching ที่คำนึงถึงต้นทุน", duration: 720, description: "ลดต้นทุน inference ลง 60% ด้วย semantic caching และ tiered routing", videoUrl: sampleVideo },
        ],
      },
    ],
  },
  {
    id: "systems-design",
    title: "เชี่ยวชาญระบบกระจาย (Distributed Systems)",
    tagline: "ออกแบบระบบให้รองรับผู้ใช้หลักล้านได้อย่างมั่นคง",
    instructor: "เอเลน่า ครอส",
    thumbnail: "systems",
    modules: [
      {
        id: "sm1",
        title: "โมดูล 01 · พื้นฐานการสเกล",
        lessons: [
          { id: "sl1", number: 1, title: "CAP Theorem ในการใช้งานจริง", duration: 645, description: "Trade-off ระหว่างระบบ AP, CP และระบบที่ปรับได้", videoUrl: sampleVideo },
          { id: "sl2", number: 2, title: "เจาะลึก Consistency Models", duration: 780, description: "Linearizability, causal consistency และ eventual consistency", videoUrl: sampleVideo },
          { id: "sl3", number: 3, title: "กลยุทธ์ Sharding", duration: 690, description: "รูปแบบ sharding แบบ range, hash และ directory", videoUrl: sampleVideo },
        ],
      },
      {
        id: "sm2",
        title: "โมดูล 02 · รูปแบบความทนทาน (Resilience)",
        lessons: [
          { id: "sl4", number: 4, title: "Circuit Breakers และ Bulkheads", duration: 555, description: "ควบคุมความเสียหายด้วยรูปแบบการออกแบบที่พิสูจน์แล้ว", videoUrl: sampleVideo },
          { id: "sl5", number: 5, title: "Idempotency และ Exactly-Once", duration: 810, description: "สร้าง pipeline ที่ทนต่อการ retry", videoUrl: sampleVideo },
          { id: "sl6", number: 6, title: "Backpressure และ Load Shedding", duration: 625, description: "ปกป้องบริการต้นทางเมื่อมีโหลดพุ่งสูง", videoUrl: sampleVideo },
        ],
      },
    ],
  },
];

export const CURRENT_USER: CurrentUser = {
  name: "อเล็กซ์ เรเยส",
  email: "alex.reyes@example.com",
  subscription_status: "free",
  lastWatched: { courseId: "ai-engineering", lessonId: "l4" },
};

export function findLesson(courseId: string, lessonId: string) {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return null;
  for (const module of course.modules) {
    const lesson = module.lessons.find((l) => l.id === lessonId);
    if (lesson) return { course, module, lesson };
  }
  return null;
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function courseStats(courseId: string, completedSet: Set<string>) {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return { total: 0, completed: 0, totalDuration: 0 };
  let total = 0;
  let completed = 0;
  let totalDuration = 0;
  for (const m of course.modules) {
    for (const l of m.lessons) {
      total++;
      totalDuration += l.duration;
      if (completedSet.has(l.id)) completed++;
    }
  }
  return { total, completed, totalDuration };
}
