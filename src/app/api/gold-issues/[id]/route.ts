import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await GoldTrackService.getJobCardById(id);
  if (!job) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

