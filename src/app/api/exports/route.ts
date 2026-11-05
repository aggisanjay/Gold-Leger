import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";
import { getSession } from "@/lib/auth";

export async function GET() {
  const exportsList = await GoldTrackService.getExports();
  return NextResponse.json(exportsList);
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const record = await GoldTrackService.generateExport(
      body.type,
      body.dateStart,
      body.dateEnd,
      session?.name || "System Accountant"
    );

    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

