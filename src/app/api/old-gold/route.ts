import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";
import { getSession } from "@/lib/auth";

export async function GET() {
  const records = await GoldTrackService.getOldGoldPurchases();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const purchase = await GoldTrackService.createOldGoldPurchase({
      ...body,
      staffId: session?.id || "u-05",
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

