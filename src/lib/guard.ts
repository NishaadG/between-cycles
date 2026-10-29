import "server-only";
import { NextResponse } from "next/server";
import { unitBalance } from "./youcam";

// Protects the API units behind a public deployment: a per-IP limit (best
// effort, per server instance) and a floor below which new jobs are refused.

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR || 30);
const UNIT_FLOOR = Number(process.env.UNIT_FLOOR || 40);

const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export async function guard(req: Request): Promise<NextResponse | null> {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "That's a lot of scans in an hour. Please try again later." } },
      { status: 429 },
    );
  }
  recent.push(now);
  hits.set(ip, recent);

  const units = await unitBalance();
  if (units !== null && units < UNIT_FLOOR) {
    return NextResponse.json(
      { error: { code: "units_low", message: "The demo has used its analysis allowance. Try the demo journey instead." } },
      { status: 503 },
    );
  }
  return null;
}
