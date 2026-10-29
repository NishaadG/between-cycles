// Test-retest run: sends sets of photos taken minutes apart (skin unchanged)
// through the running app's /api/skin endpoint and reports, per concern,
// the within-person SD and the resulting 95% minimal detectable change.
//
// Usage: node scripts/repeatability.mjs <folder> [<folder> ...]
// Each folder is one session; put a conditions.txt inside to describe it.
// Results are written to src/data/repeatability.json.

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const API = process.env.APP_URL || "http://localhost:3210";
const WATCHED = ["redness", "acne", "moisture", "age_spot"];
const ALL = [...WATCHED, "texture", "oiliness", "radiance", "dark_circle_v2"];

const sd = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};
const r1 = (x) => Math.round(x * 10) / 10;

async function analyze(file) {
  // Same preparation as the app: upright, long side 1600, JPEG.
  const jpeg = await sharp(await readFile(file)).rotate().resize(1600, 1600, { fit: "inside" }).jpeg({ quality: 92 }).toBuffer();
  const form = new FormData();
  form.append("photo", new Blob([jpeg], { type: "image/jpeg" }), "scan.jpg");
  const res = await fetch(`${API}/api/skin`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path.basename(file)}: ${json.error?.code} ${json.error?.message}`);
  if (json.mode !== "live") throw new Error("API is in offline mode; set YOUCAM_API_KEY first.");
  return json.concerns;
}

const sessions = [];
for (const dir of process.argv.slice(2)) {
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  const conditions = await readFile(path.join(dir, "conditions.txt"), "utf8").then((s) => s.trim()).catch(() => "");
  const levels = [];
  for (const f of files) {
    try {
      const c = await analyze(path.join(dir, f));
      levels.push(Object.fromEntries(ALL.map((id) => [id, c[id]?.level])));
      console.log(`${path.basename(dir)}/${f}`, WATCHED.map((id) => `${id}=${c[id]?.level}`).join(" "));
    } catch (e) {
      console.error("skipped:", e.message);
    }
  }
  if (levels.length < 2) continue;
  const sdOf = Object.fromEntries(ALL.map((id) => [id, r1(sd(levels.map((l) => l[id])))]));
  const mdcOf = Object.fromEntries(ALL.map((id) => [id, r1(1.96 * Math.SQRT2 * sdOf[id])]));
  sessions.push({ label: path.basename(dir), n: levels.length, conditions, sd: sdOf, mdc: mdcOf, levels });
}

await writeFile(
  "src/data/repeatability.json",
  JSON.stringify({ status: "measured", measuredAt: new Date().toISOString().slice(0, 10), sessions }, null, 2) + "\n",
);
console.table(sessions.map((s) => ({ session: s.label, n: s.n, ...Object.fromEntries(WATCHED.map((id) => [id, `${s.sd[id]} / ${s.mdc[id]}`])) })));
