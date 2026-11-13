import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/lib/auth";

const auth = vi.hoisted(() => ({ listener: undefined as undefined | ((event: string, session: unknown) => void) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  onAuthStateChange: vi.fn((listener) => { auth.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
  getSession: vi.fn(async () => ({ data: { session: null } })),
} } }));

describe("Account data privacy", () => {
  beforeEach(() => { auth.listener = undefined; });

  it("removes the previous user's cached wound checks when the account changes", async () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><AuthProvider><span /></AuthProvider></QueryClientProvider>);
    await waitFor(() => expect(auth.listener).toBeTypeOf("function"));
    act(() => auth.listener?.("SIGNED_IN", { user: { id: "owner-one" } }));
    client.setQueryData(["wounds"], [{ id: "private-wound-owner-one" }]);
    act(() => auth.listener?.("SIGNED_IN", { user: { id: "owner-two" } }));
    expect(client.getQueryData(["wounds"])).toBeUndefined();
  });

  it("removes cached wound checks when signing out", async () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><AuthProvider><span /></AuthProvider></QueryClientProvider>);
    await waitFor(() => expect(auth.listener).toBeTypeOf("function"));
    act(() => auth.listener?.("SIGNED_IN", { user: { id: "owner-one" } }));
    client.setQueryData(["wounds"], [{ id: "private-wound-owner-one" }]);
    act(() => auth.listener?.("SIGNED_OUT", null));
    expect(client.getQueryData(["wounds"])).toBeUndefined();
  });
});