import { getActiveBlog } from "@/lib/get-active-blog";

export default async function AboutPage() {
  const blog = await getActiveBlog();
  return (
    <div className="prose prose-editorial max-w-2xl dark:prose-invert">
      <h1>About {blog?.name ?? "this site"}</h1>
      <p>
        {blog?.name ?? "This site"} publishes thoroughly researched, practical content on {blog?.niche ?? "our niche"}.
        Every article goes through a research → brief → draft → SEO optimization → fact-check → human review pipeline
        before publishing (see our editorial process for details).
      </p>
      <p>
        We're independent and reader-supported: some articles contain affiliate links, and we may earn a commission
        when you buy through them, at no extra cost to you. See our{" "}
        <a href="/affiliate-disclosure">affiliate disclosure</a> for details.
      </p>
    </div>
  );
}
