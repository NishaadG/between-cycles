import { NextResponse } from "next/server";
import { hairTemplates } from "@/lib/youcam";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ templates: await hairTemplates() });
  } catch (e) {
    console.error("hair templates failed", e);
    return NextResponse.json({ templates: [] });
  }
}
