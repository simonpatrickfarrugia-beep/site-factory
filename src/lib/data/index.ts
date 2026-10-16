/**
 * Data connector.
 *
 * Pages never talk to Airtable (or any source) directly. Every source writes a
 * snapshot to data/<brand>/<collection>.json before the build, and pages read
 * only those snapshots. Swapping Airtable for D1, Sheets or anything else means
 * writing a new snapshot fetcher, not touching a single page.
 */
import { brand } from '../brand';

const snapshots = import.meta.glob('../../../data/*/*.json', { eager: true, import: 'default' });

export function getCollection<T>(name: string): T[] {
  const key = `../../../data/${brand.slug}/${name}.json`;
  const rows = snapshots[key];
  if (!rows) {
    const available = Object.keys(snapshots)
      .filter((k) => k.includes(`/data/${brand.slug}/`))
      .map((k) => k.split('/').pop())
      .join(', ') || 'none';
    throw new Error(`No snapshot "${name}" for brand "${brand.slug}". Available: ${available}`);
  }
  if (!Array.isArray(rows)) throw new Error(`Snapshot ${key} must be a JSON array`);
  return rows as T[];
}

export function getSingleton<T>(name: string): T {
  const key = `../../../data/${brand.slug}/${name}.json`;
  const value = snapshots[key];
  if (!value) throw new Error(`No snapshot "${name}" for brand "${brand.slug}"`);
  return value as T;
}
