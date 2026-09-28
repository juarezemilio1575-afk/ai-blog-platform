import { getActiveBlog } from "@/lib/get-active-blog";

export default async function PrivacyPolicyPage() {
  const blog = await getActiveBlog();
  return (
    <div className="prose prose-editorial max-w-2xl dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-sm italic">
        Template only — have this reviewed by a lawyer before launch, especially for GDPR/CCPA compliance if you have
        EU or California visitors.
      </p>
      <h2>Information we collect</h2>
      <p>We collect analytics data (pages visited, referrer, approximate location) and, if you subscribe, your email address.</p>
      <h2>How we use it</h2>
      <p>To improve {blog?.name ?? "this site"}'s content, send the newsletter you opted into, and measure which articles perform well.</p>
      <h2>Cookies</h2>
      <p>See our <a href="/cookie-policy">Cookie Policy</a> for details on what we store in your browser.</p>
      <h2>Third parties</h2>
      <p>We use analytics (Google Analytics), affiliate networks, and email delivery providers who may process data on our behalf.</p>
      <h2>Your rights</h2>
      <p>Contact us via the <a href="/contact">contact page</a> to request access to, correction of, or deletion of your data.</p>
    </div>
  );
}
