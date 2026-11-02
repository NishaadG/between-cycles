"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import { Logo } from "@/components/Shell";
import { Cite, Disclaimer } from "@/components/ui";
import { getProfile, seedDemo } from "@/lib/store";

const STATS = [
  { value: "9 in 10", label: "people on EGFR-targeted therapy get a skin reaction", cite: "uspharm" as const },
  { value: "21%", label: "of 1,033 real skincare products pass every guidance rule", href: "/shelf" },
  { value: "11 / 11", label: "label photos read to the same verdict as a human transcription", href: "/method#measured" },
  { value: "5", label: "YouCam AI APIs, each doing a real job", href: "/method" },
];

const STEPS = [
  {
    n: "01",
    title: "Set your normal",
    body: "Three scans before treatment. They also measure how much your scores wobble between photos when nothing has changed.",
  },
  {
    n: "02",
    title: "Check in, without the guesswork",
    body: "Each scan is compared with your own baseline. A change only counts when it's bigger than your own photo-to-photo noise.",
  },
  {
    n: "03",
    title: "Bring one page",
    body: "Changes, charts across cycles, photos and symptoms on a printable page, so “it's been bad, I think” becomes something your team can act on.",
  },
];

const FEATURES = [
  {
    title: "Honest about skin tone",
    body: "Redness is harder to see on deeper skin. Skin type is measured once, and the app says plainly when a reading is less reliable.",
  },
  {
    title: "Picked for your skin today",
    body: "Each change maps to what guidance says helps, filled with real products that pass every rule. No ads, no affiliate links.",
  },
  {
    title: "Is this product okay now?",
    body: "Snap the ingredient list. AI only reads it; ten fixed rules, each citing patient guidance, decide.",
  },
  {
    title: "Hair, tracked and previewed",
    body: "Hair density measured each cycle, and shorter styles or no hair previewed on your own face, before it happens.",
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
    <div className="min-h-dvh overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="flex items-center gap-1 text-[13px] font-medium">
            <Link href="/method" className="hidden rounded-lg px-3 py-1.5 text-muted hover:text-ink sm:block">
              How it works
            </Link>
            <Link href="/shelf" className="hidden rounded-lg px-3 py-1.5 text-muted hover:text-ink sm:block">
              For shops
            </Link>
            <Link href={hasProfile ? "/today" : "/setup"} className="btn btn-primary !px-3.5 !py-1.5 !text-[13px]">
              {hasProfile ? "Open app" : "Get started"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_70%_20%,var(--primary-soft),transparent_70%)] opacity-80"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20">
            <div className="rise">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[13px] font-medium text-muted shadow-[var(--shadow)]">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden /> For people going through cancer treatment
              </p>
              <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                Know when your skin is <span className="text-primary">really</span> changing.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Between Cycles measures your skin against your own baseline, ignores normal photo-to-photo noise, and turns it
                into one page your care team can act on.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={hasProfile ? "/today" : "/setup"} className="btn btn-primary !px-5 !py-3">
                  {hasProfile ? "Continue" : "Start my baseline"} <ArrowRight size={17} />
                </Link>
                <button onClick={openDemo} disabled={busy} className="btn btn-ghost !px-5 !py-3">
                  {busy ? "Loading…" : "Explore a demo journey"}
                </button>
              </div>
              <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Lock size={13} /> Photos stay on your phone
                </span>
                <span>No account</span>
                <span>Not a diagnosis</span>
              </p>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Numbers */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line md:grid-cols-4 md:border-x md:border-line">
            {STATS.map((s) => {
              const body = (
                <>
                  <p className="num text-3xl font-semibold sm:text-4xl">{s.value}</p>
                  <p className="mt-2 text-[13px] leading-snug text-muted">{s.label}</p>
                </>
              );
              const cls = "block bg-surface px-4 py-7 md:px-6";
              return s.href ? (
                <Link key={s.value} href={s.href} className={`${cls} transition hover:bg-surface-2`}>
                  {body}
                </Link>
              ) : (
                <div key={s.value} className={cls}>
                  {body}
                  <p className="mt-1.5">
                    <Cite ids={[s.cite!]} />
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Patients are told to report any changes. Nobody tells them what counts as one.
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t border-ink/80 pt-5">
                <p className="font-mono text-[13px] text-muted">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface p-7">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Shops */}
        <section className="border-y border-white/10 bg-[#111816] text-[#eef1f0]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
            <div>
              <p className="eyebrow !text-[#9aa5a2]">For pharmacies and shops</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                A gentle shelf, on every product page.
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#b9c3c0]">
                The same cited rules audit a whole range, and a two-line embed puts &ldquo;Gentle during treatment&rdquo; on
                the products that pass, with the reason one tap away. Only about 1 in 5 real products we checked does.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/shelf/store" className="btn bg-[#eef1f0] !px-5 !py-3 text-[#111816] hover:opacity-90">
                  See it on a demo shop <ArrowUpRight size={17} />
                </Link>
                <Link href="/shelf" className="btn border border-white/15 !px-5 !py-3 text-[#eef1f0] hover:bg-white/5">
                  Audit a range
                </Link>
              </div>
            </div>
            <BadgePreview />
          </div>
        </section>

        {/* Privacy */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="eyebrow">Private by design</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Nothing to sign up for. Nothing kept on our server.</h2>
            </div>
            <div className="space-y-4 text-[15px] leading-relaxed text-muted">
              <p>
                Photos and history stay on this device. A photo is sent to the skin analysis service only while it is being
                measured, and nothing is stored on our server. There are no accounts.
              </p>
              <Disclaimer />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-muted">
          <Logo />
          <nav className="flex flex-wrap gap-5">
            <Link href="/method" className="hover:text-ink">
              Method and sources
            </Link>
            <Link href="/shelf" className="hover:text-ink">
              For shops
            </Link>
            <a href="https://github.com/NishaadG/between-cycles" target="_blank" rel="noreferrer" className="hover:text-ink">
              Source code
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// Static artwork of the Today screen: a personal normal band and a rise
// that clears it. Not data.
function HeroPreview() {
  const pts = [12, 12.5, 11.8, 12.4, 14, 19, 24, 27, 28, 23, 20];
  const x = (i: number) => 14 + i * 31;
  const y = (v: number) => 150 - (v - 6) * 4.6;
  const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${x(pts.length - 1)},160 L${x(0)},160 Z`;
  return (
    <div className="rise relative mx-auto w-full max-w-md [animation-delay:120ms]" aria-label="Illustration of the app" role="img">
      <div className="rounded-[1.6rem] border border-line bg-surface p-2 shadow-[var(--shadow-lg)]">
        <div className="rounded-[1.15rem] bg-discuss-soft p-5">
          <p className="text-[12px] font-medium text-discuss">Cycle 2 · Day 11</p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">Worth mentioning to your care team</p>
          <p className="mt-1 text-[13px] text-ink/70">Bumps &amp; spots up 9.5 points, beyond your normal variation</p>
        </div>
        <div className="px-4 pb-3 pt-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-medium">Bumps &amp; spots</p>
            <p className="num text-[13px] font-semibold text-discuss">+9.5</p>
          </div>
          <svg viewBox="0 0 340 170" className="mt-2 w-full" aria-hidden>
            <defs>
              <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--chart-2)" stopOpacity="0.18" />
                <stop offset="1" stopColor="var(--chart-2)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x="0" y={y(15.5)} width="340" height={y(8.5) - y(15.5)} fill="var(--primary-soft)" rx="6" />
            <text x="6" y={y(15.5) - 6} fontSize="10" fill="var(--muted)">
              your normal range
            </text>
            <line x1={x(3.5)} x2={x(3.5)} y1="8" y2="160" stroke="var(--line)" strokeDasharray="3 4" />
            <text x={x(3.5) + 5} y="16" fontSize="10" fill="var(--muted)">
              treatment starts
            </text>
            <path d={area} fill="url(#hero-fill)" />
            <path d={line} fill="none" stroke="var(--chart-2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill={v > 15.5 ? "var(--chart-2)" : "var(--surface)"} stroke="var(--chart-2)" strokeWidth="1.8" />
            ))}
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[1.15rem] border border-line bg-line text-center">
          {[
            ["Redness", "+4.5", true],
            ["Dryness", "+2.6", false],
            ["Patches", "+6.3", true],
          ].map(([label, v, up]) => (
            <div key={label as string} className="bg-surface px-2 py-3">
              <p className="text-[11px] text-muted">{label}</p>
              <p className={`num mt-0.5 text-[15px] font-semibold ${up ? "text-discuss" : "text-muted"}`}>{v}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted">Illustration</p>
    </div>
  );
}

// Static artwork of the shop badge, in the colours /badge.js uses.
function BadgePreview() {
  const rows: [string, string, "ok" | "avoid"][] = [
    ["Foaming facial cleanser", "Cleansers", "ok"],
    ["Blackhead clearing scrub", "Cleansers", "avoid"],
    ["Mineral sun cream SPF 50+", "Sunscreens", "ok"],
  ];
  return (
    <div className="space-y-3" role="img" aria-label="Illustration of product cards with gentle-during-treatment badges">
      {rows.map(([name, cat, v], i) => (
        <div
          key={name}
          className="flex items-center gap-4 rounded-2xl bg-white p-3 text-[#111816] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.6)]"
          style={{ marginLeft: `${i * 18}px` }}
        >
          <span className="h-14 w-12 shrink-0 rounded-lg bg-[#eceeec]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{name}</p>
            <p className="text-[12px] text-[#5f6b68]">{cat}</p>
            <span
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[12px] font-semibold"
              style={{ background: v === "ok" ? "#e6f4ec" : "#fbe7e5", color: v === "ok" ? "#1d6b45" : "#a3312a" }}
            >
              <span
                className="grid size-4 place-items-center rounded-full text-[10px] text-white"
                style={{ background: v === "ok" ? "#1d6b45" : "#a3312a" }}
              >
                {v === "ok" ? "✓" : "×"}
              </span>
              {v === "ok" ? "Gentle during treatment" : "Not advised during treatment"}
            </span>
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-[#9aa5a2]">Illustration</p>
    </div>
  );
}
