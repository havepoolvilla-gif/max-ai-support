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
  thumbnail: string; // gradient name
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
    title: "AI Engineering Foundations",
    tagline: "Build production-grade AI systems from first principles.",
    instructor: "Marcus Vail",
    thumbnail: "ai",
    modules: [
      {
        id: "m1",
        title: "Module 01 · Neural Network Primitives",
        lessons: [
          { id: "l1", number: 1, title: "Tensors, Gradients & Compute Graphs", duration: 765, description: "Understand how modern frameworks represent and differentiate computation under the hood.", videoUrl: sampleVideo },
          { id: "l2", number: 2, title: "Forward & Backward Pass Internals", duration: 842, description: "Trace a full training step through a small MLP and inspect the gradients.", videoUrl: sampleVideo },
          { id: "l3", number: 3, title: "Optimizers: SGD to AdamW", duration: 705, description: "Compare optimizer behavior on a non-convex loss landscape.", videoUrl: sampleVideo },
        ],
      },
      {
        id: "m2",
        title: "Module 02 · Transformer Architecture",
        lessons: [
          { id: "l4", number: 4, title: "Attention, From Scratch", duration: 890, description: "Implement scaled dot-product attention without any framework helpers.", videoUrl: sampleVideo },
          { id: "l5", number: 5, title: "Multi-Head & Positional Encoding", duration: 612, description: "Why multiple heads matter and how positional information is injected.", videoUrl: sampleVideo },
          { id: "l6", number: 6, title: "Decoder Stacks & Masking", duration: 738, description: "Causal masking, KV caching, and inference-time optimizations.", videoUrl: sampleVideo },
          { id: "l7", number: 7, title: "Fine-tuning Strategies (LoRA, QLoRA)", duration: 925, description: "Parameter-efficient fine-tuning in production.", videoUrl: sampleVideo },
        ],
      },
      {
        id: "m3",
        title: "Module 03 · Deploying LLMs at Scale",
        lessons: [
          { id: "l8", number: 8, title: "Inference Servers: vLLM vs TGI", duration: 680, description: "Benchmark throughput, latency, and memory profiles.", videoUrl: sampleVideo },
          { id: "l9", number: 9, title: "Observability & Eval Harnesses", duration: 595, description: "Build offline and online evaluation pipelines.", videoUrl: sampleVideo },
          { id: "l10", number: 10, title: "Cost-Aware Routing & Caching", duration: 720, description: "Cut inference cost by 60% with semantic caching and tiered routing.", videoUrl: sampleVideo },
        ],
      },
    ],
  },
  {
    id: "systems-design",
    title: "Distributed Systems Mastery",
    tagline: "Design systems that scale to millions without breaking a sweat.",
    instructor: "Elena Cross",
    thumbnail: "systems",
    modules: [
      {
        id: "sm1",
        title: "Module 01 · Foundations of Scale",
        lessons: [
          { id: "sl1", number: 1, title: "CAP Theorem in Practice", duration: 645, description: "Real-world tradeoffs across AP, CP, and tunable systems.", videoUrl: sampleVideo },
          { id: "sl2", number: 2, title: "Consistency Models Deep Dive", duration: 780, description: "Linearizability, causal consistency, and eventual consistency.", videoUrl: sampleVideo },
          { id: "sl3", number: 3, title: "Sharding Strategies", duration: 690, description: "Range, hash, and directory-based sharding patterns.", videoUrl: sampleVideo },
        ],
      },
      {
        id: "sm2",
        title: "Module 02 · Resilience Patterns",
        lessons: [
          { id: "sl4", number: 4, title: "Circuit Breakers & Bulkheads", duration: 555, description: "Failure containment with proven design patterns.", videoUrl: sampleVideo },
          { id: "sl5", number: 5, title: "Idempotency & Exactly-Once", duration: 810, description: "Build pipelines that survive retries.", videoUrl: sampleVideo },
          { id: "sl6", number: 6, title: "Backpressure & Load Shedding", duration: 625, description: "Protect upstream services under burst load.", videoUrl: sampleVideo },
        ],
      },
    ],
  },
];

export const CURRENT_USER: CurrentUser = {
  name: "Alex Reyes",
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
