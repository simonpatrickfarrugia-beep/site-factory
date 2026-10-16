import { brands } from '../../brands/index';
import { brandSchema, type Brand } from './brand-schema';

/** Loads and validates a brand by slug. Throws a readable error on any problem. */
export function getBrand(slug: string | undefined): Brand {
  const known = Object.keys(brands).join(', ');
  if (!slug) {
    throw new Error(`BRAND is not set. Build with BRAND=<slug>. Known brands: ${known}`);
  }
  const raw = (brands as Record<string, unknown>)[slug];
  if (!raw) {
    throw new Error(`Unknown brand "${slug}". Known brands: ${known}`);
  }
  const result = brandSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Brand "${slug}" config is invalid:\n${issues}`);
  }
  if (result.data.slug !== slug) {
    throw new Error(`Brand folder "${slug}" has slug "${result.data.slug}" in its config. They must match.`);
  }
  return result.data;
}
