import { NextResponse, type NextRequest } from "next/server";
import { MAX_INGREDIENTS_CHARS, badgeResult } from "@/lib/badge";

// Public, keyless ingredient check for shops' product pages:
//   GET  /api/check?ingredients=Aqua,%20Glycerin,...
//   POST /api/check  {"ingredients": "Aqua, Glycerin, ..."}
// Pure computation on public label text, so it is open to any origin and
// cacheable at the edge.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function answer(text: unknown, req: NextRequest) {
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "missing_ingredients",
          message: 'Pass the ingredient list as ?ingredients=... or {"ingredients": "..."}.',
        },
      },
      { status: 400, headers: CORS },
    );
  }
  if (text.length > MAX_INGREDIENTS_CHARS) {
    return NextResponse.json(
      { error: { code: "too_long", message: `Ingredient lists over ${MAX_INGREDIENTS_CHARS} characters aren't accepted.` } },
      { status: 413, headers: CORS },
    );
  }
  return NextResponse.json(badgeResult(text, req.nextUrl.origin), {
    headers: { ...CORS, "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}

export function GET(req: NextRequest) {
  return answer(req.nextUrl.searchParams.get("ingredients"), req);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  return answer(body?.ingredients, req);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
