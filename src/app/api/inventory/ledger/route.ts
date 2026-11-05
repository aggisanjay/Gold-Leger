import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const transactions = await GoldTrackService.getLedgerTransactions();
  return NextResponse.json(transactions);
}

