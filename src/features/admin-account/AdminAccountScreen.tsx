"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  User,
  CreditCard,
  Users,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  LogIn,
} from "lucide-react";
import Card from "@/components/ui/Card";
import AdminProfileCard from "./components/AdminProfileCard";
import AdminMenuItem from "./components/AdminMenuItem";

/**
 * Admin Account screen - Profile and organization settings.
 * 
 * Features:
 * - Admin profile card with organization info
 * - Account settings menu items
 * - Login/Logout functionality
 */
export default function AdminAccountScreen() {
  // Mock authentication state - replace with actual auth logic
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Mock admin data - replace with actual user data
  const admin = {
    name: "Admin User",
    email: "admin@plenalearn.com",
    organization: "Plena Learn",
    avatarUrl: null as string | null,
  };

  const handleLogin = () => {
    // TODO: Implement actual login logic
    console.log("Admin login clicked");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      console.log("Admin logout clicked");
      setIsLoggedIn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Account</h1>
        <p className="text-body text-mute mt-1">
          Manage your profile and organization settings
        </p>
      </div>

      {/* Admin profile card - only show when logged in */}
      {isLoggedIn ? (
        <AdminProfileCard
          name={admin.name}
          email={admin.email}
          organization={admin.organization}
          avatarUrl={admin.avatarUrl}
        />
      ) : (
        // Logged out state
        <Card className="bg-neutral-50">
          <div className="text-center py-6">
            <div
              className={cn(
                "w-16 h-16 rounded-full",
                "bg-neutral-200",
                "flex items-center justify-center",
                "mx-auto mb-4"
              )}
            >
              <Shield className="w-8 h-8 text-mute" />
            </div>
            <h2 className="text-heading-3 text-ink mb-1">
              Not logged in
            </h2>
            <p className="text-body-sm text-mute mb-4">
              Sign in to access admin settings
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

      {/* Account section */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">
          Account
        </h3>
        
        <div className="space-y-2">
          <AdminMenuItem
            href="/admin/account/profile"
            icon={User}
            label="Profile"
            description="Manage your display name and email"
          />
          
          <AdminMenuItem
            href="/admin/account/payment"
            icon={CreditCard}
            label="Payment"
            description="Manage billing, plan, and invoices"
          />
          
          <AdminMenuItem
            href="/admin/account/team"
            icon={Users}
            label="Team"
            description="Manage users, add and remove invitations"
          />
        </div>
      </div>

      {/* Settings section */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">
          Settings
        </h3>
        
        <div className="space-y-2">
          <AdminMenuItem
            href="/admin/account/settings"
            icon={Settings}
            label="Settings"
            description="Notifications, privacy, and more"
          />
          
          <AdminMenuItem
            href="/admin/account/security"
            icon={Shield}
            label="Security"
            description="Password, two-factor authentication"
          />
          
          <AdminMenuItem
            href="/admin/account/notifications"
            icon={Bell}
            label="Notifications"
            description="Email and push notification preferences"
          />
        </div>
      </div>

      {/* Support section */}
      <div className="space-y-3">
        <h3 className="text-overline text-mute uppercase px-1">
          Support
        </h3>
        
        <div className="space-y-2">
          <AdminMenuItem
            href="/admin/account/help"
            icon={HelpCircle}
            label="Help & Support"
            description="Documentation and contact support"
          />
        </div>
      </div>

      {/* Logout section - only show when logged in */}
      {isLoggedIn && (
        <div className="pt-2">
          <AdminMenuItem
            href="#"
            icon={LogOut}
            label="Log Out"
            description="Sign out of your admin account"
            variant="danger"
            asButton
            onClick={handleLogout}
          />
        </div>
      )}

      {/* App version footer */}
      <div className="pt-4 text-center">
        <p className="text-caption text-subtle">
          Plena Admin v1.0.0
        </p>
      </div>
    </div>
  );
}