"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, CircleAlert, OctagonX } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Cite, PageTitle } from "@/components/ui";
import { preparePhoto } from "@/lib/image";
import { EXAMPLES, checkIngredients, type Verdict } from "@/lib/ingredients";
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
