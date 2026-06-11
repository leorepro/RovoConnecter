// Entry point. Each export is referenced by a `function.handler` in manifest.yml
// (e.g. `handler: index.fullSync`). Implementation lives in the layered modules.

import { syncConnection } from "./ingest/fullSync";
import { listConnectionIds } from "./config/connectorConfig";
import { SyncResult } from "./types";

export { validateConnection } from "./lifecycle/validateConnection";
export { onConnectionChange } from "./lifecycle/onConnectionChange";

/** Sync every active connection; one failing connection does not stop the rest. */
export async function runAllSyncs(): Promise<SyncResult[]> {
  const connectionIds = await listConnectionIds();
  const results: SyncResult[] = [];

  for (const connectionId of connectionIds) {
    try {
      results.push(await syncConnection(connectionId));
    } catch (err) {
      console.error(`[fullSync] connection ${connectionId} failed:`, err);
    }
  }

  console.log(`[fullSync] completed ${results.length}/${connectionIds.length} connections`);
  return results;
}

/**
 * Full-sync handler. Invoked by:
 *  - the scheduledTrigger `csv-full-sync` (periodic; return value ignored), and
 *  - the webtrigger `csv-ingest-webtrigger` (manual / dev; needs an HTTP response).
 *
 * Returns a web-trigger-shaped response so the webtrigger yields a clean 200.
 */
export async function fullSync() {
  const results = await runAllSyncs();
  return {
    statusCode: 200,
    headers: { "Content-Type": ["application/json"] },
    body: JSON.stringify({ connections: results.length, results }),
  };
}
