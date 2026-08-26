import { NextResponse } from "next/server";

type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  rain?: number;
  weather_code?: number;
  wind_speed_10m?: number;
};

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
  current_units?: Record<string, string>;
};

function asCoordinate(value: string | null) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return null;
  return coordinate;
}

function weatherLabel(code: number | undefined) {
  if (code === undefined) return "Cuaca terbaru tersedia";
  if (code === 0) return "Cerah";
  if ([1, 2, 3].includes(code)) return "Berawan";
  if ([45, 48].includes(code)) return "Berkabut";
  if ([51, 53, 55, 56, 57].includes(code)) return "Gerimis";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Hujan";
  if ([95, 96, 99].includes(code)) return "Badai petir";
  return "Cuaca berubah";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = asCoordinate(url.searchParams.get("lat"));
  const longitude = asCoordinate(url.searchParams.get("lon"));

  if (latitude === null || longitude === null) {
    return NextResponse.json({ ok: false, message: "Koordinat tidak valid." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Asia%2FJakarta`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 600 },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ ok: false, message: "Data cuaca belum tersedia." }, { status: 502 });
    }

    const payload = (await response.json()) as OpenMeteoResponse;
    const current = payload.current;

    if (!current) {
      return NextResponse.json({ ok: false, message: "Data cuaca belum tersedia." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      source: "Open-Meteo",
      sourceUrl: "https://open-meteo.com/",
      label: weatherLabel(current.weather_code),
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      precipitation: current.precipitation,
      rain: current.rain,
      windSpeed: current.wind_speed_10m,
      updatedAt: current.time,
      units: payload.current_units ?? {},
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Data cuaca belum bisa dimuat." }, { status: 503 });
  }
}
