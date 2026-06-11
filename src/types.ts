// Shared types for the CSV → Teamwork Graph connector.

/** One parsed CSV row keyed by header name. */
export type CsvRow = Record<string, string>;

/**
 * Connection configuration provided by the admin through the connector's
 * datasource form (see manifest `formConfiguration.form`). Persisted in KVS
 * keyed by `connectionId`.
 */
export interface ConnectorConfig {
  csvUrl: string;
  idColumn: string;
  titleColumn: string;
  urlColumn?: string;
  bodyColumn?: string;
  updatedAtColumn?: string;
}

// The ingested object shape (`DocumentEntity`) and ACL shape (`Permissions`)
// come directly from the `@forge/teamwork-graph` types — imported where used
// (see transform/mapRow.ts) rather than re-declared here.

/** Result of a single full-sync run, surfaced in logs for observability. */
export interface SyncResult {
  connectionId: string;
  fetched: number;
  ingested: number;
  failed: number;
  startedAt: string;
  finishedAt: string;
}
