import { NextResponse } from "next/server";
import { GoldTrackService } from "@/lib/data-service";

export async function GET() {
  const karigars = await GoldTrackService.getKarigars();
  return NextResponse.json(karigars);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newKarigar = await GoldTrackService.createKarigar(body);
    return NextResponse.json(newKarigar, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

