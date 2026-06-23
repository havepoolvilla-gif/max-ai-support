import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Paperclip, Send, Image as ImageIcon, Video, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyMessages,
  sendMyMessage,
  markMyThreadRead,
  createMyUploadUrl,
  type SupportMessageDTO,
} from "@/lib/support.functions";

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function attachmentKind(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ["support", "thread"],
    queryFn: () => listMyMessages(),
    enabled: !!userId,
    refetchOnWindowFocus: false,
  });

  const unread = messages.filter((m) => m.senderRole === "admin" && !m.isRead).length;

  // realtime
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`support:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `student_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["support", "thread"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  // autoscroll + mark read
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (open && unread > 0) {
      markMyThreadRead().then(() => qc.invalidateQueries({ queryKey: ["support", "thread"] }));
    }
  }, [open, messages, unread, qc]);

  async function handleSend() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await sendMyMessage({ data: { text: t } });
      setText("");
      qc.invalidateQueries({ queryKey: ["support", "thread"] });
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
      const { path, token } = await createMyUploadUrl({ data: { filename: file.name } });
      const { error } = await supabase.storage
        .from("support-attachments")
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      await sendMyMessage({
        data: {
          attachmentPath: path,
          attachmentType: attachmentKind(file),
          attachmentName: file.name,
        },
      });
      qc.invalidateQueries({ queryKey: ["support", "thread"] });
    } catch (err) {
      console.error(err);
      alert("อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  if (!userId) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105"
          aria-label="เปิดแชทช่วยเหลือ"
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* header */}
          <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div>
              <div className="text-sm font-semibold">ฝ่ายช่วยเหลือ Max AI</div>
              <div className="text-xs text-muted-foreground">เราพร้อมตอบทุกคำถามของคุณ</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <MessageCircle className="mb-2 h-8 w-8 opacity-40" />
                เริ่มต้นแชทกับทีมงานได้เลย
              </div>
            )}
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} mine={m.senderRole === "student"} />
            ))}
          </div>

          {/* composer */}
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
                placeholder="พิมพ์ข้อความ..."
                className="max-h-24 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-50"
                aria-label="ส่งข้อความ"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Bubble({ msg, mine }: { msg: SupportMessageDTO; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        }`}
      >
        {msg.attachmentUrl && msg.attachmentType === "image" && (
          <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
            <img
              src={msg.attachmentUrl}
              alt={msg.attachmentName ?? ""}
              className="mb-1 max-h-60 rounded-lg object-cover"
            />
          </a>
        )}
        {msg.attachmentUrl && msg.attachmentType === "video" && (
          <video src={msg.attachmentUrl} controls className="mb-1 max-h-60 rounded-lg" />
        )}
        {msg.attachmentUrl && msg.attachmentType === "file" && (
          <a
            href={msg.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
              mine ? "bg-primary-foreground/15" : "bg-muted"
            }`}
          >
            {msg.attachmentType === "image" ? (
              <ImageIcon className="h-4 w-4" />
            ) : msg.attachmentType === "video" ? (
              <Video className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="truncate">{msg.attachmentName ?? "ไฟล์แนบ"}</span>
          </a>
        )}
        {msg.text && <div className="whitespace-pre-wrap break-words">{msg.text}</div>}
        <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {formatTime(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}
