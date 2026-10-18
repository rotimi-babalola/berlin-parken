import { getWalkingRoute } from "@/lib/walking-route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = {
    latitude: Number(params.get("fromLat")),
    longitude: Number(params.get("fromLon")),
  };
  const to = {
    latitude: Number(params.get("toLat")),
    longitude: Number(params.get("toLon")),
  };
  if (["fromLat", "fromLon", "toLat", "toLon"].some((key) => !params.has(key)))
    return Response.json({ error: "Missing coordinates" }, { status: 400 });
  try {
    return Response.json(await getWalkingRoute(from, to), {
      // Routes are deterministic for a coordinate pair, so cache them.
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof RangeError
            ? "Invalid coordinates"
            : "Walking route unavailable",
      },
      {
        status: error instanceof RangeError ? 400 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
