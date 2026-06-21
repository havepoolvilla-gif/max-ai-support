import { create } from "zustand";
import { persist } from "zustand/middleware";

type ProgressState = {
  completed: string[]; // lesson ids
  lastWatched: { courseId: string; lessonId: string } | null;
  toggleComplete: (lessonId: string) => void;
  markComplete: (lessonId: string) => void;
  setLastWatched: (courseId: string, lessonId: string) => void;
  isCompleted: (lessonId: string) => boolean;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      completed: ["l1", "l2", "l3"], // seed: first module of AI course done
      lastWatched: { courseId: "ai-engineering", lessonId: "l4" },
      toggleComplete: (lessonId) =>
        set((s) => ({
          completed: s.completed.includes(lessonId)
            ? s.completed.filter((id) => id !== lessonId)
            : [...s.completed, lessonId],
        })),
      markComplete: (lessonId) =>
        set((s) =>
          s.completed.includes(lessonId)
            ? s
            : { completed: [...s.completed, lessonId] },
        ),
      setLastWatched: (courseId, lessonId) =>
        set({ lastWatched: { courseId, lessonId } }),
      isCompleted: (lessonId) => get().completed.includes(lessonId),
    }),
    { name: "forge-progress" },
  ),
);
