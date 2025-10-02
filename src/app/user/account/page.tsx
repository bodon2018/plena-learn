// CHANGE: Added AppBar so the Account page also shows the top bar with "Plena" + logo.

import AppBar from "@/components/navigation/AppBar";

export default function AccountPage() {
  return (
    <div className="space-y-4">
      <AppBar title="Account" /> {/* CHANGE: add top bar */}

      <h1 className="text-xl font-bold">Welcome Back!</h1>
      <div className="rounded-2xl border p-4">
        <h2 className="font-semibold">Profile</h2>
        <p className="text-sm text-neutral-600">Manage your display name and email.</p>
      </div>
      <div className="rounded-2xl border p-4">
        <h2 className="font-semibold">Payment</h2>
        <p className="text-sm text-neutral-600">Manage billing, plan, and invoices.</p>
      </div>
      <div className="rounded-2xl border p-4">
        <h2 className="font-semibold">Settings</h2>
        <p className="text-sm text-neutral-600">Notifications, privacy, and more.</p>
      </div>
    </div>
  );
}
