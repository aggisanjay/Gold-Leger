import { NextResponse } from "next/server";
import { api } from "@/server/api";
import { read } from "@/server/db";
import { getSetting } from "@/server/services/core";
import { movementsFor } from "@/server/services/queries";
import { isDateString } from "@/server/clock";
import { ApiError } from "@/server/errors";
import { movementsCsv, movementsTallyXml } from "@/domain/tally";

export const GET = api(["FINANCE", "PARTNER"], async ({ req, ctx }) => {
  const u = new URL(req.url);
  const date = u.searchParams.get("date") ?? "";
  const format = u.searchParams.get("format") ?? "csv";
  if (!isDateString(date)) throw new ApiError(422, "INVALID", "Choose a valid date.");
  if (format !== "csv" && format !== "tally") throw new ApiError(422, "INVALID", "Format must be csv or tally.");
  const rows = await read((c) => movementsFor(c, ctx, date));
  const company = await read((c) => getSetting(c, "company_name"));
  const text = format === "csv" ? movementsCsv(rows) : movementsTallyXml(rows, company);
  return new NextResponse(text, {
    headers: {
      "content-type": format === "csv" ? "text/csv; charset=utf-8" : "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="gold-movements-${date}.${format === "csv" ? "csv" : "xml"}"`,
    },
  });
});
