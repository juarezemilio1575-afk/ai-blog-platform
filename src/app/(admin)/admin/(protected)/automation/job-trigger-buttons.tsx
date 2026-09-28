"use client";

import { useState } from "react";

const JOBS = [
  { key: "discover-keywords", label: "Run Keyword Discovery now" },
  { key: "generate-articles", label: "Run Article Generation now" },
  { key: "detect-decay", label: "Run Content Decay Scan now" },
];

/**
 * These call the automation routes through /api/automation/[job]/trigger,
 * a thin admin-only proxy that attaches CRON_SECRET server-side — so the
 * secret never reaches the browser, but a signed-in admin can still run a
 * job on demand instead of waiting for the schedule.
 */
export function JobTriggerButtons() {
  const [status, setStatus] = useState<Record<string, string>>({});

  async function trigger(jobKey: string) {
    setStatus((s) => ({ ...s, [jobKey]: "running" }));
    const res = await fetch(`/api/automation/${jobKey}/trigger`, { method: "POST" });
    const data = await res.json();
    setStatus((s) => ({ ...s, [jobKey]: res.ok ? "done" : `error: ${data.error}` }));
  }

  return (
    <div className="space-y-3">
      {JOBS.map((job) => (
        <div key={job.key} className="flex items-center justify-between rounded-lg bg-paper-100 px-4 py-3 text-sm dark:bg-ink-800/60">
          <span>{job.label}</span>
          <div className="flex items-center gap-3">
            {status[job.key] && <span className="text-xs text-ink-700/60 dark:text-paper-100/50">{status[job.key]}</span>}
            <button
              onClick={() => trigger(job.key)}
              disabled={status[job.key] === "running"}
              className="rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
            >
              Run now
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
