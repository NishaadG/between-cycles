"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Camera as CameraIcon, RotateCcw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Camera } from "@/components/Camera";
import { Shell } from "@/components/Shell";
import { Cite, PageTitle, Spinner } from "@/components/ui";
import { HAIR_NOISE, densityLevel, summarizeHair } from "@/lib/hair";
import { preparePhoto, type PreparedPhoto } from "@/lib/image";
import { addHairCheck, listHairChecks, newId, type HairCheck } from "@/lib/store";
import { useJourney } from "@/lib/useJourney";

type Step = "idle" | "capture" | "review" | "measuring" | "error";

export default function HairPage() {
  const j = useJourney();
  const [checks, setChecks] = useState<HairCheck[] | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    listHairChecks().then(setChecks);
  }, [version]);

  async function measure() {
    if (!photo) return;
    setStep("measuring");
    const body = new FormData();
    body.append("photo", photo.blob, "hair.jpg");
    try {
      const res = await fetch("/api/hair-density", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Measurement failed.");
      await addHairCheck({
        id: newId(),
        takenAt: new Date().toISOString(),
        value: json.value,
        term: json.term,
        mode: json.mode,
        photo: photo.thumb,
      });
      setPhoto(null);
      setStep("idle");
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Measurement failed.");
      setStep("error");
    }
  }

  const summary = checks ? summarizeHair(checks) : null;
  const latest = checks?.at(-1);

  return (
    <Shell profile={j.profile}>
      <PageTitle
        title="Hair check"
        subtitle="Track hair density across your cycles, so thinning is something you see coming rather than something that surprises you."
      />

      {step === "idle" && (
        <>
          {checks === null ? (
            <Spinner label="Loading" />
          ) : checks.length === 0 ? (
            <section className="card p-5">
              <h2 className="font-semibold">How to take a hair check</h2>
              <Instructions />
              <button className="btn btn-primary mt-5" onClick={() => setStep("capture")}>
                <CameraIcon size={18} /> Take your first hair check
              </button>
            </section>
          ) : (
            <>
              <section
                className={`rounded-[1.25rem] p-5 ${summary?.status === "thinner" ? "bg-discuss-soft" : "bg-steady-soft"}`}
              >
                <p className="text-sm opacity-80">Latest hair density</p>
                <p className="mt-1 font-serif text-3xl font-semibold">
                  {densityLevel(latest!.term) ? `Level ${densityLevel(latest!.term)} of 4` : "Measured"}
                  <span className="text-lg font-normal"> · {latest!.term ? latest!.term.replace(/ Density$/, "").toLowerCase() : ""}</span>
                </p>
                <p className="text-xs opacity-80">Score {latest!.value.toFixed(2)} (higher = denser)</p>
                <p className="mt-2 text-sm">{statusText(summary!)}</p>
                {latest!.mode === "mock" && (
                  <p className="mt-2 text-xs opacity-80">
                    {latest!.demo ? "Demo data: synthetic values." : "Offline mode: placeholder value, not a real measurement."}
                  </p>
                )}
                <button className="btn btn-primary mt-4" onClick={() => setStep("capture")}>
                  <CameraIcon size={18} /> New hair check
                </button>
              </section>

              <section className="card mt-6 p-5">
                <h2 className="font-semibold">Over your treatment</h2>
                <p className="text-xs text-muted">Density score, higher = denser. The dashed line is your starting point.</p>
                <HairChart checks={checks} firstCycleStart={j.profile?.firstCycleStart} baseline={summary?.baseline ?? null} />
              </section>
            </>
          )}

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/prepare" className="card p-4 hover:border-primary">
              <h3 className="flex items-center gap-1 font-semibold">
                Preview shorter styles <ArrowRight size={16} />
              </h3>
              <p className="mt-1 text-sm text-muted">See a pixie, a buzz cut or no hair on your own photo first.</p>
            </Link>
            <div className="card p-4">
              <h3 className="font-semibold">Using scalp cooling?</h3>
              <p className="mt-1 text-sm text-muted">
                In a randomised trial, about half of women who used scalp cooling kept most of their hair (50.5% vs 0%).
                A hair check each cycle shows how it&apos;s going for you. <Cite ids={["scalpcool"]} />
              </p>
            </div>
          </section>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            Measured by the YouCam AI Hair Density Detection API from your photo: one of four levels, plus a score we use for the trend. We haven&apos;t yet measured how much
            this score moves between photos, so score changes smaller than {HAIR_NOISE} are shown as steady. This tracks how
            dense hair looks, it does not diagnose hair loss. <Cite ids={["vendor"]} />
          </p>
        </>
      )}

      {step === "capture" && (
        <div className="space-y-4">
          <div className="card p-4 text-sm">
            <Instructions />
          </div>
          <Camera onPhoto={async (b) => {
            try {
              setPhoto(await preparePhoto(b));
              setStep("review");
            } catch {
              setError("We couldn't read that image. Try a JPEG or PNG.");
              setStep("error");
            }
          }} guide="upper" />
          <button className="btn btn-ghost" onClick={() => setStep("idle")}>
            Cancel
          </button>
        </div>
      )}

      {step === "review" && photo && (
        <div className="card p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.thumb} alt="Your hair photo" className="mx-auto w-full max-w-xs rounded-2xl" />
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button className="btn btn-ghost" onClick={() => setStep("capture")}>
              <RotateCcw size={16} /> Retake
            </button>
            <button className="btn btn-primary" onClick={measure}>
              Measure
            </button>
          </div>
        </div>
      )}

      {step === "measuring" && (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <Spinner />
          <p className="font-medium">Measuring hair density…</p>
          <p className="text-sm text-muted">Usually 5–20 seconds.</p>
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
    </Shell>
  );
}

function Instructions() {
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
      <li>Face the camera in good, even light, the same spot as your skin scans.</li>
      <li>Lower your head about 45 degrees so your hairline and parting show.</li>
      <li>Hair loose, not tied back. No hat or scarf.</li>
    </ol>
  );
}

function statusText(s: ReturnType<typeof summarizeHair>): string {
  if (s.status === "baseline") return "Starting point saved. Take another check before your next cycle to compare.";
  const d = Math.abs(s.delta!).toFixed(2);
  if (s.status === "thinner")
    return `Down ${d} from your starting point (${s.baseline!.toFixed(2)}). Worth mentioning at your next appointment, especially if you're using scalp cooling.`;
  if (s.status === "fuller") return `Up ${d} from your starting point. Regrowth often starts weeks after treatment ends.`;
  return `Within ${HAIR_NOISE} of your starting point (${s.baseline!.toFixed(2)}): no clear change.`;
}

function HairChart({ checks, firstCycleStart, baseline }: { checks: HairCheck[]; firstCycleStart?: string; baseline: number | null }) {
  const start = firstCycleStart ? new Date(firstCycleStart + "T00:00:00").getTime() : new Date(checks[0].takenAt).getTime();
  const data = checks.map((c) => ({
    day: Math.round(((new Date(c.takenAt).getTime() - start) / 86_400_000) * 10) / 10,
    value: c.value,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="day"
          type="number"
          domain={["dataMin - 1", "dataMax + 1"]}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickFormatter={(d: number) => (d < 0 ? "pre" : `D${Math.floor(d) + 1}`)}
          stroke="var(--line)"
        />
        <YAxis domain={[(min: number) => Math.max(0, Math.floor((min - 0.3) * 2) / 2), (max: number) => Math.ceil((max + 0.3) * 2) / 2]} tick={{ fontSize: 11, fill: "var(--muted)" }} stroke="var(--line)" />
        {baseline !== null && <ReferenceLine y={baseline} stroke="var(--muted)" strokeDasharray="4 4" />}
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
          labelFormatter={(d) => (Number(d) < 0 ? "Before treatment" : `Day ${Math.floor(Number(d)) + 1} of treatment`)}
          formatter={(v) => [Number(v).toFixed(2), "Density"]}
        />
        <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
