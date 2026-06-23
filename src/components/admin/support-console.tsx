import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, Loader2, Search, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listSupportThreads,
  listThreadMessages,
  adminSendMessage,
  adminMarkThreadRead,
  adminCreateUploadUrl,
} from "@/lib/support.functions";
import { Bubble } from "@/components/support-chat-widget";

function attachmentKind(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function timeAgo(ts: string | null) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
}

export function SupportConsole() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: threads = [] } = useQuery({
    queryKey: ["admin", "support-threads"],
    queryFn: () => listSupportThreads(),
    refetchOnWindowFocus: false,
  });

  // realtime: refresh on any insert
  useEffect(() => {
    const ch = supabase
      .channel("admin-support")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["admin", "support-threads"] });
          const sid = payload.new?.student_id;
          if (sid) qc.invalidateQueries({ queryKey: ["admin", "support-thread", sid] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (t.fullName ?? "").toLowerCase().includes(s) ||
      (t.email ?? "").toLowerCase().includes(s) ||
      (t.phone ?? "").toLowerCase().includes(s)
    );
  });

  const activeThread = threads.find((t) => t.studentId === activeId) ?? null;

  return (
    <div className="grid h-[calc(100vh-16rem)] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
      {/* Threads list */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหานักเรียน..."
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
              <Inbox className="mb-2 h-8 w-8 opacity-40" />
              ยังไม่มีข้อความ
            </div>
          )}
          {filtered.map((t) => {
            const active = t.studentId === activeId;
            return (
              <button
                key={t.studentId}
                onClick={() => setActiveId(t.studentId)}
                className={`flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition hover:bg-muted/50 ${
                  active ? "bg-muted" : ""
                }`}
              >
                {t.avatarUrl ? (
                  <img src={t.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {(t.fullName ?? t.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{t.fullName ?? "ไม่ระบุชื่อ"}</div>
                    {t.unreadCount > 0 && (
                      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        ใหม่ {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{t.email}</div>
                  {t.phone && <div className="truncate text-xs text-muted-foreground">{t.phone}</div>}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="truncate text-xs text-foreground/70">{t.lastMessage}</div>
                    <div className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(t.lastAt)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread workspace */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {activeThread ? (
          <ThreadWorkspace
            studentId={activeThread.studentId}
            studentName={activeThread.fullName}
            studentEmail={activeThread.email}
            studentPhone={activeThread.phone}
            studentAvatar={activeThread.avatarUrl}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
            <Inbox className="mb-2 h-10 w-10 opacity-30" />
            เลือกข้อความจากนักเรียนเพื่อเริ่มตอบกลับ
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadWorkspace({
  studentId,
  studentName,
  studentEmail,
  studentPhone,
  studentAvatar,
}: {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  studentPhone: string | null;
  studentAvatar: string | null;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["admin", "support-thread", studentId],
    queryFn: () => listThreadMessages({ data: { studentId } }),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    adminMarkThreadRead({ data: { studentId } }).then(() =>
      qc.invalidateQueries({ queryKey: ["admin", "support-threads"] }),
    );
  }, [studentId, messages.length, qc]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await adminSendMessage({ data: { studentId, text: t } });
      setText("");
      qc.invalidateQueries({ queryKey: ["admin", "support-thread", studentId] });
      qc.invalidateQueries({ queryKey: ["admin", "support-threads"] });
    } finally {
      setSending(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert("ไฟล์ใหญ่เกิน 25 MB");
      return;
    }
    setUploading(true);
    try {
      const { path, token } = await adminCreateUploadUrl({
        data: { studentId, filename: file.name },
      });
      const { error } = await supabase.storage
        .from("support-attachments")
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      await adminSendMessage({
        data: {
          studentId,
          attachmentPath: path,
          attachmentType: attachmentKind(file),
          attachmentName: file.name,
        },
      });
      qc.invalidateQueries({ queryKey: ["admin", "support-thread", studentId] });
      qc.invalidateQueries({ queryKey: ["admin", "support-threads"] });
    } catch (err) {
      console.error(err);
      alert("อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        {studentAvatar ? (
          <img src={studentAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {(studentName ?? studentEmail ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{studentName ?? "ไม่ระบุชื่อ"}</div>
          <div className="truncate text-xs text-muted-foreground">
            {studentEmail}
            {studentPhone ? ` · ${studentPhone}` : ""}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            ยังไม่มีข้อความในห้องสนทนานี้
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} mine={m.senderRole === "admin"} />
        ))}
      </div>

      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="แนบไฟล์"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.zip"
            className="hidden"
            onChange={handleFile}
          />
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="พิมพ์ข้อความตอบกลับ..."
            className="max-h-32 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-50"
            aria-label="ส่ง"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
