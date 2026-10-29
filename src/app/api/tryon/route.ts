import { NextResponse } from "next/server";
import { YouCamError, tryOn } from "@/lib/youcam";
import type { TryOnKind } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

const KINDS: TryOnKind[] = ["scarf", "hat", "hair"];

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const selfie = form?.get("selfie");
  const kind = String(form?.get("kind") ?? "") as TryOnKind;
  const ref = form?.get("ref");
  const templateId = form?.get("templateId");
  const refUrl = form?.get("refUrl");
  if (!(selfie instanceof Blob) || !KINDS.includes(kind)) {
    return NextResponse.json({ error: { code: "bad_request", message: "Missing photo or try-on type." } }, { status: 400 });
  }
  if (!(ref instanceof Blob) && !templateId && !refUrl) {
    return NextResponse.json({ error: { code: "bad_request", message: "Pick something to try on." } }, { status: 400 });
  }
  try {
    const result = await tryOn({
      kind,
      selfie: Buffer.from(await selfie.arrayBuffer()),
      selfieType: selfie.type || "image/jpeg",
      ref: ref instanceof Blob ? { bytes: Buffer.from(await ref.arrayBuffer()), type: ref.type || "image/jpeg" } : undefined,
      refUrl: refUrl ? String(refUrl) : undefined,
      templateId: templateId ? String(templateId) : undefined,
      gender: form?.get("gender") === "male" ? "male" : "female",
      style: form?.get("style") ? String(form.get("style")) : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    const err = e instanceof YouCamError ? e : new YouCamError("unknown", "Something went wrong. Please try again.");
    console.error("try-on failed", err.code, err.message);
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
}
