// Lifecycle: react to connection CREATED / UPDATED / DELETED events.
//
// Persists (or clears) the connection config in KVS, and on CREATED/UPDATED runs
// the initial ingestion HERE — this event is fired by the platform in the
// installation's context, which is what `graph.setEntities` needs (a raw
// webtrigger lacks that context and fails with "app not installed on this
// instance").

import { saveConnection, deleteConnection } from "../config/connectorConfig";
import { syncConnection } from "../ingest/fullSync";
import { ConnectorConfig } from "../types";

type ConnectionAction = "CREATED" | "UPDATED" | "DELETED";

interface OnConnectionChangeRequest {
  action: ConnectionAction;
  name?: string;
  connectionId: string;
  configProperties?: Record<string, string>;
}

export async function onConnectionChange(
  request: OnConnectionChangeRequest
): Promise<{ acknowledged: true }> {
  const { action, connectionId, configProperties } = request;

  switch (action) {
    case "CREATED":
    case "UPDATED":
      await saveConnection(connectionId, toConfig(configProperties));
      console.log(`[onConnectionChange] ${action} stored config for ${connectionId}`);
      try {
        const result = await syncConnection(connectionId);
        console.log(`[onConnectionChange] initial sync result:`, result);
      } catch (err) {
        console.error(`[onConnectionChange] initial sync failed for ${connectionId}:`, err);
      }
      break;
    case "DELETED":
      await deleteConnection(connectionId);
      console.log(`[onConnectionChange] DELETED config for ${connectionId}`);
      break;
    default:
      console.warn(`[onConnectionChange] unknown action: ${action}`);
  }

  return { acknowledged: true };
}

function toConfig(props: Record<string, string> = {}): ConnectorConfig {
  if (!props.csvUrl || !props.idColumn || !props.titleColumn) {
    throw new Error("Missing required config: csvUrl, idColumn, titleColumn");
  }
  return {
    csvUrl: props.csvUrl,
    idColumn: props.idColumn,
    titleColumn: props.titleColumn,
    urlColumn: props.urlColumn,
    bodyColumn: props.bodyColumn,
    updatedAtColumn: props.updatedAtColumn,
  };
}
