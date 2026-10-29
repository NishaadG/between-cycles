import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { labelReaderAvailable, readLabel } from "@/lib/label";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ available: labelReaderAvailable() });
}

export async function POST(req: Request) {
  if (!labelReaderAvailable()) {
    return NextResponse.json({ error: { code: "unavailable", message: "Label reading isn't set up here. Paste the list instead." } }, { status: 503 });
  }
  const blocked = await guard(req, { checkUnits: false });
  if (blocked) return blocked;
  const form = await req.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob) || !["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: { code: "bad_request", message: "Send a JPEG or PNG under 8 MB." } }, { status: 400 });
  }
  try {
    return NextResponse.json(await readLabel(Buffer.from(await photo.arrayBuffer()), photo.type));
  } catch (e) {
    console.error("label read failed", e);
    return NextResponse.json({ error: { code: "read_failed", message: "Couldn't read that label. Try a sharper, closer photo, or paste the list." } }, { status: 502 });
  }
}
