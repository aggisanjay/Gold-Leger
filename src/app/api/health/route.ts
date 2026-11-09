import { NextResponse } from "next/server";
import { read, one } from "@/server/db";

export async function GET() {
  try {
    await read((c) => one(c, "SELECT 1 AS ok"));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
