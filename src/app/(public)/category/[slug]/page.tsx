import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveBlog } from "@/lib/get-active-blog";
import { ArticleCard } from "@/components/blog/public-components";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const blog = await getActiveBlog();
  if (!blog) notFound();

  const category = await db.category.findUnique({ where: { blogId_slug: { blogId: blog.id, slug: params.slug } } });
  if (!category) notFound();

  const articles = await db.article.findMany({
    where: { categoryId: category.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { category: true, images: { take: 1 } },
  });

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-semibold">{category.name}</h1>
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard
            key={a.id}
            article={{ slug: a.slug, title: a.title, excerpt: a.excerpt, categoryName: a.category?.name, heroImageUrl: a.images[0]?.url }}
          />
        ))}
        {articles.length === 0 && <p className="col-span-full text-ink-700/70">No articles in this category yet.</p>}
      </div>
    </div>
  );
}
