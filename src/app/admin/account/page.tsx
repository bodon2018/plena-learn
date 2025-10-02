// CHANGE: New Admin Account page with four cards (Profile, Payment, Team, Settings)
// and "Welcome Back!" heading. Uses the same card + typography system as user views.

"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";

export default function AdminAccountPage() {
  return (
    <>
      {/* CHANGE: Title per request */}
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome Back!</h1>

      <div className="mt-6 space-y-4">
        {/* Profile */}
        <Link href="/admin/account/profile" className="block">
          <Card className="hover:shadow-lift transition">
            {/* KEEP: same visual language as user account cards */}
            <h2 className="text-xl font-bold">Profile</h2>
            <p className="text-mute mt-1">
              Manage your display name and email.
            </p>
          </Card>
        </Link>

        {/* Payment */}
        <Link href="/admin/account/payment" className="block">
          <Card className="hover:shadow-lift transition">
            <h2 className="text-xl font-bold">Payment</h2>
            <p className="text-mute mt-1">
              Manage billing, plan, and invoices.
            </p>
          </Card>
        </Link>

        {/* Team */}
        <Link href="/admin/account/team" className="block">
          <Card className="hover:shadow-lift transition">
            <h2 className="text-xl font-bold">Team</h2>
            {/* CHANGE: Admin-specific copy per request */}
            <p className="text-mute mt-1">
              Manage your users, add and remove invitations.
            </p>
          </Card>
        </Link>

        {/* Settings */}
        <Link href="/admin/account/settings" className="block">
          <Card className="hover:shadow-lift transition">
            <h2 className="text-xl font-bold">Settings</h2>
            <p className="text-mute mt-1">
              Notifications, privacy, and more.
            </p>
          </Card>
        </Link>
      </div>
    </>
  );
}
