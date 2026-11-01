"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BellRing, Camera, Minus } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Disclaimer, Spinner, guidanceTitle } from "@/components/ui";
import { WATCHED, concernInfo } from "@/lib/concerns";
import { MIN_BASELINE_SCANS, cyclePosition, type Change } from "@/lib/stats";
import { downloadReminders } from "@/lib/reminders";
import { resetAll, seedDemo } from "@/lib/store";
import { useJourney } from "@/lib/useJourney";

export default function Today() {
  const router = useRouter();
  const j = useJourney();
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!j.loading && !j.profile) router.replace("/setup");
  }, [j.loading, j.profile, router]);

  if (j.loading || !j.profile) {
    return (
      <Shell>
        <Spinner label="Loading" />
      </Shell>
    );
  }

  const pos = cyclePosition(new Date(), new Date(j.profile.firstCycleStart + "T00:00:00"), j.profile.cycleLength);
  const needBaseline = !j.baseline;
  const latest = j.latest;
  const lastDate = latest ? new Date(latest.scan.takenAt) : null;
  const daysSince = lastDate ? Math.floor((now - lastDate.getTime()) / 86_400_000) : null;

  return (
    <Shell profile={j.profile}>
      <p className="text-sm text-muted">
        {pos ? `Cycle ${pos.cycle} · Day ${pos.day}` : "Before treatment"} ·{" "}
        {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
        {j.profile.name ? `Hi ${j.profile.name.split(" ")[0]}` : "Hello"}
      </h1>

      {needBaseline ? (
        <section className="card mt-6 p-5">
          <h2 className="font-serif text-xl font-semibold">Build your baseline</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Take {MIN_BASELINE_SCANS} scans in the same spot and light, ideally before treatment starts. They set your
            normal, and show how much your scores move between photos when nothing has changed.
          </p>
          <div className="mt-4 flex gap-2" aria-label={`${j.baselineScans.length} of ${MIN_BASELINE_SCANS} baseline scans`}>
            {Array.from({ length: MIN_BASELINE_SCANS }).map((_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${i < j.baselineScans.length ? "bg-primary" : "bg-surface-2"}`} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {j.baselineScans.length} of {MIN_BASELINE_SCANS} done. A minute apart is fine.
          </p>
          <Link href="/scan?kind=baseline" className="btn btn-primary mt-5 w-full sm:w-auto">
            <Camera size={18} /> Take baseline scan
          </Link>
        </section>
      ) : (
        <>
          <section
            className={`mt-6 rounded-[1.25rem] p-5 ${
              latest?.guidance.level === "urgent"
                ? "bg-urgent-soft"
                : latest?.guidance.level === "discuss"
                  ? "bg-discuss-soft"
                  : "bg-steady-soft"
            }`}
          >
            {latest ? (
              <>
                <h2 className="font-serif text-2xl font-semibold">{guidanceTitle(latest.guidance.level)}</h2>
                {latest.guidance.reasons.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {latest.guidance.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm">No change beyond your normal photo-to-photo variation at your last check-in.</p>
                )}
                {latest.guidance.caution && (
                  <p className="mt-3 border-t border-black/10 pt-3 text-xs">
                    {latest.guidance.caution}{" "}
                    <Link href="/method#skin-tone" className="underline">
                      Why
                    </Link>
                  </p>
                )}
                {latest.guidance.level === "urgent" && (
                  <p className="mt-3 text-sm font-semibold">
                    Call your treatment team&apos;s helpline now. Don&apos;t wait for the next appointment.
                  </p>
                )}
                <p className="mt-3 text-xs opacity-80">
                  Last check-in {daysSince === 0 ? "today" : `${daysSince} day${daysSince === 1 ? "" : "s"} ago`}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-serif text-2xl font-semibold">Baseline ready</h2>
                <p className="mt-2 text-sm">Check in every few days, or whenever your skin feels different.</p>
              </>
            )}
            <Link href="/scan?kind=checkin" className="btn btn-primary mt-5">
              <Camera size={18} /> Check in now
            </Link>
          </section>

          {latest?.changes && (
            <section className="mt-6">
              <h2 className="mb-3 font-semibold">Since your baseline</h2>
              <div className="grid grid-cols-2 gap-3">
                {WATCHED.map((w) => (
                  <ChangeTile key={w.id} change={latest.changes!.find((c) => c.id === w.id)!} />
                ))}
              </div>
              <Link href="/journey" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                See your journey <ArrowRight size={16} />
              </Link>
            </section>
          )}
        </>
      )}

      <Reminders />

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/products" className="card p-4 hover:border-primary">
          <h3 className="font-semibold">Is this product okay?</h3>
          <p className="mt-1 text-sm text-muted">Check an ingredient list against patient guidance.</p>
        </Link>
        <Link href="/hair" className="card p-4 hover:border-primary">
          <h3 className="font-semibold">Hair check</h3>
          <p className="mt-1 text-sm text-muted">Track hair density each cycle, and preview shorter styles first.</p>
        </Link>
      </section>

      <section className="mt-10 space-y-3 border-t border-line pt-6">
        <Disclaimer />
        <div className="flex flex-wrap gap-2 text-xs">
          {j.profile.demo ? (
            <button
              className="btn btn-ghost !py-1.5 text-xs"
              onClick={async () => {
                await resetAll();
                router.push("/setup");
              }}
            >
              Leave demo and start my own
            </button>
          ) : (
            <Link href="/setup" className="btn btn-ghost !py-1.5 text-xs">
              Edit treatment details
            </Link>
          )}
          <button
            className="btn btn-ghost !py-1.5 text-xs"
            onClick={async () => {
              if (!j.profile?.demo && !confirm("Replace your data with the demo journey?")) return;
              await seedDemo();
              j.reload();
            }}
          >
            Load demo journey
          </button>
        </div>
      </section>
    </Shell>
  );
}

function ChangeTile({ change }: { change: Change }) {
  const info = concernInfo(change.id);
  const Icon = change.status === "worse" ? ArrowUpRight : change.status === "better" ? ArrowDownRight : Minus;
  const tone =
    change.status === "worse" ? "text-discuss" : change.status === "better" ? "text-steady" : "text-muted";
  return (
    <div className="card p-4">
      <p className="text-sm font-medium">{info.label}</p>
      <p className={`mt-1 flex items-center gap-1 text-lg font-semibold ${tone}`}>
        <Icon size={18} />
        {change.delta > 0 ? "+" : ""}
        {change.delta}
      </p>
      <p className="text-xs text-muted">
        {change.status === "stable" ? "within your normal range" : change.status === "worse" ? "above your normal" : "better than baseline"}
      </p>
    </div>
  );
}

function Reminders() {
  const [every, setEvery] = useState(3);
  const [hour, setHour] = useState(9);
  return (
    <section className="card mt-6 flex flex-wrap items-center gap-3 p-4">
      <BellRing className="text-primary" size={20} />
      <div className="min-w-48 flex-1">
        <p className="text-sm font-semibold">Check-in reminders</p>
        <p className="text-xs text-muted">Adds a repeating event to your phone&apos;s calendar. No account needed.</p>
      </div>
      <select className="field !w-auto !py-1.5 text-sm" value={every} onChange={(e) => setEvery(Number(e.target.value))} aria-label="How often">
        {[2, 3, 4, 7].map((d) => (
          <option key={d} value={d}>
            every {d} days
          </option>
        ))}
      </select>
      <select className="field !w-auto !py-1.5 text-sm" value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Time">
        {[7, 8, 9, 10, 12, 18, 20].map((h) => (
          <option key={h} value={h}>
            {h}:00
          </option>
        ))}
      </select>
      <button className="btn btn-ghost !py-1.5 text-sm" onClick={() => downloadReminders(every, hour)}>
        Add to calendar
      </button>
    </section>
  );
}
