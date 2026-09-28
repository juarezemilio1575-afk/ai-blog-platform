import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { db } from "@/lib/db";
import { getActiveBlog } from "@/lib/get-active-blog";
import { buildArticleSchema, buildFaqSchema, buildBreadcrumbSchema } from "@/lib/seo/schema-markup";
import { ArticleCard } from "@/components/blog/public-components";
import { ProductCard, ComparisonTable, BestChoiceBlock, BudgetChoiceBlock, PremiumChoiceBlock } from "@/components/blog/affiliate-blocks";

async function getArticle(slug: string) {
  const blog = await getActiveBlog();
  if (!blog) return null;
  return db.article.findUnique({
    where: { blogId_slug: { blogId: blog.id, slug } },
    include: {
      category: true,
      author: true,
      images: true,
      affiliateBlocks: { include: { product: true }, orderBy: { position: "asc" } },
      outboundLinks: { include: { targetArticle: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return {};
  return {
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt ?? undefined,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title: article.metaTitle ?? article.title,
      description: article.metaDescription ?? undefined,
      images: article.images[0]?.url ? [article.images[0].url] : undefined,
      type: "article",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article || article.status !== "PUBLISHED") notFound();

  const blog = await getActiveBlog();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const articleSchema = buildArticleSchema({
    headline: article.title,
    description: article.metaDescription ?? article.excerpt ?? "",
    imageUrl: article.images[0]?.url ?? "",
    authorName: article.author?.name ?? "Editorial Team",
    publisherName: blog?.name ?? "AI Blog Platform",
    publisherLogoUrl: blog?.logoUrl ?? "",
    datePublished: (article.publishedAt ?? article.createdAt).toISOString(),
    dateModified: article.updatedAt.toISOString(),
    url: `${siteUrl}/blog/${article.slug}`,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: siteUrl },
    ...(article.category ? [{ name: article.category.name, url: `${siteUrl}/category/${article.category.slug}` }] : []),
    { name: article.title, url: `${siteUrl}/blog/${article.slug}` },
  ]);

  const relatedArticles = await db.article.findMany({
    where: { blogId: article.blogId, status: "PUBLISHED", NOT: { id: article.id } },
    take: 3,
    orderBy: { publishedAt: "desc" },
    include: { category: true, images: { take: 1 } },
  });

  const hasAffiliateBlocks = article.affiliateBlocks.length > 0;

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <header className="mb-8 max-w-2xl">
        {article.category && (
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
            {article.category.name}
          </span>
        )}
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight">{article.title}</h1>
        {article.author && <p className="mt-3 text-sm text-ink-700/70 dark:text-paper-100/60">By {article.author.name}</p>}
      </header>

      {hasAffiliateBlocks && (
        <p className="mb-8 rounded-lg bg-paper-100 px-4 py-3 text-sm text-ink-700/80 dark:bg-ink-800/60 dark:text-paper-100/70">
          This article contains affiliate links. We may earn a commission at no extra cost to you — see our{" "}
          <a href="/affiliate-disclosure" className="underline">
            affiliate disclosure
          </a>
          .
        </p>
      )}

      <div className="prose prose-editorial max-w-none dark:prose-invert">
        <ReactMarkdown>{article.contentMdx}</ReactMarkdown>
      </div>

      {hasAffiliateBlocks && (
        <section className="mt-10 space-y-6">
          <h2 className="font-display text-2xl font-semibold">Our picks</h2>
          {article.affiliateBlocks.map((block) => {
            const productView = {
              id: block.product.id,
              name: block.product.name,
              description: block.product.description,
              price: block.product.price,
              imageUrl: block.product.imageUrl,
              merchant: block.product.merchant,
              rating: block.product.rating,
            };
            switch (block.blockType) {
              case "BEST_CHOICE":
                return <BestChoiceBlock key={block.id} product={productView} articleId={article.id} />;
              case "BUDGET_CHOICE":
                return <BudgetChoiceBlock key={block.id} product={productView} articleId={article.id} />;
              case "PREMIUM_CHOICE":
                return <PremiumChoiceBlock key={block.id} product={productView} articleId={article.id} />;
              default:
                return <ProductCard key={block.id} product={productView} articleId={article.id} />;
            }
          })}
          {article.affiliateBlocks.length > 1 && (
            <ComparisonTable
              products={article.affiliateBlocks.map((b) => ({
                id: b.product.id,
                name: b.product.name,
                price: b.product.price,
                rating: b.product.rating,
              }))}
              articleId={article.id}
            />
          )}
        </section>
      )}

      {article.outboundLinks.length > 0 && (
        <aside className="mt-10 rounded-lg border border-paper-200 p-5 dark:border-ink-800">
          <h3 className="mb-3 font-display text-lg font-semibold">Related reading</h3>
          <ul className="space-y-2 text-sm">
            {article.outboundLinks.map((link) => (
              <li key={link.id}>
                <a href={`/blog/${link.targetArticle.slug}`} className="text-accent-600 underline dark:text-accent-400">
                  {link.anchorText || link.targetArticle.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {relatedArticles.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-semibold">More articles</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {relatedArticles.map((a) => (
              <ArticleCard
                key={a.id}
                article={{ slug: a.slug, title: a.title, excerpt: a.excerpt, categoryName: a.category?.name, heroImageUrl: a.images[0]?.url }}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
