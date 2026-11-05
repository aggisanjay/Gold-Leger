import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const locations = await GoldTrackService.getLocations();
  return NextResponse.json(locations);
}

