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
| **Product check** | Photograph the ingredient list (a vision model transcribes it, the person checks it) or paste it. Ten fixed rules, each citing published patient guidance (NHS, Macmillan, MASCC, U.S. Pharmacist), flag what to avoid, what to ask about and what helps. No AI guessing. |
| **Reminders and framing** | A calendar file adds repeating check-in reminders with no account. During capture, the first baseline photo is shown faintly over the camera so every scan is framed the same way. |
| **Hair prep** | Preview shorter hairstyles, or no hair at all, on your own face before hair loss begins, plus hats. |
| **Private** | No accounts. Photos and history stay in the browser (IndexedDB). The server only relays a photo to the analysis API and keeps nothing. |

## How the YouCam API is used

| API | Endpoint | Used for |
|---|---|---|
| AI Skin Analysis (SD) | `POST /s2s/v2.0/task/skin-analysis` | 8 concerns per scan: redness, acne, moisture, age spots (tracked), plus texture, oiliness, radiance, dark circles. Raw scores and per-concern detection masks. |
| AI Hairstyle Generator | `POST /s2s/v2.1/task/hair-transfer`, `GET /s2s/v2.1/task/template/hair-transfer` | Face-preserving previews of shorter styles and a no-hair preview. |
| AI Hat Try-On | `POST /s2s/v2.0/task/hat` | Styled previews with a hat or beanie. |
| File API, Unit API | `POST /s2s/v2.0/file`, `GET /s2s/v1.0/client/credit` | Uploads; protecting the unit balance on the public demo. |

All calls run server-side (`src/lib/youcam.ts`): register file → upload to the pre-signed URL → create task → poll with back-off. Result images are downloaded and resized immediately because their URLs expire.

**Why `raw_score`, not `ui_score`:** the vendor documents the UI score as adjusted upward to be encouraging. That is right for a beauty app and wrong for tracking change, so the app uses raw scores and shows `level = 100 − raw_score` (higher means more visible).

## The measurement method

```
SEM   = within-person SD of the baseline scans
MDC95 = 1.96 × √2 × SEM            (minimum 3 points)
flag  = |latest − baseline mean| > MDC95
```

This is the minimal detectable change from test–retest reliability studies: a difference larger than MDC95 is unlikely (< 5%) to be noise alone. Noisier concerns automatically get wider bands. The logic lives in `src/lib/stats.ts` and is unit-tested.

Repeatability measurements from real repeated selfies are published on the in-app **How it works** page (`/method`) and in `src/data/repeatability.json`, produced by `scripts/repeatability.mjs`.

## Limits, plainly

- The scores come from a cosmetic skin model and have **not** been validated against clinical grading (CTCAE or the MASCC EGFR inhibitor skin toxicity tool).
- Only the face is analysed; scalp, chest, back and hand-foot reactions are out of scope.
- The app never suggests prescription treatment, and it does not diagnose. It tells people when a change is worth raising and helps them raise it.
- The demo journey uses clearly labelled synthetic data.

## Run it

```bash
npm install
echo "YOUCAM_API_KEY=your_key" > .env.local   # without a key the app runs in offline mode with placeholder scores
npm run dev
npm test
```

Optional environment variables: `GEMINI_API_KEY` (enables label photos; `GEMINI_MODEL` defaults to `gemini-2.5-flash`), `YOUCAM_API_BASE` (default `https://yce-api-01.makeupar.com`), `RATE_LIMIT_PER_HOUR` (default 30 per IP), `UNIT_FLOOR` (default 40).

Built with Next.js 16, React 19, Tailwind CSS 4, Recharts and idb-keyval.

## Sources

- U.S. Pharmacist: [Epidermal Growth Factor Receptor Inhibitors and Skin Rash](https://www.uspharmacist.com/article/epidermal-growth-factor-receptor-inhibitors-and-skin-rash)
- Lacouture et al., MASCC: [EGFR inhibitor dermatologic toxicity guidelines](https://link.springer.com/article/10.1007/s00520-011-1197-6), Supportive Care in Cancer, 2011
- NCODA: [Managing EGFR Inhibitor Induced Rash](https://ncoda.org/wp-content/uploads/2025/03/Managing-EGFR-Inhibitor-Induced-Rash_PQI_NCODA.pdf)
- St George's University Hospitals NHS: [Skin changes and cancer](https://www.stgeorges.nhs.uk/service/living-with-and-beyond-cancer-2/managing-physical-consequences-of-cancer-and-cancer-treatment/skin-changes-and-cancer/)
- Macmillan Cancer Support: [Dry, sore and itchy skin](https://www.macmillan.org.uk/_images/dry-sore-itchy-skin_tcm9-356295.pdf)
- Basch et al., JAMA 2017: [patient-reported symptom monitoring and survival](https://www.mskcc.org/press-releases/real-time-patient-reported-symptom-monitoring-demonstrates-overall-survival-benefit)
- ESMO OncologyPRO: [Papulopustular rash](https://oncologypro.esmo.org/oncology-in-practice/palliative-and-supportive-care/multikinase-inhibitor-related-skin-toxicity/healthcare-professionals/symptoms-and-grading/skin-changes/papulopustular-rash)

Sample hat image: CC0, see `public/samples/ATTRIBUTION.md`.

## Disclaimer

Between Cycles tracks visible changes in photos. It does not diagnose, grade or treat anything and is not a medical device or a substitute for a care team.

## License

MIT
