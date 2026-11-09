import { NextResponse } from "next/server";
import { api } from "@/server/api";
import { read } from "@/server/db";
import { readingPhoto } from "@/server/services/readings";
import { notFound } from "@/server/errors";

export const GET = api<{ id: string }>(["CLERK", "FINANCE", "PARTNER"], async ({ params }) => {
  const p = await read((c) => readingPhoto(c, params.id));
  if (!p) throw notFound("The photo");
  return new NextResponse(new Uint8Array(p.bytes), { headers: { "content-type": p.mime, "cache-control": "private, max-age=3600" } });
});
