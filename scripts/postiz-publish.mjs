#!/usr/bin/env node
/**
 * postiz-publish.mjs (Deke Sharon / Total Vocal) — publishes a social content
 * pack to Postiz (hosted, api.postiz.com). Adapted from the proven
 * nataly-notes publisher; Deke-scoped, no Supabase dependency (results are
 * written back into the manifest, which is the double-post guard).
 *
 * Usage:
 *   node scripts/postiz-publish.mjs --manifest <path/to/publish-manifest.json> [--dry-run] [--draft]
 *   --draft creates Postiz DRAFTS (type:'draft') instead of scheduled posts; social-ops gap fills use this.
 *   node scripts/postiz-publish.mjs --check          # list connected Postiz channels and exit
 *
 * Env (first match wins; loaded from deke/.env.local, deke/.env, ../postiz/.env):
 *   POSTIZ_API_KEY               required (except --dry-run, which then skips mapping)
 *   POSTIZ_API_URL               optional, default https://api.postiz.com/public/v1
 *   POSTIZ_ALLOWED_ACCOUNTS      optional, default "deke,total vocal,totalvocal"
 *
 * ── Manifest format ─────────────────────────────────────────────────────────
 * Either a bare array of items, or { "packDate": "YYYY-MM-DD", "items": [...] }.
 * Each item:
 * {
 *   "platform": "instagram"|"facebook"|"x"|"tiktok"|"linkedin"|"threads"|"youtube",
 *   "text": "post caption / body text",
 *   "mediaPaths": ["path/to/reel.mp4", ...],          // video MUST be .mp4 (H.264+AAC, <=30fps, <=1920x1080)
 *   "coverPath": "path/to/cover.jpg",                 // optional — cover/thumbnail frame for
 *                                                     //   instagram + youtube video posts.
 *                                                     //   WITHOUT IT, Meta uses frame 0, which on a
 *                                                     //   fade-in reel is solid BLACK in the grid.
 *                                                     //   Generate with: node scripts/add-covers.mjs <manifest>
 *   "scheduledAtISO": "2026-07-21T14:00:00.000Z",
 *   "title": "optional — REQUIRED for youtube (2-100 chars); tiktok title (max 90)",
 *   "link": "optional — facebook link preview url",
 *   "integrationId": "optional — force a specific Postiz integration id",
 *   "settings": { optional raw overrides merged into the Postiz settings object }
 * }
 * After a real run the script writes back per item:
 *   status ('scheduled'|'skipped'|'failed'), postizPostId, integrationId, error.
 * Items that already have status 'scheduled' are never re-sent.
 *
 * ── Postiz public API shapes (docs.postiz.com/public-api, verified 2026-07-17) ──
 *   Auth:               header  Authorization: <api key>   (no "Bearer" prefix)
 *   GET  /integrations  -> [{ id, name, identifier, picture, disabled, profile }]
 *   POST /upload        multipart field "file" -> { id, name, path, ... }
 *   POST /posts         { type:'schedule', date:ISO, shortLink:false, tags:[],
 *                         posts:[{ integration:{id}, value:[{content, image:[{id,path}]}],
 *                                  settings:{ __type:<identifier>, ... } }] }
 *                       -> [{ postId, integration }]
 *   RATE LIMIT: budget 30 requests/hour (docs are inconsistent, 30 is the safe
 *   floor). Items sharing the same scheduledAtISO are bundled into ONE
 *   POST /posts call across all their channels to conserve the budget.
 *
 * Fail-loud policy: any missing env, API error, or unpublishable item causes a
 * non-zero exit with a clear message. Items on unconnected channels are skipped
 * with a warning (this alone does not fail the run).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Tiny .env loader (no dotenv dependency; existing process.env wins) ───────
async function loadEnvFile(file) {
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
await loadEnvFile(path.join(REPO_ROOT, '.env.local'));
await loadEnvFile(path.join(REPO_ROOT, '.env'));
await loadEnvFile(path.join(REPO_ROOT, '..', 'postiz', '.env'));

const API_KEY = process.env.POSTIZ_API_KEY;
const API_URL = (process.env.POSTIZ_API_URL || 'https://api.postiz.com/public/v1').replace(/\/+$/, '');

// The Postiz workspace also hosts channels for OTHER clients (e.g. Nataly).
// Only channels whose account name/profile matches one of these substrings may
// ever receive a Deke post.
const ALLOWED_ACCOUNTS = (process.env.POSTIZ_ALLOWED_ACCOUNTS || 'deke,total vocal,totalvocal')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function accountAllowed(i) {
  const hay = `${i.name || ''} ${i.profile || ''}`.toLowerCase();
  return ALLOWED_ACCOUNTS.some((a) => hay.includes(a));
}

const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'x', 'tiktok', 'linkedin', 'threads', 'youtube', 'skool'];
// Manifest platform -> Postiz integration identifiers that satisfy it.
const PLATFORM_IDENTIFIERS = {
  instagram: ['instagram', 'instagram-standalone'],
  facebook: ['facebook'],
  x: ['x'],
  tiktok: ['tiktok'],
  linkedin: ['linkedin', 'linkedin-page'],
  threads: ['threads'],
  youtube: ['youtube'],
  skool: ['skool'],
};

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
};
const VIDEO_EXTS_REJECTED = ['.mov', '.mkv', '.avi', '.webm', '.m4v'];

const log = (msg) => console.error(`[postiz-publish] ${msg}`);
function fail(message) {
  console.error(`[postiz-publish] ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { dryRun: false, draft: false, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest') args.manifest = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--draft') args.draft = true;
    else if (argv[i] === '--check') args.check = true;
    else fail(`Unknown argument: ${argv[i]}\nUsage: node scripts/postiz-publish.mjs --manifest <path> [--dry-run] [--draft] | --check`);
  }
  return args;
}

// ── Postiz HTTP helpers ───────────────────────────────────────────────────────

async function postizFetch(pathname, options = {}, { retried = false } = {}) {
  const url = `${API_URL}${pathname}`;
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: { Authorization: API_KEY, ...(options.headers || {}) },
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err.message}`);
  }

  const rawText = await res.text();

  // Retry once on rate limit / server errors.
  if ((res.status === 429 || res.status >= 500) && !retried) {
    const retryAfter = Number(res.headers.get('retry-after')) || 10;
    log(`WARNING: ${res.status} from ${pathname}, retrying once in ${retryAfter}s... raw: ${rawText.slice(0, 500)}`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return postizFetch(pathname, options, { retried: true });
  }

  if (!res.ok) {
    throw new Error(`Postiz API ${res.status} on ${pathname}: ${rawText.slice(0, 1000) || '(empty body)'}`);
  }

  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`Postiz API returned non-JSON from ${pathname}: ${rawText.slice(0, 1000)}`);
  }
}

async function listIntegrations() {
  const body = await postizFetch('/integrations');
  const list = Array.isArray(body) ? body : Array.isArray(body?.integrations) ? body.integrations : null;
  if (!list) {
    throw new Error(`Unexpected GET /integrations response shape. Raw: ${JSON.stringify(body).slice(0, 1000)}`);
  }
  return list;
}

async function uploadMedia(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (VIDEO_EXTS_REJECTED.includes(ext)) {
    throw new Error(
      `${path.basename(absPath)}: Postiz accepts MP4 video only (H.264+AAC, <=30fps, <=1920x1080). ` +
        `Re-encode first: ffmpeg -i in${ext} -c:v h264_nvenc -pix_fmt yuv420p -r 30 -c:a aac out.mp4`
    );
  }
  const buf = await fs.readFile(absPath);
  const form = new FormData();
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
  form.append('file', new Blob([buf], { type: mime }), path.basename(absPath));
  const body = await postizFetch('/upload', { method: 'POST', body: form });
  if (!body?.id || !body?.path) {
    throw new Error(`Unexpected POST /upload response for ${absPath}. Raw: ${JSON.stringify(body).slice(0, 1000)}`);
  }
  return { id: body.id, path: body.path };
}

// ── Platform mapping / settings ──────────────────────────────────────────────

function pickIntegration(item, integrations) {
  if (item.integrationId) {
    const forced = integrations.find((i) => i.id === item.integrationId);
    if (!forced) throw new Error(`integrationId "${item.integrationId}" not found among connected channels`);
    if (!accountAllowed(forced)) {
      throw new Error(
        `integrationId "${item.integrationId}" belongs to account "${forced.name}" which does not match ` +
          `POSTIZ_ALLOWED_ACCOUNTS (${ALLOWED_ACCOUNTS.join(', ')}) — refusing to publish to a foreign account`
      );
    }
    return forced;
  }
  const wanted = PLATFORM_IDENTIFIERS[item.platform] || [];
  const allCandidates = integrations.filter((i) => wanted.includes(i.identifier) && !i.disabled);
  const candidates = allCandidates.filter(accountAllowed);
  if (candidates.length === 0) {
    if (allCandidates.length > 0) {
      log(
        `WARNING: "${item.platform}" channel(s) exist (${allCandidates
          .map((c) => `${c.identifier}:${c.name}`)
          .join(', ')}) but none match POSTIZ_ALLOWED_ACCOUNTS (${ALLOWED_ACCOUNTS.join(', ')}) — skipping, NOT posting to a foreign account.`
      );
    }
    return null;
  }
  if (candidates.length > 1) {
    log(
      `WARNING: multiple connected "${item.platform}" channels (${candidates
        .map((c) => `${c.identifier}:${c.name}`)
        .join(', ')}); using the first. Set item.integrationId to override.`
    );
  }
  return candidates[0];
}

/**
 * Settings shapes verified against docs.postiz.com/public-api (2026-07-17).
 * item.settings is merged LAST — anything unusual can be overridden per item.
 */
function buildSettings(item, identifier) {
  let settings;
  switch (identifier) {
    case 'instagram':
    case 'instagram-standalone':
      // A video "post" publishes as a Reel via Meta's API (no separate reel enum).
      //
      // COVER FRAME: Meta defaults a Reel's cover to frame 0. Several of our reels open on
      // a fade-in from black (croappella-beatboxer measures YAVG=16 at t=0 — pure black in
      // video range — reaching full brightness only at t=0.5s), which publishes a solid
      // black thumbnail into the grid. item.coverPath (set by add-covers.mjs, or by hand)
      // is uploaded and passed as the cover so the grid shows a real frame.
      settings = {
        __type: identifier,
        post_type: 'post',
        ...(item.__coverUploaded ? { thumbnail: item.__coverUploaded } : {}),
      };
      break;
    case 'facebook':
      settings = { __type: 'facebook', ...(item.link ? { url: item.link } : {}) };
      break;
    case 'x':
      // X rejects >280 chars at publish time with an opaque "post is too long".
      // Fail here instead so --dry-run catches it.
      if ((item.text || '').length > 280) {
        throw new Error(
          `x post is ${item.text.length} chars — limit is 280. Trim item.text.`
        );
      }
      settings = { __type: 'x', who_can_reply_post: 'everyone' };
      break;
    case 'tiktok':
      // Full block is REQUIRED. DIRECT_POST publishes immediately at the
      // scheduled time; "UPLOAD" would only send a draft to Deke's TikTok inbox.
      settings = {
        __type: 'tiktok',
        privacy_level: 'PUBLIC_TO_EVERYONE',
        duet: true,
        stitch: true,
        comment: true,
        // Postiz validates this as the STRING 'yes'/'no', not a boolean.
        // (API changed after the 2026-07-17 verification; a boolean now 400s
        // with: settings.autoAddMusic must be one of the following values: yes, no)
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false,
        content_posting_method: 'DIRECT_POST',
        ...(item.title ? { title: String(item.title).slice(0, 90) } : {}),
      };
      break;
    case 'youtube': {
      if (!item.title || String(item.title).trim().length < 2) {
        throw new Error('youtube requires item.title (2-100 chars)');
      }
      // Portrait <=1080x1920 video becomes a Short automatically.
      settings = {
        __type: 'youtube',
        title: String(item.title).slice(0, 100),
        type: 'public',
        ...(item.tags ? { tags: item.tags } : {}),
        // Custom Shorts thumbnail, same rationale as Instagram above.
        ...(item.__coverUploaded ? { thumbnail: item.__coverUploaded } : {}),
      };
      break;
    }
    case 'linkedin':
    case 'linkedin-page':
      settings = { __type: identifier };
      break;
    case 'threads':
      settings = { __type: 'threads' };
      break;
    case 'skool':
      // Skool community post. Optional item.title becomes the post's title line.
      settings = { __type: 'skool', ...(item.title ? { title: String(item.title).slice(0, 100) } : {}) };
      break;
    default:
      log(`WARNING: no settings recipe for identifier "${identifier}", sending { __type } only.`);
      settings = { __type: identifier };
  }
  return { ...settings, ...(item.settings || {}) };
}

// ── Manifest handling ─────────────────────────────────────────────────────────

async function loadManifest(manifestPath) {
  const abs = path.resolve(manifestPath);
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(abs, 'utf8'));
  } catch (err) {
    fail(`Cannot read manifest "${manifestPath}": ${err.message}`);
  }
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items) || items.length === 0) {
    fail('Manifest must be a non-empty array of items, or an object with a non-empty "items" array.');
  }
  return { abs, root: parsed, items };
}

async function resolveMediaPath(rel, manifestDir) {
  const candidates = path.isAbsolute(rel)
    ? [rel]
    : [path.resolve(manifestDir, rel), path.resolve(REPO_ROOT, rel), path.resolve(process.cwd(), rel)];
  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Media file not found: "${rel}" (tried: ${candidates.join(' | ')})`);
}

function validateItem(item, index) {
  const errors = [];
  const tag = `item ${index + 1}`;
  if (!SUPPORTED_PLATFORMS.includes(item.platform)) {
    errors.push(`${tag}: unsupported platform "${item.platform}" (supported: ${SUPPORTED_PLATFORMS.join(', ')})`);
  }
  if (!item.text || !String(item.text).trim()) errors.push(`${tag}: "text" is required`);
  if (!item.scheduledAtISO || Number.isNaN(Date.parse(item.scheduledAtISO))) {
    errors.push(`${tag}: "scheduledAtISO" missing or not a parseable date (got "${item.scheduledAtISO}")`);
  }
  if (item.mediaPaths != null && !Array.isArray(item.mediaPaths)) {
    errors.push(`${tag}: "mediaPaths" must be an array when present`);
  }
  if (item.platform === 'youtube' && (!item.title || String(item.title).trim().length < 2)) {
    errors.push(`${tag}: youtube requires "title" (2-100 chars)`);
  }
  return errors;
}

// ── Modes ─────────────────────────────────────────────────────────────────────

async function runCheck() {
  if (!API_KEY) fail('POSTIZ_API_KEY is not set — cannot list integrations.');
  const integrations = await listIntegrations();
  const channels = integrations.map((i) => ({
    id: i.id,
    identifier: i.identifier,
    name: i.name,
    profile: i.profile ?? null,
    disabled: Boolean(i.disabled),
    eligible: accountAllowed(i),
  }));
  for (const c of channels) {
    log(
      `channel: ${c.identifier.padEnd(22)} ${c.name}${c.disabled ? '  (DISABLED)' : ''}${
        c.eligible ? '' : '  (FOREIGN ACCOUNT — will never be used)'
      }  [${c.id}]`
    );
  }
  const connected = new Set(channels.filter((c) => !c.disabled && c.eligible).map((c) => c.identifier));
  const coverage = Object.fromEntries(
    SUPPORTED_PLATFORMS.map((p) => [p, PLATFORM_IDENTIFIERS[p].some((id) => connected.has(id))])
  );
  console.log(JSON.stringify({ ok: true, apiUrl: API_URL, channels, platformCoverage: coverage }, null, 2));
}

async function runDry(manifestPath) {
  const { abs, root, items } = await loadManifest(manifestPath);
  const manifestDir = path.dirname(abs);

  let integrations = null;
  if (API_KEY) {
    try {
      integrations = await listIntegrations();
    } catch (err) {
      log(`WARNING: could not list integrations for dry-run mapping: ${err.message}`);
    }
  } else {
    log('DRY RUN without POSTIZ_API_KEY — integration mapping skipped (set the key for a full preview).');
  }

  const errors = [];
  const plan = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemErrors = validateItem(item, i);

    const media = [];
    for (const rel of item.mediaPaths || []) {
      try {
        const absMedia = await resolveMediaPath(rel, manifestDir);
        const ext = path.extname(absMedia).toLowerCase();
        if (VIDEO_EXTS_REJECTED.includes(ext)) {
          itemErrors.push(`item ${i + 1}: "${path.basename(absMedia)}" is not MP4 — Postiz accepts MP4 video only`);
        }
        media.push(absMedia);
      } catch (err) {
        itemErrors.push(`item ${i + 1}: ${err.message}`);
      }
    }

    let integration = null;
    if (integrations && itemErrors.length === 0) {
      try {
        integration = pickIntegration(item, integrations);
        if (!integration) itemErrors.push(`item ${i + 1}: WOULD SKIP — no connected "${item.platform}" channel`);
        else buildSettings(item, integration.identifier); // surface settings problems now
      } catch (err) {
        itemErrors.push(`item ${i + 1}: ${err.message}`);
      }
    }

    errors.push(...itemErrors.filter((e) => !e.includes('WOULD SKIP')));
    plan.push({
      index: i + 1,
      platform: item.platform,
      scheduledAt: item.scheduledAtISO ?? null,
      alreadyScheduled: item.status === 'scheduled',
      title: item.title ?? null,
      media,
      integration: integration ? { id: integration.id, identifier: integration.identifier, name: integration.name } : null,
      problems: itemErrors,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0,
        dryRun: true,
        apiUrl: API_URL,
        integrationMapping: integrations ? 'live' : 'skipped (no POSTIZ_API_KEY)',
        items: plan,
        errors,
      },
      null,
      2
    )
  );
  if (errors.length > 0) {
    fail(`Dry run found ${errors.length} problem(s) — see "errors" above.`);
  }
}

async function runPublish(manifestPath, { asDraft = false } = {}) {
  if (!API_KEY) fail('POSTIZ_API_KEY is not set. Aborting before any post is created.');

  const { abs, root, items } = await loadManifest(manifestPath);
  const manifestDir = path.dirname(abs);
  log(`items: ${items.length} | api: ${API_URL}`);

  // Validate everything up-front so we fail before creating any post.
  const pending = items.filter((it) => it.status !== 'scheduled' && it.status !== 'drafted');
  const skippedDone = items.length - pending.length;
  if (skippedDone > 0) log(`${skippedDone} item(s) already scheduled in a previous run — leaving untouched.`);
  const preErrors = pending.flatMap((item) => validateItem(item, items.indexOf(item)));
  if (preErrors.length > 0) {
    fail(`Manifest validation failed:\n  - ${preErrors.join('\n  - ')}`);
  }

  const integrations = await listIntegrations();
  log(`connected channels: ${integrations.map((i) => `${i.identifier}(${i.name})`).join(', ') || 'NONE'}`);

  const uploadCache = new Map(); // absolute media path -> { id, path }
  const summary = { scheduled: 0, skipped: 0, failed: 0 };

  // Bundle items sharing the same scheduledAtISO into ONE POST /posts call —
  // the create-post rate limit is per REQUEST (budget: 30/hour), not per post.
  const groups = new Map();
  for (const item of pending) {
    const key = new Date(item.scheduledAtISO).toISOString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const groupKeys = [...groups.keys()].sort();

  for (let g = 0; g < groupKeys.length; g++) {
    const scheduledAt = groupKeys[g];
    const groupItems = groups.get(scheduledAt);
    const posts = [];
    const postItems = []; // parallel to posts[]

    for (const item of groupItems) {
      const tag = `[${item.platform} @ ${scheduledAt}]`;
      delete item.error;
      try {
        const integration = pickIntegration(item, integrations);
        if (!integration) {
          item.status = 'skipped';
          item.error = `channel "${item.platform}" not connected in Postiz`;
          summary.skipped++;
          log(`WARNING: ${tag} SKIPPED — ${item.error}`);
          continue;
        }
        // Cover/thumbnail must be uploaded BEFORE buildSettings so the platform recipe can
        // reference it. Only meaningful for video posts on platforms that accept a cover.
        if (item.coverPath) {
          const absCover = await resolveMediaPath(item.coverPath, manifestDir);
          if (!uploadCache.has(absCover)) {
            log(`${tag} uploading cover ${path.basename(absCover)}...`);
            uploadCache.set(absCover, await uploadMedia(absCover));
          }
          const c = uploadCache.get(absCover);
          item.__coverUploaded = { id: c.id, path: c.path };
        }

        const settings = buildSettings(item, integration.identifier);
        const images = [];
        for (const rel of item.mediaPaths || []) {
          const absMedia = await resolveMediaPath(rel, manifestDir);
          if (!uploadCache.has(absMedia)) {
            log(`${tag} uploading ${path.basename(absMedia)}...`);
            uploadCache.set(absMedia, await uploadMedia(absMedia));
          }
          images.push(uploadCache.get(absMedia));
        }
        posts.push({
          integration: { id: integration.id },
          value: [{ content: String(item.text), image: images.map((m) => ({ id: m.id, path: m.path })) }],
          settings,
        });
        item.integrationId = integration.id;
        postItems.push(item);
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
        summary.failed++;
        log(`ERROR: ${tag} FAILED before send — ${err.message}`);
      }
    }

    if (posts.length === 0) continue;

    const payload = { type: asDraft ? 'draft' : 'schedule', date: scheduledAt, shortLink: false, tags: [], posts };
    log(`creating ${posts.length} ${asDraft ? 'DRAFT' : 'scheduled'} post(s) for ${scheduledAt} in one request...`);
    try {
      const body = await postizFetch('/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Documented: [{ postId, integration }] — map back by integration id, fall back to order.
      const results = Array.isArray(body) ? body : [body];
      postItems.forEach((item, idx) => {
        const match =
          results.find((r) => r?.integration === item.integrationId || r?.integration?.id === item.integrationId) ??
          results[idx];
        item.status = asDraft ? 'drafted' : 'scheduled';
        item.postizPostId = match?.postId ?? match?.id ?? null;
        summary.scheduled++;
        if (!item.postizPostId) {
          log(`WARNING: [${item.platform}] post created but id not found in response. Raw: ${JSON.stringify(body).slice(0, 500)}`);
        }
      });
    } catch (err) {
      for (const item of postItems) {
        item.status = 'failed';
        item.error = err.message;
        summary.failed++;
      }
      log(`ERROR: request for ${scheduledAt} FAILED — ${err.message}`);
    }

    // Stay well under the 30 req/h budget across many groups.
    if (g < groupKeys.length - 1) await new Promise((r) => setTimeout(r, 2000));
  }

  // Write results back into the manifest (same root shape it came with) —
  // this is the double-post guard for re-runs.
  await fs.writeFile(abs, `${JSON.stringify(root, null, 2)}\n`, 'utf8');
  log(`results written back to ${abs}`);

  const output = {
    ok: summary.failed === 0,
    dryRun: false,
    apiUrl: API_URL,
    manifest: abs,
    counts: { total: items.length, alreadyScheduled: skippedDone, ...summary },
    items: items.map((item, i) => ({
      index: i + 1,
      platform: item.platform,
      status: item.status ?? null,
      postizPostId: item.postizPostId ?? null,
      integrationId: item.integrationId ?? null,
      error: item.error ?? null,
    })),
  };
  console.log(JSON.stringify(output, null, 2));

  if (!output.ok) {
    fail(`${summary.failed} item(s) failed. Fix and re-run — already-scheduled items will not double-post.`);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
if (args.check) {
  await runCheck();
} else if (args.manifest) {
  if (args.dryRun) await runDry(args.manifest);
  else await runPublish(args.manifest, { asDraft: args.draft });
} else {
  fail('Usage: node scripts/postiz-publish.mjs --manifest <path> [--dry-run] | --check');
}
