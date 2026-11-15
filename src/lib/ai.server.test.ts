import { afterEach, describe, expect, it, vi } from "vitest";
import { ANALYZE_TIMEOUT_MS, AnalyzeError, callAnalyze } from "./ai.server";

type FakeResponse = { ok: boolean; status: number; text: () => Promise<string> };

function stubEndpoint(response: FakeResponse | ((url: string, init: RequestInit) => Promise<never>)) {
  vi.stubEnv("AWS_ANALYZE_URL", "https://lambda.example.test/analyze");
  vi.stubEnv("AWS_API_SECRET", "test-secret");
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return typeof response === "function" ? response(url, init) : Promise.resolve(response);
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AWS analyze endpoint client", () => {
  it("posts JSON with the secret in the x-api-secret header", async () => {
    const calls = stubEndpoint({ ok: true, status: 200, text: async () => '{"severity_tier":"clinic"}' });
    const body = { user_id: "u1", description: "Scraped my knee." };
    expect(await callAnalyze(body)).toEqual({ severity_tier: "clinic" });
    expect(calls[0]!.url).toBe("https://lambda.example.test/analyze");
    expect(calls[0]!.init.method).toBe("POST");
    expect(new Headers(calls[0]!.init.headers).get("x-api-secret")).toBe("test-secret");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual(body);
  });

  it("treats a 401 as a failure", async () => {
    stubEndpoint({ ok: false, status: 401, text: async () => "denied" });
    const err = await callAnalyze({}).catch((e) => e);
    expect(err).toBeInstanceOf(AnalyzeError);
    expect(err.status).toBe(401);
    expect(err.message).toContain("401");
  });

  it("treats a refused request as a failure", async () => {
    stubEndpoint(() => Promise.reject(new Error("socket hang up")));
    const err = await callAnalyze({}).catch((e) => e);
    expect(err).toBeInstanceOf(AnalyzeError);
    expect(err.status).toBe(0);
    expect(err.message).toContain("socket hang up");
  });

  it("treats unreadable JSON as a failure", async () => {
    stubEndpoint({ ok: true, status: 200, text: async () => "not json" });
    const err = await callAnalyze({}).catch((e) => e);
    expect(err).toBeInstanceOf(AnalyzeError);
    expect(err.status).toBe(502);
  });

  it("fails when the endpoint is not configured", async () => {
    vi.stubEnv("AWS_ANALYZE_URL", "");
    vi.stubEnv("AWS_API_SECRET", "");
    const err = await callAnalyze({}).catch((e) => e);
    expect(err).toBeInstanceOf(AnalyzeError);
    expect(err.status).toBe(500);
  });

  it("gives up after the 20 second limit", async () => {
    vi.useFakeTimers();
    stubEndpoint((_url, init) => new Promise((_resolve, reject) => {
      // A hung endpoint must be cut off by the signal the client passes to fetch.
      init.signal?.addEventListener("abort", () => reject(new Error("The operation was aborted")));
    }));
    const pending = callAnalyze({}).catch((e) => e);
    await vi.advanceTimersByTimeAsync(ANALYZE_TIMEOUT_MS);
    const err = await pending;
    expect(err).toBeInstanceOf(AnalyzeError);
    expect(err.status).toBe(0);
    expect(err.message).toContain("aborted");
  });
});
