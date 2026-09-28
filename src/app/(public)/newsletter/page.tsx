"use client";

import { useState } from "react";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // blogId is resolved server-side from the request host in a real
        // deployment; for the demo scaffold pass it explicitly if needed.
        body: JSON.stringify({ blogId: process.env.NEXT_PUBLIC_DEMO_BLOG_ID ?? "", email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-3 font-display text-3xl font-semibold">Join the newsletter</h1>
      <p className="mb-6 text-ink-700/70 dark:text-paper-100/60">
        A weekly digest of new articles and our top product recommendations. No spam, unsubscribe anytime.
      </p>
      {status === "done" ? (
        <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-400">You're subscribed 🎉</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-full border border-paper-200 px-4 py-2 dark:border-ink-800 dark:bg-ink-900"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
          >
            Subscribe
          </button>
        </form>
      )}
      {status === "error" && <p className="mt-3 text-sm text-rose-600">Something went wrong — try again.</p>}
    </div>
  );
}
