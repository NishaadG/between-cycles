import Link from "next/link";
import { Logo } from "@/components/Shell";
import { Cite } from "@/components/ui";
import { CONCERNS } from "@/lib/concerns";
import { RULES } from "@/lib/ingredients";
import { SOURCES } from "@/lib/sources";
import { MIN_BASELINE_SCANS, MIN_MDC, SYMPTOMS } from "@/lib/stats";
import repeatability from "@/data/repeatability.json";
import labelBench from "@/data/label-bench.json";
import catalog from "@/data/products.json";
import { auditCategory, type CatalogProduct } from "@/lib/catalog";
import { summarizeBench, type BenchRow } from "@/lib/labelBench";

export const metadata = { title: "How it works · Between Cycles" };

interface Session {
  label: string;
  n: number;
  conditions: string;
  sd: Record<string, number>;
  mdc: Record<string, number>;
}

export default function Method() {
  const sessions = repeatability.sessions as Session[];
  const bench = summarizeBench(labelBench.results as BenchRow[]);
  const audits = catalog.categories.map((c) => auditCategory(c.id, c.label, catalog.products as CatalogProduct[]));
  const passing = audits.reduce((a, c) => a + c.ok, 0);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Logo />
        <Link href="/today" className="text-sm text-muted hover:text-ink">
          Open the app
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-16 leading-relaxed">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">How it works, and where it stops</h1>
          <p className="mt-3 text-muted">
            Between Cycles is a measuring tool, not a diagnostic one. This page lists exactly what it measures, how it
            decides something has changed, what is backed by evidence and what is not.
          </p>
        </div>

        <Section title="Why skin, why now">
          <p>
            Skin reactions occur in roughly 90% of people treated with EGFR inhibitors, typically starting in weeks 1–3 and
            peaking at weeks 3–4, mostly on the face, scalp and upper body. Other chemotherapy drugs cause dryness and darker
            patches. Patients are asked to report changes, but are rarely given a way to measure them.
          </p>
          <Cite ids={["uspharm", "esmo", "mascc"]} />
          <p>
            Reporting symptoms early matters. In a randomised trial of 766 people on chemotherapy, online symptom
            self-reporting with alerts to nurses was associated with longer median survival (31.2 vs 26.0 months). That trial
            covered general symptoms, not skin photos, but it is the case for structured self-monitoring.
          </p>
          <Cite ids={["basch"]} />
        </Section>

        <Section title="What is measured">
          <p>
            Each scan is a front-facing photo analysed by the YouCam AI Skin Analysis API. We request {CONCERNS.length} concerns
            and focus on four that match documented treatment side effects:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {CONCERNS.filter((c) => c.watched).map((c) => (
              <li key={c.id}>
                <strong>{c.label}</strong>: {c.why}
              </li>
            ))}
          </ul>
          <p>
            We use the API&apos;s <code>raw_score</code>, not its <code>ui_score</code>. The vendor documents the UI score as
            adjusted upward to be encouraging, which is right for a beauty app and wrong for tracking change. We show{" "}
            <em>level = 100 − raw score</em>, so a rising line means a concern is more visible.
          </p>
          <Cite ids={["vendor"]} />
        </Section>

        <Section title="How a change is decided">
          <p>
            Photo-based scores move a little between shots even when skin hasn&apos;t changed: light, angle and distance all
            play a part. So the app starts with {MIN_BASELINE_SCANS} baseline scans taken minutes apart. Their spread is your
            personal measurement noise.
          </p>
          <div className="card p-4 font-mono text-sm">
            SEM = within-person SD of the baseline scans
            <br />
            MDC95 = 1.96 × √2 × SEM (minimum {MIN_MDC} points)
            <br />
            change counts only if |latest − baseline mean| &gt; MDC95
          </div>
          <p>
            This is the minimal detectable change used in test–retest reliability studies: a difference larger than MDC95 is
            unlikely (under 5%) to be noise alone. A concern with noisier scores automatically gets a wider band, so it needs a
            bigger change to be flagged. The floor of {MIN_MDC} points stops three near-identical baseline photos from making
            the band unrealistically narrow.
          </p>
        </Section>

        <Section title="Repeatability: what we measured">
          {sessions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2">Session</th>
                    <th className="pb-2">Photos</th>
                    {CONCERNS.filter((c) => c.watched).map((c) => (
                      <th key={c.id} className="pb-2 text-right">
                        {c.label} SD / MDC
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.label} className="border-t border-line">
                      <td className="py-2">
                        {s.label}
                        <div className="text-xs text-muted">{s.conditions}</div>
                      </td>
                      <td className="py-2">{s.n}</td>
                      {CONCERNS.filter((c) => c.watched).map((c) => (
                        <td key={c.id} className="py-2 text-right tabular-nums">
                          {s.sd[c.id]} / {s.mdc[c.id]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">Repeatability runs are in progress; results will be published here.</p>
          )}
        </Section>

        <Section title="When the app says to call">
          <p>
            Some things a photo can&apos;t see. Each check-in asks about them, and any of these switches the app to “Contact your
            care team today”, whatever the scores say:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {SYMPTOMS.filter((s) => s.urgent).map((s) => (
              <li key={s.id}>{s.label}</li>
            ))}
          </ul>
          <p>A rise in a watched concern beyond the normal range, or milder symptoms, become “Worth mentioning to your care team”.</p>
        </Section>

        <Section title="Skin tone and redness" id="skin-tone">
          <p>
            Redness is harder to see on deeper skin, for clinicians and for cameras, and treatment rash on darker skin is
            under-documented. So on the first baseline photo the app runs the YouCam AI Fitzpatrick Skin Type API once (types
            I–VI). For types V and VI, every result carries a plain note that a steady redness score doesn&apos;t rule out a
            rash, and that symptom answers count as much as the photo. The thresholds themselves are not changed: we have no
            data to justify a different number, so we say so instead of inventing one.
          </p>
          <p>
            Skin type is used only for this note. It is stored on the device, never used to rank or compare people, and the
            app works without it.
          </p>
          <Cite ids={["skintone", "vendor"]} />
        </Section>

        <Section title="Hair density" id="hair">
          <p>
            Hair checks use the YouCam AI Hair Density Detection API, which returns one of four documented density levels and a
            continuous score from a photo taken with the head lowered. The score&apos;s range isn&apos;t documented (in our tests a
            “medium” photo scored 1.71 and a “low” one 0.92), so the level is the headline and the score only draws the trend. The first two checks set a starting point; later checks are
            compared with it. We haven&apos;t measured this score&apos;s photo-to-photo noise yet, so moves under 0.5 are shown as
            steady. This is most useful for people using scalp cooling, which preserved hair in about half of patients in a
            randomised trial.
          </p>
          <Cite ids={["scalpcool", "vendor"]} />
        </Section>

        <Section title="Product checks" id="products">
          <p>
            The ingredient checker is a fixed list of {RULES.length} rules, not an AI model, so the same label always gets the
            same answer. When a label is photographed, a vision model only transcribes the list; the person checks the
            transcription, and the rules decide. Fatty alcohols (cetyl, cetearyl), benzyl alcohol and sunscreen salicylates are deliberately excluded
            from the alcohol and acid rules.
          </p>
          <p>
            The same rules run over a snapshot of real products from Open Beauty Facts, an open database (ODbL), to make the
            treatment-friendly picks and the shelf audit. Before publishing the numbers we listed every ingredient each rule
            matched across the catalogue and removed two false positives this found (phenoxyethanol read as an alcohol, urea
            preservatives read as moisturisers). Both are now unit tests.
          </p>
          <p>
            <strong>Picked for your skin today.</strong> After a check-in, each change maps to what the guidance above says
            helps: more bumps or redness to a gentle soap-free cleanser, more dryness (or reported dryness or itch) to a
            moisturiser with hydrating ingredients, darker patches to a daily sunscreen. Each slot is filled with catalogue
            products that pass every rule and contain that kind of ingredient, ranked by how many they contain. Nothing is
            suggested when the advice is to call the care team. There are no sponsored placements.
          </p>
          <p>
            <strong>The shop badge.</strong> The same rules are served as a public endpoint (<code>/api/check</code>) and a
            two-line embed (<code>/badge.js</code>) that shows &ldquo;Gentle during treatment&rdquo;, &ldquo;Ask your care
            team first&rdquo; or &ldquo;Not advised during treatment&rdquo; on a product page, with the reasons and sources
            one tap away. Only the public ingredient text is sent.
          </p>
          <ul className="space-y-2">
            {RULES.map((r) => (
              <li key={r.id} className="text-sm">
                <strong>{r.name}</strong> ({r.verdict}): {r.reason} <Cite ids={r.sources} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Measured: label reading and the catalogue" id="measured">
          <p>
            <strong>Label photos.</strong> We sent {bench.n} real photos filed as ingredient panels on Open Beauty Facts through the
            app&apos;s own label route ({labelBench.ranAt}) and compared the result with the human transcription on Open Beauty
            Facts, using the same parser and rules as the app.
          </p>
          <div className="card grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
            <Stat value={`${bench.sameVerdict}/${bench.n - bench.refused}`} label="same verdict and flags as the human transcription" />
            <Stat value={pct(bench.recall)} label="of listed ingredients recovered (avg)" />
            <Stat value={pct(bench.precision)} label="of read ingredients that were on the label (avg)" />
            <Stat value={`${(bench.medianMs / 1000).toFixed(1)} s`} label={`median time, slowest ${(bench.maxMs / 1000).toFixed(1)} s`} />
          </div>
          <p className="text-sm text-muted">
            {bench.refused} of {bench.n} photos returned no list: in our run that photo showed marketing text, not the
            ingredient panel, so declining was correct. Twelve labels is a small sample; the script to repeat it is{" "}
            <code>scripts/label-bench.mjs</code>.
          </p>
          <p>
            <strong>Catalogue.</strong> Across {catalog.products.length.toLocaleString()} real products in eight categories,{" "}
            {passing} ({pct(passing / catalog.products.length)}) have nothing on the watch-list. Fragrance is the most common
            reason in every category.
          </p>
        </Section>

        <Section title="Measured vs curated">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Measured by API:</strong> skin concern scores and masks, skin type, hair density, hairstyle previews.</li>
            <li><strong>Computed by us, in code:</strong> baselines, MDC95 bands, change flags, product verdicts, catalogue pass rates.</li>
            <li><strong>Curated by us:</strong> the ingredient rules and symptom list, each tied to the sources below.</li>
            <li><strong>Read by AI:</strong> ingredient lists transcribed from label photos, always shown for the person to check.</li>
            <li><strong>Synthetic:</strong> the demo journey (labelled “Demo data”) and the example ingredient lists.</li>
          </ul>
        </Section>

        <Section title="Limits, plainly">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>The scores come from a cosmetic skin model. They have not been validated against clinical grading (CTCAE or the MASCC EGFR inhibitor skin toxicity tool).</li>
            <li>Only the face is analysed. Rash on the scalp, chest or back, and hand-foot reactions, are out of scope.</li>
            <li>Consistency of lighting and position matters; the baseline captures it, but a very different setup can still produce false changes.</li>
            <li>The app never suggests prescription treatments. Questions for the care team are generated instead.</li>
            <li>A proper validation would compare app levels with clinician grades across skin tones in a prospective study.</li>
          </ul>
        </Section>

        <Section title="Sources">
          <ul className="space-y-1.5 text-sm">
            {Object.values(SOURCES).map((s) => (
              <li key={s.id}>
                <a href={s.url} className="underline decoration-dotted underline-offset-2" target="_blank" rel="noreferrer">
                  {s.title}
                </a>{" "}
                <span className="text-muted">({s.publisher})</span>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
