import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { DEFAULT_RISK, type RiskFactors } from "./triage";

export type HealthProfile = {
  conditions: string[];
  medications: string[];
  allergies: string[];
  lastTetanus: string;
  ageRange: string;
};

export type ProfilePreferences = {
  acknowledgedAt?: string;
  healthProfile?: HealthProfile | null;
};

export const EMPTY_HEALTH_PROFILE: HealthProfile = {
  conditions: [],
  medications: [],
  allergies: [],
  lastTetanus: "",
  ageRange: "",
};

export function useProfilePreferences() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["profile-preferences", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfilePreferences> => {
      const { data, error } = await supabase.from("profiles").select("preferences").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return (data?.preferences ?? {}) as ProfilePreferences;
    },
  });
}

/** Maps only the risk flags relevant to a check; the full profile never leaves the browser. */
export function profileRiskFlags(profile: HealthProfile | null | undefined, now = new Date()): RiskFactors {
  const risk = { ...DEFAULT_RISK };
  if (!profile) return risk;
  risk.diabetes = profile.conditions.includes("diabetes");
  risk.weakImmune = profile.conditions.includes("weak_immune") || profile.medications.includes("immunosuppressants");
  risk.pregnant = profile.conditions.includes("pregnant");
  risk.bloodThinners = profile.medications.includes("blood_thinners");
  if (profile.lastTetanus === "unsure") risk.noTetanus = true;
  if (profile.lastTetanus && profile.lastTetanus !== "unsure") {
    const shot = new Date(`${profile.lastTetanus}T00:00:00`);
    const cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - 10);
    risk.noTetanus = !Number.isNaN(shot.getTime()) && shot < cutoff;
  }
  return risk;
}
