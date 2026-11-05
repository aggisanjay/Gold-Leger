import { NextResponse } from "next/server";
import { assessOldGold } from "@/lib/calculations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { grossWeight, approvedDeduction, testedPurityPct, goldRatePerGram } = body;

    const assessment = assessOldGold(
      grossWeight,
      approvedDeduction,
      testedPurityPct,
      goldRatePerGram
    );

    return NextResponse.json({
      grossWeight: assessment.grossWeight.toNumber(),
      approvedDeduction: assessment.approvedDeduction.toNumber(),
      netEligibleWeight: assessment.netEligibleWeight.toNumber(),
      testedPurityPct: assessment.testedPurityPct.toNumber(),
      fineGoldWeight: assessment.fineGoldWeight.toNumber(),
      ratePerGram: assessment.ratePerGram.toNumber(),
      exchangeValue: assessment.exchangeValue.toNumber(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

