"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/primitives";

interface ScheduleRow {
  id: string;
  jobKey: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

export function ScheduleEditor() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/automation/schedule")
      .then((r) => r.json())
      .then((data) => setSchedules(data.schedules ?? []));
  }, []);

  async function save(row: ScheduleRow) {
    setSaving(row.jobKey);
    await fetch("/api/automation/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobKey: row.jobKey, hour: row.hour, minute: row.minute, enabled: row.enabled }),
    });
    setSaving(null);
  }

  function updateRow(jobKey: string, patch: Partial<ScheduleRow>) {
    setSchedules((prev) => prev.map((s) => (s.jobKey === jobKey ? { ...s, ...patch } : s)));
  }

  return (
    <Card className="p-0">
      <div className="border-b border-paper-200 px-4 py-3 dark:border-ink-800">
        <h2 className="font-display text-lg font-semibold">Daily schedule (UTC)</h2>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-paper-100/50">
          Changes take effect within 15 minutes — no redeploy needed (see /api/automation/dispatcher).
        </p>
      </div>
      <ul className="divide-y divide-paper-200 dark:divide-ink-800">
        {schedules.map((s) => (
          <li key={s.jobKey} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="font-medium">{s.jobKey}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                value={s.hour}
                onChange={(e) => updateRow(s.jobKey, { hour: Number(e.target.value) })}
                className="w-14 rounded border border-paper-200 px-2 py-1 dark:border-ink-800 dark:bg-ink-900"
              />
              :
              <input
                type="number"
                min={0}
                max={59}
                value={s.minute}
                onChange={(e) => updateRow(s.jobKey, { minute: Number(e.target.value) })}
                className="w-14 rounded border border-paper-200 px-2 py-1 dark:border-ink-800 dark:bg-ink-900"
              />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={s.enabled} onChange={(e) => updateRow(s.jobKey, { enabled: e.target.checked })} />
                on
              </label>
              <button
                onClick={() => save(s)}
                disabled={saving === s.jobKey}
                className="rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
              >
                {saving === s.jobKey ? "..." : "Save"}
              </button>
            </div>
          </li>
        ))}
        {schedules.length === 0 && <li className="px-4 py-6 text-center text-ink-700/60">No schedule rows yet — run npm run db:seed.</li>}
      </ul>
    </Card>
  );
}
