import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// Public: signs visitors into the shared demo account and makes sure its sample wound exists.
export const startDemo = createServerFn({ method: "POST" }).handler(async () => {
  const email = "demo@firstlook.app";
  const password = "FirstLook-demo-2026!";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const pub = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  let { data, error } = await pub.auth.signInWithPassword({ email, password });
  if (error) {
    await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    ({ data, error } = await pub.auth.signInWithPassword({ email, password }));
  }
  if (error || !data.session) throw new Error("Demo is unavailable right now.");
  const userId = data.user!.id;

  const { count } = await supabaseAdmin.from("wounds").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (!count) {
    const day = 86400000;
    const d1 = new Date(Date.now() - 2 * day).toISOString();
    const { data: wound } = await supabaseAdmin
      .from("wounds")
      .insert({ user_id: userId, title: "Scrape on forearm", created_at: d1 })
      .select("id")
      .single();
    if (wound) {
      await supabaseAdmin.from("checks").insert([
        {
          user_id: userId, wound_id: wound.id, created_at: d1, photo_path: "/demo/day1.jpg", for_whom: "me",
          tier: "self_care", summary: "Fresh scrape with mild redness. Home care should be enough.",
          answers: { fever: false, spreadingRedness: false, pus: false, warmth: false, numbness: false, pain: 3, howLong: "today", tetanus: "yes" },
          result: {
            wound_type: "Scrape", visible_signs: ["Top layer of skin rubbed off", "Mild redness around edges"],
            severity_tier: "self_care", confidence: "high",
            reasoning: "This looks like a shallow scrape. The redness is small and close to the scrape. You said you have no fever.",
            next_steps: ["Rinse with clean water", "Wash around it with mild soap", "Cover with a clean bandage", "Change the bandage daily"],
            warning_signs: ["Redness spreads past the scrape", "Pus or bad smell", "Fever or chills", "Pain gets worse after 2 days"],
            retake_needed: false, comparison: null,
          },
        },
        {
          user_id: userId, wound_id: wound.id, created_at: new Date().toISOString(), photo_path: "/demo/day3.jpg", for_whom: "me",
          tier: "self_care", summary: "Healing well. Redness is smaller and a scab is forming.",
          answers: { fever: false, spreadingRedness: false, pus: false, warmth: false, numbness: false, pain: 1, howLong: "2-3days", tetanus: "yes" },
          result: {
            wound_type: "Healing scrape", visible_signs: ["Scab forming", "Less redness"], severity_tier: "self_care", confidence: "high",
            reasoning: "The scrape is drying and a scab is forming. Redness is smaller than on day 1.",
            next_steps: ["Keep it clean and dry", "Don't pick the scab", "Use a bandage if it rubs on clothes"],
            warning_signs: ["New redness or swelling", "Pus or bad smell", "Fever"],
            retake_needed: false,
            comparison: { change: "better", summary: "Redness is smaller and a scab is forming. This looks like normal healing." },
          },
        },
      ]);
    }
  }
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
});
