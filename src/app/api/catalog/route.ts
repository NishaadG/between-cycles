import { NextResponse } from "next/server";
import snapshot from "@/data/products.json";
import { auditCategory, picks, type CatalogProduct } from "@/lib/catalog";

// The snapshot is fixed at build time, so this is computed once and cached.
export const dynamic = "force-static";

export function GET() {
  const products = snapshot.products as CatalogProduct[];
  const categories = snapshot.categories.map((c) => ({
    audit: auditCategory(c.id, c.label, products),
    picks: picks(c.id, products).map((p) => ({ ...p.product, helpful: p.helpful })),
  }));
  return NextResponse.json({
    source: { name: snapshot.source, license: snapshot.license, url: snapshot.url, fetchedAt: snapshot.fetchedAt },
    total: products.length,
    categories,
  });
}
