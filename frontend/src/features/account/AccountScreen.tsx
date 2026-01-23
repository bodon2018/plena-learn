"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { User, CreditCard, Settings, Bell, Shield, HelpCircle, LogOut, LogIn } from "lucide-react";
import Card from "@/components/ui/Card";
import UserProfileCard from "./components/UserProfileCard";
import AccountMenuItem from "./components/AccountMenuItem";
import { useAuth } from "@/hooks/useAuth";

/**
 * Account screen - backed by real auth endpoints.
 */
export default function AccountScreen() {
  const router = useRouter();
  const auth = useAuth();

  const isLoggedIn = Boolean(auth.user);
  const userDisplay = useMemo(
    () =>
      auth.user || {
        name: "Guest",
        email: "guest@example.com",
        avatarUrl: null,
      },
    [auth.user]
  );

  useEffect(() => {
    // refresh on mount
    auth.refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1 text-ink">Account</h1>
        <p className="text-body text-mute mt-1">Manage your profile and preferences</p>
      </div>

      {/* User profile */}
      {isLoggedIn ? (
        <UserProfileCard name={userDisplay.name} email={userDisplay.email ?? ""} avatarUrl={null} />
      ) : (
        <Card className="bg-neutral-50">
          <div className="text-center py-4">
            <div
              className={cn(
                "w-16 h-16 rounded-full",
                "bg-neutral-200",
                "flex items-center justify-center",
                "mx-auto mb-4"
              )}
            >
              <User className="w-8 h-8 text-mute" />
            </div>
            <h2 className="text-heading-3 text-ink mb-1">Not logged in</h2>
            <p className="text-body-sm text-mute mb-4">Sign in to access your account</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className={cn(
                  "inline-flex items-center gap-2",
                  "px-5 py-2.5 rounded-full",
                  "bg-primary text-white",
                  "text-ui font-semibold",
                  "shadow-soft hover:shadow-lift",
                  "transition-all duration-150",
                  "active:scale-[0.98]"
                )}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => router.push("/auth/register")}
                className={cn(
                  "inline-flex items-center gap-2",
                  "px-5 py-2.5 rounded-full",
                  "bg-white text-ink border border-neutral-200",
                  "text-ui font-semibold",
                  "shadow-soft hover:shadow-lift",
                  "transition-all duration-150",
                  "active:scale-[0.98]"
                )}
              >
                Register
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Account menu */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">Account</h3>

        <div className="space-y-2">
          <AccountMenuItem
            icon={User}
            label="Profile"
            description="View your profile details"
            onClick={() => router.push("/auth/login")}
          />

          <AccountMenuItem
            icon={CreditCard}
            label="Subscription"
            description="Manage your plan and billing"
            onClick={() => console.log("Subscription clicked")}
          />
        </div>
      </div>

      {/* Settings menu */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">Settings</h3>

        <div className="space-y-2">
          <AccountMenuItem
            icon={Bell}
            label="Notifications"
            description="Configure alerts and reminders"
            onClick={() => console.log("Notifications clicked")}
          />

          <AccountMenuItem
            icon={Shield}
            label="Privacy"
            description="Control your data and visibility"
            onClick={() => console.log("Privacy clicked")}
          />

          <AccountMenuItem
            icon={Settings}
            label="Preferences"
            description="App settings and customization"
            onClick={() => console.log("Preferences clicked")}
          />
        </div>
      </div>

      {/* Support section */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">Support</h3>

        <div className="space-y-2">
          <AccountMenuItem
            icon={HelpCircle}
            label="Help & Support"
            description="Get help and contact us"
            onClick={() => console.log("Help clicked")}
          />
        </div>
      </div>

      {/* Logout */}
      {isLoggedIn && (
        <div className="pt-2">
          <AccountMenuItem
            icon={LogOut}
            label="Log Out"
            description="Sign out of your account"
            onClick={() => auth.logout()}
            variant="danger"
          />
        </div>
      )}

      <div className="pt-4 text-center">
        <p className="text-caption text-subtle">Plena Learn v1.0.0</p>
      </div>
    </div>
  );
}
