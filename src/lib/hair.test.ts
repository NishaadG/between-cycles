import { describe, expect, it } from "vitest";
import { densityLevel, summarizeHair } from "./hair";

const p = (day: number, value: number) => ({ takenAt: `2026-01-${String(day).padStart(2, "0")}`, value });

describe("summarizeHair", () => {
  it("has no change until there is a check after the baseline", () => {
    expect(summarizeHair([p(1, 3.6), p(2, 3.4)]).status).toBe("baseline");
  });
  it("treats small moves as steady", () => {
    expect(summarizeHair([p(1, 3.6), p(2, 3.4), p(9, 3.2)]).status).toBe("steady");
  });
  it("flags a drop of half a level or more", () => {
    const s = summarizeHair([p(1, 3.6), p(2, 3.4), p(20, 2.7)]);
    expect(s.baseline).toBe(3.5);
    expect(s.delta).toBe(-0.8);
    expect(s.status).toBe("thinner");
  });
  it("sorts by date", () => {
    expect(summarizeHair([p(20, 2.7), p(1, 3.6), p(2, 3.4)]).latest).toBe(2.7);
  });
});

describe("densityLevel", () => {
  it("maps the four documented terms", () => {
    expect(["Extremely Low Density", "Low Density", "Medium Density", "High Density"].map(densityLevel)).toEqual([1, 2, 3, 4]);
  });
  it("returns null for anything else", () => expect(densityLevel("Placeholder")).toBeNull());
});
