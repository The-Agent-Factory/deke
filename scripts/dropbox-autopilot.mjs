#!/usr/bin/env node
/**
 * dropbox-autopilot.mjs: hands-off front half of the Deke content pipeline.
 *
 * Runs on a Windows Scheduled Task (every 6h). For anything new that Deke
 * drops in the shared Dropbox folder it:
 *   1. detects new files (videos via ingest ledger; EVERYTHING via a snapshot
 *      diff, so photo/MOV-only drops like stills get noticed too)
 *   2. indexes new videos ONLINE (since 2026-11-03, Denis: "this should all be
 *      done online"): engine/index_dropbox.py streams each clip from Dropbox,
 *      probes it and transcribes it. No video is copied to any drive.
 *   3. emails Denis a digest (Resend) with what was indexed
 *
 * What it deliberately does NOT do: create pipeline projects, edit, write
 * copy, or post anything. Those stay behind the human gates (triage gate,
 * GATEs A-D, Postiz dry-run). Fail-loud: any error is emailed + logged and
 * the run exits 1.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEKE_ROOT = path.dirname(SCRIPT_DIR);
const CONFIG = JSON.parse(readFileSync(path.join(SCRIPT_DIR, 'dropbox-watch.json'), 'utf8'));
const FOOTAGE = path.join(DEKE_ROOT, 'engine', 'state', 'dropbox'); // online mode: no media drive
mkdirSync(FOOTAGE, { recursive: true });
const PYTHON = process.env.DEKE_PYTHON || 'C:/Python313/python.exe';
const INDEXER = path.join(DEKE_ROOT, 'engine', 'index_dropbox.py');
const SNAPSHOT = path.join(FOOTAGE, 'autopilot-remote-snapshot.json');
const LOCK = path.join(FOOTAGE, 'autopilot.lock');
const LOG = path.join(FOOTAGE, 'autopilot-log.txt');
// Full path: the scheduled task got empty stdout from the WinGet Links shim (failing since 2026-09-28).
const RCLONE = process.env.RCLONE_EXE || path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe', 'rclone-v1.74.4-windows-amd64', 'rclone.exe');
const TO_EMAIL = process.env.AUTOPILOT_TO || 'denis@theagentfactory.ai';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG, line + '\n'); } catch { /* console + email still carry it */ }
}

function loadEnvKeys() {
  // Read RESEND_* from the deke app's .env without exporting or printing them.
  const envFile = path.join(DEKE_ROOT, '.env');
  const out = {};
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(RESEND_API_KEY|RESEND_FROM_EMAIL)=(.+)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, '');
    }
  }
  return out;
}

async function sendEmail(subject, html) {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = loadEnvKeys();
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    log('EMAIL SKIPPED: RESEND_API_KEY / RESEND_FROM_EMAIL missing from deke/.env');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [TO_EMAIL], subject, html }),
  });
  if (!res.ok) {
    log(`EMAIL FAILED: ${res.status} ${await res.text()}`);
    return false;
  }
  log(`emailed: ${subject}`);
  return true;
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
}

function runOrThrow(cmd, args, opts = {}) {
  const res = run(cmd, args, opts);
  if (res.error) throw new Error(`${cmd} failed to start: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\nexit ${res.status}\n${(res.stderr || res.stdout || '').slice(-2000)}`);
  return res;
}

function fmtSize(b) { return b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : (b / 1e6).toFixed(1) + ' MB'; }
function fmtDur(s) { return s == null ? '?' : `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ---------- main ----------

async function main() {
  if (existsSync(LOCK)) {
    let age = Infinity; // empty/corrupt lock (e.g. a crash mid-write on 2026-09-28) counts as stale
    try { age = Date.now() - JSON.parse(readFileSync(LOCK, 'utf8')).at; } catch { log('lock file unreadable - treating as stale'); }
    if (age < 5 * 3600 * 1000) { log('lock present, previous run still active, exiting'); return; }
    log('stale lock (>5h), taking over');
  }
  writeFileSync(LOCK, JSON.stringify({ at: Date.now(), pid: process.pid }));

  try {
    // 1. FULL remote snapshot diff (all file types, all watches)
    const prev = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, 'utf8')) : { files: {} };
    const current = { files: {} };
    const newNonVideo = [];
    for (const watch of CONFIG.watches) {
      const res = runOrThrow(RCLONE, ['lsjson', watch.remote, '--recursive', '--files-only']);
      if (!res.stdout || !res.stdout.trim()) {
        throw new Error(`rclone lsjson returned empty output for ${watch.remote} (exit ${res.status}, rclone=${RCLONE}, cwd=${process.cwd()})\nstderr: ${(res.stderr || '(empty)').slice(-2000)}`);
      }
      for (const e of JSON.parse(res.stdout)) {
        const key = `${watch.name}:${e.Path}`;
        current.files[key] = { size: e.Size, modTime: e.ModTime };
        const isVideo = CONFIG.videoExtensions.includes(path.extname(e.Name).toLowerCase());
        if (!prev.files[key] && !isVideo && !e.Name.toLowerCase().endsWith('.lrf')) {
          newNonVideo.push({ key, path: e.Path, size: e.Size });
        }
      }
    }
    const firstRun = !existsSync(SNAPSHOT);
    writeFileSync(SNAPSHOT, JSON.stringify(current, null, 2));

    // 2. Online index (2026-11-03): nothing is copied. index_dropbox.py streams each new clip from Dropbox,
    //    probes it, transcribes it (DJI .LRF preview audio when there is one) and records it in
    //    engine/state/dropbox-index.json. Its last stdout line is a JSON summary.
    const listOut = runOrThrow(PYTHON, ['-X', 'utf8', INDEXER, '--list']).stdout.trim().split('\n').pop();
    const pendingBefore = JSON.parse(listOut).pending;
    if (!pendingBefore && (!newNonVideo.length || firstRun)) {
      log(`nothing new (videos: 0, non-video: ${firstRun ? 'baseline snapshot written' : '0'})`);
      return;
    }
    let summary = { indexed: [], errors: [], pending: 0 };
    if (pendingBefore) {
      log(`indexing ${pendingBefore} new clip(s) online (max 40 this run)`);
      const res = run(PYTHON, ['-X', 'utf8', INDEXER, '--limit', '40']);
      const last = (res.stdout || '').trim().split('\n').pop() || '';
      try { summary = JSON.parse(last); } catch { throw new Error(`indexer gave no summary (exit ${res.status}): ${(res.stderr || res.stdout || '').slice(-1500)}`); }
      if (summary.busy) { log('indexer already running (another run or the backfill); skipping this pass'); return; }
    }
    const rows = summary.indexed.map((r) => ({ rel: r.path, durationSec: r.duration, audioFlag: r.orientation,
      suggestedRole: r.speech, transcript: r.firstLine ? `"${r.firstLine}"` : '' }));
    for (const e of summary.errors) rows.push({ rel: e.path, durationSec: null, audioFlag: 'ERROR', suggestedRole: '', transcript: e.error });

    // 6. Digest email
    const table = rows.map((r) => `<tr>
      <td>${esc(r.rel)}</td><td>${fmtDur(r.durationSec)}</td>
      <td>${esc(r.audioFlag ?? '?')}</td><td>${esc(r.suggestedRole ?? '?')}</td><td>${esc(r.transcript)}</td></tr>`).join('');
    const nonVideoNote = newNonVideo.length && !firstRun
      ? `<p><b>${newNonVideo.length} new non-video file(s)</b> (photos and other files): ${esc(newNonVideo.slice(0, 12).map((f) => f.path).join(', '))}${newNonVideo.length > 12 ? ' …' : ''}</p>`
      : '';
    const html = `
      <h2>Deke Dropbox autopilot: ${rows.length} new clip(s) indexed online${summary.pending ? ` (${summary.pending} more next run)` : ''}${newNonVideo.length && !firstRun ? `, ${newNonVideo.length} new other file(s)` : ''}</h2>
      ${rows.length ? `<table border="1" cellpadding="6" cellspacing="0">
        <tr><th>clip</th><th>length</th><th>shape</th><th>speech</th><th>first line</th></tr>${table}</table>` : ''}
      ${nonVideoNote}
      <h3>Next steps (say to Claude)</h3>
      <ul>
        <li>"<b>mine the new Deke footage</b>": Claude reads the transcripts and proposes reels (source type dropbox)</li>
        <li>Footage stays in Dropbox. Reels pull only the seconds they use.</li>
      </ul>
      <p style="color:#888">Nothing was edited, packaged, posted or copied to disk. Index: engine/state/dropbox-index.json</p>`;
    await sendEmail(`[Deke autopilot] ${rows.length} new clip(s) indexed online${summary.errors.length ? `, ${summary.errors.length} failed` : ''}`, html);
    if (summary.errors.length) process.exitCode = 1;
    log(`done: ${rows.length} video(s), ${newNonVideo.length} non-video`);
  } catch (err) {
    log(`ERROR: ${err.message}`);
    await sendEmail('[Deke autopilot] RUN FAILED', `<pre>${esc(err.message)}</pre><p>Log: ${esc(LOG)}</p>`).catch(() => {});
    process.exitCode = 1;
  } finally {
    rmSync(LOCK, { force: true });
  }
}

// Anything thrown before the try block inside main() (a missing media drive,
// an unreadable config) would otherwise exit silently, the exact way this ran
// dead for a month. Catch it here so it still emails and still exits non-zero.
main().catch(async (err) => {
  log(`FATAL: ${err.message}`);
  await sendEmail('[Deke autopilot] RUN FAILED (startup)', `<pre>${esc(err.message)}</pre>`).catch(() => {});
  process.exitCode = 1;
});
