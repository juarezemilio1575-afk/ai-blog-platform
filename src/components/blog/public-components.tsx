import Link from "next/link";
import Image from "next/image";

export interface ArticleCardView {
  slug: string;
  title: string;
  excerpt?: string | null;
  categoryName?: string | null;
  heroImageUrl?: string | null;
  publishedAt?: Date | null;
}

export function ArticleCard({ article }: { article: ArticleCardView }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group block">
      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-paper-200 dark:bg-ink-800">
        {article.heroImageUrl && (
          <Image
            src={article.heroImageUrl}
            alt={article.title}
            width={640}
            height={400}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="mt-3">
        {article.categoryName && (
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
            {article.categoryName}
          </span>
        )}
        <h3 className="mt-1 font-display text-xl font-semibold leading-snug group-hover:text-accent-600 dark:group-hover:text-accent-400">
          {article.title}
        </h3>
        {article.excerpt && <p className="mt-1 line-clamp-2 text-sm text-ink-700/70 dark:text-paper-100/60">{article.excerpt}</p>}
      </div>
    </Link>
  );
}

export function SiteHeader({ blogName, logoUrl }: { blogName: string; logoUrl?: string | null }) {
  return (
    <header className="border-b border-paper-200 dark:border-ink-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold">
          {logoUrl ? <img src={logoUrl} alt={blogName} className="h-8 w-8 rounded" /> : null}
          {blogName}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
          <Link href="/newsletter">Newsletter</Link>
          <Link href="/search" aria-label="Search">
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ blogName }: { blogName: string }) {
  return (
    <footer className="mt-20 border-t border-paper-200 py-10 text-sm text-ink-700/70 dark:border-ink-800 dark:text-paper-100/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {blogName}. All rights reserved.</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookie-policy">Cookie Policy</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
