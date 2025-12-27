"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  User,
  CreditCard,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  LogIn,
} from "lucide-react";
import Card from "@/components/ui/Card";
import UserProfileCard from "./components/UserProfileCard";
import AccountMenuItem from "./components/AccountMenuItem";

/**
 * Account screen - User profile and settings.
 * 
 * Features:
 * - User profile card with avatar
 * - Account settings menu items
 * - Login/Logout functionality
 */
export default function AccountScreen() {
  // Mock authentication state - replace with actual auth logic
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Mock user data - replace with actual user data
  const user = {
    name: "FirstName LastName",
    email: "first.last@example.com",
    avatarUrl: null as string | null,
  };

  const handleLogin = () => {
    // TODO: Implement actual login logic
    console.log("Login clicked");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      console.log("Logout clicked");
      setIsLoggedIn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Account</h1>
        <p className="text-body text-mute mt-1">
          Manage your profile and preferences
        </p>
      </div>

      {/* User profile card - only show when logged in */}
      {isLoggedIn ? (
        <UserProfileCard
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
        />
      ) : (
        // Logged out state
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
            <h2 className="text-heading-3 text-ink mb-1">
              Not logged in
            </h2>
            <p className="text-body-sm text-mute mb-4">
              Sign in to access your account
            </p>
            <button
              type="button"
              onClick={handleLogin}
              className={cn(
                "inline-flex items-center gap-2",
                "px-6 py-2.5 rounded-full",
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
          </div>
        </Card>
      )}

      {/* Account menu section */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">
          Account
        </h3>
        
        <div className="space-y-2">
          <AccountMenuItem
            icon={User}
            label="Profile"
            description="Manage your display name and email"
            onClick={() => console.log("Profile clicked")}
          />
          
          <AccountMenuItem
            icon={CreditCard}
            label="Subscription"
            description="Manage your plan and billing"
            onClick={() => console.log("Subscription clicked")}
          />
        </div>
      </div>

      {/* Settings menu section */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">
          Settings
        </h3>
        
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
        <h3 className="text-overline text-mute uppercase px-1">
          Support
        </h3>
        
        <div className="space-y-2">
          <AccountMenuItem
            icon={HelpCircle}
            label="Help & Support"
            description="Get help and contact us"
            onClick={() => console.log("Help clicked")}
          />
        </div>
      </div>

      {/* Logout section - only show when logged in */}
      {isLoggedIn && (
        <div className="pt-2">
          <AccountMenuItem
            icon={LogOut}
            label="Log Out"
            description="Sign out of your account"
            onClick={handleLogout}
            variant="danger"
          />
        </div>
      )}

      {/* App version footer */}
      <div className="pt-4 text-center">
        <p className="text-caption text-subtle">
          Plena Learn v1.0.0
        </p>
      </div>
    </div>
  );
}