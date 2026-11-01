import { describe, expect, it } from "vitest";
import bench from "../data/label-bench.json";
import { scoreRow, summarizeBench, type BenchRow } from "./labelBench";

describe("label benchmark scoring", () => {
  it("scores a perfect read as perfect", () => {
    const s = scoreRow({ code: "x", name: "x", truth: "Aqua, Glycerin, Parfum (Fragrance)", read: "AQUA, GLYCERIN, PARFUM", legible: true, ms: 1 });
    expect(s.recall).toBe(1);
    expect(s.precision).toBe(1);
    expect(s.sameVerdict).toBe(true);
  });

  it("treats an empty read as a refusal, not a match", () => {
    const s = scoreRow({ code: "x", name: "x", truth: "Aqua, Glycerin", read: "", legible: false, ms: 1 });
    expect(s.refused).toBe(true);
    expect(s.sameVerdict).toBe(false);
  });

  it("prints the saved run", () => {
    const sum = summarizeBench(bench.results as BenchRow[]);
    expect(sum.n).toBe(bench.results.length);
    if (process.env.PRINT_BENCH) {
      console.table(sum.scores.map((s) => ({ ...s, recall: s.recall.toFixed(2), precision: s.precision.toFixed(2) })));
      const { scores: _s, ...rest } = sum;
      void _s;
      console.log(rest);
    }
  });
});
