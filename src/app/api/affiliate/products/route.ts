import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireAdminSession } from "@/lib/api-utils";

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const blogId = searchParams.get("blogId");
  if (!blogId) return apiError("blogId query param is required", 400);

  const products = await db.product.findMany({
    where: { blogId },
    include: { _count: { select: { clicks: true, conversions: true } }, affiliateProgram: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}
