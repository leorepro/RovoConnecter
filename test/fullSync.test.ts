import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@forge/teamwork-graph", () => ({
  default: { setObjects: vi.fn() },
}));
vi.mock("../src/source/csvSource", () => ({ loadRows: vi.fn() }));
vi.mock("../src/config/connectorConfig", () => ({ getConnection: vi.fn() }));

import graph from "@forge/teamwork-graph";
import { syncConnection } from "../src/ingest/fullSync";
import { loadRows } from "../src/source/csvSource";
import { getConnection } from "../src/config/connectorConfig";

const setObjects = (graph as unknown as { setObjects: ReturnType<typeof vi.fn> }).setObjects;
const mockLoad = loadRows as unknown as ReturnType<typeof vi.fn>;
const mockGet = getConnection as unknown as ReturnType<typeof vi.fn>;

const cfg = { csvUrl: "https://example.com/data.csv", idColumn: "id", titleColumn: "title" };
const accepted = (n: number) => ({
  success: true,
  results: { accepted: Array.from({ length: n }, (_, i) => ({ entityId: { id: String(i) } })), rejected: [] },
});

beforeEach(() => vi.clearAllMocks());

describe("syncConnection", () => {
  it("throws when there is no stored config", async () => {
    mockGet.mockResolvedValue(undefined);
    await expect(syncConnection("c1")).rejects.toThrow(/No stored config/);
  });

  it("calls setObjects with the connectionId and reports accepted counts", async () => {
    mockGet.mockResolvedValue(cfg);
    mockLoad.mockResolvedValue([
      { id: "1", title: "A" },
      { id: "2", title: "B" },
    ]);
    setObjects.mockResolvedValue(accepted(2));

    const r = await syncConnection("c1");
    expect(r).toMatchObject({ connectionId: "c1", fetched: 2, ingested: 2, failed: 0 });
    expect(setObjects).toHaveBeenCalledTimes(1);
    expect(setObjects).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: "c1", objects: expect.any(Array) })
    );
  });

  it("counts rejected objects as failed", async () => {
    mockGet.mockResolvedValue(cfg);
    mockLoad.mockResolvedValue([
      { id: "1", title: "A" },
      { id: "2", title: "B" },
    ]);
    setObjects.mockResolvedValue({
      success: false,
      results: { accepted: [{ entityId: { id: "1" } }], rejected: [{ key: {}, errors: [] }] },
    });

    const r = await syncConnection("c1");
    expect(r.ingested).toBe(1);
    expect(r.failed).toBe(1);
  });

  it("counts the whole batch as failed when setObjects throws", async () => {
    mockGet.mockResolvedValue(cfg);
    mockLoad.mockResolvedValue([{ id: "1", title: "A" }]);
    setObjects.mockRejectedValue(new Error("network"));

    const r = await syncConnection("c1");
    expect(r.failed).toBe(1);
    expect(r.ingested).toBe(0);
  });
});
