"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Paperclip } from "lucide-react";

interface Message {
  id: string;
  senderUserId: string;
  content: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Polls every 4 seconds while open — real near-real-time updates, not
 * a WebSocket connection (none exists in this project). Documented
 * honestly rather than claiming push-based real-time.
 */
export function ThreadView({ threadId, currentUserId, fetchUrl, sendUrl, closed = false }: { threadId: string; currentUserId: string; fetchUrl: string; sendUrl: string; closed?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function fetchThread() {
    try {
      const res = await fetch(fetchUrl);
      const data = await res.json();
      if (res.ok) setMessages(data.thread.messages);
    } catch {
      // Silent — polling retries on the next tick.
    }
  }

  useEffect(() => {
    fetchThread();
    const interval = setInterval(fetchThread, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), attachmentUrl: attachmentUrl.trim() || undefined, attachmentType: attachmentUrl.trim() ? "IMAGE" : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent("");
      setAttachmentUrl("");
      fetchThread();
    } catch (err: any) {
      toast.error(err.message ?? "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[500px] flex-col rounded-xl2 border border-black/5 bg-white">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isMine = m.senderUserId === currentUserId;
          return (
            <div key={m.id} className={isMine ? "text-end" : ""}>
              <div className={`inline-block max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMine ? "bg-saveo-emerald-700 text-white" : "bg-black/[0.04]"}`}>
                {m.content}
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs underline">
                    📎 Attachment
                  </a>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-saveo-emerald-700/40">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {isMine && m.readAt && " · Read"}
              </p>
            </div>
          );
        })}
      </div>

      {closed ? (
        <p className="border-t border-black/5 p-4 text-center text-sm text-saveo-emerald-700/40">This conversation is closed.</p>
      ) : (
        <form onSubmit={send} className="border-t border-black/5 p-3">
          {attachmentUrl && <p className="mb-2 text-xs text-saveo-emerald-700/50">📎 {attachmentUrl}</p>}
          <div className="flex gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-black/10 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => { const url = prompt("Attachment URL (image or document link)"); if (url) setAttachmentUrl(url); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10"
              aria-label="Attach"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button type="submit" disabled={sending} className="flex h-9 w-9 items-center justify-center rounded-full bg-saveo-emerald-700 text-white">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
