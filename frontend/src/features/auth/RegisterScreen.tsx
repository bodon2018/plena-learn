"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { AlertCircle, Loader2, Mail, KeyRound, User, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLocalError(null);
    try {
      await auth.verifyInvite(code.trim());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await auth.register({
        code: code.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      });
      router.push("/user/account");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-heading-1">Register</h1>
            <p className="text-body text-mute">Join with an invite code</p>
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
              <label className="text-ui font-medium text-ink" htmlFor="code">
                Invite Code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-xl",
                      "border border-neutral-200 bg-white",
                      "text-body text-ink",
                      "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    )}
                    placeholder="e.g., DEMOADMIN"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerify}
                  className={cn(
                    "px-3 py-2 rounded-xl",
                    "bg-neutral-100 text-ink",
                    "text-caption font-semibold",
                    "hover:bg-neutral-200",
                    "transition-colors"
                  )}
                >
                  Verify
                </button>
              </div>
              {auth.inviteInfo && (
                <p className="text-caption text-success">
                  Invite for role <strong>{auth.inviteInfo.role}</strong>{" "}
                  {auth.inviteInfo.organization?.name ? `@ ${auth.inviteInfo.organization.name}` : ""}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-ui font-medium text-ink" htmlFor="name">
                Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl",
                    "border border-neutral-200 bg-white",
                    "text-body text-ink",
                    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  )}
                  placeholder="Your full name"
                />
              </div>
            </div>

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
                  placeholder="you@example.com"
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl",
                    "border border-neutral-200 bg-white",
                    "text-body text-ink",
                    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  )}
                  placeholder="Min 8 characters"
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
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-caption text-mute text-center">
            Use invite codes: <span className="font-semibold text-ink">DEMOADMIN</span> (admin) or{" "}
            <span className="font-semibold text-ink">DEMOUSER</span> (user).
          </p>
        </div>
      </Card>
    </div>
  );
}
