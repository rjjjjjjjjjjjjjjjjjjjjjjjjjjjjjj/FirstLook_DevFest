// Server-only: AWS analyze endpoint client. Secrets are read inside the call and
// never reach browser code. Import only from *.functions.ts handlers.
export class AnalyzeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** The app gives up on the endpoint after this long. */
export const ANALYZE_TIMEOUT_MS = 20_000;

export async function callAnalyze(body: unknown): Promise<unknown> {
  const url = process.env["AWS_ANALYZE_URL"];
  const secret = process.env["AWS_API_SECRET"];
  if (!url || !secret) throw new AnalyzeError(500, "AWS analysis is not configured.");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": secret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new AnalyzeError(0, `AWS request failed: ${reason}`);
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new AnalyzeError(res.status, `AWS returned ${res.status}: ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new AnalyzeError(502, `AWS returned unreadable JSON: ${text.slice(0, 200)}`);
  }
}
