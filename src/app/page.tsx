"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, FlaskConical, Ruler, Sparkles } from "lucide-react";
import { Logo } from "@/components/Shell";
import { Cite, Disclaimer } from "@/components/ui";
import { getProfile, seedDemo } from "@/lib/store";

const FEATURES = [
  {
    icon: Ruler,
    title: "Measured against you",
    body: "Three baseline scans before treatment set your normal. Later scans are compared to that, not to strangers.",
  },
  {
    icon: FileText,
    title: "Noise is ignored",
    body: "Photos vary a little even when skin doesn't. A change is only flagged when it's bigger than your own photo-to-photo variation.",
  },
  {
    icon: FlaskConical,
    title: "Is this product okay now?",
    body: "Paste an ingredient list. Each flag is a fixed rule that cites published patient guidance.",
  },
  {
    icon: Sparkles,
    title: "Prepare for hair loss",
    body: "Try scarves, hats and shorter styles on your own photo, before treatment starts.",
  },
];

export default function Landing() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getProfile().then((p) => setHasProfile(!!p && !p.demo));
  }, []);

  async function openDemo() {
    setBusy(true);
    await seedDemo();
    router.push("/today");
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <Link href="/method" className="text-sm text-muted hover:text-ink">
          How it works
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="grid items-center gap-10 py-10 md:grid-cols-[1.15fr_1fr] md:py-16">
          <div>
            <p className="mb-4 inline-block rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
              For people going through cancer treatment
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Know when your skin is really changing.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              About 9 in 10 people on EGFR-targeted therapy get a skin reaction. Between Cycles measures your skin against
              your own baseline, ignores photo-to-photo noise, and turns it into a one-page summary for your care team.
            </p>
            <p className="mt-2">
              <Cite ids={["uspharm"]} />
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={hasProfile ? "/today" : "/setup"} className="btn btn-primary">
                {hasProfile ? "Continue" : "Start my baseline"} <ArrowRight size={18} />
              </Link>
              <button onClick={openDemo} disabled={busy} className="btn btn-ghost">
                {busy ? "Loading…" : "Explore a demo journey"}
              </button>
            </div>
          </div>

          <HeroChart />
        </section>

        <section className="grid gap-4 pb-12 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <Icon className="text-primary" size={22} />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </section>

        <section className="card mb-12 p-6">
          <h2 className="font-serif text-xl font-semibold">Private by design</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your photos and history stay on this device. A photo is sent to the skin analysis service only while it is being
            measured, and nothing is stored on our server. There are no accounts.
          </p>
          <div className="mt-4">
            <Disclaimer />
          </div>
        </section>
      </main>
    </div>
  );
}

// Illustrative sketch of what the journey view shows: a personal baseline band
// and a rise that clears it. Static artwork, not data.
function HeroChart() {
  const pts = [12, 12.5, 11.8, 12.4, 14, 19, 24, 27, 28, 23, 20];
  const x = (i: number) => 20 + i * 30;
  const y = (v: number) => 190 - (v - 6) * 6;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">Bumps &amp; spots</span>
        <span className="rounded-full bg-discuss-soft px-2 py-0.5 text-xs font-semibold text-discuss">Above your normal</span>
      </div>
      <svg viewBox="0 0 340 210" className="w-full" role="img" aria-label="Illustration of a concern rising above a personal baseline band">
        <rect x="10" y={y(15.5)} width="320" height={y(8.5) - y(15.5)} fill="var(--primary-soft)" rx="6" />
        <text x="16" y={y(15.5) - 6} fontSize="10" fill="var(--muted)">
          your normal range
        </text>
        <line x1="95" x2="95" y1="20" y2="200" stroke="var(--line)" strokeDasharray="4 4" />
        <text x="99" y="30" fontSize="10" fill="var(--muted)">
          treatment starts
        </text>
        <path d={d} fill="none" stroke="var(--chart-2)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={v > 15.5 ? "var(--chart-2)" : "var(--surface)"} stroke="var(--chart-2)" strokeWidth="2" />
        ))}
      </svg>
      <p className="mt-1 text-xs text-muted">Illustration</p>
    </div>
  );
}
