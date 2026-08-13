"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Plus } from "lucide-react";
import { ThreadView } from "@/components/messaging/thread-view";

interface ThreadSummary {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  messages: { content: string }[];
  _count: { messages: number };
}

export function AccountMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchThreads() {
    const res = await fetch("/api/messages");
    const data = await res.json();
    if (res.ok) setThreads(data.threads);
  }

  useEffect(() => {
    fetchThreads();
  }, []);

  async function createThread(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Conversation started");
      setSubject("");
      setMessage("");
      setShowNewForm(false);
      await fetchThreads();
      setSelectedId(data.thread.id);
    } catch (err: any) {
      toast.error(err.message ?? "Could not start conversation");
    } finally {
      setSaving(false);
    }
  }

  const selectedThread = threads.find((t) => t.id === selectedId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-saveo-emerald-700">Messages</h1>
        <button onClick={() => setShowNewForm(!showNewForm)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {showNewForm && (
        <form onSubmit={createThread} className="mb-6 card space-y-2 p-4">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="input text-sm" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={2} className="input text-sm" />
          <button type="submit" disabled={saving} className="btn-primary text-sm">Send</button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
        <div className="space-y-1.5">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`flex w-full items-center gap-2 rounded-lg p-2.5 text-start text-xs ${selectedId === t.id ? "bg-saveo-emerald-50" : "hover:bg-black/[0.02]"}`}
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-saveo-emerald-700/40" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.subject}</p>
                <p className="truncate text-saveo-emerald-700/40">{t.messages[0]?.content ?? ""}</p>
              </div>
              {t._count.messages > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
            </button>
          ))}
          {threads.length === 0 && <p className="p-4 text-center text-xs text-saveo-emerald-700/40">No conversations yet.</p>}
        </div>

        <div>
          {selectedThread ? (
            <ThreadView
              threadId={selectedThread.id}
              currentUserId={currentUserId}
              fetchUrl={`/api/messages/${selectedThread.id}`}
              sendUrl={`/api/messages/${selectedThread.id}`}
              closed={selectedThread.status === "CLOSED"}
            />
          ) : (
            <div className="flex h-[500px] items-center justify-center rounded-xl2 border border-dashed border-black/10 text-sm text-saveo-emerald-700/40">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
