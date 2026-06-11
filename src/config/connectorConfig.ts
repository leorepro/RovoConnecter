// Persistence for connection configuration, backed by Forge KVS.
//
// Each connection's config is stored under `conn:<connectionId>`. A separate
// index key holds the list of active connection ids so the scheduled full-sync
// can iterate every connection without a query API.

import { kvs } from "@forge/kvs";
import { ConnectorConfig } from "../types";

const INDEX_KEY = "connections:index";
const configKey = (connectionId: string) => `conn:${connectionId}`;

export async function saveConnection(
  connectionId: string,
  config: ConnectorConfig
): Promise<void> {
  await kvs.set(configKey(connectionId), config);
  await addToIndex(connectionId);
}

export async function getConnection(
  connectionId: string
): Promise<ConnectorConfig | undefined> {
  return (await kvs.get(configKey(connectionId))) as ConnectorConfig | undefined;
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await kvs.delete(configKey(connectionId));
  await removeFromIndex(connectionId);
}

export async function listConnectionIds(): Promise<string[]> {
  return ((await kvs.get(INDEX_KEY)) as string[] | undefined) ?? [];
}

async function addToIndex(connectionId: string): Promise<void> {
  const ids = await listConnectionIds();
  if (!ids.includes(connectionId)) {
    await kvs.set(INDEX_KEY, [...ids, connectionId]);
  }
}

async function removeFromIndex(connectionId: string): Promise<void> {
  const ids = await listConnectionIds();
  await kvs.set(
    INDEX_KEY,
    ids.filter((id) => id !== connectionId)
  );
}
