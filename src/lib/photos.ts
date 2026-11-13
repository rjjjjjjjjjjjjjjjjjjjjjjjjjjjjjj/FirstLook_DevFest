import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resize an image (File or URL) to a JPEG data URL, max 1024px. */
export async function toDataUrl(src: File | string, max = 1024): Promise<string> {
  const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export async function photoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("/")) return path;
  const { data } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function usePhotoUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(path?.startsWith("/") ? path : null);
  useEffect(() => {
    let live = true;
    photoUrl(path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [path]);
  return url;
}

export async function uploadDataUrl(userId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}
