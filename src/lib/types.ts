import type { ConcernId } from "./concerns";

export interface ConcernResult {
  raw: number; // vendor raw_score, 1-100, higher = healthier-looking
  level: number; // 100 - raw, higher = more visible concern
  maskUrl?: string; // data URL of the detection mask (PNG with alpha)
}

export interface SkinAnalysis {
  concerns: Record<ConcernId, ConcernResult>;
  overall?: number;
  mode: "live" | "mock";
  analyzedAt: string;
}

export interface SkinApiError {
  code: string;
  message: string;
}

export type TryOnKind = "scarf" | "hat" | "hair";

export interface TryOnResult {
  imageDataUrl: string;
  mode: "live" | "mock";
}
