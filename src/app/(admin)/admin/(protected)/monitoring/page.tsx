import { db } from "@/lib/db";
import { Badge, Card } from "@/components/ui/primitives";
import { ApprovalsList } from "./approvals-list";
import { ScheduleEditor } from "./schedule-editor";

const SEVERITY_TONE: Record<string, "neutral" | "accent" | "warning" | "danger"> = {
  info: "neutral",
  warning: "warning",
  critical: "danger",
};

export default async function AdminMonitoringPage() {
  const [alerts, approvals] = await Promise.all([
    db.systemAlert.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.approvalRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Alerts & Approvals</h1>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ApprovalsList
          approvals={approvals.map((a) => ({ id: a.id, type: a.type, description: a.description, status: a.status, createdAt: a.createdAt.toISOString() }))}
        />

        <Card className="p-0">
          <div className="border-b border-paper-200 px-4 py-3 dark:border-ink-800">
            <h2 className="font-display text-lg font-semibold">Unresolved alerts</h2>
          </div>
          <ul className="divide-y divide-paper-200 dark:divide-ink-800">
            {alerts.map((a) => (
              <li key={a.id} className="px-4 py-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                  <span className="text-xs text-ink-700/50">{a.category}</span>
                </div>
                <p>{a.message}</p>
                <p className="text-xs text-ink-700/50">{a.createdAt.toLocaleString()}</p>
              </li>
            ))}
            {alerts.length === 0 && <li className="px-4 py-6 text-center text-ink-700/60">No unresolved alerts.</li>}
          </ul>
        </Card>
      </div>

      <ScheduleEditor />

      <p className="mt-4 text-xs text-ink-700/50">
        Point an external uptime monitor (UptimeRobot, BetterStack) at <code>/api/health</code> once deployed — it
        checks real database connectivity, not just that the server process is running.
      </p>
    </div>
  );
}
