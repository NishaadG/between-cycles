"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Camera, CheckCircle2, CircleAlert, ExternalLink, OctagonX } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Cite, PageTitle } from "@/components/ui";
import { preparePhoto } from "@/lib/image";
import { EXAMPLES, checkIngredients, type Verdict } from "@/lib/ingredients";
import { productUrl } from "@/lib/catalog";
import { useCatalog } from "@/lib/useCatalog";
import { useJourney } from "@/lib/useJourney";

const VERDICT: Record<Verdict, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  avoid: { label: "Avoid for now", cls: "bg-urgent-soft text-urgent", icon: OctagonX },
  caution: { label: "Ask your team", cls: "bg-discuss-soft text-discuss", icon: CircleAlert },
  helpful: { label: "Helpful", cls: "bg-steady-soft text-steady", icon: CheckCircle2 },
};

const OVERALL = {
  avoid: { title: "Not a good pick right now", cls: "bg-urgent-soft" },
  caution: { title: "Check with your care team first", cls: "bg-discuss-soft" },
  ok: { title: "Nothing on our watch-list", cls: "bg-steady-soft" },
};

export default function Products() {
  const { profile } = useJourney();
  const [text, setText] = useState("");
  const [canRead, setCanRead] = useState(false);
  const [reading, setReading] = useState(false);
  const [readInfo, setReadInfo] = useState<{ name: string; note: string; legible: boolean } | null>(null);
  const [readError, setReadError] = useState("");

  useEffect(() => {
    fetch("/api/label")
      .then((r) => r.json())
      .then((d) => setCanRead(!!d.available))
      .catch(() => {});
  }, []);

  async function snap(file: File) {
    setReading(true);
    setReadError("");
    setReadInfo(null);
    try {
      const { blob } = await preparePhoto(file);
      const body = new FormData();
      body.append("photo", blob, "label.jpg");
      const res = await fetch("/api/label", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Couldn't read that label.");
      if (!json.ingredients.length) throw new Error(json.note || "No ingredient list found in that photo.");
      setText(json.ingredients.join(", "));
      setReadInfo({ name: json.productName, note: json.note, legible: json.legible });
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "Couldn't read that label.");
    } finally {
      setReading(false);
    }
  }
  const result = useMemo(() => (text.trim() ? checkIngredients(text) : null), [text]);
  const order: Verdict[] = ["avoid", "caution", "helpful"];

  return (
    <Shell profile={profile}>
      <PageTitle
        title="Is this product okay now?"
        subtitle="Photograph the ingredient list, or paste it from the shop page. Every flag below is a fixed rule with a published source."
      />

      <div className="card p-5">
        {canRead && (
          <div className="mb-4">
            <label className={`btn btn-primary w-full cursor-pointer sm:w-auto ${reading ? "pointer-events-none opacity-60" : ""}`}>
              <Camera size={18} /> {reading ? "Reading the label…" : "Snap the ingredient list"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) snap(f);
                  e.target.value = "";
                }}
              />
            </label>
            {readInfo && (
              <p className={`mt-3 rounded-xl p-3 text-sm ${readInfo.legible ? "bg-primary-soft" : "bg-discuss-soft text-discuss"}`}>
                {readInfo.name && <strong>{readInfo.name}: </strong>}
                Read by AI from your photo. Check it matches the label before relying on the result
                {readInfo.legible ? "." : `. ${readInfo.note || "Part of the list may be missing."}`}
              </p>
            )}
            {readError && <p className="mt-3 text-sm text-discuss">{readError}</p>}
          </div>
        )}
        <textarea
          className="field min-h-32 font-mono text-sm"
          placeholder="Aqua, Glycerin, Cetearyl Alcohol, Parfum…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Ingredient list"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex.name} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted hover:text-ink" onClick={() => setText(ex.text)}>
              {ex.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Examples are made-up formulas, not real products.</p>
      </div>

      {result && (
        <div className="mt-5 space-y-4">
          <div className={`rounded-[1.25rem] p-5 ${OVERALL[result.overall].cls}`}>
            <h2 className="font-serif text-xl font-semibold">{OVERALL[result.overall].title}</h2>
            <p className="mt-1 text-sm">
              Checked {result.ingredients.length} ingredients. Anything not listed below isn&apos;t on our watch-list, which
              is not the same as proven safe for you.
            </p>
          </div>
          {[...result.findings]
            .sort((a, b) => order.indexOf(a.rule.verdict) - order.indexOf(b.rule.verdict))
            .map((f) => {
              const v = VERDICT[f.rule.verdict];
              const Icon = v.icon;
              return (
                <div key={f.rule.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${v.cls}`}>
                      <Icon size={14} />
                      {v.label}
                    </span>
                    <h3 className="font-semibold">{f.rule.name}</h3>
                  </div>
                  <p className="mt-2 text-sm">{f.rule.reason}</p>
                  <p className="mt-1 text-xs text-muted">Found: {f.matched.join(", ")}</p>
                  <p className="mt-2">
                    <Cite ids={f.rule.sources} />
                  </p>
                </div>
              );
            })}
        </div>
      )}

      <Picks
        onCheck={(ingredients) => {
          setText(ingredients);
          setReadInfo(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <section className="card mt-8 p-5">
        <h2 className="font-serif text-lg font-semibold">Gentle basics during treatment</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>Wash with lukewarm water, not hot, and use a soap-free cleanser.</li>
          <li>Moisturise while skin is still damp. Urea, hyaluronic acid, shea butter and glycerin help.</li>
          <li>Broad-spectrum SPF 30–50 every day, after moisturiser, even in winter.</li>
          <li>Choose fragrance-free products, including laundry detergent.</li>
          <li>Over-the-counter acne treatments aren&apos;t meant for treatment-related rash. Ask your team instead.</li>
        </ul>
        <p className="mt-3">
          <Cite ids={["stgeorges", "macmillan", "uspharm", "mascc"]} />
        </p>
      </section>
    </Shell>
  );
}

function Picks({ onCheck }: { onCheck: (ingredients: string) => void }) {
  const data = useCatalog();
  const [cat, setCat] = useState("face-creams");
  // "See the check" from a recommendation links here as ?code=...
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (!data || opened) return;
    setOpened(true);
    const code = new URLSearchParams(window.location.search).get("code");
    const hit = code && data.categories.flatMap((c) => c.picks.map((p) => ({ p, cat: c.audit.id }))).find((x) => x.p.code === code);
    if (hit) {
      setCat(hit.cat);
      onCheck(hit.p.ingredients);
    }
  }, [data, opened, onCheck]);
  if (!data) return null;
  const current = data.categories.find((c) => c.audit.id === cat) ?? data.categories[0];
  const a = current.audit;
  const pct = Math.round((a.ok / a.total) * 100);
  const top = a.flags[0];

  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl font-semibold">Treatment-friendly picks</h2>
      <p className="mt-1 text-sm text-muted">
        Real products from an open database, run through the same rules. No ads, no affiliate links.
      </p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {data.categories.map((c) => (
          <button
            key={c.audit.id}
            onClick={() => setCat(c.audit.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
              c.audit.id === cat ? "bg-primary font-semibold text-white" : "bg-surface-2 text-muted hover:text-ink"
            }`}
          >
            {c.audit.label}
          </button>
        ))}
      </div>

      <div className="card mt-4 p-4">
        <p className="text-sm">
          <strong className="text-lg">
            {a.ok} of {a.total}
          </strong>{" "}
          {a.label.toLowerCase()} ({pct}%) have nothing on our watch-list.
          {top && ` The most common problem is ${top.name.toLowerCase()}, in ${top.count}.`}
        </p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden>
          <span className="bg-steady" style={{ width: `${(a.ok / a.total) * 100}%` }} />
          <span className="bg-discuss" style={{ width: `${(a.caution / a.total) * 100}%` }} />
          <span className="bg-urgent" style={{ width: `${(a.avoid / a.total) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Green: no flags · amber: ask your team · red: contains something to avoid for now
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {current.picks.map((p) => (
          <li key={p.code} className="card flex min-w-0 gap-3 p-3">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-surface-2 object-contain" />
            ) : (
              <span className="h-16 w-16 shrink-0 rounded-xl bg-surface-2" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted">{p.brand || "Unknown brand"}</p>
              {p.helpful.length > 0 && (
                <p className="mt-1 truncate text-xs text-steady">Has {p.helpful.join(", ").toLowerCase()}</p>
              )}
              <div className="mt-1.5 flex gap-3 text-xs">
                <button className="font-medium text-primary" onClick={() => onCheck(p.ingredients)}>
                  See the check
                </button>
                <a href={productUrl(p.code)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-muted">
                  Product page <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Snapshot of {data.total.toLocaleString()} products from{" "}
        <a href={data.source.url} target="_blank" rel="noreferrer" className="underline">
          {data.source.name}
        </a>{" "}
        ({data.source.license}), taken {data.source.fetchedAt}. Formulas change: check the label on the pack you buy.
        Passing our rules is not the same as proven safe for you.
      </p>
      <Link href="/shelf" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
        For pharmacies and shops: audit a whole shelf <ArrowRight size={16} />
      </Link>
    </section>
  );
}
