import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const categories = await GoldTrackService.getCategories();
  return NextResponse.json(categories);
}

