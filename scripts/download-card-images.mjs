// One-off backup script: download every card image referenced in src/data/cards.json
// into src/data/images/<filename> and rewrite the JSON to point at the local folder.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const JSON_PATH = path.join(ROOT, 'src', 'data', 'cards.json');
const IMAGES_DIR = path.join(ROOT, 'src', 'data', 'images');
const CONCURRENCY = 8;
const MAX_RETRIES = 5;

fs.mkdirSync(IMAGES_DIR, { recursive: true });

const cards = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

// Collect every card that still points at a remote URL.
const jobs = [];
for (const card of cards) {
  const img = card.image;
  if (typeof img !== 'string' || !/^https?:\/\//.test(img)) continue;
  const filename = img.split('/').pop().split('?')[0];
  jobs.push({ card, url: img, filename, dest: path.join(IMAGES_DIR, filename) });
}

console.log(`Total remote images to download: ${jobs.length}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(job) {
  // Skip if already present and non-empty (idempotent / resumable).
  if (fs.existsSync(job.dest) && fs.statSync(job.dest).size > 0) {
    return { ...job, status: 'cached', size: fs.statSync(job.dest).size };
  }
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(job.url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error('empty body');
      fs.writeFileSync(job.dest, buf);
      return { ...job, status: 'ok', size: buf.length };
    } catch (err) {
      lastErr = err;
      await sleep(attempt * 1000);
    }
  }
  return { ...job, status: 'failed', error: lastErr?.message };
}

const results = [];
let idx = 0;
async function worker() {
  while (idx < jobs.length) {
    const my = idx++;
    const r = await download(jobs[my]);
    results.push(r);
    const done = results.length;
    if (done % 50 === 0 || r.status === 'failed') {
      console.log(`[${done}/${jobs.length}] ${r.status.padEnd(7)} ${r.filename}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const failed = results.filter((r) => r.status === 'failed');
const ok = results.filter((r) => r.status === 'ok' || r.status === 'cached');
console.log(`\nDownloaded/cached: ${ok.length}  Failed: ${failed.length}`);
if (failed.length) {
  console.log('FAILED URLS:');
  for (const f of failed) console.log(`  ${f.url}  -> ${f.error}`);
  process.exit(1); // do not rewrite JSON if anything is missing
}

// All good — rewrite cards.json to point at the local images folder.
for (const card of cards) {
  if (typeof card.image === 'string' && /^https?:\/\//.test(card.image)) {
    const filename = card.image.split('/').pop().split('?')[0];
    card.image = `/images/${filename}`;
  }
}
fs.writeFileSync(JSON_PATH, JSON.stringify(cards, null, 2) + '\n');
console.log('cards.json rewritten -> image fields now point to images/<filename>');
