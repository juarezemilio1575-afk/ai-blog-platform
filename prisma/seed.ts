/**
 * Demo data seed — section 30 of the spec.
 * Run with: `npm run db:seed` (after `npm run db:migrate`).
 * Creates one demo blog, an admin login, categories, 12 articles (10+
 * required), keywords, affiliate products + blocks, revenue, analytics
 * history, and internal links — so the platform is understandable the
 * moment it's running, not an empty shell.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ARTICLE_TOPICS = [
  { title: "Best Budget Security Cameras For Renters (2026 Tested Picks)", keyword: "best budget security camera for renters", category: "Buying Guides" },
  { title: "Arlo vs Ring: Which Security Camera System Should You Choose?", keyword: "arlo vs ring comparison", category: "Comparisons" },
  { title: "Does a Ring Doorbell Work Without WiFi?", keyword: "does ring doorbell work without wifi", category: "How-To" },
  { title: "How To Choose A Smart Lock For An Apartment You Rent", keyword: "best smart lock for renters", category: "Buying Guides" },
  { title: "The Best Video Doorbells For Small Porches", keyword: "best video doorbell small porch", category: "Buying Guides" },
  { title: "Wired vs Wireless Security Cameras: A Practical Comparison", keyword: "wired vs wireless security cameras", category: "Comparisons" },
  { title: "How Long Does Security Camera Footage Actually Get Stored?", keyword: "how long security camera footage stored", category: "How-To" },
  { title: "Best Outdoor Security Cameras For Cold Climates", keyword: "best outdoor security camera cold weather", category: "Buying Guides" },
  { title: "Do Fake Security Cameras Actually Deter Burglars?", keyword: "do fake security cameras work", category: "How-To" },
  { title: "SimpliSafe vs Ring: A Full Feature Breakdown", keyword: "simplisafe vs ring", category: "Comparisons" },
  { title: "Best Solar-Powered Security Cameras For No-Wiring Setups", keyword: "best solar security camera", category: "Buying Guides" },
  { title: "How To Set Up A Home Security System In A Weekend", keyword: "how to set up home security system", category: "How-To" },
];

const PRODUCTS = [
  { name: "Wyze Cam v4", price: 35.99, merchant: "Amazon", category: "budget", rating: 4.4 },
  { name: "Ring Stick Up Cam", price: 99.99, merchant: "Amazon", category: "mid-range", rating: 4.5 },
  { name: "Arlo Pro 5S", price: 199.99, merchant: "Amazon", category: "premium", rating: 4.6 },
  { name: "Eufy SoloCam S340", price: 159.99, merchant: "Amazon", category: "solar", rating: 4.3 },
  { name: "Google Nest Cam (battery)", price: 179.99, merchant: "Best Buy", category: "premium", rating: 4.5 },
  { name: "Blink Outdoor 4", price: 89.99, merchant: "Amazon", category: "budget", rating: 4.2 },
];

function mdxFor(title: string, keyword: string) {
  return `# ${title}

Here's what actually matters when choosing for ${keyword}, based on manufacturer specs, verified owner reports, and return/complaint patterns — replace this with your own hands-on testing notes before publishing for real; never claim testing that didn't happen.

## What to look for

- Field of view and night vision quality
- Local vs cloud storage costs over time
- How easy the install actually is without drilling or a professional

## Our top picks

See the comparison and picks below.

## Frequently asked questions

**Do these need a subscription to be useful?**
Most work fine without one for live viewing; a subscription mainly adds longer clip history and person detection.

**Is professional installation worth it?**
For renters, no — every option here is designed for a fully reversible, no-drill install.

[Read our related comparison](/blog/arlo-vs-ring-comparison) for a deeper look at two of the most popular options.
`;
}

async function main() {
  console.log("Seeding demo data...");
  if ((await db.article.count()) > 0 && !process.env.FORCE_SEED) {
    console.log("Database already seeded - skipping.");
    return;
  }
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "admin123");
  if (!adminPassword) throw new Error("ADMIN_PASSWORD env var is required in production - refusing to create an admin with a default password.");

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Admin", email: adminEmail, passwordHash, role: "OWNER" },
  });

  const blog = await db.blog.upsert({
    where: { domain: process.env.BLOG_DOMAIN ?? "localhost" },
    update: {},
    create: {
      name: "Smart Home Security Guide",
      domain: process.env.BLOG_DOMAIN ?? "localhost",
      niche: "smart home security cameras",
      language: "en",
      autoPublish: false,
    },
  });

  await db.blogMember.upsert({
    where: { userId_blogId: { userId: admin.id, blogId: blog.id } },
    update: {},
    create: { userId: admin.id, blogId: blog.id, role: "OWNER" },
  });

  const author = await db.author.upsert({
    where: { blogId_slug: { blogId: blog.id, slug: "editorial-team" } },
    update: {},
    create: {
      blogId: blog.id,
      name: "Editorial Team",
      slug: "editorial-team",
      bio: "Independent product testing and research, published by the Smart Home Security Guide team.",
      isAiAuthor: false,
    },
  });

  const categoryNames = [...new Set(ARTICLE_TOPICS.map((t) => t.category))];
  const categories = new Map<string, string>();
  for (const name of categoryNames) {
    const category = await db.category.upsert({
      where: { blogId_slug: { blogId: blog.id, slug: name.toLowerCase().replace(/\s+/g, "-") } },
      update: {},
      create: { blogId: blog.id, name, slug: name.toLowerCase().replace(/\s+/g, "-") },
    });
    categories.set(name, category.id);
  }

  // Affiliate program + products
  const program = await db.affiliateProgram.create({
    data: { blogId: blog.id, name: "Amazon Associates", network: "amazon", defaultCommissionPct: 4, isActive: true },
  });

  const products = await Promise.all(
    PRODUCTS.map((p) =>
      db.product.create({
        data: {
          blogId: blog.id,
          affiliateProgramId: program.id,
          name: p.name,
          description: `${p.name} — a solid ${p.category} pick for renters and homeowners alike.`,
          price: p.price,
          merchant: p.merchant,
          category: p.category,
          rating: p.rating,
          affiliateUrl: `https://www.amazon.com/dp/DEMO-${p.name.replace(/\s+/g, "-").toUpperCase()}?tag=demo-20`,
          lastCheckedAt: new Date(),
        },
      })
    )
  );

  // Articles + keywords + SEO metrics + affiliate blocks
  const createdArticles: { id: string; slug: string }[] = [];

  for (let i = 0; i < ARTICLE_TOPICS.length; i++) {
    const topic = ARTICLE_TOPICS[i];
    const slug = topic.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const keyword = await db.keyword.create({
      data: {
        blogId: blog.id,
        phrase: topic.keyword,
        searchIntent: i % 3 === 0 ? "COMPARISON" : i % 2 === 0 ? "COMMERCIAL" : "INFORMATIONAL",
        estimatedVolume: 1000 + i * 400,
        estimatedDifficulty: 25 + (i % 6) * 10,
        commercialValue: 40 + (i % 5) * 12,
        priorityScore: 90 - i * 4,
        status: "used",
      },
    });

    const publishedDaysAgo = 30 + i * 25; // spread publish dates out
    const publishedAt = new Date(Date.now() - publishedDaysAgo * 86_400_000);

    const article = await db.article.create({
      data: {
        blogId: blog.id,
        keywordId: keyword.id,
        authorId: author.id,
        categoryId: categories.get(topic.category)!,
        title: topic.title,
        slug,
        excerpt: `Everything you need to know about ${topic.keyword}, based on hands-on testing.`,
        contentMdx: mdxFor(topic.title, topic.keyword),
        metaTitle: topic.title.slice(0, 60),
        metaDescription: `${topic.title} — hands-on testing, honest pros and cons, and our final verdict.`.slice(0, 155),
        status: "PUBLISHED",
        qualityScore: 82 + (i % 4) * 3,
        publishedAt,
        lastOptimizedAt: publishedAt,
        createdAt: publishedAt,
      },
    });
    createdArticles.push({ id: article.id, slug: article.slug });

    // Attach 2 affiliate products to the first half of the articles (commercial/comparison intent)
    if (i < 8) {
      const picked = [products[i % products.length], products[(i + 3) % products.length]];
      await db.articleAffiliateBlock.create({
        data: { articleId: article.id, productId: picked[0].id, blockType: "BEST_CHOICE", position: 0 },
      });
      await db.articleAffiliateBlock.create({
        data: { articleId: article.id, productId: picked[1].id, blockType: "BUDGET_CHOICE", position: 1 },
      });
    }

    // 56 days of SeoMetric history so the Content Decay Detector has real trend data.
    // Older articles get a simulated traffic decline; newer ones trend flat/up.
    const isDecaying = i % 4 === 0;
    for (let d = 0; d < 56; d++) {
      const date = new Date(Date.now() - d * 86_400_000);
      const base = 40 - i * 2;
      const trendFactor = isDecaying ? 1 + d * 0.02 : 1 - d * 0.005;
      const clicks = Math.max(1, Math.round(base * trendFactor + (Math.random() * 6 - 3)));
      const impressions = clicks * (8 + Math.round(Math.random() * 4));
      await db.seoMetric.create({
        data: {
          blogId: blog.id,
          articleId: article.id,
          date,
          clicks,
          impressions,
          ctr: impressions === 0 ? 0 : clicks / impressions,
          avgPosition: isDecaying ? 6 + d * 0.15 : Math.max(2, 8 - d * 0.03),
          topQuery: topic.keyword,
        },
      });
    }

    // Revenue + a couple of clicks/conversions for the monetization dashboard
    if (i < 8) {
      const clickCount = 15 + i * 3;
      for (let c = 0; c < clickCount; c++) {
        await db.affiliateClick.create({
          data: { productId: products[i % products.length].id, articleId: article.id, clickedAt: new Date(Date.now() - Math.random() * 30 * 86_400_000) },
        });
      }
      const commission = Number((products[i % products.length].price! * 0.04).toFixed(2));
      await db.conversion.create({ data: { productId: products[i % products.length].id, orderValue: products[i % products.length].price!, commissionUsd: commission } });
      await db.revenue.create({ data: { blogId: blog.id, articleId: article.id, source: "AFFILIATE", amountUsd: commission } });
      await db.revenue.create({ data: { blogId: blog.id, articleId: article.id, source: "ADSENSE", amountUsd: Number((clickCount * 0.08).toFixed(2)) } });
    }
  }

  // Internal links between related articles (comparisons <-> buying guides)
  const comparison = createdArticles[1]; // Arlo vs Ring
  for (const target of [createdArticles[0], createdArticles[4], createdArticles[7]]) {
    await db.internalLink.create({
      data: { sourceArticleId: target.id, targetArticleId: comparison.id, anchorText: "Arlo vs Ring comparison" },
    }).catch(() => undefined); // unique constraint safety on re-seed
  }

  // 30 days of blog-level analytics for the Overview/SEO tabs
  for (let d = 0; d < 30; d++) {
    const date = new Date(Date.now() - d * 86_400_000);
    const pageViews = 900 + Math.round(Math.random() * 300) - d * 4;
    await db.analyticsSnapshot.upsert({
      where: { blogId_date: { blogId: blog.id, date } },
      update: {},
      create: {
        blogId: blog.id,
        date,
        organicTraffic: Math.round(pageViews * 0.8),
        pageViews,
        uniqueVisitors: Math.round(pageViews * 0.65),
        avgSessionSec: 95 + Math.round(Math.random() * 40),
        bounceRatePct: 55 + Math.random() * 10,
      },
    });
  }

  // A few AI generation log rows so the AI cost dashboard isn't empty
  await db.aiGeneration.createMany({
    data: createdArticles.slice(0, 5).flatMap((a) => [
      { blogId: blog.id, articleId: a.id, taskType: "ARTICLE_DRAFT" as const, provider: "mock", model: "mock", promptTokens: 800, completionTokens: 1600, estimatedCostUsd: 0 },
      { blogId: blog.id, articleId: a.id, taskType: "SEO_OPTIMIZATION" as const, provider: "mock", model: "mock", promptTokens: 200, completionTokens: 100, estimatedCostUsd: 0 },
    ]),
  });

  // Newsletter subscribers + one campaign
  await db.subscriber.createMany({
    data: Array.from({ length: 24 }, (_, i) => ({ blogId: blog.id, email: `demo-subscriber-${i}@example.com`, segment: i % 3 === 0 ? "engaged" : "new" })),
    skipDuplicates: true,
  });
  await db.emailCampaign.create({
    data: {
      blogId: blog.id,
      subject: "This week: the best budget security cameras, tested",
      bodyMdx: "A short digest of this week's top picks and the newest published guide.",
      type: "digest",
      sentAt: new Date(Date.now() - 3 * 86_400_000),
    },
  });

  // Default automation schedule (Phase 7) — editable later from Admin → Automation
  const DEFAULT_SCHEDULE: { jobKey: string; hour: number; minute: number }[] = [
    { jobKey: "discover-keywords", hour: 8, minute: 0 },
    { jobKey: "generate-articles", hour: 10, minute: 0 },
    { jobKey: "fact-check", hour: 12, minute: 0 },
    { jobKey: "publish-scheduled", hour: 16, minute: 0 },
    { jobKey: "growth-agent", hour: 18, minute: 0 },
    { jobKey: "daily-report", hour: 23, minute: 0 },
    { jobKey: "detect-decay", hour: 6, minute: 0, daysOfWeek: [1] } as never, // Monday only
  ];
  for (const s of DEFAULT_SCHEDULE) {
    await db.automationSchedule.upsert({ where: { jobKey: s.jobKey }, update: {}, create: s });
  }

  console.log(`Seeded blog "${blog.name}" with ${createdArticles.length} articles.`);
  console.log(`Admin login email: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
