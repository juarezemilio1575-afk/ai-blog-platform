import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, parseBody, requireAdminSession } from "@/lib/api-utils";
import { analyzeNiche } from "@/lib/ai/niche-analyzer";

const bodySchema = z.object({
  blogId: z.string().optional(),
  niche: z.string().min(2),
  avgMonthlySearchVolume: z.number().nonnegative(),
  serpCompetition: z.number().min(0).max(100),
  affiliateProgramsFound: z.number().nonnegative(),
  avgCpcUsd: z.number().nonnegative(),
  contentAngleCount: z.number().nonnegative(),
  newSiteDifficulty: z.number().min(0).max(100),
});

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const parsed = await parseBody(req, bodySchema);
  if (!parsed.success) return parsed.response;

  const result = analyzeNiche(parsed.data);

  try {
    await db.nicheScore.create({
      data: {
        blogId: parsed.data.blogId,
        niche: result.niche,
        searchDemandScore: result.searchDemandScore,
        competitionScore: result.competitionScore,
        affiliateOpportunityScore: result.affiliateOpportunityScore,
        cpcPotentialScore: result.cpcPotentialScore,
        contentOpportunityScore: result.contentOpportunityScore,
        difficultyScore: result.difficultyScore,
        overallScore: result.overallScore,
      },
    });
  } catch (err) {
    // Non-fatal: still return the score even if persistence fails (e.g. DB not migrated yet).
    console.error("Failed to persist niche score:", err);
  }

  return NextResponse.json({ result });
}
