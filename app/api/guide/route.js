import { getGuideData, getSupportedRegions } from "@/lib/providers";

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
  });
}