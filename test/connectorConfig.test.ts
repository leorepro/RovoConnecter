import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory KVS backing the @forge/kvs mock. `vi.hoisted` ensures the store
// exists before the (hoisted) vi.mock factory runs.
const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));

vi.mock("@forge/kvs", () => ({
  kvs: {
    get: vi.fn(async (k: string) => store.get(k)),
    set: vi.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
    delete: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  },
}));

import {
  saveConnection,
  getConnection,
  deleteConnection,
  listConnectionIds,
} from "../src/config/connectorConfig";
import { ConnectorConfig } from "../src/types";

const cfg: ConnectorConfig = {
  csvUrl: "https://example.com/data.csv",
  idColumn: "id",
  titleColumn: "title",
};

beforeEach(() => store.clear());

describe("connectorConfig", () => {
  it("saves and retrieves a connection config", async () => {
    await saveConnection("c1", cfg);
    expect(await getConnection("c1")).toEqual(cfg);
  });

  it("returns undefined for an unknown connection", async () => {
    expect(await getConnection("missing")).toBeUndefined();
  });

  it("tracks connection ids in the index without duplicates", async () => {
    await saveConnection("c1", cfg);
    await saveConnection("c1", cfg);
    await saveConnection("c2", cfg);
    expect(await listConnectionIds()).toEqual(["c1", "c2"]);
  });

  it("deletes config and removes it from the index", async () => {
    await saveConnection("c1", cfg);
    await saveConnection("c2", cfg);
    await deleteConnection("c1");
    expect(await getConnection("c1")).toBeUndefined();
    expect(await listConnectionIds()).toEqual(["c2"]);
  });

  it("returns an empty list when there are no connections", async () => {
    expect(await listConnectionIds()).toEqual([]);
  });
});
