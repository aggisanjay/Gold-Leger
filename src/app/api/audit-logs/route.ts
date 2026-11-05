import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const logs = await GoldTrackService.getAuditLogs();
  return NextResponse.json(logs);
}

