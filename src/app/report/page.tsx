"use client";

import Link from "next/link";
import { useState } from "react";
import { Printer } from "lucide-react";
import { ConcernChart, toPoints } from "@/components/ConcernChart";
import { Shell } from "@/components/Shell";
import { Disclaimer, GuidanceBadge, Spinner, guidanceTitle } from "@/components/ui";
import { WATCHED } from "@/lib/concerns";
import { SYMPTOMS, cyclePosition, type Change, type SymptomId } from "@/lib/stats";
import { TREATMENTS, type Profile } from "@/lib/store";
import { useJourney } from "@/lib/useJourney";

const COLORS = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-4)"];

function questions(changes: Change[] | null, symptoms: SymptomId[], profile: Profile): string[] {
  const worse = new Set((changes ?? []).filter((c) => c.status === "worse").map((c) => c.id));
  const q: string[] = [];
  if (symptoms.some((s) => SYMPTOMS.find((x) => x.id === s)?.urgent)) {
    q.push("I reported symptoms that guidance says to raise the same day. What should I do now?");
  }
  if (worse.has("acne") || worse.has("redness")) {
    q.push(
      profile.treatment === "egfr"
        ? "My face rash has risen above my normal range. Is this expected with my treatment, and should I start or change anything for it?"
        : "My face has more redness or bumps than my normal range. Could this be related to my treatment?",
    );
  }
  if (worse.has("moisture")) q.push("My skin is getting drier. Which moisturiser do you recommend, and how often?");
  if (worse.has("age_spot")) q.push("I'm seeing darker patches. Is this from my treatment, and should I change my sun protection?");
  q.push("Which skin changes should make me call the helpline rather than wait?");
  return q;
}

export default function Report() {
  const j = useJourney();
  const [now] = useState(() => Date.now());
  if (j.loading) {
    return (
      <Shell>
        <Spinner label="Loading" />
      </Shell>
    );
  }
  if (!j.profile || !j.baseline) {
    return (
      <Shell profile={j.profile}>
        <h1 className="font-serif text-3xl font-semibold">Care-team summary</h1>
        <div className="card mt-6 p-6 text-center">
          <p className="text-muted">The summary needs a finished baseline (3 scans) first.</p>
          <Link href="/today" className="btn btn-primary mt-4">
            Go to Today
          </Link>
        </div>
      </Shell>
    );
  }

  const profile = j.profile;
  const baseline = j.baseline;
  const latest = j.latest;
  const start = new Date(profile.firstCycleStart + "T00:00:00");
  const pos = cyclePosition(new Date(), start, profile.cycleLength);
  const since = now - 14 * 86_400_000;
  const recentSymptoms = [
    ...new Set(j.checkIns.filter((c) => new Date(c.scan.takenAt).getTime() >= since).flatMap((c) => c.scan.symptoms)),
  ];
  const firstBaseline = j.baselineScans[0];

  return (
    <Shell profile={profile}>
      <div className="no-print mb-4 flex justify-end">
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={18} /> Print or save as PDF
        </button>
      </div>

      <article className="space-y-5">
        <header className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">Patient-recorded skin summary</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold">
            {profile.name || "Patient"} · {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </h1>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <dt className="text-muted">Treatment</dt>
            <dd className="sm:col-span-3">{TREATMENTS.find((t) => t.id === profile.treatment)?.label}</dd>
            <dt className="text-muted">Now</dt>
            <dd className="sm:col-span-3">{pos ? `Cycle ${pos.cycle}, day ${pos.day} (${profile.cycleLength}-day cycles)` : "Before treatment"}</dd>
            <dt className="text-muted">Scans</dt>
            <dd className="sm:col-span-3">
              {j.baselineScans.length} baseline, {j.checkIns.length} check-ins
            </dd>
          </dl>
          {profile.demo && <p className="mt-3 text-xs font-semibold text-discuss">Demo data: synthetic values for illustration.</p>}
        </header>

        {latest && (
          <section className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">Latest check-in</h2>
              <GuidanceBadge level={latest.guidance.level} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {new Date(latest.scan.takenAt).toLocaleDateString(undefined, { day: "numeric", month: "long" })} ·{" "}
              {guidanceTitle(latest.guidance.level)}
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Concern</th>
                  <th className="pb-2 text-right font-medium">Normal range</th>
                  <th className="pb-2 text-right font-medium">Latest</th>
                  <th className="pb-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {WATCHED.map((w) => {
                  const b = baseline[w.id];
                  const c = latest.changes?.find((x) => x.id === w.id);
                  return (
                    <tr key={w.id} className="border-t border-line">
                      <td className="py-2 font-medium">{w.label}</td>
                      <td className="py-2 text-right tabular-nums text-muted">
                        {b.mean} ± {b.mdc}
                      </td>
                      <td className="py-2 text-right tabular-nums">{c?.value}</td>
                      <td className={`py-2 text-right tabular-nums ${c?.status === "worse" ? "font-semibold text-discuss" : ""}`}>
                        {c ? `${c.delta > 0 ? "+" : ""}${c.delta}${c.status === "worse" ? " ▲" : c.status === "better" ? " ▼" : ""}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Levels 0–100 from photo analysis, higher = more visible. ▲ marks a change larger than this patient&apos;s own
              photo-to-photo variation (95% minimal detectable change from {baseline.redness.n} baseline scans).
            </p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          {WATCHED.map((w, i) => (
            <div key={w.id} className="card p-4">
              <h3 className="text-sm font-semibold">{w.label}</h3>
              <ConcernChart
                points={toPoints(j.scans, w.id, profile.firstCycleStart)}
                stat={baseline[w.id]}
                cycleLength={profile.cycleLength}
                color={COLORS[i]}
                height={150}
                animate={false}
              />
            </div>
          ))}
        </section>

        {(firstBaseline?.photo || latest?.scan.photo) && (
          <section className="card p-5">
            <h2 className="font-semibold">Photos</h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {[
                { label: "Baseline", scan: firstBaseline },
                { label: "Latest", scan: latest?.scan },
              ].map(({ label, scan }) =>
                scan?.photo ? (
                  <figure key={label}>
                    <div className="relative overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scan.photo} alt={`${label} photo`} className="w-full" />
                      {scan.analysis.concerns.acne?.maskUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={scan.analysis.concerns.acne.maskUrl} alt="" className="absolute inset-0 h-full w-full" />
                      )}
                    </div>
                    <figcaption className="mt-1 text-xs text-muted">
                      {label} · {new Date(scan.takenAt).toLocaleDateString()} · bumps &amp; spots overlay
                    </figcaption>
                  </figure>
                ) : null,
              )}
            </div>
          </section>
        )}

        <section className="card p-5">
          <h2 className="font-semibold">Symptoms reported (last 14 days)</h2>
          {recentSymptoms.length ? (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {recentSymptoms.map((id) => (
                <li key={id}>{SYMPTOMS.find((s) => s.id === id)?.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">None reported.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Questions I&apos;d like to ask</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
            {questions(latest?.changes ?? null, latest?.scan.symptoms ?? [], profile).map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </section>

        <section className="card p-5 text-xs leading-relaxed text-muted">
          <p className="font-semibold text-ink">How these numbers were made</p>
          <p className="mt-1">
            Front-facing photos analysed by the YouCam AI Skin Analysis API (raw scores, not the vendor&apos;s
            encouragement-adjusted UI scores). Each concern is compared with this patient&apos;s own baseline; the normal range
            is the baseline mean ± the 95% minimal detectable change (1.96 × √2 × within-person SD, minimum 3 points). The
            scores are cosmetic measures, not a clinical grading such as CTCAE, and have not been validated against clinician
            assessment.
          </p>
          <div className="mt-3">
            <Disclaimer />
          </div>
        </section>
      </article>
    </Shell>
  );
}
