import { describe, expect, it } from "vitest";
import { badgeResult } from "./badge";

describe("badgeResult", () => {
  it("passes a gentle formula and lists what helps", () => {
    const r = badgeResult("Aqua, Glycerin, Cetearyl Alcohol, Urea, Dimethicone", "https://x.test");
    expect(r.verdict).toBe("ok");
    expect(r.label).toBe("Gentle during treatment");
    expect(r.flags).toEqual([]);
    expect(r.helpful.map((h) => h.id)).toEqual(["humectant"]);
    expect(r.method).toBe("https://x.test/method#products");
  });

  it("explains each flag with its sources", () => {
    const r = badgeResult("Aqua, Alcohol Denat., Salicylic Acid, Parfum");
    expect(r.verdict).toBe("avoid");
    expect(r.flags.map((f) => f.id).sort()).toEqual(["drying-alcohol", "fragrance", "salicylic"]);
    expect(r.flags.every((f) => f.sources.length > 0 && f.sources[0].url.startsWith("https://"))).toBe(true);
    expect(r.summary).toContain("fragrance");
    expect(r.summary).toContain("salicylic acid (BHA)");
  });

  it("marks caution-only formulas as ask first", () => {
    expect(badgeResult("Aqua, Glycolic Acid, Glycerin").label).toBe("Ask your care team first");
  });
});
