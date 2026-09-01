#!/usr/bin/env node
/**
 * pick-cover-frame.mjs — choose a non-black cover/thumbnail frame for a vertical reel.
 *
 * WHY THIS EXISTS
 *   Meta's Instagram API defaults a Reel's cover to frame 0. Several of our reels open on a
 *   fade-in from black (e.g. croappella-beatboxer-reel-vertical.mp4 measures YAVG=16 at t=0,
 *   reaching full brightness ~83 only at t=0.5s). Result: a pure-black thumbnail in the grid.
 *   Postiz's Instagram settings block did not send any cover parameter, so nothing overrode it.
 *
 * WHAT IT DOES
 *   Scans the first N seconds, scores each candidate frame, and writes the winner as a JPEG
 *   sized for Instagram (1080x1920). Scoring rejects near-black/near-white frames and prefers
 *   frames with high detail (a proxy for "something is actually happening on screen").
 *
 * NOTE ON LUMA RANGE
 *   These are video-range (limited/TV) files: black is Y=16, white is Y=235. A YAVG of 16 is
 *   pure black, NOT "very dark". Thresholds below are set in that range.
 *
 * USAGE
 *   node scripts/pick-cover-frame.mjs <video.mp4> [--out cover.jpg] [--window 5] [--json]
 *
 * EXIT CODES
 *   0 ok · 1 usage/ffmpeg error · 2 no acceptable frame found in the window
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const run = promisify(execFile);

// Video-range luma thresholds. Black floor is 16, white ceiling is 235.
const MIN_YAVG = 40;   // below this reads as "black frame" on a phone screen
const MAX_YAVG = 215;  // blown-out white flash
const MIN_STDDEV = 8;  // flat/featureless frame (solid colour card) — reject as a cover

async function ffprobeDuration(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ]);
  return parseFloat(stdout.trim()) || 0;
}

/** Measure average luma + spatial detail for a single frame at time t. */
async function measure(file, t) {
  let stderr = '';
  try {
    const r = await run('ffmpeg', [
      '-v', 'info', '-ss', String(t), '-i', file,
      '-frames:v', '1', '-vf', 'signalstats,metadata=print', '-f', 'null', '-',
    ], { maxBuffer: 1 << 24 });
    stderr = r.stderr;
  } catch (err) {
    stderr = err.stderr || '';
  }
  const grab = (key) => {
    const m = stderr.match(new RegExp(`signalstats\\.${key}=([0-9.]+)`));
    return m ? parseFloat(m[1]) : null;
  };
  const yavg = grab('YAVG');
  if (yavg === null) return null;
  // YDIF = mean absolute difference between adjacent pixels: a good cheap detail proxy.
  const ydif = grab('YDIF') ?? 0;
  const ylow = grab('YLOW') ?? yavg;
  const yhigh = grab('YHIGH') ?? yavg;
  return { t, yavg, ydif, spread: yhigh - ylow };
}

function score(f) {
  if (f.yavg < MIN_YAVG || f.yavg > MAX_YAVG) return -Infinity;
  if (f.spread < MIN_STDDEV) return -Infinity;
  // Prefer mid-bright, high-contrast, detailed frames. Penalise distance from a pleasant
  // mid-luma (~120 in video range) so we don't pick the single brightest flash.
  const lumaFit = 1 - Math.abs(f.yavg - 120) / 120;
  return lumaFit * 2 + (f.spread / 255) * 1.5 + Math.min(f.ydif, 30) / 30;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('usage: node scripts/pick-cover-frame.mjs <video.mp4> [--out cover.jpg] [--window 5] [--json]');
    process.exit(1);
  }
  const getOpt = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : def;
  };
  const asJson = args.includes('--json');
  const window = parseFloat(getOpt('window', '5'));
  const out = getOpt('out', file.replace(/\.[^.]+$/, '') + '-cover.jpg');

  await fs.access(file);
  const dur = await ffprobeDuration(file);
  const end = Math.min(window, Math.max(dur - 0.1, 0.1));

  // Sample every 1/6s across the window — dense enough to catch a short fade, cheap enough to run fast.
  const times = [];
  for (let t = 0; t <= end; t += 1 / 6) times.push(Number(t.toFixed(3)));

  const frames = [];
  for (const t of times) {
    const m = await measure(file, t);
    if (m) frames.push({ ...m, score: score(m) });
  }
  if (frames.length === 0) {
    console.error(`ERROR: could not measure any frame in ${file}`);
    process.exit(1);
  }

  const viable = frames.filter((f) => Number.isFinite(f.score));
  if (viable.length === 0) {
    console.error(
      `ERROR: no acceptable cover frame in the first ${end}s of ${path.basename(file)}.\n` +
      `       Every sampled frame was too dark, too bright, or too flat.\n` +
      `       Widen with --window, or supply a designed cover card instead.`);
    process.exit(2);
  }

  viable.sort((a, b) => b.score - a.score);
  const best = viable[0];
  const first = frames[0];

  await run('ffmpeg', [
    '-v', 'error', '-y', '-ss', String(best.t), '-i', file,
    '-frames:v', '1', '-q:v', '2',
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    out,
  ]);

  const result = {
    ok: true,
    video: file,
    cover: out,
    chosenAt: best.t,
    chosenYAVG: Number(best.yavg.toFixed(2)),
    frame0YAVG: Number(first.yavg.toFixed(2)),
    frame0WouldBeBlack: first.yavg < MIN_YAVG,
    sampled: frames.length,
  };

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${path.basename(file)}`);
    console.log(`  frame 0 YAVG : ${result.frame0YAVG}${result.frame0WouldBeBlack ? '  <-- BLACK, would be the IG cover' : ''}`);
    console.log(`  chosen       : t=${best.t}s  YAVG=${result.chosenYAVG}`);
    console.log(`  cover written: ${out}`);
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
