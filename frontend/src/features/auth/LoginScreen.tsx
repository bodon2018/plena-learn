"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await auth.login(email.trim(), password);
      router.push("/user/account");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-heading-1">Sign In</h1>
            <p className="text-body text-mute">Access your Plena account</p>
          </div>

          {(localError || auth.error) && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl",
                "bg-danger/5 border border-danger/20"
              )}
            >
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-danger">{localError || auth.error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-ui font-medium text-ink" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl",
                    "border border-neutral-200 bg-white",
                    "text-body text-ink",
                    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-ui font-medium text-ink" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl",
                    "border border-neutral-200 bg-white",
                    "text-body text-ink",
                    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  )}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2",
                "px-4 py-3 rounded-xl",
                "bg-primary text-white",
                "text-ui font-semibold",
                "shadow-soft hover:shadow-lift",
                "transition-all duration-150",
                "active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-caption text-mute text-center">
            Need an invite? Use code <span className="font-semibold text-ink">DEMOADMIN</span> or{" "}
            <span className="font-semibold text-ink">DEMOUSER</span> on the register page.
          </p>
        </div>
      </Card>
    </div>
  );
}
