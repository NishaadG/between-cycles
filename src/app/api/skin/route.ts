import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { YouCamError, analyzeSkin } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 120;

const TYPES = ["image/jpeg", "image/png"];

export async function POST(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const form = await req.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob) || !TYPES.includes(photo.type)) {
    return NextResponse.json({ error: { code: "bad_request", message: "Send a JPEG or PNG photo." } }, { status: 400 });
  }
  if (photo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: { code: "too_large", message: "Photos must be under 10 MB." } }, { status: 413 });
  }
  try {
    const result = await analyzeSkin(Buffer.from(await photo.arrayBuffer()), photo.type);
    return NextResponse.json(result);
  } catch (e) {
    const err = e instanceof YouCamError ? e : new YouCamError("unknown", "Something went wrong. Please try again.");
    console.error("skin analysis failed", err.code, err.message);
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
}
