import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | false | null)[]) {
  return twMerge(clsx(inputs));
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger" }) {
  const tones: Record<string, string> = {
    neutral: "bg-paper-200 text-ink-700 dark:bg-ink-800 dark:text-paper-100",
    accent: "bg-accent-500/10 text-accent-600 dark:text-accent-400",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-paper-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-800/40", className)}>
      {children}
    </div>
  );
}
