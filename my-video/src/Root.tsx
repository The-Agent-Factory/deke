import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { DekeShort } from "./DekeShort";
import type { DekeShortProps } from "./DekeShort";
import type { Word } from "./DekeShort";
import competitionWords from "../public/short-words.json";
import arrangingWords from "../public/short-words-arranging.json";
import card68Meta from "../public/card68/meta.json";
import card68A from "../public/card68/reel-a-words.json";
import card68B from "../public/card68/reel-b-words.json";
import card68C from "../public/card68/reel-c-words.json";
import card68F1 from "../public/card68/f1-words.json";

// Card 68 (week of 2026-10-19): bases built by card68/work/build_bases.sh
const card68 = [
  { id: "Card68ReelA", base: "card68/reel-a.mp4", words: card68A, meta: card68Meta["reel-a"], showTitle: true },
  { id: "Card68ReelB", base: "card68/reel-b.mp4", words: card68B, meta: card68Meta["reel-b"], showTitle: true },
  { id: "Card68ReelC", base: "card68/reel-c.mp4", words: card68C, meta: card68Meta["reel-c"], showTitle: false },
  { id: "Card68F1", base: "card68/f1.mp4", words: card68F1, meta: card68Meta["f1"], showTitle: false },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="DekeShort"
        component={DekeShort}
        durationInFrames={1609}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          baseFile: "short-base.mp4",
          words: (competitionWords as { words: Word[] }).words,
          cover: {
            text: "“Competitions are mostly for losers.”",
            endSec: 4.75,
            x: 540,
            y: 625,
            w: 540,
            h: 275,
          },
        }}
      />
      <Composition
        id="DekeShortArranging"
        component={DekeShort}
        durationInFrames={1272}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          baseFile: "short-base-arranging.mp4",
          words: (arrangingWords as { words: Word[] }).words,
          broll: [{ src: "broll-truck.png", startSec: 15.37, endSec: 18.67 }],
        }}
      />
      {card68.map((c) => (
        <Composition
          key={c.id}
          id={c.id}
          component={DekeShort}
          durationInFrames={c.meta.frames}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            baseFile: c.base,
            words: (c.words as { words: Word[] }).words,
            showTitle: c.showTitle,
          }}
        />
      ))}
      {/* Engine: any clip, driven entirely by --props (engine/render.py). Duration comes from props.durationSec. */}
      <Composition
        id="EngineShort"
        component={DekeShort}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={300}
        defaultProps={{ baseFile: "engine/placeholder.mp4", words: [], showTitle: false, durationSec: 10 } as DekeShortProps & { durationSec: number }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(30, Math.round(((props as { durationSec?: number }).durationSec ?? 10) * 30)),
        })}
      />
    </>
  );
};
