interface ProductRevealWrapperProps {
  experienceType: string;
  children: React.ReactNode;
}

/** Gradual fade-in + subtle glow for Premium/Mystery/Luxury products only. Standard products render instantly with no wrapper overhead. */
export function ProductRevealWrapper({ experienceType, children }: ProductRevealWrapperProps) {
  const isSpecial = experienceType === "PREMIUM" || experienceType === "MYSTERY" || experienceType === "LUXURY";
  if (!isSpecial) return <>{children}</>;

  return (
    <div className="product-reveal">
      <style>{`
        @keyframes productRevealFade {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); filter: drop-shadow(0 0 0 rgba(212,175,55,0)); }
          60% { opacity: 1; transform: translateY(0) scale(1.005); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: drop-shadow(0 0 24px rgba(212,175,55,0.25)); }
        }
        .product-reveal { animation: productRevealFade 700ms ease-out; }
      `}</style>
      {children}
    </div>
  );
}
