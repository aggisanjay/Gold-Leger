import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { karigarName, jobCategory, currentLossGrams, historicalAverageLossGrams, monthsTracked = 6 } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim() !== "") {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are the AI Bullion Controller for GoldTrack ERP at a high-end Coimbatore jewellery chain.
Analyze this artisan's loss trend:
Artisan: ${karigarName}
Category: ${jobCategory}
Current Job Actual Wastage: ${currentLossGrams}g
Historical 6-Month Average Wastage for this Category: ${historicalAverageLossGrams}g

TASK:
1. Determine if current loss represents an unusual drift (>20-25% above baseline).
2. Write a confidential, polite, non-accusatory review advisory note strictly for the Finance Head and Managing Partner.
3. Suggest a technical craft cause (e.g. solder porosity, polishing wheel dust filtration saturation, laser weld scrap).

Return ONLY valid JSON:
{
  "isDriftDetected": boolean,
  "driftPercentage": number,
  "advisoryTone": "CONFIDENTIAL_REVIEW",
  "recommendedAction": "string",
  "craftRootCauseAnalysis": "string"
}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({
              success: true,
              aiEngine: "Google Gemini AI (Live)",
              ...parsed,
            });
          }
        }
      } catch (geminiErr) {
        console.error("Gemini AI Loss Drift error:", geminiErr);
      }
    }

    // Baseline calculation when GEMINI_API_KEY is not set
    const current = Number(currentLossGrams);
    const baseline = Number(historicalAverageLossGrams);
    const driftPct = baseline > 0 ? ((current - baseline) / baseline) * 100 : 0;
    const isDrift = driftPct > 20;

    return NextResponse.json({
      success: true,
      aiEngine: "Statistical Karigar Baseline Engine",
      isDriftDetected: isDrift,
      driftPercentage: Number(driftPct.toFixed(1)),
      advisoryTone: "CONFIDENTIAL_REVIEW",
      recommendedAction: isDrift
        ? `Quietly review ${karigarName}'s bench suction filter dust and solder recovery for the next batch.`
        : "Wastage within acceptable craftsmanship tolerance.",
      craftRootCauseAnalysis: isDrift
        ? "Loss variation suggests potential bench filings collection bag wear or higher filigree wire trimming ratios."
        : "Normal metallurgical working loss.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

