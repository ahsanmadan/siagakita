import { NextRequest, NextResponse } from "next/server";
import { fetchVolcanoCctvList, fetchLiveCctvMap } from "@/lib/repositories/external-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volcanoQuery = searchParams.get("volcano") || searchParams.get("slug") || searchParams.get("name");

    if (!volcanoQuery) {
      const allCctvMap = await fetchLiveCctvMap();
      const allList: Array<{ volcano: string; cameras: number }> = [];
      allCctvMap.forEach((cctvs, key) => {
        allList.push({ volcano: key, cameras: cctvs.length });
      });
      return NextResponse.json({
        ok: true,
        totalVolcanoes: allList.length,
        volcanoes: allList,
      });
    }

    const cctvList = await fetchVolcanoCctvList(volcanoQuery);

    return NextResponse.json(
      {
        ok: true,
        volcano: volcanoQuery,
        totalCameras: cctvList.length,
        cctvList,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal memuat feed CCTV gunung api.",
      },
      { status: 500 }
    );
  }
}
