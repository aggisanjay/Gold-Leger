import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const balances = await GoldTrackService.getInventoryBalances();
  return NextResponse.json(balances);
}

