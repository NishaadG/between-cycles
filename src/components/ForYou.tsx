"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
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
      <p className="eyebrow">For this check-in</p>
      <h2 id="for-you" className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">
        Picked for your skin today
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        Based on what changed at this check-in. Real products that pass every ingredient rule. No ads, no affiliate links.
      </p>

      <div className="mt-4 space-y-4">
        {needs.map((n) => (
          <div key={n.id} className="card overflow-hidden">
            <div className="p-5 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {n.because.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
                    <span className="size-1.5 rounded-full bg-discuss" aria-hidden />
                    {b}
                  </span>
                ))}
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em]">{n.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {n.advice} <Cite ids={n.sources} />
              </p>
            </div>
            <ul className="-mt-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-5 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible">
              {n.items.map((p) => (
                <li key={p.code} className="flex w-[72%] shrink-0 snap-start flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:w-auto">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-28 w-full rounded-lg bg-white object-contain" />
                  ) : (
                    <span className="h-28 w-full rounded-lg bg-surface-2" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
                    <p className="truncate text-xs text-muted">{p.brand || "Unknown brand"}</p>
                    <p className="mt-1 text-xs text-steady">{p.why}</p>
                    <div className="mt-auto flex flex-wrap gap-x-3 pt-2 text-xs">
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
