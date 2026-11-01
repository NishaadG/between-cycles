// Snapshot real products and their ingredient lists from Open Beauty Facts
// (https://world.openbeautyfacts.org, Open Database License) into
// src/data/products.json. The app runs its cited ingredient rules over this
// snapshot; nothing is fetched at runtime.
//
//   node scripts/fetch-products.mjs
//
// The search API allows 10 requests a minute, so this takes a few minutes.

import { writeFile } from "node:fs/promises";

const UA = "BetweenCycles/0.1 (+https://github.com/NishaadG/between-cycles)";
const CATEGORIES = [
  { id: "face-creams", label: "Face creams" },
  { id: "body-creams", label: "Body creams" },
  { id: "body-milks", label: "Body lotions" },
  { id: "hand-creams", label: "Hand creams" },
  { id: "lip-balms", label: "Lip balms" },
  { id: "sunscreens", label: "Sunscreens" },
  { id: "cleansers", label: "Cleansers" },
  { id: "shower-gels", label: "Shower gels" },
];
const PAGES = 3;
const FIELDS = "code,product_name,product_name_en,brands,ingredients_text_en,ingredients_text,image_front_small_url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// INCI lists are Latin-script and comma-separated; skip anything that
// doesn't look like one (missing, free text, other scripts).
function usableIngredients(p) {
  const text = (p.ingredients_text_en || p.ingredients_text || "").replace(/\s+/g, " ").trim();
  if (text.length < 40) return null;
  if (text.split(/[,;]/).length < 5) return null;
  const ascii = [...text].filter((c) => c.charCodeAt(0) < 128).length / text.length;
  return ascii > 0.95 ? text : null;
}

const out = [];
const seen = new Set();
for (const cat of CATEGORIES) {
  let kept = 0;
  for (let page = 1; page <= PAGES; page++) {
    const url = `https://world.openbeautyfacts.org/api/v2/search?categories_tags_en=${cat.id}&fields=${FIELDS}&page_size=100&page=${page}&sort_by=unique_scans_n`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.error(cat.id, page, res.status);
      await sleep(10_000);
      continue;
    }
    const json = await res.json();
    for (const p of json.products ?? []) {
      const ingredients = usableIngredients(p);
      const name = (p.product_name_en || p.product_name || "").trim();
      if (!ingredients || !name || !p.code) continue;
      const key = `${name.toLowerCase()}|${(p.brands || "").toLowerCase()}`;
      if (seen.has(key) || seen.has(p.code)) continue;
      seen.add(key);
      seen.add(p.code);
      out.push({
        code: p.code,
        name: name.slice(0, 120),
        brand: (p.brands || "").split(",")[0].trim().slice(0, 60),
        category: cat.id,
        ingredients: ingredients.slice(0, 3000),
        image: p.image_front_small_url || undefined,
      });
      kept++;
    }
    if ((json.products ?? []).length < 100) break;
    await sleep(6500);
  }
  console.log(`${cat.label}: ${kept}`);
  await sleep(6500);
}

const snapshot = {
  source: "Open Beauty Facts",
  license: "Open Database License (ODbL) 1.0",
  url: "https://world.openbeautyfacts.org",
  fetchedAt: new Date().toISOString().slice(0, 10),
  categories: CATEGORIES,
  products: out,
};
await writeFile(new URL("../src/data/products.json", import.meta.url), JSON.stringify(snapshot));
console.log(`total ${out.length}`);
