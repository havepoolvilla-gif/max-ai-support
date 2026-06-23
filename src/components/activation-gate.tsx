import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { activateAccount, getActivationStatus } from "@/lib/activation.functions";

export function ActivationGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getActivationStatus);
  const activate = useServerFn(activateAccount);

  const { data, isLoading } = useQuery({
    queryKey: ["activation-status"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
  });

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (pw: string) => activate({ data: { password: pw } }),
    onSuccess: (res) => {
      if (res.ok) {
        setError(null);
        setPassword("");
        queryClient.invalidateQueries({ queryKey: ["activation-status"] });
      } else {
        setError("รหัสไม่ถูกต้อง กรุณาลองอีกครั้ง");
      }
    },
    onError: () => setError("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง"),
  });

  const showOverlay = !isLoading && data && !data.isActivated;

  return (
    <>
      {children}
      {showOverlay && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              ยืนยันสิทธิ์
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              ยืนยันสิทธิ์เข้าใช้งานครั้งแรก
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              กรุณากรอกรหัสผ่าน 10 หลักที่ได้รับจากแอดมินเพื่อยืนยันสิทธิ์เข้าเรียนครั้งแรก
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pw = password.trim();
                if (pw.length !== 10) {
                  setError("กรุณากรอกรหัส 10 หลัก");
                  return;
                }
                mutation.mutate(pw);
              }}
              className="mt-6 space-y-3"
            >
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  รหัสเปิดใช้งาน 10 หลัก
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 10))}
                  placeholder="A1B2C3D4E5"
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] focus:border-primary focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow disabled:opacity-60"
              >
                {mutation.isPending ? "กำลังตรวจสอบ..." : "ยืนยัน"}
              </button>
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              หากยังไม่ได้รับรหัส กรุณาติดต่อแอดมินเพื่อขอรหัสเปิดใช้งาน
            </p>
          </div>
        </div>
      )}
    </>
  );
}
