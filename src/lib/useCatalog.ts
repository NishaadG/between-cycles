"use client";

import { useEffect, useState } from "react";
import type { CatalogPick, CategoryAudit } from "./catalog";

export type { CatalogPick };

export interface CatalogData {
  source: { name: string; license: string; url: string; fetchedAt: string };
  total: number;
  categories: { audit: CategoryAudit; picks: CatalogPick[] }[];
}

export function useCatalog() {
  const [data, setData] = useState<CatalogData | null>(null);
  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}
