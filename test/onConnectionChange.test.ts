import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/connectorConfig", () => ({
  saveConnection: vi.fn(async () => {}),
  deleteConnection: vi.fn(async () => {}),
}));
vi.mock("../src/ingest/fullSync", () => ({
  syncConnection: vi.fn(async () => ({
    connectionId: "c1",
    fetched: 0,
    ingested: 0,
    failed: 0,
    startedAt: "",
    finishedAt: "",
  })),
}));

import { onConnectionChange } from "../src/lifecycle/onConnectionChange";
import { saveConnection, deleteConnection } from "../src/config/connectorConfig";
import { syncConnection } from "../src/ingest/fullSync";

const props = {
  csvUrl: "https://example.com/data.csv",
  idColumn: "id",
  titleColumn: "title",
  urlColumn: "url",
};

beforeEach(() => vi.clearAllMocks());

describe("onConnectionChange", () => {
  it("stores config on CREATED", async () => {
    await onConnectionChange({
      action: "CREATED",
      connectionId: "c1",
      configProperties: props,
    });
    expect(saveConnection).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ csvUrl: props.csvUrl, idColumn: "id", titleColumn: "title", urlColumn: "url" })
    );
  });

  it("runs the initial sync on CREATED", async () => {
    await onConnectionChange({
      action: "CREATED",
      connectionId: "c1",
      configProperties: props,
    });
    expect(syncConnection).toHaveBeenCalledWith("c1");
  });

  it("does not sync on DELETED", async () => {
    await onConnectionChange({ action: "DELETED", connectionId: "c1" });
    expect(syncConnection).not.toHaveBeenCalled();
  });

  it("stores config on UPDATED", async () => {
    await onConnectionChange({
      action: "UPDATED",
      connectionId: "c1",
      configProperties: props,
    });
    expect(saveConnection).toHaveBeenCalledTimes(1);
  });

  it("deletes config on DELETED", async () => {
    await onConnectionChange({ action: "DELETED", connectionId: "c1" });
    expect(deleteConnection).toHaveBeenCalledWith("c1");
    expect(saveConnection).not.toHaveBeenCalled();
  });

  it("throws when required config is missing on CREATED", async () => {
    await expect(
      onConnectionChange({
        action: "CREATED",
        connectionId: "c1",
        configProperties: { csvUrl: "x" } as Record<string, string>,
      })
    ).rejects.toThrow(/Missing required config/);
  });

  it("acknowledges an unknown action without throwing", async () => {
    const res = await onConnectionChange({
      action: "WEIRD" as never,
      connectionId: "c1",
    });
    expect(res).toEqual({ acknowledged: true });
    expect(saveConnection).not.toHaveBeenCalled();
    expect(deleteConnection).not.toHaveBeenCalled();
  });
});
