import { getActiveBlog } from "@/lib/get-active-blog";
import { SiteHeader, SiteFooter } from "@/components/blog/public-components";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const blog = await getActiveBlog();
  const blogName = blog?.name ?? "AI Blog Platform";

  return (
    <div className="font-sans">
      <SiteHeader blogName={blogName} logoUrl={blog?.logoUrl} />
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      <SiteFooter blogName={blogName} />
    </div>
  );
}
