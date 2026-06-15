"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, AlertCircle } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    const { user, error: authError } = await signInWithGoogle();
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
              <h2 className="text-2xl font-bold text-text">Welcome Back</h2>
              <p className="text-sm text-muted mt-1">EngageBot Admin Portal</p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-error-border bg-error-bg px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {/* Google sign-in */}
            <Button
              variant="secondary"
              size="lg"
              onClick={handleGoogleSignIn}
              loading={loading}
              className="w-full border-border"
            >
              {!loading && (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Sign in with Google
            </Button>

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
