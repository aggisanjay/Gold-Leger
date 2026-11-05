import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";
import { getSession } from "@/lib/auth";

export async function GET() {
  const transfers = await GoldTrackService.getStockTransfers();
  return NextResponse.json(transfers);
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const transfer = await GoldTrackService.createStockTransfer({
      ...body,
      userId: session?.id || "u-03",
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

