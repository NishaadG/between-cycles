import { describe, expect, it } from "vitest";
import snapshot from "../data/products.json";
import { picks, type CatalogPick, type CatalogProduct } from "./catalog";
import { checkIngredients } from "./ingredients";
import { recommend } from "./recommend";
import type { Change } from "./stats";

const products = snapshot.products as CatalogProduct[];
const catalogue = snapshot.categories.map((c) => ({
  id: c.id,
  picks: picks(c.id, products).map((p): CatalogPick => ({ ...p.product, helpful: p.helpful, good: p.good })),
}));

const change = (id: Change["id"], delta: number, status: Change["status"] = "worse"): Change => ({
  id,
  value: 30 + delta,
  delta,
  status,
  marked: false,
});

describe("recommend", () => {
  it("maps a rash and dryness to a cleanser and a moisturiser, with the person's numbers", () => {
    const needs = recommend([change("acne", 8), change("moisture", 5)], ["dry"], "discuss", catalogue);
    expect(needs.map((n) => n.id)).toEqual(["cleanser", "moisturiser"]);
    expect(needs[0].because).toEqual(["Bumps & spots up 8 points"]);
    expect(needs[1].because).toEqual(["Dryness up 5 points", "You reported tight, dry skin"]);
  });

  it("only suggests products that pass every rule and have the ingredient the need asks for", () => {
    const needs = recommend([change("acne", 8), change("moisture", 5), change("age_spot", 4)], [], "discuss", catalogue);
    expect(needs).toHaveLength(3);
    for (const n of needs) {
      expect(n.items.length).toBe(3);
      for (const p of n.items) expect(checkIngredients(p.ingredients).overall).toBe("ok");
    }
    expect(needs[1].items.every((p) => p.good.some((g) => g.id === "humectant"))).toBe(true);
    expect(needs[2].items.every((p) => p.good.some((g) => g.id === "spf"))).toBe(true);
  });

  it("never repeats a product across needs", () => {
    const codes = recommend([change("acne", 8), change("moisture", 5), change("age_spot", 4)], [], "discuss", catalogue)
      .flatMap((n) => n.items.map((p) => p.code));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("falls back to everyday basics when nothing changed", () => {
    const needs = recommend([change("acne", 1, "stable")], [], "steady", catalogue);
    expect(needs.map((n) => n.id)).toEqual(["moisturiser", "sunscreen"]);
  });

  it("shows nothing when the advice is to call the care team", () => {
    expect(recommend([change("acne", 20)], ["fever"], "urgent", catalogue)).toEqual([]);
  });
});
