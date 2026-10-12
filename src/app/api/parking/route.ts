import { NextResponse } from "next/server";
import { getNearbyParking } from "@/lib/parking";
import { getParkingContext, type Visit } from "@/lib/parking-context";
import { parseArrivalInstant, parseDuration } from "@/lib/search-time";

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

  const arrivalParam = params.get("arrival");
  const durationParam = params.get("duration");
  let visit: Visit | undefined;
  if (arrivalParam !== null || durationParam !== null) {
    if (arrivalParam === null || durationParam === null) {
      return NextResponse.json(
        { error: "Provide both arrival time and stay duration." },
        { status: 400 },
      );
    }
    const arrival = parseArrivalInstant(arrivalParam);
    const duration = parseDuration(durationParam);
    if (!arrival.ok || !duration.ok) {
      return NextResponse.json(
        { error: "Provide a future arrival time and a valid stay duration." },
        { status: 400 },
      );
    }
    visit = { arrivalMs: arrival.ms, durationMinutes: duration.minutes };
  }

  const [parking, context] = await Promise.all([
    getNearbyParking(longitude, latitude, radiusMeters),
    getParkingContext(longitude, latitude, radiusMeters, visit),
  ]);
  return NextResponse.json(
    { ...parking, ...context },
    { headers: { "Cache-Control": "no-store" } },
  );
}
