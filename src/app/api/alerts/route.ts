import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const alerts = await GoldTrackService.getAlerts(status);
  return NextResponse.json(alerts);
}

