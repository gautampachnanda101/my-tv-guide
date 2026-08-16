import { getGuideData, getSupportedRegions } from "@/lib/providers";

// Cache API responses for 5 minutes (300 seconds)
export const revalidate = 300;

function toSafeQuery(searchParams) {
  const raw = searchParams.get("q") || "";
  return raw.trim().slice(0, 80);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const region = (searchParams.get("region") || "uk").toLowerCase();
  const query = toSafeQuery(searchParams);

  const data = await getGuideData({ region, query });

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    supportedRegions: getSupportedRegions(),
    query,
    ...data
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  });
}