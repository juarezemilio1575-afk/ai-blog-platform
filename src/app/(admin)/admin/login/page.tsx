"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-ink-800 bg-ink-800/40 p-8">
        <h1 className="mb-6 font-display text-2xl font-semibold text-paper-50">Admin sign in</h1>
        <div className="mb-4">
          <label className="mb-1 block text-sm text-paper-100/70">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-paper-50"
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm text-paper-100/70">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-paper-50"
          />
        </div>
        {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-4 text-xs text-paper-100/50">
          Demo credentials after seeding: admin@example.com / admin123 (change immediately in production).
        </p>
      </form>
    </div>
  );
}
