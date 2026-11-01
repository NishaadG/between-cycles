# Between Cycles

**Know when your skin is really changing.** A skin companion for people going through cancer treatment.

About 9 in 10 people on EGFR-targeted cancer therapy get a skin reaction, usually starting in weeks 1–3 and peaking in weeks 3–4, mostly on the face. Other chemotherapy drugs cause dryness and darker patches, and many cause hair loss. Patients are told to "report any changes", but they are rarely given a way to measure them.

Between Cycles turns a phone selfie into a measurement, compares it with the person's **own** baseline, ignores normal photo-to-photo noise, and produces a one-page summary to show the care team.

## What it does

| | |
|---|---|
| **Baseline** | Three scans before treatment set the person's normal and measure how much their scores move between photos when nothing has changed. |
| **Check-ins** | Each scan is compared with the baseline. A change is flagged only when it is bigger than the person's own measurement noise (95% minimal detectable change). |
| **Symptoms** | Each check-in asks about things a photo can't see (fever, blisters, signs of infection, pain). Any of these switches the app to "Contact your care team today", whatever the scores say. |
| **Care-team report** | A printable page with the change table, charts across treatment cycles, baseline vs latest photos with detection overlays, recent symptoms and questions to ask. |
| **Skin-tone honesty** | Skin type (Fitzpatrick I–VI) is measured once from the first baseline photo. Redness is harder to see on deeper skin, so for types V–VI every result says plainly that a steady redness score doesn't rule out a rash and that symptoms count as much as the photo. |
| **Product check** | Photograph the ingredient list (a vision model transcribes it, the person checks it) or paste it. Ten fixed rules, each citing published patient guidance (NHS, Macmillan, MASCC, U.S. Pharmacist), flag what to avoid, what to ask about and what helps. No AI guessing. |
| **Treatment-friendly picks** | The same rules run over 1,033 real products from Open Beauty Facts, so patients can browse products with nothing on the watch-list, by category. |
| **Picked for your skin today** | After each check-in, what changed is mapped to what patient guidance says helps (more bumps or redness → a gentle soap-free cleanser; dryness → a moisturiser with hydrating ingredients; darker patches → daily SPF), and filled with real products that pass every rule. Hidden when the advice is to call the care team. No sponsored placements. |
| **Shelf check** | For pharmacies, hospital shops and retailers: the catalogue audit by category, and a tool to audit your own range (paste `name \| ingredients`, download CSV). |
| **Shop badge and API** | A two-line embed that puts "Gentle during treatment", "Ask your care team first" or "Not advised during treatment" on any product page, with reasons and sources one tap away, plus a keyless public endpoint for whole catalogues. Demo shop page at `/shelf/store`. |
| **Hair check** | Hair density measured each cycle from a head-lowered photo and charted against the person's starting point, useful alongside scalp cooling. |
| **Reminders and framing** | A calendar file adds repeating check-in reminders with no account. During capture, the first baseline photo is shown faintly over the camera so every scan is framed the same way. |
| **Hair prep** | Preview shorter hairstyles, or no hair at all, on your own face before hair loss begins, plus hats. |
| **Private** | No accounts. Photos and history stay in the browser (IndexedDB). The server only relays a photo to the analysis API and keeps nothing. |

## How the YouCam API is used

| API | Endpoint | Used for |
|---|---|---|
| AI Skin Analysis (SD) | `POST /s2s/v2.0/task/skin-analysis` | 8 concerns per scan: redness, acne, moisture, age spots (tracked), plus texture, oiliness, radiance, dark circles. Raw scores and per-concern detection masks. |
| AI Fitzpatrick Skin Type | `POST /s2s/v2.0/task/fitzpatrick-scale-analyzer` | Once per person, on the first baseline photo, to decide whether redness readings carry a reliability note. |
| AI Hair Density Detection | `POST /s2s/v2.0/task/hair-density-detection` | Hair density level and score per hair check, charted across cycles. |
| AI Hairstyle Generator | `POST /s2s/v2.1/task/hair-transfer`, `GET /s2s/v2.1/task/template/hair-transfer` | Face-preserving previews of shorter styles and a no-hair preview. |
| AI Hat Try-On | `POST /s2s/v2.0/task/hat` | Styled previews with a hat or beanie. |
| File API, Unit API | `POST /s2s/v2.0/file`, `GET /s2s/v1.0/client/credit` | Uploads; protecting the unit balance on the public demo. |

All calls run server-side (`src/lib/youcam.ts`): register file → upload to the pre-signed URL → create task → poll with back-off. Result images are downloaded and resized immediately because their URLs expire.

**Why `raw_score`, not `ui_score`:** the vendor documents the UI score as adjusted upward to be encouraging. That is right for a beauty app and wrong for tracking change, so the app uses raw scores and shows `level = 100 − raw_score` (higher means more visible).

## For shops: the badge

```html
<div data-gentle-badge data-ingredients-from="#ingredients"></div>
<script src="https://between-cycles.vercel.app/badge.js" async></script>
```

The script reads the ingredient list already on the page and draws the badge in a shadow DOM, so it can't clash with the shop's styles. Only the public ingredient text is sent: no key, no cookies, no tracking. For catalogues, call the API directly:

```
GET  /api/check?ingredients=Aqua,%20Glycerin,%20Parfum
POST /api/check   {"ingredients": "Aqua, Glycerin, Parfum"}
→ { verdict: "ok" | "caution" | "avoid", label, summary, flags: [{ name, reason, matched, sources }], helpful }
```

It is open to any origin and cached at the edge. The logic is `src/lib/badge.ts`; the rules are the same ten the app uses.

## The measurement method

```
SEM   = within-person SD of the baseline scans
MDC95 = 1.96 × √2 × SEM            (minimum 3 points)
flag  = |latest − baseline mean| > MDC95
```

This is the minimal detectable change from test–retest reliability studies: a difference larger than MDC95 is unlikely (< 5%) to be noise alone. Noisier concerns automatically get wider bands. The logic lives in `src/lib/stats.ts` and is unit-tested.

Repeatability measurements from real repeated selfies are published on the in-app **How it works** page (`/method`) and in `src/data/repeatability.json`, produced by `scripts/repeatability.mjs`.

## What we measured

| | Result |
|---|---|
| **Label reading** | 12 real photos filed as ingredient panels on Open Beauty Facts, sent through the app's `/api/label`. On all 11 that showed an ingredient list, the rules reached the **same verdict and flags** as on the human transcription. 92% of listed ingredients recovered on average, 93% precision, median **2.6 s**. The 12th photo showed marketing text, and the reader correctly returned no list. Re-run with `scripts/label-bench.mjs`; scored in `src/lib/labelBench.ts`. |
| **Catalogue audit** | Of 1,033 real products in eight categories, **212 (21%)** have nothing on the watch-list. Fragrance is the most common problem in every category; only 2% of shower gels pass. Snapshot made with `scripts/fetch-products.mjs`. Listing every matched ingredient across the catalogue found two false positives in our rules (phenoxyethanol, urea preservatives), now fixed and tested. |
| **API latency** | Skin type ~17 s, hair density ~9 s, label reading ~2–4 s (single runs on the deployed stack; skin analysis 10–30 s). |

## Limits, plainly

- The scores come from a cosmetic skin model and have **not** been validated against clinical grading (CTCAE or the MASCC EGFR inhibitor skin toxicity tool).
- Only the face is analysed; scalp, chest, back and hand-foot reactions are out of scope.
- The app never suggests prescription treatment, and it does not diagnose. It tells people when a change is worth raising and helps them raise it.
- Skin type is used only to add a reliability note. Thresholds are not changed for deeper skin, because we have no data to justify a different number.
- The hair density score's range isn't documented and its photo-to-photo noise hasn't been measured yet; changes under 0.5 are shown as steady.
- The demo journey uses clearly labelled synthetic data.

## Run it

```bash
npm install
echo "YOUCAM_API_KEY=your_key" > .env.local   # without a key the app runs in offline mode with placeholder scores
npm run dev
npm test
```

Optional environment variables: `GEMINI_API_KEY` (enables label photos; `GEMINI_MODELS` is a comma-separated fallback list, default `gemini-flash-lite-latest,gemini-flash-latest`), `YOUCAM_API_BASE` (default `https://yce-api-01.makeupar.com`), `RATE_LIMIT_PER_HOUR` (default 30 per IP), `UNIT_FLOOR` (default 40).

Built with Next.js 16, React 19, Tailwind CSS 4, Recharts and idb-keyval.

## Sources

- U.S. Pharmacist: [Epidermal Growth Factor Receptor Inhibitors and Skin Rash](https://www.uspharmacist.com/article/epidermal-growth-factor-receptor-inhibitors-and-skin-rash)
- Lacouture et al., MASCC: [EGFR inhibitor dermatologic toxicity guidelines](https://link.springer.com/article/10.1007/s00520-011-1197-6), Supportive Care in Cancer, 2011
- NCODA: [Managing EGFR Inhibitor Induced Rash](https://ncoda.org/wp-content/uploads/2025/03/Managing-EGFR-Inhibitor-Induced-Rash_PQI_NCODA.pdf)
- St George's University Hospitals NHS: [Skin changes and cancer](https://www.stgeorges.nhs.uk/service/living-with-and-beyond-cancer-2/managing-physical-consequences-of-cancer-and-cancer-treatment/skin-changes-and-cancer/)
- Macmillan Cancer Support: [Dry, sore and itchy skin](https://www.macmillan.org.uk/_images/dry-sore-itchy-skin_tcm9-356295.pdf)
- Basch et al., JAMA 2017: [patient-reported symptom monitoring and survival](https://www.mskcc.org/press-releases/real-time-patient-reported-symptom-monitoring-demonstrates-overall-survival-benefit)
- Nangia et al., JAMA 2017: [scalp cooling and chemotherapy alopecia (SCALP trial)](https://doi.org/10.1001/jama.2016.20939)
- Current Oncology 2022: [EGFR TKI skin toxicities in a patient with darker skin](https://pmc.ncbi.nlm.nih.gov/articles/PMC9028593/)
- ESMO OncologyPRO: [Papulopustular rash](https://oncologypro.esmo.org/oncology-in-practice/palliative-and-supportive-care/multikinase-inhibitor-related-skin-toxicity/healthcare-professionals/symptoms-and-grading/skin-changes/papulopustular-rash)

Product data: [Open Beauty Facts](https://world.openbeautyfacts.org), Open Database License (ODbL) 1.0, snapshot in `src/data/products.json`. Sample hat image: CC0, see `public/samples/ATTRIBUTION.md`.

## Disclaimer

Between Cycles tracks visible changes in photos. It does not diagnose, grade or treat anything and is not a medical device or a substitute for a care team.

## License

MIT
