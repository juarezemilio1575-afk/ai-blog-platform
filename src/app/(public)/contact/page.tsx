export default function ContactPage() {
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-3xl font-semibold">Contact us</h1>
      <form className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" className="w-full rounded-lg border border-paper-200 px-3 py-2 dark:border-ink-800 dark:bg-ink-900" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" name="email" className="w-full rounded-lg border border-paper-200 px-3 py-2 dark:border-ink-800 dark:bg-ink-900" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="message">
            Message
          </label>
          <textarea id="message" name="message" rows={5} className="w-full rounded-lg border border-paper-200 px-3 py-2 dark:border-ink-800 dark:bg-ink-900" />
        </div>
        <button type="submit" className="rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600">
          Send message
        </button>
        <p className="text-xs text-ink-700/60 dark:text-paper-100/50">
          Wire this form to /api/contact (or a provider like Formspree/Resend) — not implemented in this scaffold.
        </p>
      </form>
    </div>
  );
}
