"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui/primitives";

export interface ApprovalRow {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
}

const TYPE_TONE: Record<string, "warning" | "danger"> = {
  spend: "warning",
  delete_data: "danger",
  purchase_service: "warning",
  domain_change: "danger",
  structure_change: "danger",
};

export function ApprovalsList({ approvals }: { approvals: ApprovalRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function resolve(id: string, status: "APPROVED" | "REJECTED") {
    setLoadingId(id);
    await fetch(`/api/automation/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoadingId(null);
    router.refresh();
  }

  return (
    <Card className="p-0">
      <div className="border-b border-paper-200 px-4 py-3 dark:border-ink-800">
        <h2 className="font-display text-lg font-semibold">Pending approvals</h2>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-paper-100/50">
          The Growth Agent queues anything involving spend, data deletion, or structural changes here instead of doing it automatically (Phase 14/26).
        </p>
      </div>
      <ul className="divide-y divide-paper-200 dark:divide-ink-800">
        {approvals.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone={TYPE_TONE[a.type] ?? "warning"}>{a.type}</Badge>
              <p className="mt-1">{a.description}</p>
              <p className="text-xs text-ink-700/50">{new Date(a.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resolve(a.id, "APPROVED")}
                disabled={loadingId === a.id}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => resolve(a.id, "REJECTED")}
                disabled={loadingId === a.id}
                className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
        {approvals.length === 0 && <li className="px-4 py-6 text-center text-ink-700/60">Nothing pending — the site is running within its automated boundaries.</li>}
      </ul>
    </Card>
  );
}
