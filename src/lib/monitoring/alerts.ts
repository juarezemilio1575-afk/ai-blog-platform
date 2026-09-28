import { db } from "@/lib/db";

/**
 * Phase 17 (Monitoring): every alert is always persisted to SystemAlert so
 * it shows up in Admin → Alerts & Approvals even if email isn't configured.
 * If EMAIL_SERVER_* env vars are set, it also emails the site owner —
 * critical alerts should never be silent.
 */
export async function createAlert(params: {
  severity: "info" | "warning" | "critical";
  category: "budget" | "cron" | "api_error" | "traffic_anomaly" | "revenue_anomaly" | "broken_link" | "indexing";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const alert = await db.systemAlert.create({
    data: {
      severity: params.severity,
      category: params.category,
      message: params.message,
      metadata: params.metadata as never,
    },
  });

  if (params.severity !== "info" && process.env.EMAIL_SERVER_HOST) {
    try {
      const { default: nodemailer } = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
        auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
      });
      await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_FROM, // sends to the site owner's own configured address
        subject: `[${params.severity.toUpperCase()}] ${params.category}: ${params.message.slice(0, 80)}`,
        text: `${params.message}\n\n${JSON.stringify(params.metadata ?? {}, null, 2)}`,
      });
    } catch (err) {
      // Never let a failed alert email crash the calling job — the alert is
      // already safely persisted in the database either way.
      console.error("Failed to send alert email:", err);
    }
  }

  return alert;
}
