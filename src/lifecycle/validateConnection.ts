// Lifecycle: validate the admin-supplied configuration before the data source
// is created. Throws on failure (Forge surfaces the error to the admin);
// returns normally on success.

import { fetchCsv } from "../source/csvSource";
import { parseCsv } from "../source/csvParser";

interface ValidateConnectionRequest {
  name?: string;
  configProperties?: Record<string, string>;
}

export async function validateConnection(
  request: ValidateConnectionRequest
): Promise<{ valid: true }> {
  const cfg = request.configProperties ?? {};
  const csvUrl = cfg.csvUrl;
  const idColumn = cfg.idColumn;
  const titleColumn = cfg.titleColumn;

  if (!csvUrl) throw new Error("csvUrl is required");
  if (!idColumn) throw new Error("idColumn is required");
  if (!titleColumn) throw new Error("titleColumn is required");

  // Reachability + header check: fetch the CSV and confirm the mapped columns exist.
  const rows = parseCsv(await fetchCsv(csvUrl));
  if (rows.length === 0) {
    throw new Error("CSV is empty or has no data rows");
  }
  const header = Object.keys(rows[0]);
  // idColumn may be a comma-separated composite key (e.g. "City,State").
  const idCols = idColumn.split(",").map((c) => c.trim()).filter(Boolean);
  for (const col of [...idCols, titleColumn]) {
    if (!header.includes(col)) {
      throw new Error(`Column "${col}" not found in CSV header: ${header.join(", ")}`);
    }
  }

  return { valid: true };
}
