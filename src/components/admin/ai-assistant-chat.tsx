"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTED_QUESTIONS = [
  "Why did sales drop?",
  "Who is my best supplier?",
  "Who are my most valuable customers?",
  "What's my best selling product?",
  "Why did conversion drop?",
];

export function AIAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(question: string) {
    if (!question.trim() || sending) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/admin/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not get an answer");
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch (err: any) {
      toast.error(err.message ?? "Could not get an answer");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex flex-col p-5">
      <div className="mb-3">
        <h2 className="font-bold text-saveo-emerald-700">💬 Ask a Business Question</h2>
        <p className="text-xs text-saveo-emerald-700/50">
          Answers are computed directly from Savo's real data — not a language model. If there's no data to answer with, it says so.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button key={q} onClick={() => send(q)} className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-saveo-emerald-700/70 hover:bg-saveo-emerald-100">
            {q}
          </button>
        ))}
      </div>

      <div className="mb-3 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-black/[0.02] p-3">
        {messages.length === 0 && <p className="text-sm text-saveo-emerald-700/40">Ask a question above to get started.</p>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-end" : "text-start"}>
            <span className={`inline-block max-w-[85%] whitespace-pre-line rounded-xl2 px-3 py-2 text-sm ${m.role === "user" ? "bg-saveo-emerald-700 text-white" : "bg-white text-saveo-emerald-800 shadow-sm"}`}>
              {m.text}
            </span>
          </div>
        ))}
        {sending && <p className="text-xs text-saveo-emerald-700/40">Thinking...</p>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about sales, suppliers, customers, products..."
          className="input text-sm"
        />
        <button type="submit" disabled={sending} className="btn-primary !py-2 text-sm">Ask</button>
      </form>
    </div>
  );
}
