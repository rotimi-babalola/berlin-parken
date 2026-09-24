import { NextResponse } from "next/server";
import { getNearbyParking } from "@/lib/parking";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const longitude = Number(params.get("longitude"));
  const latitude = Number(params.get("latitude"));
  const radiusMeters = Number(params.get("radius"));
  if (
    !Number.isFinite(longitude) ||
    longitude < 13.0 ||
    longitude > 13.8 ||
    !Number.isFinite(latitude) ||
    latitude < 52.3 ||
    latitude > 52.7 ||
    !Number.isInteger(radiusMeters) ||
    radiusMeters < 100 ||
    radiusMeters > 1000
  ) {
    return NextResponse.json(
      { error: "Choose a valid Berlin destination and search radius." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    await getNearbyParking(longitude, latitude, radiusMeters),
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
