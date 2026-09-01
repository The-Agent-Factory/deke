#!/usr/bin/env node
/**
 * add-covers.mjs — give every video post in a Postiz manifest a real (non-black) cover frame.
 *
 * WHY
 *   Meta defaults an Instagram Reel's cover to frame 0. Reels that fade in from black publish
 *   a solid black thumbnail into the grid — measured on the CROappella pack: frame 0 YAVG=16
 *   (pure black in video range) rising to ~84 only at t=0.5s.
 *
 * WHAT IT DOES
 *   For each item whose mediaPaths include an .mp4 on a platform that accepts a cover
 *   (instagram, youtube), runs pick-cover-frame.mjs, writes the JPEG next to the video, and
 *   sets item.coverPath. Idempotent: an item that already has coverPath is left alone
 *   unless --force.
 *
 * USAGE
 *   node scripts/add-covers.mjs <manifest.json> [--dry-run] [--force] [--window 5]
 *
 * Run this BEFORE postiz-publish.mjs.
 *
 * ⚠ HUMAN REVIEW IS MANDATORY, NOT OPTIONAL.
 *   The picker optimises for "bright and detailed" — it has no idea what makes a good cover.
 *   Observed on croappella-improv-reel-vertical.mp4: it picked a technically bright frame that
 *   is a blurred arm across the foreground, faces mid-blink, and several identifiable
 *   attendees. That last point violates the standing rule in the copy masters:
 *   NEVER feature unnamed students/attendees (some may be minors).
 *
 *   So: this tool guarantees the cover is NOT BLACK. It does not guarantee the cover is GOOD,
 *   and it cannot enforce the people-safety rule. Open every generated JPEG before publishing
 *   and replace coverPath by hand where the auto-pick is weak or shows identifiable faces.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const PICKER = path.join(HERE, 'pick-cover-frame.mjs');

// Platforms whose API accepts a cover/thumbnail image for a video post.
const COVER_PLATFORMS = new Set(['instagram', 'instagram-standalone', 'youtube']);

async function resolveMediaPath(rel, manifestDir) {
  const candidates = path.isAbsolute(rel)
    ? [rel]
    : [path.resolve(manifestDir, rel), path.resolve(REPO_ROOT, rel), path.resolve(process.cwd(), rel)];
  for (const c of candidates) {
    try { await fs.access(c); return c; } catch { /* next */ }
  }
  throw new Error(`Media file not found: "${rel}" (tried: ${candidates.join(' | ')})`);
}

async function main() {
  const args = process.argv.slice(2);
  const manifestPath = args.find((a) => !a.startsWith('--'));
  if (!manifestPath) {
    console.error('usage: node scripts/add-covers.mjs <manifest.json> [--dry-run] [--force] [--window 5]');
    process.exit(1);
  }
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const wi = args.indexOf('--window');
  const window = wi >= 0 && args[wi + 1] ? args[wi + 1] : '5';

  const abs = path.resolve(manifestPath);
  const manifestDir = path.dirname(abs);
  const raw = JSON.parse(await fs.readFile(abs, 'utf8'));
  const items = Array.isArray(raw) ? raw : raw.items;
  if (!Array.isArray(items)) {
    console.error('ERROR: manifest must be an array of items or { items: [...] }');
    process.exit(1);
  }

  let added = 0, skipped = 0, black = 0;
  const report = [];

  for (const [i, item] of items.entries()) {
    const platform = String(item.platform || '').toLowerCase();
    const tag = `[${i}] ${platform}`;

    if (!COVER_PLATFORMS.has(platform)) { skipped++; continue; }
    const video = (item.mediaPaths || []).find((m) => m.toLowerCase().endsWith('.mp4'));
    if (!video) { skipped++; continue; }
    if (item.coverPath && !force) {
      console.log(`${tag} already has coverPath — skipping (use --force to regenerate)`);
      skipped++;
      continue;
    }

    const absVideo = await resolveMediaPath(video, manifestDir);
    const coverAbs = absVideo.replace(/\.mp4$/i, '-cover.jpg');

    const { stdout } = await run('node', [PICKER, absVideo, '--out', coverAbs, '--window', window, '--json']);
    const res = JSON.parse(stdout);
    if (res.frame0WouldBeBlack) black++;

    // Store the cover path the same way the video path is stored (relative to the manifest
    // when the video was relative), so the manifest stays portable.
    const coverRel = path.isAbsolute(video)
      ? coverAbs
      : path.relative(manifestDir, coverAbs).split(path.sep).join('/');

    if (!dryRun) item.coverPath = coverRel;
    added++;
    report.push({
      idx: i, platform,
      video: path.basename(absVideo),
      frame0YAVG: res.frame0YAVG,
      wouldBeBlack: res.frame0WouldBeBlack,
      chosenAt: res.chosenAt,
      cover: coverRel,
    });
    console.log(
      `${tag} ${path.basename(absVideo)}\n` +
      `      frame0 YAVG=${res.frame0YAVG}${res.frame0WouldBeBlack ? '  <-- WOULD PUBLISH BLACK' : ''}\n` +
      `      cover  t=${res.chosenAt}s -> ${coverRel}`
    );
  }

  if (!dryRun && added > 0) {
    await fs.writeFile(abs, JSON.stringify(raw, null, 2) + '\n', 'utf8');
  }

  console.log('\n' + '─'.repeat(64));
  console.log(`covers ${dryRun ? 'that WOULD be added' : 'added'}: ${added}   skipped: ${skipped}`);
  if (black > 0) {
    console.log(`⚠  ${black} video(s) would have published a BLACK thumbnail without this fix.`);
  }
  if (dryRun) console.log('(dry run — manifest not modified)');
  else if (added > 0) console.log(`manifest updated: ${abs}`);
  console.log('REVIEW the generated JPEGs before publishing. Swap coverPath by hand for a better frame.');
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
