import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const metrics = await GoldTrackService.getDashboardMetrics();
  return NextResponse.json(metrics);
}

