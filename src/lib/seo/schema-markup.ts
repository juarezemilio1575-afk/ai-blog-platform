/**
 * JSON-LD schema markup — section 18 (Technical SEO).
 * Pure builder functions returning plain objects; render them in the page
 * with <script type="application/ld+json">{JSON.stringify(schema)}</script>.
 */

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  imageUrl: string;
  authorName: string;
  publisherName: string;
  publisherLogoUrl: string;
  datePublished: string; // ISO 8601
  dateModified: string; // ISO 8601
  url: string;
}

export function buildArticleSchema(i: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: i.headline,
    description: i.description,
    image: [i.imageUrl],
    author: { "@type": "Person", name: i.authorName },
    publisher: {
      "@type": "Organization",
      name: i.publisherName,
      logo: { "@type": "ImageObject", url: i.publisherLogoUrl },
    },
    datePublished: i.datePublished,
    dateModified: i.dateModified,
    mainEntityOfPage: { "@type": "WebPage", "@id": i.url },
  };
}

export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  if (faqs.length === 0) return null; // section 18: "only when appropriate"
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
