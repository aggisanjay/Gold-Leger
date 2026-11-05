import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const body = await request.json();

    const alert = await GoldTrackService.resolveAlert(id, {
      status: body.status || "RESOLVED",
      resolutionNotes: body.resolutionNotes,
      reviewerId: session?.id || "u-01",
    });

    return NextResponse.json(alert);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

