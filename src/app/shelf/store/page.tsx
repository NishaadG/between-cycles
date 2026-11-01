import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { ArrowLeft, Info } from "lucide-react";
import snapshot from "@/data/products.json";
import type { CatalogProduct } from "@/lib/catalog";
import { productUrl } from "@/lib/catalog";
import { CopyCode } from "./CopyCode";

export const metadata: Metadata = {
  title: "Demo shop · Between Cycles",
  description: "A mock shop page showing the gentle-during-treatment badge on real products.",
};

// A mock product listing to show the badge working on a page that isn't
// ours. The products and ingredient lists are real (Open Beauty Facts);
// the shop is not, and nothing here is for sale.
const CODES = [
  "3606000537750", // foaming cleanser
  "3574660149807", // blackhead scrub
  "3282770141214", // SPF 50+
  "4005800001192", // classic cream
  "3337875766326", // hand cream
  "3605970360757", // face cream
];

const EMBED = `<div data-gentle-badge data-ingredients-from="#ingredients"></div>
<script src="https://between-cycles.vercel.app/badge.js" async></script>`;

const API = `GET https://between-cycles.vercel.app/api/check?ingredients=Aqua,Glycerin,Parfum

{
  "verdict": "avoid",
  "label": "Not advised during treatment",
  "summary": "Contains fragrance.",
  "flags": [{ "name": "Fragrance", "reason": "...", "sources": [...] }],
  "helpful": [{ "name": "Hydrating ingredients" }]
}`;

export default function DemoStore() {
  const all = snapshot.products as CatalogProduct[];
  const products = CODES.map((c) => all.find((p) => p.code === c)).filter((p): p is CatalogProduct => !!p);
  const label = Object.fromEntries(snapshot.categories.map((c) => [c.id, c.label]));

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#1f2a2e]">
      <div className="bg-[#1f2a2e] px-4 py-2 text-xs text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/shelf" className="inline-flex items-center gap-1 font-semibold">
            <ArrowLeft size={14} /> Between Cycles
          </Link>
          <span className="opacity-80">
            Demo: a mock shop page with the badge embedded. Products and ingredient lists are real; the shop isn&apos;t, and
            nothing is for sale.
          </span>
        </div>
      </div>

      <header className="border-b border-black/10 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4">
          <p className="text-xl font-bold tracking-tight">
            Example Pharmacy <span className="text-sm font-normal text-black/50">(fictional)</span>
          </p>
          <nav className="hidden gap-5 text-sm text-black/60 sm:flex" aria-label="Demo shop sections">
            <span>Skincare</span>
            <span>Sun care</span>
            <span>Hands &amp; body</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Skincare</h1>
        <p className="mt-1 text-sm text-black/60">
          Each product shows a badge for customers in cancer treatment. Tap <em>Why?</em> on any badge.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.code} className="flex min-w-0 flex-col rounded-2xl border border-black/10 bg-white p-4">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="h-40 w-full rounded-xl object-contain" />
              ) : (
                <span className="h-40 w-full rounded-xl bg-black/5" />
              )}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-black/50">{p.brand}</p>
              <h2 className="font-semibold leading-snug">{p.name}</h2>
              <p className="text-xs text-black/50">{label[p.category]}</p>
              <div className="mt-3 min-h-9" data-gentle-badge="" data-ingredients-from={`#ing-${p.code}`} />
              <details className="mt-3 text-xs text-black/60">
                <summary className="cursor-pointer select-none">Ingredients</summary>
                <p id={`ing-${p.code}`} className="mt-1 leading-relaxed">
                  {p.ingredients}
                </p>
              </details>
              <a
                href={productUrl(p.code)}
                target="_blank"
                rel="noreferrer"
                className="mt-auto pt-3 text-xs text-black/50 underline underline-offset-2"
              >
                Product data on Open Beauty Facts
              </a>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-lg font-bold">Add the badge to your shop</h2>
          <p className="mt-1 text-sm text-black/60">
            Two lines on a product page. The script reads the ingredient list already on the page and draws the badge in a
            shadow DOM, so it can&apos;t clash with your styles. No key, no cookies, no tracking: only the public ingredient
            text is sent.
          </p>
          <CopyCode code={EMBED} />
          <h3 className="mt-6 font-semibold">Or call the API from your own catalogue</h3>
          <p className="mt-1 text-sm text-black/60">
            Open to any origin and cached at the edge. Use it to badge a whole range at import time, or to build a
            &ldquo;gentle during treatment&rdquo; filter.
          </p>
          <CopyCode code={API} />
          <p className="mt-4 flex gap-2 text-xs text-black/60">
            <Info size={14} className="mt-0.5 shrink-0" />
            The badge uses the same ten cited rules as the app. A green badge means nothing on the watch-list, not a medical
            endorsement. Rules and sources: <Link href="/method#products" className="underline">method page</Link>.
          </p>
        </section>

        <p className="mt-6 text-xs text-black/50">
          Product data:{" "}
          <a href={snapshot.url} className="underline" target="_blank" rel="noreferrer">
            {snapshot.source}
          </a>
          , {snapshot.license}.
        </p>
      </main>

      <Script src="/badge.js" strategy="afterInteractive" />
    </div>
  );
}
