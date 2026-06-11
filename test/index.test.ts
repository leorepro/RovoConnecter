import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/ingest/fullSync", () => ({ syncConnection: vi.fn() }));
vi.mock("../src/config/connectorConfig", () => ({ listConnectionIds: vi.fn() }));
// Prevent loading @forge/api via the re-exported lifecycle handlers.
vi.mock("../src/source/csvSource", () => ({
  fetchCsv: vi.fn(),
  loadRows: vi.fn(),
  parseCsv: vi.fn(),
}));

import { runAllSyncs, fullSync } from "../src/index";
import { syncConnection } from "../src/ingest/fullSync";
import { listConnectionIds } from "../src/config/connectorConfig";

const mockSync = syncConnection as unknown as ReturnType<typeof vi.fn>;
const mockList = listConnectionIds as unknown as ReturnType<typeof vi.fn>;

const result = (id: string) => ({
  connectionId: id,
  fetched: 1,
  ingested: 1,
  failed: 0,
  startedAt: "",
  finishedAt: "",
});

beforeEach(() => vi.clearAllMocks());

describe("runAllSyncs", () => {
  it("syncs every active connection", async () => {
    mockList.mockResolvedValue(["c1", "c2"]);
    mockSync.mockImplementation(async (id: string) => result(id));

    const results = await runAllSyncs();
    expect(results).toHaveLength(2);
    expect(mockSync).toHaveBeenCalledTimes(2);
  });

  it("continues when one connection fails", async () => {
    mockList.mockResolvedValue(["c1", "c2"]);
    mockSync.mockImplementation(async (id: string) => {
      if (id === "c1") throw new Error("boom");
      return result(id);
    });

    const results = await runAllSyncs();
    expect(results).toHaveLength(1);
    expect(results[0].connectionId).toBe("c2");
  });

  it("returns empty when there are no connections", async () => {
    mockList.mockResolvedValue([]);
    expect(await runAllSyncs()).toEqual([]);
    expect(mockSync).not.toHaveBeenCalled();
  });
});

describe("fullSync handler", () => {
  it("returns a 200 web-trigger response with results in the body", async () => {
    mockList.mockResolvedValue(["c1"]);
    mockSync.mockImplementation(async (id: string) => result(id));

    const res = await fullSync();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.connections).toBe(1);
    expect(body.results[0].connectionId).toBe("c1");
  });
});
