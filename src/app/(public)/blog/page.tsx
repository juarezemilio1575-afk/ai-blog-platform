import { db } from "@/lib/db";
import { getActiveBlog } from "@/lib/get-active-blog";
import { ArticleCard } from "@/components/blog/public-components";

export default async function BlogIndexPage() {
  const blog = await getActiveBlog();
  if (!blog) return null;

  const articles = await db.article.findMany({
    where: { blogId: blog.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { category: true, images: { take: 1 } },
  });

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-semibold">All articles</h1>
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard
            key={a.id}
            article={{
              slug: a.slug,
              title: a.title,
              excerpt: a.excerpt,
              categoryName: a.category?.name,
              heroImageUrl: a.images[0]?.url,
              publishedAt: a.publishedAt,
            }}
          />
        ))}
      </div>
    </div>
  );
}
