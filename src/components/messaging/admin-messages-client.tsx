"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { ThreadView } from "@/components/messaging/thread-view";

interface ThreadSummary {
  id: string;
  subject: string;
  status: string;
  participantType: string;
  participant: { name: string | null; email: string; role: string };
  messages: { content: string }[];
  _count: { messages: number };
}

export function AdminMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [filter, setFilter] = useState<"OPEN" | "CLOSED" | "ALL">("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchThreads() {
    const res = await fetch(`/api/admin/messages${filter !== "ALL" ? `?status=${filter}` : ""}`);
    const data = await res.json();
    if (res.ok) setThreads(data.threads);
  }

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function toggleStatus(threadId: string, currentStatus: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/messages/${threadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: currentStatus === "OPEN" ? "CLOSE" : "REOPEN" }),
      });
      if (!res.ok) throw new Error();
      toast.success(currentStatus === "OPEN" ? "Conversation closed" : "Conversation reopened");
      await fetchThreads();
    } catch {
      toast.error("Could not update conversation");
    } finally {
      setBusy(false);
    }
  }

  const selectedThread = threads.find((t) => t.id === selectedId);

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Messages</h1>
        <div className="flex gap-1.5">
          {(["OPEN", "CLOSED", "ALL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-saveo-emerald-700 text-white" : "bg-black/5"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[280px_1fr]">
        <div className="space-y-1.5">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`flex w-full items-start gap-2 rounded-lg p-2.5 text-start text-xs ${selectedId === t.id ? "bg-saveo-emerald-50" : "hover:bg-black/[0.02]"}`}
            >
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-saveo-emerald-700/40" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.subject}</p>
                <p className="truncate text-saveo-emerald-700/50">{t.participant.name ?? t.participant.email} · {t.participantType}</p>
                <p className="truncate text-saveo-emerald-700/40">{t.messages[0]?.content ?? ""}</p>
              </div>
            </button>
          ))}
          {threads.length === 0 && <p className="p-4 text-center text-xs text-saveo-emerald-700/40">No conversations.</p>}
        </div>

        <div>
          {selectedThread ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{selectedThread.subject}</p>
                <button onClick={() => toggleStatus(selectedThread.id, selectedThread.status)} disabled={busy} className="text-xs font-semibold text-saveo-emerald-600">
                  {selectedThread.status === "OPEN" ? "Close" : "Reopen"}
                </button>
              </div>
              <ThreadView
                threadId={selectedThread.id}
                currentUserId={currentUserId}
                fetchUrl={`/api/messages/${selectedThread.id}`}
                sendUrl={`/api/messages/${selectedThread.id}`}
                closed={selectedThread.status === "CLOSED"}
              />
            </>
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
