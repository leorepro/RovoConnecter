// Fetch layer: download a CSV over Forge external fetch, then parse it.
// Parsing itself lives in the dependency-free `csvParser` module.

import { fetch } from "@forge/api";
import { CsvRow } from "../types";
import { parseCsv } from "./csvParser";

export { parseCsv };

/** Download raw CSV text from the given URL (egress must be allowlisted). */
export async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV (${res.status} ${res.statusText}): ${url}`);
  }
  return res.text();
}

/** Convenience: fetch + parse in one call. */
export async function loadRows(url: string): Promise<CsvRow[]> {
  return parseCsv(await fetchCsv(url));
}
