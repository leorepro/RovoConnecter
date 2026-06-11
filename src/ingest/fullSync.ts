// Ingest layer: run a full sync for a single connection.
//
// Pipeline: load config → fetch+parse CSV → map rows → graph.setObjects (bulk
// upsert). The `connectionId` is REQUIRED by @forge/teamwork-graph v4 and is
// what binds the write to the right connection/instance — omitting it (or using
// the old v1 setEntities API) produces "app is not installed on this instance".

import graph from "@forge/teamwork-graph";
import { loadRows } from "../source/csvSource";
import { mapRows } from "../transform/mapRow";
import { getConnection } from "../config/connectorConfig";
import { SyncResult } from "../types";

const BATCH_SIZE = 100;

export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const config = await getConnection(connectionId);
  if (!config) {
    throw new Error(`No stored config for connection ${connectionId}`);
  }

  console.log(`[fullSync] ${connectionId} config: idColumn="${config.idColumn}", titleColumn="${config.titleColumn}"`);
  const rows = await loadRows(config.csvUrl);
  const usn = Date.now();
  const objects = mapRows(rows, config, usn);
  console.log(`[fullSync] ${connectionId} unique ids in batch: ${new Set(objects.map((o) => o.id)).size}/${objects.length}`);

  let ingested = 0;
  let failed = 0;

  for (const batch of chunk(objects, BATCH_SIZE)) {
    try {
      const res = await graph.setObjects({ objects: batch, connectionId });
      const accepted = res.results?.accepted?.length ?? 0;
      ingested += accepted;
      failed += batch.length - accepted;
      if (!res.success || (res.results?.rejected?.length ?? 0) > 0) {
        console.error(
          `[fullSync] setObjects rejected on ${connectionId}:`,
          JSON.stringify(res.results?.rejected ?? res.error)
        );
      }
    } catch (err) {
      failed += batch.length;
      console.error(
        `[fullSync] setObjects failed for ${batch.length} objects on ${connectionId}:`,
        err
      );
    }
  }

  const result: SyncResult = {
    connectionId,
    fetched: rows.length,
    ingested,
    failed,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  console.log(`[fullSync] ${connectionId} result:`, result);
  return result;
}

function* chunk<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) {
    yield items.slice(i, i + size);
  }
}
