import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, parseBody, requireAdminSession } from "@/lib/api-utils";
import { scoreArticleQuality } from "@/lib/ai/quality-score";

const listQuerySchema = z.object({
  blogId: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    blogId: searchParams.get("blogId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) return apiError("Invalid query params", 422, parsed.error.flatten());

  try {
    const articles = await db.article.findMany({
      where: {
        blogId: parsed.data.blogId,
        status: parsed.data.status as never,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { category: true, author: true, keyword: true },
    });
    return NextResponse.json({ articles });
  } catch (err) {
    return apiError("Failed to load articles", 500, err instanceof Error ? err.message : undefined);
  }
}

const createArticleSchema = z.object({
  blogId: z.string(),
  briefId: z.string().optional(),
  keywordId: z.string().optional(),
  title: z.string().min(3),
  slug: z.string().min(3),
  contentMdx: z.string().min(1),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
});

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const parsed = await parseBody(req, createArticleSchema);
  if (!parsed.success) return parsed.response;

  try {
    const article = await db.article.create({
      data: { ...parsed.data, status: "DRAFTED" },
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    return apiError("Failed to create article (slug may already exist for this blog)", 409, err instanceof Error ? err.message : undefined);
  }
}

// Re-exported so /api/articles/[id]/publish (and the human-approval UI) can
// run the same gate the spec requires in section 24 without duplicating logic.
export { scoreArticleQuality };
