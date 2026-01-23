"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export type Organization = {
  id: number;
  name: string;
  sport?: string | null;
};

export type Team = {
  id: number;
  name: string;
  organization_id?: number | null;
  organization?: Organization | null;
  players?: Array<{ id: number; name: string; position?: string | null; number?: string | null }>;
  coaches?: Array<{ id: number; name: string; role?: string | null }>;
};

export type GameSession = {
  id: number;
  name?: string | null;
  session_type?: string | null;
  start_at?: string | null;
  location?: string | null;
  organization_id?: number | null;
  home_team_id?: number | null;
  away_team_id?: number | null;
  organization?: Organization | null;
  home_team?: Team | null;
  away_team?: Team | null;
};

export type DirectoryState = {
  loading: boolean;
  error: string | null;
  organizations: Organization[];
  teams: Team[];
  sessions: GameSession[];
};

export function useDirectory(): DirectoryState & { refresh: () => Promise<void> } {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reqInit: RequestInit = { credentials: "include" };
      const [orgRes, teamRes, sessionRes] = await Promise.all([
        fetch(`${API_BASE}/api/organizations`, reqInit),
        fetch(`${API_BASE}/api/teams`, reqInit),
        fetch(`${API_BASE}/api/sessions`, reqInit),
      ]);

      if (!orgRes.ok) throw new Error(`Organizations failed (${orgRes.status})`);
      if (!teamRes.ok) throw new Error(`Teams failed (${teamRes.status})`);
      if (!sessionRes.ok) throw new Error(`Sessions failed (${sessionRes.status})`);

      const orgs = (await orgRes.json()) as Organization[];
      const teamList = (await teamRes.json()) as Team[];
      const sessionList = (await sessionRes.json()) as GameSession[];

      setOrganizations(Array.isArray(orgs) ? orgs : []);
      setTeams(Array.isArray(teamList) ? teamList : []);
      setSessions(Array.isArray(sessionList) ? sessionList : []);
    } catch (err) {
      console.error("Directory refresh error:", err);
      setError(err instanceof Error ? err.message : "Failed to load directory data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    error,
    organizations,
    teams,
    sessions,
    refresh,
  };
}
