import { describe, expect, it } from "vitest";
import { CONCERN_IDS, type ConcernId } from "./concerns";
import { MIN_MDC, compare, computeBaseline, cyclePosition, guidance, mdcFromSd, sampleSd } from "./stats";

const levels = (v: number, over: Partial<Record<ConcernId, number>> = {}) =>
  Object.fromEntries(CONCERN_IDS.map((id) => [id, over[id] ?? v])) as Record<ConcernId, number>;

describe("sampleSd", () => {
  it("needs two values", () => expect(sampleSd([5])).toBeNull());
  it("matches the textbook value", () => expect(sampleSd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3));
});

describe("mdcFromSd", () => {
  it("is 1.96*sqrt(2)*sd", () => expect(mdcFromSd(4)).toBeCloseTo(11.087, 2));
  it("never goes below the floor", () => expect(mdcFromSd(0.1)).toBe(MIN_MDC));
  it("uses the floor without an sd", () => expect(mdcFromSd(null)).toBe(MIN_MDC));
});

describe("compare", () => {
  const base = computeBaseline([levels(20), levels(22), levels(21, { redness: 24 })]);

  it("treats small moves as stable", () => {
    const c = compare(levels(22.5), base).find((x) => x.id === "acne")!;
    expect(c.status).toBe("stable");
  });

  it("flags a rise beyond the detectable change", () => {
    const c = compare(levels(21, { acne: 30 }), base).find((x) => x.id === "acne")!;
    expect(c.status).toBe("worse");
    expect(c.delta).toBe(9);
    expect(c.marked).toBe(true);
  });

  it("reports improvement", () => {
    const c = compare(levels(21, { moisture: 10 }), base).find((x) => x.id === "moisture")!;
    expect(c.status).toBe("better");
  });

  it("widens the threshold for a noisier concern", () => {
    expect(base.redness.mdc).toBeGreaterThan(base.acne.mdc);
  });
});

describe("guidance", () => {
  const base = computeBaseline([levels(20), levels(21), levels(22)]);

  it("urgent symptoms win over everything", () => {
    expect(guidance(compare(levels(21), base), ["fever"]).level).toBe("urgent");
  });

  it("a watched concern rising means discuss", () => {
    const g = guidance(compare(levels(21, { redness: 35 }), base), []);
    expect(g.level).toBe("discuss");
  });

  it("an unwatched concern rising alone stays steady", () => {
    expect(guidance(compare(levels(21, { oiliness: 40 }), base), []).level).toBe("steady");
  });
});

describe("cyclePosition", () => {
  const start = new Date(2026, 9, 1);
  it("day 1 of cycle 1", () => expect(cyclePosition(new Date(2026, 9, 1), start, 21)).toEqual({ cycle: 1, day: 1 }));
  it("rolls into cycle 2", () => expect(cyclePosition(new Date(2026, 9, 22), start, 21)).toEqual({ cycle: 2, day: 1 }));
  it("null before treatment", () => expect(cyclePosition(new Date(2026, 8, 30), start, 21)).toBeNull());
});

describe("skin type caution", () => {
  const base = computeBaseline([levels(20), levels(22), levels(21)]);
  it("adds a caution for deeper skin", () => {
    expect(guidance(compare(levels(21), base), [], { skinType: "V" }).caution).toBeTruthy();
    expect(guidance(compare(levels(21), base), ["fever"], { skinType: "VI" }).caution).toBeTruthy();
  });
  it("adds none for lighter skin or unknown", () => {
    expect(guidance(compare(levels(21), base), [], { skinType: "II" }).caution).toBeUndefined();
    expect(guidance(compare(levels(21), base), []).caution).toBeUndefined();
  });
});
