"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, AlertCircle, Eye, EyeOff } from "lucide-react";
import { signInWithEmail } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const { user, error: authError } = await signInWithEmail(email, password);
    setLoading(false);
    if (authError) {
      setError(authError);
      return;
    }
    if (user) {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Left panel */}
      <div className="hidden md:flex w-[420px] shrink-0 bg-sidebar flex-col items-center justify-center px-10 gap-6">
        <div className="w-20 h-20 bg-black/80 rounded-2xl flex items-center justify-center shadow-lg">
          <Cpu size={40} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">EngageBot</h1>
          <p className="text-green-200 text-sm leading-relaxed text-center max-w-xs">
            Advanced Classroom Engagement Intelligence for Malaysian Schools
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-between bg-background px-6 py-10">
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-sm bg-surface rounded-2xl shadow-md px-8 py-10 flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-text">Admin Sign In</h2>
              <p className="text-sm text-muted mt-1">EngageBot Admin Portal</p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-error-border bg-error-bg px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="admin@school.edu.my"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                Sign In
              </Button>
            </form>

            <p className="text-xs text-center text-muted leading-relaxed">
              Access is restricted to authorised administrators only. All login attempts are monitored
              and logged for security auditing purposes.
            </p>
          </div>
        </div>

        <footer className="flex flex-col items-center gap-3 text-xs text-muted">
          <p>© 2026 EngageBot Malaysia. All Rights Reserved.</p>
          <div className="flex gap-4">
            <button className="hover:text-text transition-colors">Security Policy</button>
            <button className="hover:text-text transition-colors">Privacy Notice</button>
            <button className="hover:text-text transition-colors">Usage Guidelines</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
