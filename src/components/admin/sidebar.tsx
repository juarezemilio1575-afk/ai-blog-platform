"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/components/ui/primitives";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    label: "Content",
    items: [{ href: "/admin/content", label: "Articles & Media" }],
  },
  {
    label: "AI",
    items: [{ href: "/admin/ai", label: "Content Engine" }],
  },
  {
    label: "SEO",
    items: [{ href: "/admin/seo", label: "Keywords & Decay" }],
  },
  {
    label: "Monetization",
    items: [{ href: "/admin/monetization", label: "Revenue & Affiliate" }],
  },
  {
    label: "Automation",
    items: [
      { href: "/admin/automation", label: "Jobs & Pipeline" },
      { href: "/admin/monitoring", label: "Alerts & Approvals" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/admin/settings", label: "Providers & Config" }],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-ink-800 bg-ink-900 px-4 py-6 text-paper-100">
      <div className="mb-8 px-2 font-display text-lg font-semibold">AI Blog Platform</div>
      <nav className="flex-1 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-paper-100/40">{group.label}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-2 py-2 text-sm hover:bg-ink-800",
                  pathname === item.href && "bg-ink-800 font-medium text-accent-400"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="mt-4 rounded-lg px-2 py-2 text-left text-sm text-paper-100/60 hover:bg-ink-800"
      >
        Sign out
      </button>
    </aside>
  );
}
