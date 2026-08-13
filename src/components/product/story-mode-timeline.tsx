"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const STEP_ICONS: Record<string, string> = {
  ORIGIN: "🌍",
  MANUFACTURING: "🏭",
  INGREDIENTS: "🌿",
  QUALITY: "🔬",
  CERTIFICATE: "📜",
  AWARD: "🏆",
  CUSTOM: "✨",
};

interface StoryStep {
  id: string;
  stepType: string;
  title: string;
  titleAr: string | null;
  content: string;
  contentAr: string | null;
  imageUrl: string | null;
}

export function StoryModeTimeline({ steps, locale }: { steps: StoryStep[]; locale: string }) {
  const [activeId, setActiveId] = useState<string | null>(steps[0]?.id ?? null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.getAttribute("data-step-id"));
      },
      { threshold: [0.5], rootMargin: "-20% 0px -20% 0px" }
    );
    Object.values(refs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [steps]);

  if (steps.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-6 text-lg font-black text-saveo-emerald-700">
        {locale === "ar" ? "📖 رحلة القصة" : "📖 Story Mode"}
      </h2>
      <div className="relative">
        <div className="absolute bottom-0 top-0 start-4 w-0.5 bg-black/10" />
        <div className="space-y-8">
          {steps.map((step) => {
            const title = locale === "ar" && step.titleAr ? step.titleAr : step.title;
            const content = locale === "ar" && step.contentAr ? step.contentAr : step.content;
            const active = activeId === step.id;
            return (
              <div
                key={step.id}
                ref={(el) => { refs.current[step.id] = el; }}
                data-step-id={step.id}
                className="relative ps-12"
              >
                <div
                  className={`absolute start-0 flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all ${
                    active ? "scale-110 bg-saveo-emerald-600 text-white shadow-lg" : "bg-black/5 text-saveo-emerald-700/50"
                  }`}
                >
                  {STEP_ICONS[step.stepType] ?? "•"}
                </div>
                <div className={`rounded-xl2 p-4 transition-all ${active ? "bg-saveo-emerald-50 shadow-sm" : "bg-transparent"}`}>
                  <p className={`mb-1 text-sm font-bold ${active ? "text-saveo-emerald-800" : "text-saveo-emerald-700/60"}`}>{title}</p>
                  {step.imageUrl && (
                    <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-lg">
                      <Image src={step.imageUrl} alt={title} fill className="object-cover" />
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-saveo-emerald-700/70">{content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
