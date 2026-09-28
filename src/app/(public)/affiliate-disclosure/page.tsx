import { getActiveBlog } from "@/lib/get-active-blog";

export default async function AffiliateDisclosurePage() {
  const blog = await getActiveBlog();
  return (
    <div className="prose prose-editorial max-w-2xl dark:prose-invert">
      <h1>Affiliate Disclosure</h1>
      <p>
        {blog?.name ?? "This site"} participates in affiliate marketing programs, which means we may earn a
        commission on qualifying purchases made through links on this site, at no additional cost to you.
      </p>
      <p>
        Our recommendations are based on genuine research and testing criteria, not on which program pays the
        highest commission. Affiliate relationships do not influence which products we choose to feature or how we
        rate them.
      </p>
      <p>Any article that contains affiliate links displays a disclosure notice near the top of the piece.</p>
    </div>
  );
}
