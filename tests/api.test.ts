import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { closeDb, resetDbForTests, run, withTx } from "@/server/db";
import { newId, type Ctx } from "@/server/services/core";
import { addBullion, createKarigar } from "@/server/services/work";
import { parseGrams } from "@/domain/units";
import type { SessionUser } from "@/server/session";

import { forbidden, unauthorized } from "@/server/errors";
import type { Role } from "@/server/services/core";

// Global mock state for user
let mockUser: SessionUser | null = null;

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    requireUser: vi.fn(async (roles: Role[] | "any" = "any") => {
      if (!mockUser) throw unauthorized();
      if (roles !== "any" && !roles.includes(mockUser.role)) throw forbidden();
      return mockUser;
    }),
  };
});

import { GET as stockExportGet } from "@/app/api/stock/export/route";
import { PATCH as alertPatch } from "@/app/api/alerts/[id]/route";
import { POST as issuePost } from "@/app/api/issues/route";

const DB = `/tmp/gl-api-${process.pid}.db`;
const finCtx: Ctx = { userId: "u-fin", role: "FINANCE", now: new Date("2026-11-05T09:00:00+05:30") };
let k1 = "";
let necklaceId = "";
let alertId = "";

beforeAll(async () => {
  resetDbForTests(`file:${DB}`);
  await withTx(async (t) => {
    necklaceId = newId();
    alertId = newId();
    await run(t, "INSERT INTO categories(id,name,default_wastage_bp) VALUES (?,?,300)", [necklaceId, "Necklace"]);
    await run(t, "INSERT INTO users(id,name,username,role,password_hash,active,created_at) VALUES ('u-fin','Finance','fin','FINANCE','x',1,'2026-01-01')");
    await run(t, "INSERT INTO users(id,name,username,role,password_hash,active,created_at) VALUES ('u-clerk','Clerk','clk','CLERK','x',1,'2026-01-01')");
  });
  k1 = (await createKarigar(finCtx, { name: "Murugesan S", phone: "9000000001" })).id;
  await addBullion(finCtx, { fineMg: parseGrams("5000.000"), idempotencyKey: randomUUID() });

  // Add dummy open alert to test PATCH /api/alerts/:id
  await withTx(async (t) => {
    await run(
      t,
      "INSERT INTO alerts(id, kind, level, karigar_id, job_id, title, summary, evidence, status, created_at, updated_at) VALUES (?,'DRIFT','REVIEW',?,NULL,'Test alert','Summary','{}','OPEN','2026-11-05T09:00:00','2026-11-05T09:00:00')",
      [alertId, k1]
    );
  });
});

afterAll(async () => {
  closeDb();
  for (const s of ["", "-wal", "-shm"]) {
    try {
      rmSync(DB + s, { force: true });
    } catch {}
  }
});

describe("API route guards and handlers", () => {
  it("unauthenticated request returns 401", async () => {
    mockUser = null;
    const req = new NextRequest("http://localhost:3000/api/stock/export?date=2026-11-05&format=csv", {
      method: "GET",
    });
    const res = await stockExportGet(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("CLERK cannot GET /api/stock/export (403)", async () => {
    mockUser = { id: "u-clerk", name: "Clerk", username: "clk", role: "CLERK", karigarId: null };
    const req = new NextRequest("http://localhost:3000/api/stock/export?date=2026-11-05&format=csv", {
      method: "GET",
    });
    const res = await stockExportGet(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe("FORBIDDEN");
  });

  it("CLERK cannot PATCH /api/alerts/:id (403)", async () => {
    mockUser = { id: "u-clerk", name: "Clerk", username: "clk", role: "CLERK", karigarId: null };
    const req = new NextRequest(`http://localhost:3000/api/alerts/${alertId}`, {
      method: "PATCH",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "REVIEWED", note: "Clerk cannot review" }),
    });
    const res = await alertPatch(req, { params: Promise.resolve({ id: alertId }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe("FORBIDDEN");
  });

  it("cross-site Origin on POST returns 403", async () => {
    mockUser = { id: "u-clerk", name: "Clerk", username: "clk", role: "CLERK", karigarId: null };
    const req = new NextRequest("http://localhost:3000/api/issues", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://malicious-external-site.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const res = await issuePost(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.message).toMatch(/cross-site/i);
  });

  it("invalid body returns 422 with field messages", async () => {
    mockUser = { id: "u-clerk", name: "Clerk", username: "clk", role: "CLERK", karigarId: null };
    const req = new NextRequest("http://localhost:3000/api/issues", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        karigarId: "",
        categoryId: "",
        gross: "invalid-weight",
        purity: "invalid-purity",
        idempotencyKey: "not-a-uuid",
      }),
    });
    const res = await issuePost(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("INVALID");
    expect(body.error?.fields).toBeDefined();
    expect(Object.keys(body.error?.fields || {}).length).toBeGreaterThan(0);
  });

  it("the same issue POST twice with one idempotency key returns replayed: true", async () => {
    mockUser = { id: "u-clerk", name: "Clerk", username: "clk", role: "CLERK", karigarId: null };
    const key = randomUUID();
    const payload = {
      karigarId: k1,
      categoryId: necklaceId,
      gross: "120.000",
      purity: "91.60",
      idempotencyKey: key,
      description: "Temple necklace",
    };

    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/issues", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

    // First POST
    const res1 = await issuePost(makeReq(), { params: Promise.resolve({}) });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.replayed).toBe(false);
    expect(data1.txnNo).toBeDefined();

    // Second POST with exact same idempotency key
    const res2 = await issuePost(makeReq(), { params: Promise.resolve({}) });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.replayed).toBe(true);
    expect(data2.txnNo).toBe(data1.txnNo);
  });
});
