import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.mocked(createClient).mockClear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("independent Supabase session storage", () => {
  it("preserves browser-local login, refresh and logout storage without an editor", async () => {
    const values = new Map<string, string>([["existing-session", "existing-token"]]);
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    };
    vi.stubGlobal("window", { localStorage: storage });

    const { supabase } = await import("../../src/integrations/supabase/client");
    expect(supabase.auth).toBeDefined();
    const options = vi.mocked(createClient).mock.calls[0]?.[2];
    expect(options?.auth?.persistSession).toBe(true);
    expect(options?.auth?.autoRefreshToken).toBe(true);
    expect(options?.auth?.storage).toBe(storage);
    expect(await options?.auth?.storage?.getItem("existing-session")).toBe("existing-token");
    await options?.auth?.storage?.setItem("existing-session", "refreshed-token");
    expect(storage.getItem("existing-session")).toBe("refreshed-token");
    await options?.auth?.storage?.removeItem("existing-session");
    expect(storage.getItem("existing-session")).toBeNull();
  });

  it("does not access browser storage during server rendering", async () => {
    vi.stubGlobal("window", undefined);
    const { supabase } = await import("../../src/integrations/supabase/client");
    expect(supabase.auth).toBeDefined();
    expect(vi.mocked(createClient).mock.calls[0]?.[2]?.auth?.storage).toBeUndefined();
  });

  it("fails explicitly when independent Supabase configuration is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_URL", "");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { supabase } = await import("../../src/integrations/supabase/client");
    expect(() => supabase.auth).toThrow("Missing Supabase environment variable(s): SUPABASE_URL");
    expect(errorLog).toHaveBeenCalledOnce();
    expect(createClient).not.toHaveBeenCalled();
  });
});
