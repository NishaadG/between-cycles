"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ConcernChart, toPoints } from "@/components/ConcernChart";
import { Shell } from "@/components/Shell";
import { GuidanceBadge, PageTitle, Spinner } from "@/components/ui";
import { WATCHED } from "@/lib/concerns";
import { SYMPTOMS, cyclePosition } from "@/lib/stats";
import { deleteScan } from "@/lib/store";
import { useJourney } from "@/lib/useJourney";

const COLORS = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-4)"];

export default function Journey() {
  const j = useJourney();
  if (j.loading) {
    return (
      <Shell>
        <Spinner label="Loading" />
      </Shell>
    );
  }
  if (!j.profile || !j.scans.length) {
    return (
      <Shell profile={j.profile}>
        <PageTitle title="Your journey" />
        <div className="card p-6 text-center">
          <p className="text-muted">No scans yet.</p>
          <Link href={j.profile ? "/scan?kind=baseline" : "/setup"} className="btn btn-primary mt-4">
            Take your first scan
          </Link>
        </div>
      </Shell>
    );
  }
  const profile = j.profile;
  const start = new Date(profile.firstCycleStart + "T00:00:00");

  return (
    <Shell profile={profile}>
      <PageTitle
        title="Your journey"
        subtitle="The shaded band is your normal range: your baseline average plus or minus your own photo-to-photo variation. Filled dots are check-ins above it."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {WATCHED.map((w, i) => {
          const stat = j.baseline?.[w.id] ?? null;
          return (
            <section key={w.id} className="card p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{w.label}</h2>
                {stat && (
                  <span className="text-xs text-muted">
                    normal {stat.mean} ± {stat.mdc}
                  </span>
                )}
              </div>
              <p className="mb-2 text-xs text-muted">{w.why}</p>
              <ConcernChart points={toPoints(j.scans, w.id, profile.firstCycleStart)} stat={stat} cycleLength={profile.cycleLength} color={COLORS[i]} />
            </section>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 font-semibold">All scans</h2>
      <ul className="space-y-2">
        {[...j.scans].reverse().map((s) => {
          const ci = j.checkIns.find((c) => c.scan.id === s.id);
          const pos = cyclePosition(new Date(s.takenAt), start, profile.cycleLength);
          return (
            <li key={s.id} className="card flex items-center gap-3 p-3">
              {s.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo} alt="" className="size-12 rounded-xl object-cover" />
              ) : (
                <div className="size-12 rounded-xl bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {new Date(s.takenAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                  {pos ? `Cycle ${pos.cycle}, day ${pos.day}` : "Before treatment"}
                </p>
                <p className="truncate text-xs text-muted">
                  {s.kind === "baseline" ? "Baseline" : "Check-in"}
                  {s.symptoms.length > 0 && ` · ${s.symptoms.map((id) => SYMPTOMS.find((x) => x.id === id)?.label).join(", ")}`}
                </p>
              </div>
              {ci && <GuidanceBadge level={ci.guidance.level} compact />}
              <button
                aria-label="Delete scan"
                className="p-2 text-muted hover:text-urgent"
                onClick={async () => {
                  if (!confirm("Delete this scan?")) return;
                  await deleteScan(s.id);
                  j.reload();
                }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
