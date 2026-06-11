# Rovo CSV Data Connector

A [Atlassian Forge](https://developer.atlassian.com/platform/forge/) **Teamwork Graph connector** (`graph:connector`) that ingests rows from a CSV file into **Teamwork Graph**, making every row discoverable in **Rovo Search, Chat, and Agents**.

Each CSV row becomes an `atlassian:document` object. Built with `@forge/teamwork-graph` (v4).

```
External source (CSV / HTTP)
      │  external fetch
      ▼
Forge graph:connector  (Node.js runtime)
   ├─ validateConnection   validate config on submit
   ├─ onConnectionChange   CREATED/UPDATED/DELETED → KVS + ingest
   ├─ csvSource            fetch + parse CSV → rows
   ├─ mapRow               row → DocumentObject
   └─ setObjects           graph.setObjects({ objects, connectionId })
      │  @forge/teamwork-graph
      ▼
Teamwork Graph → Rovo (Search / Chat / Agents)
```

> **Demo:** with a U.S. cities CSV connected, asking Rovo *"Wichita"* returns the record (City: Wichita, State: KS), attributes it to the connector, and even surfaces the related *"Wichita Falls"*.

## Features

- CSV ingestion via a **configurable URL** (Forge external fetch)
- **Full sync** with deterministic upsert; site-wide visibility (`EVERYONE` ACL)
- **Composite id** support — map one or many columns (`"City,State"`) to a unique key
- Dependency-free, RFC 4180-style CSV parser (handles quotes, embedded commas/newlines, `", "` spacing)
- Layered, single-responsibility modules with **41 unit tests** (Forge SDK fully mocked)

## Prerequisites

- **Node.js 22+**
- **Forge CLI** — `npm install -g @forge/cli@latest`, then `forge login`
- A **Jira Cloud** site with Rovo (Teamwork Graph connectors install into Jira only)

## Project structure

```
.
├── manifest.yml                    # graph:connector + scopes + egress + triggers
├── src/
│   ├── index.ts                    # entry point — handlers referenced by manifest
│   ├── lifecycle/
│   │   ├── validateConnection.ts   # validate CSV URL reachable + columns exist
│   │   └── onConnectionChange.ts   # CREATED/UPDATED/DELETED → KVS; ingest on create/update
│   ├── source/
│   │   ├── csvParser.ts            # pure RFC4180 parser (unit-tested)
│   │   └── csvSource.ts            # external fetch + parse
│   ├── transform/mapRow.ts         # CSV row → DocumentObject (composite id)
│   ├── ingest/fullSync.ts          # graph.setObjects({ objects, connectionId })
│   ├── config/connectorConfig.ts   # KVS read/write of connection config
│   └── types.ts
├── test/                           # vitest unit tests (41)
└── static/sample-data.csv
```

## Setup

```bash
git clone <this-repo> && cd <this-repo>
npm install

forge register          # generates your app id into manifest.yml
forge deploy
forge install --site your-site.atlassian.net --product jira
```

Copy `.env.example` to `.env` and fill in your values (used by the deploy helper; **`.env` is gitignored**).

## Configure a connection

In **Atlassian Administration → Apps → [site] → Connected apps**, find **CSV Connector**, click **Connect**, and fill the form:

| Field             | Example                                 | Notes |
| ----------------- | --------------------------------------- | ----- |
| CSV URL           | `https://your-csv-host.example.com/data.csv` | Must be publicly reachable and return **raw CSV** (a direct-download link, not an HTML viewer page) |
| ID column         | `City,State`                            | One or more columns (comma-separated) forming a unique key per connection |
| Title column      | `City`                                  | Becomes the object's `displayName` |
| Body column       | `State`                                 | Optional — indexed content |
| URL / Updated-at  | *(blank)*                               | Optional |

Clicking **Connect** fires `onConnectionChange` (CREATED), which stores the config and runs the first ingestion.

## How it works — key points

- **Ingestion API:** `graph.setObjects({ objects, connectionId })` from `@forge/teamwork-graph`. `connectionId` is **required** — it binds the write to the connection/instance.
- Each row maps to an `atlassian:document` with `schemaVersion`, a stable `id` (unique per connection), `displayName`, `url`, timestamps, a `permissions.accessControls` ACL, and `'atlassian:document': { type, content }`.
- Objects are pushed in batches of 100. The response reports `results.accepted` / `results.rejected`.
- `onConnectionChange` performs ingestion because it runs in the connection's installation context. A `scheduledTrigger` (hourly) and a `webtrigger` re-run the full sync.

## Gotchas (lessons learned)

- ⚠️ **`connectionId` is required** on `setObjects`. Omitting it — or using the old v1 `setEntities({ entities })` API — fails with the misleading `The app is not installed on this instance`. It looks like an install/permission issue but is an **API-contract** issue.
- ⚠️ **`@forge/teamwork-graph` changed a lot across major versions (v1 → v4).** Don't guess the version — `npm view @forge/teamwork-graph version` and pin to the latest.
- `storage:app` scope is required for `@forge/kvs`.
- `graph:connector` requires `icons` — use a **URL** (a single-file `resource:` fails to package).
- `onConnectionChange` sits at the `datasource` level (not inside `formConfiguration`); each form property needs a `label`; the section needs `title` + `description`.
- Runtime must be `nodejs22.x` (`nodejs20.x` is deprecated).
- Map each row to a **stable, per-connection-unique `id`** — use a composite key (`City,State`) when no single column is unique.

## Testing

```bash
npm test          # 41 unit tests (vitest)
npm run build     # tsc type-check
```

## References

- **Atlassian's official Forge skills** — [github.com/atlassian/forge-skills](https://github.com/atlassian/forge-skills) (`skills/forge-connector`) — the authoritative guide that documents the correct `graph.setObjects({ objects, connectionId })` pattern.
- [Teamwork Graph connector module reference](https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/)
- [Build a Teamwork Graph connector](https://developer.atlassian.com/platform/forge/build-a-teamwork-graph-connector/)

## License

MIT
