import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const karigarId = searchParams.get("karigarId") || undefined;

  const jobCards = await GoldTrackService.getJobCards(status, karigarId);
  return NextResponse.json(jobCards);
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const job = await GoldTrackService.createGoldIssue({
      ...body,
      userId: session?.id || "u-03",
    });

    return NextResponse.json(job, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

