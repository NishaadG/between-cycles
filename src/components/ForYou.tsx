"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { Cite } from "@/components/ui";
import { productUrl } from "@/lib/catalog";
import { recommend } from "@/lib/recommend";
import type { Change, Guidance, SymptomId } from "@/lib/stats";
import { useCatalog } from "@/lib/useCatalog";

// "Picked for your skin today": the check-in's changes, mapped to what
// patient guidance says helps, filled with real products that pass every
// rule. Shown after a check-in; hidden when the advice is to call the team.
export function ForYou({ changes, symptoms, level }: { changes: Change[] | null; symptoms: SymptomId[]; level: Guidance }) {
  const data = useCatalog();
  if (!data) return null;
  const needs = recommend(
    changes,
    symptoms,
    level,
    data.categories.map((c) => ({ id: c.audit.id, picks: c.picks })),
  );
  if (!needs.length) return null;

  return (
    <section className="mt-8" aria-labelledby="for-you">
      <h2 id="for-you" className="flex items-center gap-2 font-serif text-2xl font-semibold">
        <Sparkles size={20} className="text-primary" /> Picked for your skin today
      </h2>
      <p className="mt-1 text-sm text-muted">
        Based on what changed at this check-in. Real products that pass every ingredient rule. No ads, no affiliate links.
      </p>

      <div className="mt-4 space-y-4">
        {needs.map((n) => (
          <div key={n.id} className="card p-4">
            <div className="flex flex-wrap gap-1.5">
              {n.because.map((b) => (
                <span key={b} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                  {b}
                </span>
              ))}
            </div>
            <h3 className="mt-2 font-semibold">{n.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {n.advice} <Cite ids={n.sources} />
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {n.items.map((p) => (
                <li key={p.code} className="flex min-w-0 gap-3 rounded-xl bg-surface-2 p-2.5 sm:flex-col sm:gap-2">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain sm:h-20 sm:w-full" />
                  ) : (
                    <span className="h-14 w-14 shrink-0 rounded-lg bg-white sm:h-20 sm:w-full" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
                    <p className="truncate text-xs text-muted">{p.brand || "Unknown brand"}</p>
                    <p className="mt-1 text-xs text-steady">{p.why}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs">
                      <Link href={`/products?code=${encodeURIComponent(p.code)}`} className="font-medium text-primary">
                        See the check
                      </Link>
                      <a href={productUrl(p.code)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-muted">
                        Product page <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Chosen by fixed rules from {data.total.toLocaleString()} products on {data.source.name} ({data.source.license}).
        Formulas change, so check the pack, and ask your team before starting anything new on broken or very sore skin.
      </p>
      <Link href="/products" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Browse all treatment-friendly picks <ArrowRight size={16} />
      </Link>
    </section>
  );
}
