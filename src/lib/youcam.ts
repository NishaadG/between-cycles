import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CONCERN_IDS, concernLevel, type ConcernId } from "./concerns";
import type { ConcernResult, SkinAnalysis, TryOnKind, TryOnResult } from "./types";

// Server-side client for the skin analysis and try-on APIs.
// Flow for every feature: register file -> PUT to pre-signed URL ->
// create task -> poll until success/error.

const BASE = process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com";
const KEY = process.env.YOUCAM_API_KEY || "";

export const isLive = () => KEY.length > 0;

export class YouCamError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

// Friendly messages for the errors a patient can actually fix.
const FRIENDLY: Record<string, string> = {
  error_src_face_too_small: "Move closer: your face should fill most of the frame.",
  error_src_face_out_of_bound: "Keep your whole face inside the frame.",
  error_lighting_dark: "It's too dark. Face a window or a bright light.",
  error_below_min_image_size: "The photo is too small. Use the camera at full resolution.",
  error_no_face: "We couldn't find a face. Look straight at the camera.",
  error_large_face_angle: "Face the camera straight on.",
  error_multiple_people: "Make sure only one person is in the photo.",
  error_no_shoulder: "Step back a little so your shoulders are visible.",
  exceed_max_filesize: "The photo is larger than 10 MB.",
};

export function friendlyMessage(code: string): string {
  return FRIENDLY[code] ?? "The analysis service couldn't process this photo. Please try again.";
}

async function api<T>(method: "GET" | "POST", url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    status?: number;
    data?: T;
    error?: string;
    error_code?: string;
  };
  if (!res.ok || !json.data) {
    const code = json.error_code || `http_${res.status}`;
    throw new YouCamError(code, json.error || friendlyMessage(code), res.status === 429 ? 429 : 502);
  }
  return json.data;
}

async function uploadFile(bytes: Buffer, contentType: string): Promise<string> {
  const ext = contentType.split("/")[1] || "jpg";
  const data = await api<{
    files: { file_id: string; requests: { url: string; headers: Record<string, string> }[] }[];
  }>("POST", "/s2s/v2.0/file", {
    files: [{ content_type: contentType, file_name: `photo.${ext}`, file_size: bytes.length }],
  });
  const file = data.files[0];
  const put = file.requests[0];
  const res = await fetch(put.url, {
    method: "PUT",
    headers: put.headers,
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new YouCamError("error_upload", `Upload failed (${res.status})`);
  return file.file_id;
}

interface TaskStatus<R> {
  task_status: "running" | "success" | "error";
  results?: R;
  error?: string | null;
}

async function runTask<R>(route: string, body: Record<string, unknown>, timeoutMs = 90_000): Promise<R> {
  const { task_id } = await api<{ task_id: string }>("POST", route, body);
  const started = Date.now();
  let wait = 1200;
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, wait));
    const s = await api<TaskStatus<R>>("GET", `${route}/${task_id}`);
    if (s.task_status === "success" && s.results) return s.results;
    if (s.task_status === "error") {
      const code = s.error || "unknown_internal_error";
      throw new YouCamError(code, friendlyMessage(code), 422);
    }
    wait = Math.min(wait * 1.4, 4000);
  }
  throw new YouCamError("timeout", "The analysis took too long. Please try again.", 504);
}

// Downloads a result image (URLs expire) and shrinks it so it can be kept
// on the device. Masks stay PNG to keep their alpha channel.
async function toDataUrl(url: string, maxSide = 900): Promise<string | undefined> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return undefined;
    const img = sharp(Buffer.from(await res.arrayBuffer())).resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true });
    const isPng = (res.headers.get("content-type") || "").includes("png") || url.split("?")[0].endsWith(".png");
    const buf = isPng ? await img.png({ compressionLevel: 9, palette: true }).toBuffer() : await img.jpeg({ quality: 88 }).toBuffer();
    return `data:image/${isPng ? "png" : "jpeg"};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

// ---------- local dev cache (saves units while iterating) ----------

const CACHE_DIR = path.join(process.cwd(), ".yc-cache");
const cacheOn = () => process.env.YC_CACHE === "1" || process.env.NODE_ENV !== "production";

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!cacheOn()) return fn();
  const file = path.join(CACHE_DIR, `${key}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    const value = await fn();
    await mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
    await writeFile(file, JSON.stringify(value)).catch(() => {});
    return value;
  }
}

const hash = (...parts: (string | Buffer)[]) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 32);
};

// ---------- skin analysis ----------

interface SkinOutput {
  output: { type: string; raw_score: number; ui_score: number; mask_urls?: string[] }[];
}

export async function analyzeSkin(bytes: Buffer, contentType: string): Promise<SkinAnalysis> {
  if (!isLive()) return mockSkin(bytes);
  return cached(`skin-${hash(bytes)}`, async () => {
    const fileId = await uploadFile(bytes, contentType);
    const results = await runTask<SkinOutput>("/s2s/v2.0/task/skin-analysis", {
      src_file_id: fileId,
      dst_actions: CONCERN_IDS,
      miniserver_args: { enable_mask_overlay: false },
      format: "json",
    });
    const concerns = {} as Record<ConcernId, ConcernResult>;
    await Promise.all(
      results.output.map(async (o) => {
        const id = o.type as ConcernId;
        if (!CONCERN_IDS.includes(id)) return;
        concerns[id] = {
          raw: o.raw_score,
          level: concernLevel(o.raw_score),
          maskUrl: o.mask_urls?.[0] ? await toDataUrl(o.mask_urls[0]) : undefined,
        };
      }),
    );
    return { concerns, mode: "live" as const, analyzedAt: new Date().toISOString() };
  });
}

// Deterministic fake scores so the app runs without a key. Clearly flagged
// as mock in the response and the UI.
function mockSkin(bytes: Buffer): SkinAnalysis {
  const seed = createHash("sha256").update(bytes).digest();
  const concerns = {} as Record<ConcernId, ConcernResult>;
  CONCERN_IDS.forEach((id, i) => {
    const raw = 55 + (seed[i] / 255) * 35;
    concerns[id] = { raw: Math.round(raw * 100) / 100, level: concernLevel(raw) };
  });
  return { concerns, mode: "mock", analyzedAt: new Date().toISOString() };
}

// ---------- try-on (scarf, hat, hairstyle) ----------

const TRYON_ROUTE: Record<TryOnKind, string> = {
  scarf: "/s2s/v2.0/task/scarf",
  hat: "/s2s/v2.0/task/hat",
  hair: "/s2s/v2.1/task/hair-transfer",
};

export interface TryOnInput {
  kind: TryOnKind;
  selfie: Buffer;
  selfieType: string;
  ref?: { bytes: Buffer; type: string };
  refUrl?: string;
  templateId?: string;
  gender?: "female" | "male";
  style?: string;
}

export async function tryOn(input: TryOnInput): Promise<TryOnResult> {
  if (!isLive()) {
    return {
      imageDataUrl: `data:${input.selfieType};base64,${input.selfie.toString("base64")}`,
      mode: "mock",
    };
  }
  const key = hash(
    input.kind,
    input.selfie,
    input.ref?.bytes ?? "",
    input.refUrl ?? "",
    input.templateId ?? "",
    input.gender ?? "",
    input.style ?? "",
  );
  return cached(`tryon-${key}`, async () => {
    const body: Record<string, unknown> = {
      src_file_id: await uploadFile(input.selfie, input.selfieType),
    };
    if (input.templateId) body.template_id = input.templateId;
    else if (input.ref) body.ref_file_id = await uploadFile(input.ref.bytes, input.ref.type);
    else if (input.refUrl) body.ref_file_url = input.refUrl;
    if (input.kind !== "hair") {
      body.gender = input.gender ?? "female";
      body.style = input.style ?? "random";
    }
    const results = await runTask<{ url: string }>(TRYON_ROUTE[input.kind], body, 150_000);
    const imageDataUrl = await toDataUrl(results.url, 1200);
    if (!imageDataUrl) throw new YouCamError("error_download", "Couldn't fetch the try-on result.");
    return { imageDataUrl, mode: "live" as const };
  });
}

export interface HairTemplate {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
}

export async function hairTemplates(): Promise<HairTemplate[]> {
  if (!isLive()) return [];
  return cached("hair-templates", async () => {
    const out: HairTemplate[] = [];
    let token = "";
    for (let page = 0; page < 10; page++) {
      const data = await api<{ next_token?: string; templates: { id: string; title: string; thumb: string; category_name?: string }[] }>(
        "GET",
        `/s2s/v2.1/task/template/hair-transfer?page_size=20${token ? `&starting_token=${token}` : ""}`,
      );
      out.push(...data.templates.map((t) => ({ id: t.id, title: t.title, thumbnail: t.thumb, category: t.category_name ?? "" })));
      if (!data.next_token || data.templates.length === 0) break;
      token = data.next_token;
    }
    return out;
  });
}

export async function unitBalance(): Promise<number | null> {
  if (!isLive()) return null;
  try {
    // This endpoint returns { results: [{ amount }, ...] } rather than { data }.
    const res = await fetch(`${BASE}/s2s/v1.0/client/credit`, { headers: { Authorization: `Bearer ${KEY}` }, cache: "no-store" });
    const json = (await res.json()) as { results?: { amount_dec?: number; amount?: number }[] };
    if (!json.results) return null;
    return json.results.reduce((a, r) => a + Number(r.amount_dec ?? r.amount ?? 0), 0);
  } catch {
    return null;
  }
}
