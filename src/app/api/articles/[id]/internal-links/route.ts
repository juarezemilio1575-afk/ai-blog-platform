import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireAdminSession } from "@/lib/api-utils";
import { suggestInternalLinks, type ArticleForLinking } from "@/lib/seo/internal-linking";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const source = await db.article.findUnique({ where: { id: params.id }, include: { keyword: true, topic: true } });
  if (!source) return apiError("Article not found", 404);

  const candidates = await db.article.findMany({
    where: { blogId: source.blogId, status: "PUBLISHED", NOT: { id: source.id } },
    include: { keyword: true, topic: true },
    take: 200,
  });

  const toLinkShape = (a: typeof source): ArticleForLinking => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    clusterKey: a.topic?.clusterKey ?? null,
    primaryKeyword: a.keyword?.phrase ?? a.title,
    publishedAt: a.publishedAt,
  });

  const suggestions = suggestInternalLinks(toLinkShape(source), candidates.map(toLinkShape));
  return NextResponse.json({ suggestions });
}
