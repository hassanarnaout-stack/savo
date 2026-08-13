"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, ShoppingBag, Check } from "lucide-react";
import { AuraGlowCard } from "@/components/ui/aura-glow-card";
import { formatKWD } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { AIAssistantResponse, StructuredAction, AIProductCard } from "@/lib/ai-assistant";

interface Turn {
  role: "user" | "assistant";
  response?: AIAssistantResponse;
  text?: string;
}

function getOrCreateSessionId(): string {
  const key = "savo_ai_session";
  let id = typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
  if (!id) {
    id = `ai_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    if (typeof window !== "undefined") sessionStorage.setItem(key, id);
  }
  return id;
}

export function AIConciergePanel({ locale, onClose }: { locale: string; onClose: () => void }) {
  const [sessionId] = useState(getOrCreateSessionId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<StructuredAction | null>(null);
  const [pendingCard, setPendingCard] = useState<AIProductCard | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai-assistant/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "SESSION_STARTED", sessionId }),
    }).catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setTurns((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, sessionId }),
      });
      const response: AIAssistantResponse = await res.json();
      setTurns((prev) => [...prev, { role: "assistant", response }]);
    } catch {
      setTurns((prev) => [...prev, { role: "assistant", text: locale === "ar" ? "حدث خطأ — جرّب مرة ثانية." : "Something went wrong — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleActionClick(action: StructuredAction, card?: AIProductCard) {
    if (action.requiresConfirmation) {
      setPendingAction(action);
      setPendingCard(card ?? null);
      return;
    }
    if (action.type === "VIEW_PRODUCT" && action.productId) {
      const slug = card?.slug || action.productId;
      window.location.href = `/${locale}/products/${slug}`;
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    await fetch("/api/ai-assistant/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "ACTION_CONFIRMED", sessionId, productId: pendingAction.productId, actionType: pendingAction.type }),
    }).catch(() => {});

    // Real cart mutation — goes through the existing, unmodified cart
    // store (same addItem the rest of the site already uses), never a
    // new/parallel cart-writing code path. If the AI hasn't provided
    // enough real product data to construct a cart line, this safely
    // falls back to navigating to the real product page instead of
    // guessing any field.
    if (pendingAction.type === "ADD_TO_CART" && pendingAction.productId && pendingCard) {
      addItem(
        {
          productId: pendingCard.productId,
          name: pendingCard.productName,
          slug: pendingCard.slug,
          image: pendingCard.image,
          originalPrice: pendingCard.originalPrice ?? pendingCard.price,
          saveoPrice: pendingCard.price,
          stockQty: pendingCard.stockQty,
        },
        pendingAction.quantity ?? 1
      );
    } else if (pendingAction.type === "ADD_TO_CART" && pendingAction.productId) {
      window.location.href = `/${locale}/products/${pendingAction.productId}`;
    }
    setPendingAction(null);
    setPendingCard(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-luxury sm:h-[80vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-saveo-emerald-800 to-saveo-emerald-700 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-saveo-gold-400/20">
              <Sparkles className="h-5 w-5 text-saveo-gold-400" />
            </div>
            <div>
              <p className="font-bold text-white">{locale === "ar" ? "مستشارك الشخصي" : "Your Shopping Concierge"}</p>
              <p className="text-xs text-white/60">Saveo AI</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {turns.length === 0 && (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-saveo-gold-400" />
              <p className="mt-3 text-sm text-saveo-emerald-700/60">
                {locale === "ar" ? "شو تحتاج اليوم؟" : "What are you looking for today?"}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["ساعدني أختار هدية 🎁", "أفضل العروض الآن", "ساعدني أوفر في السلة"].map((p) => (
                  <button key={p} onClick={() => send(p)} className="rounded-full bg-saveo-emerald-50 px-3 py-1.5 text-xs font-semibold text-saveo-emerald-700">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, i) => (
            <div key={i} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {turn.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-saveo-emerald-700 px-4 py-2.5 text-sm text-white">{turn.text}</div>
              ) : (
                <div className="max-w-[90%] space-y-3">
                  <div className="rounded-2xl rounded-tl-sm bg-saveo-emerald-50 px-4 py-2.5 text-sm text-saveo-emerald-800">
                    {turn.response?.message ?? turn.text}
                  </div>

                  {turn.response?.productCards.map((card) => (
                    <AuraGlowCard key={card.productId} className="rounded-xl2">
                      <div className="flex gap-3 p-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl2 bg-saveo-emerald-50">
                          <ShoppingBag className="h-6 w-6 text-saveo-emerald-700/30" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-saveo-emerald-800">{card.productName}</p>
                          <p className="mt-0.5 text-xs text-saveo-gold-700">{card.aiReason}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-sm font-bold text-saveo-emerald-700">{formatKWD(card.price)}</span>
                            {card.originalPrice && <span className="text-xs text-saveo-emerald-700/40 line-through">{formatKWD(card.originalPrice)}</span>}
                          </div>
                          <div className="mt-2 flex gap-2">
                            {card.actions.map((action, ai) => (
                              <button
                                key={ai}
                                onClick={() => handleActionClick(action, card)}
                                className={action.type === "ADD_TO_CART" ? "btn-primary !py-1 !px-3 text-xs" : "btn-outline !py-1 !px-3 text-xs"}
                              >
                                {action.type === "ADD_TO_CART" ? (locale === "ar" ? "أضف للسلة" : "Add to Cart") : (locale === "ar" ? "شوف المنتج" : "View")}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AuraGlowCard>
                  ))}

                  {turn.response?.budgetBasket?.items.map((card) => (
                    <AuraGlowCard key={card.productId} className="rounded-xl2">
                      <div className="flex gap-3 p-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl2 bg-saveo-emerald-50">
                          <ShoppingBag className="h-6 w-6 text-saveo-emerald-700/30" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-saveo-emerald-800">{card.productName}</p>
                          <p className="mt-0.5 text-xs text-saveo-gold-700">{card.aiReason}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-sm font-bold text-saveo-emerald-700">{formatKWD(card.price)}</span>
                          </div>
                          <div className="mt-2 flex gap-2">
                            {card.actions.map((action, ai) => (
                              <button
                                key={ai}
                                onClick={() => handleActionClick(action, card)}
                                className={action.type === "ADD_TO_CART" ? "btn-primary !py-1 !px-3 text-xs" : "btn-outline !py-1 !px-3 text-xs"}
                              >
                                {action.type === "ADD_TO_CART" ? (locale === "ar" ? "أضف للسلة" : "Add to Cart") : (locale === "ar" ? "شوف المنتج" : "View")}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AuraGlowCard>
                  ))}

                  {turn.response?.budgetBasket && (
                    <div className="rounded-xl2 bg-saveo-gold-50 p-3 text-xs">
                      <p className="font-bold text-saveo-emerald-800">
                        {locale === "ar" ? "الباقي من ميزانيتك:" : "Remaining budget:"} {formatKWD(turn.response.budgetBasket.remainingBudget)}
                      </p>
                    </div>
                  )}

                  {turn.response?.comparisonCard && (
                    <div className="rounded-xl2 border border-saveo-gold-200 p-3 text-xs">
                      <p className="font-bold text-saveo-emerald-800">{turn.response.comparisonCard.aiRecommendation}</p>
                    </div>
                  )}

                  {turn.response && turn.response.suggestedPrompts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {turn.response.suggestedPrompts.map((p) => (
                        <button key={p} onClick={() => send(p)} className="rounded-full bg-saveo-emerald-700/5 px-2.5 py-1 text-[11px] font-semibold text-saveo-emerald-700">
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && <div className="text-xs text-saveo-emerald-700/40">{locale === "ar" ? "جاري التفكير..." : "Thinking..."}</div>}
        </div>

        {pendingAction && (
          <div className="border-t border-black/5 bg-saveo-gold-50 px-4 py-3">
            <p className="mb-2 text-sm font-semibold text-saveo-emerald-800">{pendingAction.confirmationText}</p>
            <div className="flex gap-2">
              <button onClick={confirmAction} className="btn-primary flex items-center gap-1 !py-1.5 text-xs">
                <Check className="h-3.5 w-3.5" /> {locale === "ar" ? "تأكيد" : "Confirm"}
              </button>
              <button onClick={() => setPendingAction(null)} className="btn-outline !py-1.5 text-xs">
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-black/5 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={locale === "ar" ? "اكتب سؤالك..." : "Ask me anything..."}
            className="flex-1 rounded-full border border-black/10 px-4 py-2 text-sm"
          />
          <button onClick={() => send(input)} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-full bg-saveo-emerald-700 text-white disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
