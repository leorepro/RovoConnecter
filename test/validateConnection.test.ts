import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/source/csvSource", () => ({
  fetchCsv: vi.fn(),
}));

import { validateConnection } from "../src/lifecycle/validateConnection";
import { fetchCsv } from "../src/source/csvSource";

const mockFetch = fetchCsv as unknown as ReturnType<typeof vi.fn>;
const base = { csvUrl: "https://example.com/data.csv", idColumn: "id", titleColumn: "title" };

beforeEach(() => vi.clearAllMocks());

describe("validateConnection", () => {
  it("passes when the CSV is reachable and mapped columns exist", async () => {
    mockFetch.mockResolvedValue("id,title\n1,Hello");
    expect(await validateConnection({ configProperties: base })).toEqual({ valid: true });
  });

  it("throws when csvUrl is missing", async () => {
    await expect(
      validateConnection({ configProperties: { idColumn: "id", titleColumn: "title" } })
    ).rejects.toThrow(/csvUrl/);
  });

  it("throws when idColumn is missing", async () => {
    await expect(
      validateConnection({ configProperties: { csvUrl: "x", titleColumn: "title" } })
    ).rejects.toThrow(/idColumn/);
  });

  it("throws when the CSV has no data rows", async () => {
    mockFetch.mockResolvedValue("id,title\n");
    await expect(validateConnection({ configProperties: base })).rejects.toThrow(/empty/);
  });

  it("throws when a mapped column is not in the CSV header", async () => {
    mockFetch.mockResolvedValue("id,name\n1,Hello");
    await expect(validateConnection({ configProperties: base })).rejects.toThrow(/title/);
  });
});
