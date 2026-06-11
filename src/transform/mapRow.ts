// Transform layer: normalize a CSV row into a Teamwork Graph `DocumentObject`
// (object type `atlassian:document`). Pure and deterministic so it can be
// unit-tested in isolation.

import { types } from "@forge/teamwork-graph";
import { ConnectorConfig, CsvRow } from "../types";

type DocumentObject = types.DocumentObject;

/**
 * Site-wide visible ACL: a single EVERYONE principal. Paired with manifest
 * `replicatesPermissions: false`, this makes every object discoverable by all
 * users with Rovo access.
 */
function publicPermissions(): types.Permissions {
  return { accessControls: [{ principals: [{ type: "EVERYONE" }] }] };
}

/**
 * Map one CSV row to a DocumentObject.
 * @param row    parsed CSV row
 * @param config column mapping from the connection config
 * @param usn    update sequence number for this sync run (monotonic)
 */
export function mapRow(
  row: CsvRow,
  config: ConnectorConfig,
  usn: number
): DocumentObject {
  const id = buildId(row, config.idColumn);

  const displayName = row[config.titleColumn]?.trim() || id;
  const rawUrl = config.urlColumn ? row[config.urlColumn]?.trim() : "";
  // url is required and should be a valid link; synthesize a search link when
  // the source has no URL column (e.g. a plain reference CSV).
  const url = rawUrl || `https://www.google.com/search?q=${encodeURIComponent(displayName)}`;
  const body = config.bodyColumn ? row[config.bodyColumn]?.trim() || "" : "";
  const updatedAt = config.updatedAtColumn
    ? normalizeTimestamp(row[config.updatedAtColumn])
    : new Date().toISOString();

  return {
    schemaVersion: "1.0",
    id,
    updateSequenceNumber: usn,
    displayName,
    url,
    createdAt: updatedAt,
    lastUpdatedAt: updatedAt,
    permissions: publicPermissions(),
    "atlassian:document": {
      type: { category: "DOCUMENT", mimeType: "text/plain" },
      content: { mimeType: "text/plain", text: body || displayName },
    },
  };
}

/** Map an entire batch of rows; throws on the first invalid row. */
export function mapRows(
  rows: CsvRow[],
  config: ConnectorConfig,
  usn: number
): DocumentObject[] {
  return rows.map((row) => mapRow(row, config, usn));
}

/**
 * Build the object id from one or more CSV columns. `idColumn` may be a single
 * column ("City") or a comma-separated list ("City,State") to form a composite
 * unique id (joined with ":"), e.g. "Youngstown:OH".
 */
function buildId(row: CsvRow, idColumn: string): string {
  const cols = idColumn.split(",").map((c) => c.trim()).filter(Boolean);
  const parts = cols.map((c) => row[c]?.trim() ?? "");
  if (parts.length === 0 || parts.some((p) => !p)) {
    throw new Error(`Row is missing a value for id column(s) "${idColumn}"`);
  }
  return parts.join(":");
}

function normalizeTimestamp(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}
