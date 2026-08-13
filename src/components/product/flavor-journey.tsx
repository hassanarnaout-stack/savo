const AXES = [
  { key: "sweetness", label: "Sweet", labelAr: "حلاوة" },
  { key: "sourness", label: "Sour", labelAr: "حموضة" },
  { key: "bitterness", label: "Bitter", labelAr: "مرارة" },
  { key: "saltiness", label: "Salty", labelAr: "ملوحة" },
  { key: "spiciness", label: "Spicy", labelAr: "حرارة" },
  { key: "richness", label: "Rich", labelAr: "دسم" },
] as const;

interface FlavorProfile {
  sweetness: number | null;
  sourness: number | null;
  bitterness: number | null;
  saltiness: number | null;
  spiciness: number | null;
  richness: number | null;
  firstTasteNote: string | null;
  midTasteNote: string | null;
  finishNote: string | null;
}

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

export function FlavorJourney({ profile, locale }: { profile: FlavorProfile; locale: string }) {
  const values = AXES.map((a) => profile[a.key] ?? 0);
  const hasAnyValue = values.some((v) => v > 0);
  const hasNotes = profile.firstTasteNote || profile.midTasteNote || profile.finishNote;
  if (!hasAnyValue && !hasNotes) return null;

  const size = 220;
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const angleStep = 360 / AXES.length;

  const points = AXES.map((axis, i) => {
    const value = profile[axis.key] ?? 0;
    const radius = (value / 5) * maxRadius;
    return polarPoint(center, center, radius, i * angleStep);
  });
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <section className="mt-10 rounded-xl2 border border-black/5 bg-white p-6">
      <h2 className="mb-4 text-lg font-black text-saveo-emerald-700">
        {locale === "ar" ? "👅 رحلة النكهة" : "👅 Flavor Journey"}
      </h2>

      {hasAnyValue && (
        <div className="mb-4 flex justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {[1, 2, 3, 4, 5].map((ring) => (
              <circle key={ring} cx={center} cy={center} r={(ring / 5) * maxRadius} fill="none" stroke="rgba(11,61,46,0.08)" strokeWidth="1" />
            ))}
            {AXES.map((_, i) => {
              const edge = polarPoint(center, center, maxRadius, i * angleStep);
              return <line key={i} x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="rgba(11,61,46,0.1)" strokeWidth="1" />;
            })}
            <polygon points={polygonPoints} fill="rgba(11,61,46,0.15)" stroke="#0B3D2E" strokeWidth="2" />
            {AXES.map((axis, i) => {
              const labelPos = polarPoint(center, center, maxRadius + 16, i * angleStep);
              return (
                <text key={axis.key} x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#0B3D2E">
                  {locale === "ar" ? axis.labelAr : axis.label}
                </text>
              );
            })}
          </svg>
        </div>
      )}

      {hasNotes && (
        <div className="space-y-2 border-t border-black/5 pt-4 text-sm">
          {profile.firstTasteNote && (
            <p><span className="font-bold text-saveo-emerald-700">{locale === "ar" ? "أول مذاق: " : "First Taste: "}</span>{profile.firstTasteNote}</p>
          )}
          {profile.midTasteNote && (
            <p><span className="font-bold text-saveo-emerald-700">{locale === "ar" ? "الوسط: " : "Mid Palate: "}</span>{profile.midTasteNote}</p>
          )}
          {profile.finishNote && (
            <p><span className="font-bold text-saveo-emerald-700">{locale === "ar" ? "الختام: " : "Finish: "}</span>{profile.finishNote}</p>
          )}
        </div>
      )}
    </section>
  );
}
