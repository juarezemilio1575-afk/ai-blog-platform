import { db } from "@/lib/db";
import { getActiveBlog } from "@/lib/get-active-blog";
import { ArticleCard } from "@/components/blog/public-components";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const blog = await getActiveBlog();
  const query = searchParams.q?.trim() ?? "";

  const articles =
    blog && query
      ? await db.article.findMany({
          where: {
            blogId: blog.id,
            status: "PUBLISHED",
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { excerpt: { contains: query, mode: "insensitive" } },
            ],
          },
          include: { category: true, images: { take: 1 } },
          take: 20,
        })
      : [];

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-semibold">Search</h1>
      <form className="mb-8" action="/search" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search articles..."
          className="w-full max-w-md rounded-full border border-paper-200 px-4 py-2 dark:border-ink-800 dark:bg-ink-900"
        />
      </form>
      {query && (
        <p className="mb-6 text-sm text-ink-700/70 dark:text-paper-100/60">
          {articles.length} result{articles.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
        </p>
      )}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard
            key={a.id}
            article={{ slug: a.slug, title: a.title, excerpt: a.excerpt, categoryName: a.category?.name, heroImageUrl: a.images[0]?.url }}
          />
        ))}
      </div>
    </div>
  );
}
