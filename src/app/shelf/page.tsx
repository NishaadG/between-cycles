"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Cite, PageTitle, Spinner } from "@/components/ui";
import { checkIngredients } from "@/lib/ingredients";
import { useCatalog } from "@/lib/useCatalog";
import { useJourney } from "@/lib/useJourney";

// The same cited rules, pointed at a whole range instead of one product:
// for a pharmacy, an oncology clinic shop or a retailer deciding what to
// put on a "gentle during treatment" shelf.

const SAMPLE = `Barrier Cream | Aqua, Glycerin, Cetearyl Alcohol, Urea, Butyrospermum Parkii Butter, Dimethicone, Phenoxyethanol
Fresh Gel Moisturiser | Aqua, Alcohol Denat., Glycerin, Parfum, Limonene, Carbomer
Clear Skin Wash | Aqua, Sodium Laureth Sulfate, Salicylic Acid, Parfum
Daily SPF 50 | Aqua, Zinc Oxide, Glycerin, Caprylic/Capric Triglyceride, Tocopherol`;

interface Row {
  name: string;
  overall: "ok" | "caution" | "avoid";
  flags: string[];
}

function parseRange(text: string): Row[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const sep = line.includes("|") ? "|" : line.includes("\t") ? "\t" : null;
      const [name, ingredients] = sep ? [line.slice(0, line.indexOf(sep)), line.slice(line.indexOf(sep) + 1)] : [`Product ${i + 1}`, line];
      const r = checkIngredients(ingredients);
      return {
        name: name.trim(),
        overall: r.overall,
        flags: r.findings.filter((f) => f.rule.verdict !== "helpful").map((f) => f.rule.name),
      };
    });
}

const LABEL = { ok: "Gentle shelf", caution: "Ask the care team", avoid: "Not for now" };
const TONE = { ok: "bg-steady-soft text-steady", caution: "bg-discuss-soft text-discuss", avoid: "bg-urgent-soft text-urgent" };

function downloadCsv(rows: Row[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = ["product,result,flags", ...rows.map((r) => [esc(r.name), r.overall, esc(r.flags.join("; "))].join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "shelf-check.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Shelf() {
  const { profile } = useJourney();
  const data = useCatalog();
  const [text, setText] = useState("");
  const rows = useMemo(() => (text.trim() ? parseRange(text) : []), [text]);

  const totals = data?.categories.reduce(
    (acc, c) => ({ total: acc.total + c.audit.total, ok: acc.ok + c.audit.ok }),
    { total: 0, ok: 0 },
  );

  return (
    <Shell profile={profile}>
      <Link href="/products" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        <ArrowLeft size={16} /> Products
      </Link>
      <PageTitle
        title="Shelf check"
        subtitle="For pharmacies, hospital shops and beauty retailers: which of your products suit someone whose skin is reacting to cancer treatment?"
      />

      <section className="card p-5">
        <h2 className="font-semibold">Why this shelf matters</h2>
        <p className="mt-2 text-sm leading-relaxed">
          About 9 in 10 people on EGFR-inhibitor therapy develop a rash, and patient guidance asks them to avoid fragrance,
          drying alcohol and acne actives. Those are exactly the ingredients most shelves are full of. A patient standing in
          an aisle has no quick way to tell. <Cite ids={["uspharm", "stgeorges", "macmillan"]} />
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-serif text-2xl font-semibold">An open catalogue, audited</h2>
        {!data || !totals ? (
          <Spinner label="Loading" />
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Only <strong className="text-ink">{totals.ok} of {totals.total.toLocaleString()}</strong> real products (
              {Math.round((totals.ok / totals.total) * 100)}%) pass every rule. Snapshot from {data.source.name},{" "}
              {data.source.fetchedAt}.
            </p>
            <div className="card mt-4 overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 text-right font-medium">Products</th>
                    <th className="p-3 text-right font-medium">Pass</th>
                    <th className="p-3 font-medium">Most common flags</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map(({ audit: a }) => (
                    <tr key={a.id} className="border-t border-line">
                      <td className="p-3 font-medium">{a.label}</td>
                      <td className="p-3 text-right tabular-nums">{a.total}</td>
                      <td className="p-3 text-right tabular-nums">{Math.round((a.ok / a.total) * 100)}%</td>
                      <td className="p-3 text-xs text-muted">
                        {a.flags
                          .slice(0, 3)
                          .map((f) => `${f.name} (${f.count})`)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">
              Data: <a href={data.source.url} className="underline" target="_blank" rel="noreferrer">{data.source.name}</a>,{" "}
              {data.source.license}. Only products with a usable ingredient list are counted.
            </p>
          </>
        )}
      </section>

      <section className="card mt-8 p-5">
        <h2 className="font-semibold">Check your own range</h2>
        <p className="mt-1 text-sm text-muted">
          One product per line: <code className="rounded bg-surface-2 px-1">name | ingredients</code>. Paste from a
          spreadsheet (tab-separated works too). It runs in your browser; nothing is uploaded.
        </p>
        <textarea
          className="field mt-3 min-h-36 font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Product name | Aqua, Glycerin, …"
          aria-label="Products and ingredients"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted hover:text-ink" onClick={() => setText(SAMPLE)}>
            Try a sample range (made-up products)
          </button>
        </div>

        {rows.length > 0 && (
          <>
            <p className="mt-5 text-sm">
              <strong>{rows.filter((r) => r.overall === "ok").length}</strong> of {rows.length} can go on a gentle shelf.
            </p>
            <ul className="mt-3 divide-y divide-line">
              {rows.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[r.overall]}`}>{LABEL[r.overall]}</span>
                  <span className="text-sm font-medium">{r.name}</span>
                  {r.flags.length > 0 && <span className="text-xs text-muted">{r.flags.join(", ")}</span>}
                </li>
              ))}
            </ul>
            <button className="btn btn-ghost mt-4 text-sm" onClick={() => downloadCsv(rows)}>
              <Download size={16} /> Download results (CSV)
            </button>
          </>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Rules flag ingredients named in published patient guidance; they don&apos;t test products. A pass means nothing on the
        watch-list, not a medical endorsement. Each rule and its source is listed on the{" "}
        <Link href="/method" className="underline">
          method page
        </Link>
        .
      </p>
    </Shell>
  );
}
