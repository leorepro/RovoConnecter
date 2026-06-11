import { describe, it, expect } from "vitest";
import { parseCsv } from "../src/source/csvParser";

describe("parseCsv", () => {
  it("parses a simple CSV into rows keyed by header", () => {
    const csv = "id,title\n1,Hello\n2,World";
    expect(parseCsv(csv)).toEqual([
      { id: "1", title: "Hello" },
      { id: "2", title: "World" },
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const csv = 'id,title\n1,"Hello, ""World"""';
    expect(parseCsv(csv)).toEqual([{ id: "1", title: 'Hello, "World"' }]);
  });

  it("handles newlines inside quoted fields", () => {
    const csv = 'id,body\n1,"line one\nline two"';
    expect(parseCsv(csv)).toEqual([{ id: "1", body: "line one\nline two" }]);
  });

  it("normalizes CRLF line endings", () => {
    const csv = "id,title\r\n1,Hello\r\n2,World\r\n";
    expect(parseCsv(csv)).toEqual([
      { id: "1", title: "Hello" },
      { id: "2", title: "World" },
    ]);
  });

  it("skips blank trailing lines", () => {
    const csv = "id,title\n1,Hello\n\n";
    expect(parseCsv(csv)).toEqual([{ id: "1", title: "Hello" }]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("trims surrounding whitespace on ', '-separated CSVs", () => {
    const csv = '"City", "State"\n"Youngstown", OH\n"Yankton", SD';
    expect(parseCsv(csv)).toEqual([
      { City: "Youngstown", State: "OH" },
      { City: "Yankton", State: "SD" },
    ]);
  });

  it("fills missing trailing columns with empty strings", () => {
    const csv = "id,title,url\n1,Hello";
    expect(parseCsv(csv)).toEqual([{ id: "1", title: "Hello", url: "" }]);
  });
});
