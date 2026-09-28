import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getActiveBlog } from "@/lib/get-active-blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const blog = await getActiveBlog();
  if (!blog) return [{ url: siteUrl, lastModified: new Date() }];

  const [articles, categories] = await Promise.all([
    db.article.findMany({ where: { blogId: blog.id, status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { blogId: blog.id }, select: { slug: true } }),
  ]);

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    ...articles.map((a) => ({
      url: `${siteUrl}/blog/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...categories.map((c) => ({ url: `${siteUrl}/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
