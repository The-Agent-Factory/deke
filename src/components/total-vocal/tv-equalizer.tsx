"use client";

/**
 * Animated gold equalizer — the Total Vocal hero motif.
 * 26 bars with sine-derived heights and staggered, alternating animation.
 * Purely decorative; respects prefers-reduced-motion via the `.animate-eq`
 * keyframes being neutralized in globals.css.
 */
export function TvEqualizer() {
  const barCount = 26;
  return (
    <div aria-hidden className="flex h-16 items-end gap-[5px]">
      {Array.from({ length: barCount }, (_, i) => {
        const height = 16 + Math.abs(Math.sin(i * 0.7)) * 44;
        const duration = 1 + ((i % 6) + 2) / 10; // 1.2s – 1.7s
        const delay = (i * 0.07).toFixed(2);
        return (
          <span
            key={i}
            className="animate-eq block w-1 rounded"
            style={{
              height: `${height}px`,
              background: "linear-gradient(180deg,#EBC579,#D8A33E)",
              opacity: 0.9,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
