import { NextResponse } from "next/server";
import { getGeocoderProvider } from "@/lib/geocoder";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 120) {
    return NextResponse.json(
      { error: "Enter at least 3 characters." },
      { status: 400 },
    );
  }

  try {
    const suggestions = await getGeocoderProvider().suggest(query);
    return NextResponse.json(
      { suggestions },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Address search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
