"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishButton({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState<string[] | null>(null);

  async function handlePublish(force = false) {
    setLoading(true);
    setBlocked(null);
    const res = await fetch(`/api/articles/${articleId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setBlocked(data.quality?.blockingIssues ?? [data.error]);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => handlePublish(false)}
        disabled={loading}
        className="rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
      >
        {loading ? "..." : "Publish"}
      </button>
      {blocked && (
        <div className="max-w-xs text-right text-xs text-rose-600">
          <p>Blocked by quality gate:</p>
          <ul className="list-inside list-disc">
            {blocked.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <button onClick={() => handlePublish(true)} className="mt-1 underline">
            Force publish anyway
          </button>
        </div>
      )}
    </div>
  );
}
