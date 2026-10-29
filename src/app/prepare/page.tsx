"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImagePlus, RotateCcw } from "lucide-react";
import { Camera } from "@/components/Camera";
import { Shell } from "@/components/Shell";
import { PageTitle, Spinner } from "@/components/ui";
import { preparePhoto, type PreparedPhoto } from "@/lib/image";
import { addTryOn, listTryOns, newId, type SavedTryOn } from "@/lib/store";
import type { TryOnKind } from "@/lib/types";
import { useJourney } from "@/lib/useJourney";

const STYLES: Record<"scarf" | "hat", { id: string; label: string }[]> = {
  scarf: [
    { id: "random", label: "Surprise me" },
    { id: "style_modern_chic", label: "Modern chic" },
    { id: "style_french_elegance", label: "French elegance" },
    { id: "style_light_luxury", label: "Light luxury" },
    { id: "style_cottagecore", label: "Cottagecore" },
    { id: "style_bohemian", label: "Bohemian" },
  ],
  hat: [
    { id: "random", label: "Surprise me" },
    { id: "style_warm_cozy", label: "Warm & cozy" },
    { id: "style_urban_fashion", label: "Urban" },
    { id: "style_sporty_casual", label: "Sporty casual" },
    { id: "style_vacation_casual", label: "Vacation" },
    { id: "style_bohemian", label: "Bohemian" },
  ],
};

const TABS: { id: TryOnKind; label: string; hint: string; shop: string }[] = [
  { id: "scarf", label: "Headscarves", hint: "Upload a photo of a scarf you own or like.", shop: "soft cotton head scarf for hair loss" },
  { id: "hat", label: "Hats & beanies", hint: "Upload a photo of a hat or beanie.", shop: "soft cotton chemo beanie" },
  { id: "hair", label: "Shorter styles", hint: "Some people find going shorter first makes the change feel more in their control.", shop: "" },
];

const SAMPLES: Record<"scarf" | "hat", { src: string; label: string }[]> = {
  scarf: [
    { src: "/samples/scarf-floral.jpg", label: "Floral cotton" },
    { src: "/samples/scarf-magenta.jpg", label: "Printed silk" },
    { src: "/samples/scarf-bandana.jpg", label: "Bandana" },
  ],
  hat: [{ src: "/samples/hat-beanie.jpg", label: "Soft beanie" }],
};

interface Template {
  id: string;
  title: string;
  thumbnail: string;
}

export default function Prepare() {
  const { profile } = useJourney();
  const [selfie, setSelfie] = useState<PreparedPhoto | null>(null);
  const [tab, setTab] = useState<TryOnKind>("scarf");
  const [ref, setRef] = useState<{ blob: Blob; url: string } | null>(null);
  const [style, setStyle] = useState("random");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SavedTryOn | null>(null);
  const [showBefore, setShowBefore] = useState(false);
  const [gallery, setGallery] = useState<SavedTryOn[]>([]);

  useEffect(() => {
    listTryOns().then(setGallery);
  }, []);

  useEffect(() => {
    if (tab !== "hair" || templates) return;
    fetch("/api/hair-templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]));
  }, [tab, templates]);

  const current = TABS.find((t) => t.id === tab)!;
  const canRun = !!selfie && (tab === "hair" ? !!templateId : !!ref);

  async function run() {
    if (!selfie) return;
    setBusy(true);
    setError("");
    setResult(null);
    const body = new FormData();
    body.append("selfie", selfie.blob, "selfie.jpg");
    body.append("kind", tab);
    if (tab === "hair" && templateId) body.append("templateId", templateId);
    if (tab !== "hair" && ref) {
      body.append("ref", ref.blob, "item.jpg");
      body.append("style", style);
      body.append("gender", gender);
    }
    try {
      const res = await fetch("/api/tryon", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Try-on failed.");
      const label =
        tab === "hair"
          ? (templates?.find((t) => t.id === templateId)?.title ?? "Shorter style")
          : `${current.label.replace(/s$/, "")} · ${STYLES[tab].find((s) => s.id === style)?.label}`;
      const saved: SavedTryOn = { id: newId(), kind: tab, label, image: json.imageDataUrl, createdAt: new Date().toISOString() };
      setResult(saved);
      if (json.mode === "live") {
        await addTryOn(saved);
        setGallery(await listTryOns());
      }
      setShowBefore(false);
      if (json.mode === "mock") setError("Offline mode: showing your original photo instead of a try-on.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try-on failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell profile={profile}>
      <PageTitle
        title="Prepare for hair loss"
        subtitle="Not every treatment causes hair loss. If yours might, you can try options on your own photo now, at your own pace."
      />

      {!selfie ? (
        <section className="card p-5">
          <h2 className="mb-1 font-semibold">1. A head-and-shoulders photo</h2>
          <p className="mb-4 text-sm text-muted">Plain background, just you, shoulders visible.</p>
          <Camera guide="upper" onPhoto={async (b) => setSelfie(await preparePhoto(b))} />
        </section>
      ) : (
        <>
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">2. Choose what to try</h2>
              <button className="text-sm text-muted hover:text-ink" onClick={() => setSelfie(null)}>
                Change photo
              </button>
            </div>
            <div className="mt-4 flex gap-1 rounded-full bg-surface-2 p-1" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => {
                    setTab(t.id);
                    setStyle("random");
                    setRef(null);
                  }}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">{current.hint}</p>

            {tab !== "hair" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {SAMPLES[tab].map((sm) => (
                  <button
                    key={sm.src}
                    title={sm.label}
                    onClick={async () => setRef({ blob: await (await fetch(sm.src)).blob(), url: sm.src })}
                    className={`size-16 overflow-hidden rounded-xl border-2 ${ref?.url === sm.src ? "border-primary" : "border-line"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sm.src} alt={sm.label} className="h-full w-full object-cover" />
                  </button>
                ))}
                <span className="self-center text-xs text-muted">Samples, or upload your own below</span>
              </div>
            )}

            {tab !== "hair" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-line bg-surface-2 text-sm text-muted">
                  {ref ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ref.url} alt="Item to try on" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus size={22} /> Item photo
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setRef({ blob: f, url: URL.createObjectURL(f) });
                    }}
                  />
                </label>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Styling</span>
                    <select className="field" value={style} onChange={(e) => setStyle(e.target.value)}>
                      {STYLES[tab].map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Fit</span>
                    <select className="field" value={gender} onChange={(e) => setGender(e.target.value as "female" | "male")}>
                      <option value="female">Feminine</option>
                      <option value="male">Masculine</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : templates === null ? (
              <div className="mt-4">
                <Spinner label="Loading styles" />
              </div>
            ) : templates.length === 0 ? (
              <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-muted">Styles are unavailable in offline mode.</p>
            ) : (
              <div className="mt-4 grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`overflow-hidden rounded-xl border-2 ${templateId === t.id ? "border-primary" : "border-transparent"}`}
                    title={t.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.thumbnail} alt={t.title} className="aspect-square w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            <button className="btn btn-primary mt-5 w-full" disabled={!canRun || busy} onClick={run}>
              {busy ? "Creating your preview… (up to a minute)" : "Try it on"}
            </button>
            {error && <p className="mt-3 text-sm text-discuss">{error}</p>}
          </section>

          {result && (
            <section className="card mt-5 p-5">
              <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={showBefore ? selfie.thumb : result.image} alt={result.label} className="w-full" />
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button className="btn btn-ghost" onClick={() => setShowBefore((s) => !s)}>
                  <RotateCcw size={16} /> {showBefore ? "Show preview" : "Show original"}
                </button>
                {current.shop && (
                  <a
                    className="btn btn-ghost"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(current.shop)}`}
                  >
                    <ExternalLink size={16} /> Find similar
                  </a>
                )}
              </div>
              <p className="mt-3 text-center text-xs text-muted">AI-generated preview. Real fabrics and fit will differ.</p>
            </section>
          )}
        </>
      )}

      {gallery.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Saved previews</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {gallery.map((g) => (
              <figure key={g.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image} alt={g.label} className="aspect-[3/4] w-full rounded-xl object-cover" />
                <figcaption className="mt-1 truncate text-xs text-muted">{g.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
