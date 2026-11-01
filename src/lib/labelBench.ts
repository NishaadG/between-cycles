import { checkIngredients, parseIngredients } from "./ingredients";

// Scores the label-reader benchmark (src/data/label-bench.json): how much of
// the human transcription the reader recovered, and whether the rules reach
// the same verdict and flags from the reader's text as from the human's.

export interface BenchRow {
  code: string;
  name: string;
  truth: string;
  read: string;
  legible: boolean;
  error?: string;
  ms: number;
}

const norm = (s: string) =>
  s
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const names = (text: string) => new Set(parseIngredients(text).map(norm).filter(Boolean));

const flags = (text: string) =>
  checkIngredients(text)
    .findings.filter((f) => f.rule.verdict !== "helpful")
    .map((f) => f.rule.id)
    .sort()
    .join(",");

export interface BenchScore {
  code: string;
  name: string;
  recall: number; // share of the human list the reader recovered
  precision: number; // share of the reader's list that is in the human list
  sameVerdict: boolean;
  sameFlags: boolean;
  refused: boolean; // reader said it couldn't find a list
  ms: number;
}

export function scoreRow(r: BenchRow): BenchScore {
  const truth = names(r.truth);
  const read = names(r.read);
  const hit = [...read].filter((x) => truth.has(x)).length;
  const refused = read.size === 0;
  return {
    code: r.code,
    name: r.name,
    recall: truth.size ? hit / truth.size : 0,
    precision: read.size ? hit / read.size : 0,
    sameVerdict: !refused && checkIngredients(r.truth).overall === checkIngredients(r.read).overall,
    sameFlags: !refused && flags(r.truth) === flags(r.read),
    refused,
    ms: r.ms,
  };
}

export function summarizeBench(rows: BenchRow[]) {
  const scores = rows.map(scoreRow);
  const read = scores.filter((s) => !s.refused);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const ms = [...scores.map((s) => s.ms)].sort((a, b) => a - b);
  return {
    n: scores.length,
    refused: scores.length - read.length,
    sameVerdict: read.filter((s) => s.sameVerdict).length,
    sameFlags: read.filter((s) => s.sameFlags).length,
    recall: avg(read.map((s) => s.recall)),
    precision: avg(read.map((s) => s.precision)),
    medianMs: ms.length ? ms[Math.floor(ms.length / 2)] : 0,
    maxMs: ms.at(-1) ?? 0,
    scores,
  };
}
