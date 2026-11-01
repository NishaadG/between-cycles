// Benchmark for "snap the ingredient list": sends real ingredient-panel
// photos from Open Beauty Facts through this app's /api/label route and
// records what came back next to the human transcription on Open Beauty
// Facts. Accuracy is computed from the saved file by the method page and
// the unit tests, with the same parser and rules the app uses.
//
//   npm run build && npx next start -p 3211
//   node scripts/label-bench.mjs http://localhost:3211 12
//
// Photos are not stored, only product codes, transcriptions and timings.

import { writeFile } from "node:fs/promises";

const base = process.argv[2] || "http://localhost:3211";
const want = Number(process.argv[3] || 12);
const UA = "BetweenCycles/0.1 (+https://github.com/NishaadG/between-cycles)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const latin = (t) => [...t].every((c) => c.charCodeAt(0) < 128);

async function json(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Popular products that have both an English ingredient transcription and
// a photo of the ingredient panel.
const candidates = [];
for (const cat of ["face-creams", "hand-creams", "sunscreens", "body-creams"]) {
  const s = await json(
    `https://world.openbeautyfacts.org/api/v2/search?categories_tags_en=${cat}&fields=code,product_name,ingredients_text_en&page_size=60&sort_by=unique_scans_n`,
  );
  for (const p of s.products ?? []) {
    const t = (p.ingredients_text_en || "").trim();
    if (t.length > 80 && t.split(",").length >= 8 && latin(t)) candidates.push({ ...p, category: cat });
  }
  await sleep(7000);
}

const results = [];
for (const c of candidates) {
  if (results.length >= want) break;
  const p = (await json(`https://world.openbeautyfacts.org/api/v2/product/${c.code}?fields=image_ingredients_url`)).product;
  await sleep(700);
  if (!p?.image_ingredients_url) continue;
  const imgUrl = p.image_ingredients_url.replace(/\.\d+\.jpg$/, ".full.jpg");
  const img = await fetch(imgUrl, { headers: { "User-Agent": UA } });
  if (!img.ok) continue;
  const form = new FormData();
  form.append("photo", new Blob([await img.arrayBuffer()], { type: "image/jpeg" }), "label.jpg");
  const t0 = Date.now();
  const res = await fetch(`${base}/api/label`, { method: "POST", body: form });
  const ms = Date.now() - t0;
  const body = await res.json().catch(() => ({}));
  results.push({
    code: c.code,
    name: c.product_name,
    category: c.category,
    truth: c.ingredients_text_en,
    read: res.ok ? (body.ingredients ?? []).join(", ") : "",
    legible: res.ok ? !!body.legible : false,
    error: res.ok ? undefined : body.error?.code ?? `http_${res.status}`,
    ms,
  });
  console.log(results.length, c.code, res.status, `${ms} ms`, (body.ingredients ?? []).length, "ingredients");
}

await writeFile(
  new URL("../src/data/label-bench.json", import.meta.url),
  JSON.stringify({ ranAt: new Date().toISOString().slice(0, 10), source: "Open Beauty Facts (ODbL)", results }, null, 1),
);
console.log(`saved ${results.length}`);
