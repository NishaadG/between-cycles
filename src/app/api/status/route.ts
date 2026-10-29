import { NextResponse } from "next/server";
import { isLive, unitBalance } from "@/lib/youcam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ live: isLive(), units: await unitBalance() });
}
