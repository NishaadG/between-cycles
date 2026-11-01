import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { YouCamError, skinType } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 120;

// Runs once per person, on their first baseline photo.
export async function POST(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const form = await req.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob) || !["image/jpeg", "image/png"].includes(photo.type) || photo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: { code: "bad_request", message: "Send a JPEG or PNG photo under 10 MB." } }, { status: 400 });
  }
  try {
    return NextResponse.json({ result: await skinType(Buffer.from(await photo.arrayBuffer())) });
  } catch (e) {
    const err = e instanceof YouCamError ? e : new YouCamError("unknown", "Couldn't measure skin type.");
    console.error("skin type failed", err.code, err.message);
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
}
