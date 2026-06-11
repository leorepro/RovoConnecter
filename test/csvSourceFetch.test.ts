import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@forge/api", () => ({ fetch: vi.fn() }));

import { fetch } from "@forge/api";
import { fetchCsv, loadRows } from "../src/source/csvSource";

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

const ok = (text: string) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  text: async () => text,
});

beforeEach(() => vi.clearAllMocks());

describe("fetchCsv", () => {
  it("returns the body text on a successful response", async () => {
    mockFetch.mockResolvedValue(ok("id,title\n1,Hello"));
    expect(await fetchCsv("https://example.com/data.csv")).toBe("id,title\n1,Hello");
  });

  it("throws with status info on a failed response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    await expect(fetchCsv("https://example.com/missing.csv")).rejects.toThrow(/404 Not Found/);
  });
});

describe("loadRows", () => {
  it("fetches and parses CSV into rows", async () => {
    mockFetch.mockResolvedValue(ok("id,title\n1,Hello\n2,World"));
    expect(await loadRows("https://example.com/data.csv")).toEqual([
      { id: "1", title: "Hello" },
      { id: "2", title: "World" },
    ]);
  });
});
