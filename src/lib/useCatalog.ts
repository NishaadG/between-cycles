"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct, CategoryAudit } from "./catalog";

export interface CatalogData {
  source: { name: string; license: string; url: string; fetchedAt: string };
  total: number;
  categories: { audit: CategoryAudit; picks: (CatalogProduct & { helpful: string[] })[] }[];
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
