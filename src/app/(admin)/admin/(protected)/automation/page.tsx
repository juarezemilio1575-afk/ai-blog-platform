import { db } from "@/lib/db";
import { Badge, Card } from "@/components/ui/primitives";
import { JobTriggerButtons } from "./job-trigger-buttons";

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "danger"> = {
  SUCCESS: "success",
  RUNNING: "accent",
  FAILED: "danger",
  PENDING: "neutral",
};

export default async function AdminAutomationPage() {
  const jobs = await db.automationJob.findMany({ orderBy: { createdAt: "desc" }, take: 30 });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Automation</h1>

      <div className="mb-8">
        <JobTriggerButtons />
      </div>

      <Card className="p-0">
        <div className="border-b border-paper-200 px-4 py-3 dark:border-ink-800">
          <h2 className="font-display text-lg font-semibold">Recent job runs</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-100 dark:bg-ink-800/60">
            <tr>
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Started</th>
              <th className="px-4 py-2">Log</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-paper-200 dark:border-ink-800">
                <td className="px-4 py-2">{j.jobKey}</td>
                <td className="px-4 py-2">
                  <Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge>
                </td>
                <td className="px-4 py-2 text-xs text-ink-700/60 dark:text-paper-100/50">
                  {j.startedAt?.toLocaleString() ?? "—"}
                </td>
                <td className="max-w-md truncate px-4 py-2 text-xs text-ink-700/60 dark:text-paper-100/50">{j.log}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-700/60">
                  No job runs yet — trigger one above, or wait for the Vercel Cron schedule in vercel.json.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
