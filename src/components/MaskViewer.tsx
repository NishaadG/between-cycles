"use client";

import { useState } from "react";
import { WATCHED, type ConcernId } from "@/lib/concerns";
import type { SkinAnalysis } from "@/lib/types";

// Shows the photo with one detection mask blended on top. Masks are PNGs
// whose alpha marks where the concern was detected.
export function MaskViewer({ photo, analysis }: { photo?: string; analysis: SkinAnalysis }) {
  const available = WATCHED.filter((w) => analysis.concerns[w.id]?.maskUrl);
  const [active, setActive] = useState<ConcernId | null>(available[0]?.id ?? null);
  if (!photo) return null;
  const mask = active ? analysis.concerns[active]?.maskUrl : undefined;
  return (
    <div>
      <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="Your scan photo" className="w-full" />
        {mask && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mask} alt="" className="absolute inset-0 h-full w-full object-fill" />
        )}
      </div>
      {available.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {available.map((w) => (
            <button
              key={w.id}
              onClick={() => setActive(active === w.id ? null : w.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                active === w.id ? "bg-primary text-on-primary" : "bg-surface-2 text-muted"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
