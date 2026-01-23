"use client";

import { cn } from "@/lib/cn";
import AdminCard from "@/components/ui/AdminCard";
import { useDirectory } from "./hooks/useDirectory";
import { AlertCircle, Loader2, RefreshCw, Users, Building2, CalendarClock } from "lucide-react";

export default function DirectoryScreen() {
  const dir = useDirectory();

  const SectionHeader = ({
    icon: Icon,
    label,
    onRefresh,
    loading,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onRefresh: () => void;
    loading: boolean;
  }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-ui font-semibold text-ink">
        <Icon className="w-5 h-5 text-primary" />
        {label}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-1.5",
          "px-3 py-1.5 rounded-lg",
          "text-caption font-medium text-mute",
          "border border-neutral-200",
          "hover:bg-neutral-50 hover:text-ink",
          "transition-all duration-150",
          "disabled:opacity-50"
        )}
      >
        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        Refresh
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1 text-ink">Directory</h1>
        <p className="text-body text-mute mt-1">
          View organizations, teams, and sessions from the backend.
        </p>
      </div>

      {/* Error banner */}
      {dir.error && (
        <div
          className={cn(
            "flex items-start gap-3 p-4 rounded-2xl",
            "bg-danger/5 border border-danger/20",
            "animate-fade-up"
          )}
        >
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-danger font-medium">
              Failed to load directory
            </p>
            <p className="text-caption text-danger/80 mt-0.5">{dir.error}</p>
          </div>
        </div>
      )}

      {/* Organizations */}
      <AdminCard
        title="Organizations"
        description="Fetched from /api/organizations"
        headerActions={
          <SectionHeader
            icon={Building2}
            label="Organizations"
            onRefresh={dir.refresh}
            loading={dir.loading}
          />
        }
      >
        {dir.loading && dir.organizations.length === 0 ? (
          <div className="flex items-center gap-2 text-mute">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {dir.organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3"
              >
                <div>
                  <p className="text-body font-semibold text-ink">{org.name}</p>
                  <p className="text-caption text-mute">
                    {org.sport ? `Sport: ${org.sport}` : "No sport specified"}
                  </p>
                </div>
                <span className="text-caption text-subtle">ID: {org.id}</span>
              </div>
            ))}
            {dir.organizations.length === 0 && (
              <p className="text-caption text-mute">No organizations found.</p>
            )}
          </div>
        )}
      </AdminCard>

      {/* Teams */}
      <AdminCard
        title="Teams"
        description="Fetched from /api/teams"
        headerActions={
          <SectionHeader
            icon={Users}
            label="Teams"
            onRefresh={dir.refresh}
            loading={dir.loading}
          />
        }
      >
        {dir.loading && dir.teams.length === 0 ? (
          <div className="flex items-center gap-2 text-mute">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {dir.teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-neutral-200 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-body font-semibold text-ink">{team.name}</p>
                  <span className="text-caption text-subtle">ID: {team.id}</span>
                </div>
                {team.organization && (
                  <p className="text-caption text-mute">
                    Org: {team.organization.name}
                  </p>
                )}
                {team.players && team.players.length > 0 && (
                  <p className="text-caption text-subtle">
                    Players: {team.players.length}
                  </p>
                )}
                {team.coaches && team.coaches.length > 0 && (
                  <p className="text-caption text-subtle">
                    Coaches: {team.coaches.length}
                  </p>
                )}
              </div>
            ))}
            {dir.teams.length === 0 && (
              <p className="text-caption text-mute">No teams found.</p>
            )}
          </div>
        )}
      </AdminCard>

      {/* Sessions */}
      <AdminCard
        title="Sessions"
        description="Fetched from /api/sessions"
        headerActions={
          <SectionHeader
            icon={CalendarClock}
            label="Sessions"
            onRefresh={dir.refresh}
            loading={dir.loading}
          />
        }
      >
        {dir.loading && dir.sessions.length === 0 ? (
          <div className="flex items-center gap-2 text-mute">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {dir.sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-neutral-200 p-4 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <p className="text-body font-semibold text-ink">
                    {s.name || "Session"}
                  </p>
                  <span className="text-caption text-subtle">ID: {s.id}</span>
                </div>
                <p className="text-caption text-mute">
                  Type: {s.session_type || "—"}
                </p>
                <p className="text-caption text-mute">
                  Start: {s.start_at ? new Date(s.start_at).toLocaleString() : "—"}
                </p>
                {s.location && (
                  <p className="text-caption text-mute">Location: {s.location}</p>
                )}
                {(s.home_team || s.away_team) && (
                  <p className="text-caption text-subtle">
                    {s.home_team?.name || "—"} vs {s.away_team?.name || "—"}
                  </p>
                )}
              </div>
            ))}
            {dir.sessions.length === 0 && (
              <p className="text-caption text-mute">No sessions found.</p>
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
