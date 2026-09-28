import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveBlog } from "@/lib/get-active-blog";
import { ArticleCard } from "@/components/blog/public-components";

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const blog = await getActiveBlog();
  if (!blog) notFound();

  const author = await db.author.findUnique({ where: { blogId_slug: { blogId: blog.id, slug: params.slug } } });
  if (!author) notFound();

  const articles = await db.article.findMany({
    where: { authorId: author.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { category: true, images: { take: 1 } },
  });

  return (
    <div>
      <header className="mb-8 flex items-center gap-4">
        {author.avatarUrl && <img src={author.avatarUrl} alt={author.name} className="h-16 w-16 rounded-full object-cover" />}
        <div>
          <h1 className="font-display text-2xl font-semibold">{author.name}</h1>
          {author.bio && <p className="text-sm text-ink-700/70 dark:text-paper-100/60">{author.bio}</p>}
        </div>
      </header>
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
