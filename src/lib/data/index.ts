/**
 * Data connector.
 *
 * Pages never talk to Airtable (or any source) directly. Every source writes a
 * snapshot to data/<brand>/<collection>.json before the build, and pages read
 * only those snapshots. Swapping the source means writing a new snapshot
 * fetcher, not touching a single page.
 *
 * Snapshots are read from disk at build time for the current brand only, so one
 * brand's (possibly large) data never ends up in another brand's build.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { brand } from '../brand';

const cache = new Map<string, unknown>();

function load(name: string): unknown {
  if (cache.has(name)) return cache.get(name);
  const dir = join(process.cwd(), 'data', brand.slug);
  const file = join(dir, `${name}.json`);
  if (!existsSync(file)) {
    const available = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).join(', ') || 'none' : 'none';
    throw new Error(`No snapshot "${name}" for brand "${brand.slug}". Available: ${available}`);
  }
  const value = JSON.parse(readFileSync(file, 'utf8'));
  cache.set(name, value);
  return value;
}

export function getCollection<T>(name: string): T[] {
  const rows = load(name);
  if (!Array.isArray(rows)) throw new Error(`Snapshot data/${brand.slug}/${name}.json must be a JSON array`);
  return rows as T[];
}

export function getSingleton<T>(name: string): T {
  return load(name) as T;
}
