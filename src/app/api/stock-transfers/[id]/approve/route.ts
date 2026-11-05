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

    const trf = await GoldTrackService.approveStockTransfer(
      id,
      session?.id || "u-02"
    );

    return NextResponse.json(trf);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

