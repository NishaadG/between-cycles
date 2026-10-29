import { describe, expect, it } from "vitest";
import { EXAMPLES, checkIngredients, parseIngredients } from "./ingredients";

const ids = (text: string) => checkIngredients(text).findings.map((f) => f.rule.id);

describe("parseIngredients", () => {
  it("splits and normalizes a label", () => {
    expect(parseIngredients("Ingredients: Aqua, Glycerin*,  Parfum.")).toEqual(["aqua", "glycerin", "parfum"]);
  });
});

describe("checkIngredients", () => {
  it("flags acne actives and fragrance", () => {
    expect(ids(EXAMPLES[0].text)).toEqual(expect.arrayContaining(["benzoyl-peroxide", "fragrance", "drying-alcohol"]));
    expect(checkIngredients(EXAMPLES[0].text).overall).toBe("avoid");
  });

  it("does not treat fatty alcohols as drying", () => {
    expect(ids("Cetearyl Alcohol, Cetyl Alcohol, Stearyl Alcohol")).not.toContain("drying-alcohol");
  });

  it("does not treat benzyl alcohol as drying", () => {
    expect(ids("Benzyl Alcohol")).not.toContain("drying-alcohol");
  });

  it("does not confuse sunscreen salicylates with salicylic acid", () => {
    const found = ids("Ethylhexyl Salicylate, Homosalate");
    expect(found).not.toContain("salicylic");
    expect(found).toContain("spf");
  });

  it("finds a gentle barrier cream ok", () => {
    const r = checkIngredients(EXAMPLES[2].text);
    expect(r.overall).toBe("ok");
    expect(r.findings.map((f) => f.rule.id)).toContain("humectant");
  });

  it("marks AHAs as caution, not avoid", () => {
    expect(checkIngredients("Aqua, Lactic Acid, Urea").overall).toBe("caution");
  });

  it("handles a transcribed label in capitals with slashes", () => {
    const label =
      "AQUA/WATER, GLYCERIN, CETEARYL ALCOHOL, ALCOHOL DENAT., NIACINAMIDE, SALICYLIC ACID, DIMETHICONE, SODIUM HYALURONATE, PARFUM/FRAGRANCE, LIMONENE, LINALOOL, PHENOXYETHANOL";
    const r = checkIngredients(label);
    expect(r.overall).toBe("avoid");
    expect(r.findings.map((f) => f.rule.id)).toEqual(expect.arrayContaining(["drying-alcohol", "salicylic", "fragrance", "humectant"]));
    expect(r.findings.find((f) => f.rule.id === "drying-alcohol")!.matched).toEqual(["alcohol denat"]);
  });
});
