import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Total Vocal community palette (same as the Skool welcome splash in deke-brand/SkoolSplash.tsx)
const SKOOL = { bg: "#161616", bgDeep: "#0d0d0d", gold: "#D4A853", cream: "#F2ECDC" };
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

export type KickerProps = { text: string; outSec?: number };
export type EndSplashProps = { lines: string[]; url: string; startSec: number };
export type MusicProps = { src: string; under: number; swell: number; swellAtSec: number; fadeOutSec?: number };

/**
 * One small gold label at the top while Deke opens ("REHEARSAL TIP 1 OF 4"), with a hairline
 * that draws in under it. Fades out by outSec. Sits above his head, never over captions.
 */
export const Kicker: React.FC<KickerProps> = ({ text, outSec = 2.8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inO = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 16 });
  const rule = spring({ frame: frame - 12, fps, config: { damping: 200 }, durationInFrames: 22 });
  const out = interpolate(frame, [(outSec - 0.5) * fps, outSec * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (out <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: inO * out }}>
      <div
        style={{
          display: "inline-block",
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: 8,
          color: SKOOL.gold,
          padding: "10px 26px",
          background: "rgba(13,13,13,0.55)",
          borderRadius: 8,
          transform: `translateY(${(1 - inO) * -16}px)`,
        }}
      >
        {text}
      </div>
      <div
        style={{
          margin: "14px auto 0",
          height: 3,
          width: 360 * rule,
          background: SKOOL.gold,
          borderRadius: 2,
        }}
      />
    </div>
  );
};

/**
 * Closing card: the video settles back and gives way to a Total Vocal card in the Skool palette,
 * with Deke's portrait, two or three short lines, and the community link. Replaces the held last
 * frame + pill, so the ending lands instead of stopping.
 */
export const EndSplash: React.FC<EndSplashProps> = ({ lines, url, startSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startSec * fps;
  if (f < 0) return null;
  const bgIn = interpolate(f, [0, 0.45 * fps], [0, 1], { extrapolateRight: "clamp" });
  const photo = spring({ frame: f - 3, fps, config: { damping: 200 }, durationInFrames: 24 });
  const pill = spring({ frame: f - 0.95 * fps, fps, config: { damping: 15, stiffness: 140 } });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SKOOL.bg} 0%, ${SKOOL.bgDeep} 100%)`,
        opacity: bgIn,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 250,
          left: "50%",
          width: 600,
          height: 886,
          marginLeft: -300,
          borderRadius: 24,
          overflow: "hidden",
          opacity: photo,
          transform: `translateY(${(1 - photo) * 40}px)`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        <Img src={staticFile("skool/deke-portrait.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, rgba(22,22,22,0) 60%, ${SKOOL.bg} 100%)`,
          }}
        />
      </div>
      <div style={{ position: "absolute", top: 1190, left: 0, right: 0, textAlign: "center" }}>
        {lines.map((line, i) => {
          const s = spring({ frame: f - (0.35 + i * 0.14) * fps, fps, config: { damping: 16, stiffness: 120 } });
          const last = i === lines.length - 1;
          return (
            <div
              key={i}
              style={{
                fontSize: last ? 118 : 66,
                fontWeight: last ? 800 : 600,
                letterSpacing: last ? 6 : 4,
                color: last ? SKOOL.cream : SKOOL.gold,
                lineHeight: 1.18,
                opacity: s,
                transform: `translateY(${(1 - s) * 34}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
        <div
          style={{
            margin: "34px auto 0",
            display: "inline-block",
            padding: "18px 46px",
            borderRadius: 999,
            border: `2px solid ${SKOOL.gold}`,
            color: SKOOL.gold,
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: 2,
            opacity: pill,
            transform: `scale(${0.92 + 0.08 * pill})`,
          }}
        >
          {url}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Sing-Off a cappella bed under Deke's voice: barely there while he talks, rises on the closing
 * card, fades out at the very end.
 */
export const MusicBed: React.FC<MusicProps> = ({ src, under, swell, swellAtSec, fadeOutSec = 1.2 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const end = durationInFrames / fps;
  return (
    <Audio
      src={staticFile(src)}
      volume={(fr) => {
        const t = fr / fps;
        const fadeIn = interpolate(t, [0, 0.8], [0, 1], { extrapolateRight: "clamp" });
        const rise = interpolate(t, [swellAtSec - 0.2, swellAtSec + 0.6], [under, swell], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const out = interpolate(t, [end - fadeOutSec, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return fadeIn * rise * out;
      }}
    />
  );
};
