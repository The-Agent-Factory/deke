import React, { useMemo } from "react";
import { Kicker, EndSplash, MusicBed } from "./Polish";
import type { KickerProps, EndSplashProps, MusicProps } from "./Polish";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const GOLD = "#E8B84B";
const DARK = "rgba(12, 10, 16, 0.92)";

export type Word = { start: number; end: number; word: string };
export type ShortCover = {
  text: string;
  endSec: number; // fades out just before this
  x: number;
  y: number;
  w: number;
  h: number;
};
export type ShortBRoll = { src: string; startSec: number; endSec: number };

export type DekeShortProps = {
  baseFile: string; // blur-fill 9:16 base video in public/
  words: Word[]; // short-timeline word timings
  cover?: ShortCover; // masks a legacy burned-in graphic during the cold open
  broll?: ShortBRoll[];
  showTitle?: boolean; // "Too Many Notes" title; off for non-TMN sources
  kicker?: KickerProps; // small gold label at the top during the opening line
  endSplash?: EndSplashProps; // Total Vocal closing card (replaces the small end pill)
  music?: MusicProps; // a cappella bed under the voice, swelling on the closing card
};

const chunkWords = (words: Word[]): Word[][] => {
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const gap = i + 1 < words.length ? words[i + 1].start - w.end : 9;
    if (cur.length >= 3 || gap > 0.6 || /[.?!,]$/.test(w.word)) {
      chunks.push(cur);
      cur = [];
    }
  });
  if (cur.length) chunks.push(cur);
  return chunks;
};

const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = useMemo(() => chunkWords(words), [words]);
  const t = frame / fps;
  // The newest caption that has started wins, so a lingering caption never hides a short one after it.
  const chunk = [...chunks].reverse().find((c) => t >= c[0].start && t <= c[c.length - 1].end + 0.15);
  if (!chunk) return null;
  const pop = spring({
    frame: frame - Math.round(chunk[0].start * fps),
    fps,
    config: { damping: 12, stiffness: 200 },
    durationInFrames: 8,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1310,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${0.9 + 0.1 * pop})`,
      }}
    >
      <div
        style={{
          display: "block",
          textAlign: "center",
          maxWidth: 940,
          padding: "18px 30px",
          borderRadius: 24,
          background: DARK,
          fontFamily: "Arial Black, Arial, sans-serif",
          fontWeight: 900,
          fontSize: 72,
          lineHeight: 1.25,
          textTransform: "uppercase",
        }}
      >
        {chunk.map((w, i) => {
          const active = t >= w.start;
          return (
            <React.Fragment key={i}>
              <span
                style={{
                  display: "inline-block",
                  margin: "0 12px",
                  color: active ? GOLD : "white",
                  textShadow: "0 4px 18px rgba(0,0,0,0.6)",
                  transform: active ? "scale(1.06)" : "scale(1)",
                }}
              >
                {w.word}
              </span>{" "}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Title superimposed over him talking, then fades away (Deke's request — no static card)
const TitleOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inO = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 14 });
  const out = interpolate(frame, [3.4 * fps, 4.4 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (out <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 160,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: out,
        transform: `translateY(${(1 - inO) * -40}px)`,
      }}
    >
      <div
        style={{
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: 84,
          fontWeight: 900,
          color: "white",
          letterSpacing: 2,
          textShadow: "0 6px 24px rgba(0,0,0,0.7)",
        }}
      >
        TOO MANY <span style={{ color: GOLD }}>NOTES</span>
      </div>
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 34,
          letterSpacing: 10,
          color: GOLD,
          marginTop: 6,
        }}
      >
        WITH DEKE SHARON
      </div>
    </div>
  );
};

// Modern card covering a legacy burned-in graphic
const CardCover: React.FC<{ cover: ShortCover }> = ({ cover }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t > cover.endSec) return null;
  const inO = spring({ frame, fps, config: { damping: 13 }, durationInFrames: 12 });
  const out = interpolate(t, [cover.endSec - 0.45, cover.endSec], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: cover.x,
        top: cover.y,
        width: cover.w,
        height: cover.h,
        borderRadius: "24px 0 0 24px",
        background: "linear-gradient(135deg, rgb(20,14,10), rgb(60,30,14))",
        borderTop: `2px solid ${GOLD}`,
        borderBottom: `2px solid ${GOLD}`,
        borderLeft: `2px solid ${GOLD}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        opacity: inO * out,
        transform: `scale(${0.9 + 0.1 * inO})`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 34,
          color: "white",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {cover.text}
      </div>
    </div>
  );
};

// Full-frame b-roll cutaway with slow push, over the host's audio
const BRollShot: React.FC<{ b: ShortBRoll }> = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < b.startSec || t > b.endSec) return null;
  const local = (t - b.startSec) / (b.endSec - b.startSec);
  const opacity = interpolate(t, [b.startSec, b.startSec + 0.35, b.endSec - 0.35, b.endSec], [0, 1, 1, 0]);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity, backgroundColor: "black" }}>
      <Img
        src={staticFile(b.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${1 + 0.09 * local})`,
        }}
      />
    </div>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 12,
        width: (frame / durationInFrames) * width,
        background: GOLD,
      }}
    />
  );
};

const EndCta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const startF = durationInFrames - 4.2 * fps;
  if (frame < startF) return null;
  const inO = spring({ frame: frame - startF, fps, config: { damping: 13 }, durationInFrames: 14 });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 260,
        textAlign: "center",
        opacity: inO,
        transform: `translateY(${(1 - inO) * 60}px)`,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: DARK,
          border: `2px solid ${GOLD}`,
          borderRadius: 999,
          padding: "22px 48px",
        }}
      >
        <div
          style={{
            fontFamily: "Arial Black, Arial, sans-serif",
            fontSize: 44,
            fontWeight: 900,
            color: "white",
          }}
        >
          JOIN <span style={{ color: GOLD }}>TOTAL VOCAL</span>
        </div>
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 32, color: GOLD, marginTop: 4 }}>
          skool.com/deke
        </div>
      </div>
    </div>
  );
};

export const DekeShort: React.FC<DekeShortProps> = ({
  baseFile,
  words,
  cover,
  broll = [],
  showTitle = true,
  kicker,
  endSplash,
  music,
}) => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <OffthreadVideo src={staticFile(baseFile)} />
      {cover ? <CardCover cover={cover} /> : null}
      {broll.map((b, i) => (
        <BRollShot key={i} b={b} />
      ))}
      {showTitle ? <TitleOverlay /> : null}
      {kicker ? <Kicker {...kicker} /> : null}
      <Captions words={words} />
      {endSplash ? <EndSplash {...endSplash} /> : <EndCta />}
      {music ? <MusicBed {...music} /> : null}
      <ProgressBar />
    </AbsoluteFill>
  );
};
