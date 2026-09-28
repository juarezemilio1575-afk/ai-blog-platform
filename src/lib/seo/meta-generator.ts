/**
 * Meta title / description / slug generator — section 5, items 11-13.
 * Pure formatting + validation logic; the actual wording can come from the
 * AI provider (SEO_OPTIMIZATION task) or be edited by hand — either way it
 * passes through here so limits are enforced consistently everywhere.
 */

export interface MetaInput {
  title: string;
  primaryKeyword: string;
  siteName: string;
  rawDescription: string;
}

export interface MetaOutput {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  warnings: string[];
}

const MAX_TITLE_LEN = 60;
const MAX_DESC_LEN = 155;

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function generateMeta(input: MetaInput): MetaOutput {
  const warnings: string[] = [];

  let metaTitle = input.title;
  if (!metaTitle.toLowerCase().includes(input.primaryKeyword.toLowerCase())) {
    warnings.push("Primary keyword is missing from the title — consider rewording.");
  }
  if (metaTitle.length > MAX_TITLE_LEN) {
    metaTitle = truncateAtWord(metaTitle, MAX_TITLE_LEN);
    warnings.push(`Title truncated to fit ${MAX_TITLE_LEN} characters.`);
  }

  let metaDescription = input.rawDescription.trim();
  if (metaDescription.length > MAX_DESC_LEN) {
    metaDescription = truncateAtWord(metaDescription, MAX_DESC_LEN);
    warnings.push(`Description truncated to fit ${MAX_DESC_LEN} characters.`);
  }
  if (metaDescription.length < 70) {
    warnings.push("Description is quite short — under 70 characters leaves SERP space unused.");
  }

  const slug = slugify(input.primaryKeyword || input.title);

  return { metaTitle, metaDescription, slug, warnings };
}
