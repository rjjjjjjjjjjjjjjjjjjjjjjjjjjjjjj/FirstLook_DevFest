import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const QUERIES = {
  telehealth: "telehealth clinic",
  chc: "community health center",
  urgent: "urgent care",
  er: "emergency room hospital",
  wound: "wound care center",
  derm: "dermatologist",
} as const;

const Input = z.object({
  kind: z.enum(["telehealth", "chc", "urgent", "er", "wound", "derm"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  lang: z.enum(["en", "es"]),
});

export type NearbyPlace = {
  id: string; name: string; address: string; rating: number | null; ratings: number;
  openNow: boolean | null; phone: string | null; mapsUrl: string | null; distanceKm: number | null;
};

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const findNearbyCare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; places: NearbyPlace[] } | { ok: false }> => {
    const lovable = process.env["LOVABLE_API_KEY"];
    const maps = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovable || !maps) { console.error("Missing Google Maps credentials"); return { ok: false }; }
    try {
      const res = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovable}`,
          "X-Connection-Api-Key": maps,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.nationalPhoneNumber,places.googleMapsUri",
        },
        body: JSON.stringify({
          textQuery: QUERIES[data.kind],
          pageSize: 8,
          languageCode: data.lang,
          locationBias: { circle: { center: { latitude: data.lat, longitude: data.lng }, radius: 25000 } },
        }),
      });
      if (!res.ok) { console.error(`Places failed [${res.status}]: ${await res.text()}`); return { ok: false }; }
      const json = (await res.json()) as { places?: any[] };
      const places: NearbyPlace[] = (json.places ?? []).map((p) => ({
        id: String(p.id),
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        rating: typeof p.rating === "number" ? p.rating : null,
        ratings: p.userRatingCount ?? 0,
        openNow: typeof p.currentOpeningHours?.openNow === "boolean" ? p.currentOpeningHours.openNow : null,
        phone: p.nationalPhoneNumber ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        distanceKm: p.location ? km(data.lat, data.lng, p.location.latitude, p.location.longitude) : null,
      })).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      return { ok: true, places };
    } catch (e) {
      console.error("Places error", e);
      return { ok: false };
    }
  });
