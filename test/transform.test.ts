import { describe, it, expect } from "vitest";
import { mapRow, mapRows } from "../src/transform/mapRow";
import { ConnectorConfig } from "../src/types";

const config: ConnectorConfig = {
  csvUrl: "https://example.com/data.csv",
  idColumn: "id",
  titleColumn: "title",
  urlColumn: "url",
  bodyColumn: "description",
  updatedAtColumn: "updated_at",
};

describe("mapRow", () => {
  it("maps a row to an atlassian:document object", () => {
    const doc = mapRow(
      {
        id: "42",
        title: "Answer",
        url: "https://example.com/42",
        description: "the answer",
        updated_at: "2026-01-02T03:04:05.000Z",
      },
      config,
      1000
    );

    expect(doc).toMatchObject({
      schemaVersion: "1.0",
      id: "42",
      displayName: "Answer",
      url: "https://example.com/42",
      createdAt: "2026-01-02T03:04:05.000Z",
      lastUpdatedAt: "2026-01-02T03:04:05.000Z",
      updateSequenceNumber: 1000,
      "atlassian:document": {
        type: { category: "DOCUMENT", mimeType: "text/plain" },
        content: { mimeType: "text/plain", text: "the answer" },
      },
    });
    expect(doc.permissions).toEqual({
      accessControls: [{ principals: [{ type: "EVERYONE" }] }],
    });
  });

  it("falls back to id when title is empty", () => {
    const doc = mapRow({ id: "7", title: "" }, { ...config, urlColumn: undefined }, 1);
    expect(doc.displayName).toBe("7");
  });

  it("builds a composite id from a comma-separated idColumn", () => {
    const doc = mapRow(
      { City: "Wilmington", State: "NC" },
      { ...config, idColumn: "City,State", titleColumn: "City", urlColumn: undefined, bodyColumn: undefined, updatedAtColumn: undefined },
      1
    );
    expect(doc.id).toBe("Wilmington:NC");
    expect(doc.displayName).toBe("Wilmington");
  });

  it("throws when the id column is missing", () => {
    expect(() => mapRow({ title: "no id" }, config, 1)).toThrow(/id column/);
  });

  it("maps a batch with a shared update sequence number", () => {
    const docs = mapRows(
      [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
      ],
      { ...config, urlColumn: undefined, bodyColumn: undefined, updatedAtColumn: undefined },
      555
    );
    expect(docs.map((d) => d.id)).toEqual(["1", "2"]);
    expect(docs.every((d) => d.updateSequenceNumber === 555)).toBe(true);
  });
});
