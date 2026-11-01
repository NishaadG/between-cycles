"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Camera } from "@/components/Camera";
import { MaskViewer } from "@/components/MaskViewer";
import { Shell } from "@/components/Shell";
import { ForYou } from "@/components/ForYou";
import { PageTitle, Spinner, guidanceTitle } from "@/components/ui";
import { CONCERNS, WATCHED } from "@/lib/concerns";
import { photoProblems, preparePhoto, type PreparedPhoto } from "@/lib/image";
import { MIN_BASELINE_SCANS, SYMPTOMS, compare, computeBaseline, guidance, type SymptomId } from "@/lib/stats";
import { addScan, getProfile, levelsOf, listScans, newId, saveProfile, type Scan } from "@/lib/store";
import type { SkinTypeScale } from "@/lib/stats";
import type { SkinAnalysis } from "@/lib/types";
import { useJourney } from "@/lib/useJourney";

type Step = "capture" | "review" | "symptoms" | "analyzing" | "result" | "error";

export default function ScanPage() {
  return (
    <Suspense>
      <ScanFlow />
    </Suspense>
  );
}

// Keep only the masks we show, to limit on-device storage.
function slim(a: SkinAnalysis): SkinAnalysis {
  const watched = new Set(WATCHED.map((w) => w.id));
  const concerns = { ...a.concerns };
  for (const id of Object.keys(concerns) as (keyof typeof concerns)[]) {
    if (!watched.has(id)) concerns[id] = { ...concerns[id], maskUrl: undefined };
  }
  return { ...a, concerns };
}

function ScanFlow() {
  const kind = useSearchParams().get("kind") === "checkin" ? "checkin" : "baseline";
  const j = useJourney();
  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomId[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Scan | null>(null);
  const [allScans, setAllScans] = useState<Scan[]>([]);

  async function onPhoto(blob: Blob) {
    try {
      setPhoto(await preparePhoto(blob));
      setStep("review");
    } catch {
      setError("We couldn't read that image. Try a JPEG or PNG.");
      setStep("error");
    }
  }

  async function analyze() {
    if (!photo) return;
    setStep("analyzing");
    const body = new FormData();
    body.append("photo", photo.blob, "scan.jpg");
    // Measured in parallel with the analysis, so it adds no waiting.
    const skinTypeDone = kind === "baseline" && !j.profile?.skinType ? measureSkinType(photo.blob) : null;
    try {
      const res = await fetch("/api/skin", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Analysis failed.");
      const scan: Scan = {
        id: newId(),
        takenAt: new Date().toISOString(),
        kind,
        analysis: slim(json as SkinAnalysis),
        photo: photo.thumb,
        symptoms,
      };
      await addScan(scan);
      await skinTypeDone;
      setAllScans(await listScans());
      setSaved(scan);
      setStep("result");
      j.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      setStep("error");
    }
  }

  // Once per person: skin type decides whether redness readings get a
  // reliability caution. Failure is silent: the app works without it.
  async function measureSkinType(blob: Blob) {
    const profile = await getProfile();
    if (!profile || profile.skinType) return;
    const body = new FormData();
    body.append("photo", blob, "scan.jpg");
    try {
      const res = await fetch("/api/skin-type", { method: "POST", body });
      const json = (await res.json()) as { result?: { scale: SkinTypeScale } | null };
      if (!res.ok || !json.result) return;
      const latest = await getProfile();
      if (latest && !latest.skinType) {
        await saveProfile({ ...latest, skinType: { scale: json.result.scale, measuredAt: new Date().toISOString() } });
        j.reload();
      }
    } catch {
      // Skin type is optional; the app works without it.
    }
  }

  const problems = photo ? photoProblems(photo) : [];
  const title = kind === "baseline" ? "Baseline scan" : "Check-in";

  return (
    <Shell profile={j.profile}>
      <PageTitle
        title={title}
        subtitle={
          kind === "baseline"
            ? "Same spot, same light, every time. Consistency is what makes changes measurable."
            : "Use the same spot and light as your baseline."
        }
      />

      {step === "capture" && <Camera onPhoto={onPhoto} ghost={j.baselineScans[0]?.photo} />}

      {step === "review" && photo && (
        <div className="card p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.thumb} alt="Your photo" className="mx-auto w-full max-w-xs rounded-2xl" />
          {problems.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl bg-discuss-soft p-3 text-sm text-discuss">
              {problems.map((p) => (
                <li key={p} className="flex gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button className="btn btn-ghost" onClick={() => setStep("capture")}>
              <RotateCcw size={16} /> Retake
            </button>
            <button className="btn btn-primary" onClick={() => (kind === "checkin" ? setStep("symptoms") : analyze())}>
              {kind === "checkin" ? "Next" : "Analyse"}
            </button>
          </div>
        </div>
      )}

      {step === "symptoms" && (
        <div className="card p-5">
          <h2 className="font-semibold">Anything else since your last check-in?</h2>
          <p className="mt-1 text-sm text-muted">Tick all that apply. Photos can&apos;t see these.</p>
          <div className="mt-4 space-y-2">
            {SYMPTOMS.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input
                  type="checkbox"
                  checked={symptoms.includes(s.id)}
                  onChange={(e) =>
                    setSymptoms((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))
                  }
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm">{s.label}</span>
              </label>
            ))}
          </div>
          <button className="btn btn-primary mt-5 w-full" onClick={analyze}>
            Analyse
          </button>
        </div>
      )}

      {step === "analyzing" && (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <Spinner />
          <p className="font-medium">Measuring redness, bumps, dryness and dark patches…</p>
          <p className="text-sm text-muted">Usually 10–30 seconds.</p>
        </div>
      )}

      {step === "error" && (
        <div className="card p-6 text-center">
          <AlertCircle className="mx-auto text-discuss" />
          <p className="mt-3 font-medium">{error}</p>
          <button className="btn btn-primary mt-5" onClick={() => setStep("capture")}>
            Try again
          </button>
        </div>
      )}

      {step === "result" && saved && <Result scan={saved} all={allScans} skinType={j.profile?.skinType?.scale} />}
    </Shell>
  );
}

function Result({ scan, all, skinType }: { scan: Scan; all: Scan[]; skinType?: SkinTypeScale }) {
  const baselineScans = all.filter((s) => s.kind === "baseline");
  const baseline = baselineScans.length >= MIN_BASELINE_SCANS ? computeBaseline(baselineScans.map(levelsOf)) : null;
  const changes = scan.kind === "checkin" && baseline ? compare(levelsOf(scan), baseline) : null;
  const g = scan.kind === "checkin" ? guidance(changes, scan.symptoms, { skinType }) : null;

  return (
    <div className="space-y-5">
      {scan.analysis.mode === "mock" && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
          Offline mode: these scores are placeholders, not a real analysis.
        </p>
      )}

      {scan.kind === "baseline" && (
        <div className="card p-5">
          <h2 className="font-serif text-xl font-semibold">
            Baseline {Math.min(baselineScans.length, MIN_BASELINE_SCANS)} of {MIN_BASELINE_SCANS} saved
          </h2>
          <p className="mt-1 text-sm text-muted">
            {baseline
              ? "Your baseline is ready. From now on, check-ins are compared to it."
              : "Take the next one now, without moving. The small differences between them are what we measure."}
          </p>
          {baseline ? (
            <Link href="/today" className="btn btn-primary mt-4">
              Done
            </Link>
          ) : (
            // Full navigation resets the capture flow for the next photo.
            <a href="/scan?kind=baseline" className="btn btn-primary mt-4">
              Take the next baseline scan
            </a>
          )}
        </div>
      )}

      {g && (
        <div className={`rounded-[1.25rem] p-5 ${g.level === "urgent" ? "bg-urgent-soft" : g.level === "discuss" ? "bg-discuss-soft" : "bg-steady-soft"}`}>
          <h2 className="font-serif text-xl font-semibold">{guidanceTitle(g.level)}</h2>
          {g.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {g.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {!baseline && <p className="mt-2 text-sm">Finish your baseline to see changes.</p>}
          {g.caution && <p className="mt-3 border-t border-black/10 pt-3 text-xs">{g.caution}</p>}
        </div>
      )}

      <div className="card p-5">
        <MaskViewer photo={scan.photo} analysis={scan.analysis} />
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-medium">Concern</th>
              <th className="pb-2 text-right font-medium">Level</th>
              {changes && <th className="pb-2 text-right font-medium">vs baseline</th>}
            </tr>
          </thead>
          <tbody>
            {CONCERNS.map((c) => {
              const r = scan.analysis.concerns[c.id];
              const ch = changes?.find((x) => x.id === c.id);
              if (!r) return null;
              return (
                <tr key={c.id} className="border-t border-line">
                  <td className={`py-2 ${c.watched ? "font-medium" : "text-muted"}`}>{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{r.level}</td>
                  {changes && (
                    <td
                      className={`py-2 text-right tabular-nums ${
                        ch?.status === "worse" ? "font-semibold text-discuss" : ch?.status === "better" ? "text-steady" : "text-muted"
                      }`}
                    >
                      {ch ? `${ch.delta > 0 ? "+" : ""}${ch.delta}` : ""}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          Level = how visible a concern is (0–100, higher is more visible). Changes inside your normal photo-to-photo range are
          shown as grey.
        </p>
      </div>

      {g && baseline && <ForYou changes={changes} symptoms={scan.symptoms} level={g.level} />}

      {scan.kind === "checkin" && (
        <Link href="/today" className="btn btn-primary w-full">
          Done
        </Link>
      )}
    </div>
  );
}
