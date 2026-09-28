import { db } from "@/lib/db";
import { getActiveBlog } from "@/lib/get-active-blog";
import { ArticleCard } from "@/components/blog/public-components";

export default async function HomePage() {
  const blog = await getActiveBlog();
  if (!blog) {
    return (
      <p className="text-center text-ink-700/70">
        No blog configured yet — run <code>npm run db:seed</code> to load demo data.
      </p>
    );
  }

  const articles = await db.article.findMany({
    where: { blogId: blog.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 9,
    include: { category: true, images: { take: 1 } },
  });

  return (
    <div>
      <section className="mb-14 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          {blog.name}
        </h1>
        <p className="mt-4 text-lg text-ink-700/80 dark:text-paper-100/70">
          Practical, thoroughly researched guides on {blog.niche}.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
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
        {articles.length === 0 && (
          <p className="col-span-full text-ink-700/70">
            No published articles yet — run <code>npm run db:seed</code> to load demo content.
          </p>
        )}
      </section>
    </div>
  );
}
