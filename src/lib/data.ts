import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AiResult, Answers, Tier } from "./triage";

export type CheckRow = {
  id: string;
  wound_id: string;
  created_at: string;
  photo_path: string | null;
  tier: Tier;
  summary: string;
  for_whom: string;
  age_group: string | null;
  answers: Answers;
  result: AiResult;
};
export type WoundRow = { id: string; title: string; created_at: string; checks: CheckRow[] };

export function useWounds(enabled = true) {
  return useQuery({
    queryKey: ["wounds"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wounds")
        .select("id, title, created_at, checks(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as WoundRow[]).map((w) => ({
        ...w,
        checks: [...w.checks].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      }));
    },
  });
}

export function buildSummary(w: WoundRow, labels: { tier: (t: Tier) => string; disclaimer: string }) {
  const lines = [`FirstLook summary: ${w.title}`, ""];
  for (const c of w.checks) {
    lines.push(`${new Date(c.created_at).toLocaleDateString()}: ${labels.tier(c.tier)}`);
    if (c.result.wound_type) lines.push(`  Type: ${c.result.wound_type}`);
    if (c.result.visible_signs?.length) lines.push(`  Signs: ${c.result.visible_signs.join(", ")}`);
    const a = c.answers;
    const sym = [a.fever && "fever", a.spreadingRedness && "spreading redness", a.pus && "pus", a.warmth && "warmth", a.numbness && "numbness"].filter(Boolean);
    lines.push(`  Pain: ${a.pain}/10. Symptoms: ${sym.length ? sym.join(", ") : "none reported"}. Tetanus in 10 yrs: ${a.tetanus}`);
    if (c.result.comparison?.summary) lines.push(`  Change: ${c.result.comparison.change}. ${c.result.comparison.summary}`);
    lines.push(`  Notes: ${c.summary}`);
  }
  lines.push("", labels.disclaimer);
  return lines.join("\n");
}
