import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { YouCamError, hairDensity } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const form = await req.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob) || !["image/jpeg", "image/png"].includes(photo.type) || photo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: { code: "bad_request", message: "Send a JPEG or PNG photo under 10 MB." } }, { status: 400 });
  }
  try {
    return NextResponse.json(await hairDensity(Buffer.from(await photo.arrayBuffer()), photo.type));
  } catch (e) {
    const err = e instanceof YouCamError ? e : new YouCamError("unknown", "Couldn't measure hair density.");
    console.error("hair density failed", err.code, err.message);
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
}
