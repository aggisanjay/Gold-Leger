import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const branches = await GoldTrackService.getBranches();
  return NextResponse.json(branches);
}

