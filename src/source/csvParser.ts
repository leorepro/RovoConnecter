// Pure CSV parsing — no Forge dependencies, fully unit-testable.
//
// RFC 4180-style tokenizer that handles quoted fields, escaped quotes (""),
// and commas/newlines inside quotes.

import { CsvRow } from "../types";

/** Parse CSV text into an array of rows keyed by the header columns. */
export function parseCsv(text: string): CsvRow[] {
  const records = tokenize(text);
  if (records.length === 0) return [];

  // Trim header keys and values so CSVs that use ", "-style separators
  // (leading spaces around fields) map cleanly to the configured column names.
  const header = records[0].map((h) => h.trim());
  return records
    .slice(1)
    .filter((fields) => !isBlankRecord(fields))
    .map((fields) => {
      const row: CsvRow = {};
      header.forEach((col, i) => {
        row[col] = (fields[i] ?? "").trim();
      });
      return row;
    });
}

function isBlankRecord(fields: string[]): boolean {
  return fields.length === 0 || (fields.length === 1 && fields[0] === "");
}

/** RFC 4180-style tokenizer → array of records (each an array of fields). */
function tokenize(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++; // consume escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}
