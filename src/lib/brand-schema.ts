import { z } from 'astro/zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour like #0E4D64');

/**
 * Every brand's config is checked against this at build time.
 * A typo or missing field fails the build instead of breaking the live site.
 */
export const brandSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
  name: z.string().min(1),
  domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Bare domain, no https:// or slashes'),

  /** false = every page gets noindex, so previews never leak into Google. Flip at cutover. */
  launched: z.boolean().default(false),

  theme: z.enum(['cinematic', 'editorial', 'coastal']),
  colors: z.object({ brand: hex, accent: hex }),
  fonts: z.object({ display: z.string(), body: z.string() }),

  seo: z.object({
    titleSuffix: z.string(),
    defaultDescription: z.string().max(170, 'Keep meta descriptions under 170 characters'),
  }),

  data: z.object({
    source: z.enum(['airtable', 'none']),
    base: z.string().regex(/^app[A-Za-z0-9]{14}$/).optional(),
  }).refine((d) => d.source !== 'airtable' || !!d.base, 'Airtable source needs a base ID'),

  forms: z.array(z.enum(['contact', 'quote', 'supplier-signup'])).default([]),

  analytics: z.object({
    /** Cloudflare Web Analytics site token (public, safe to commit). */
    cloudflareToken: z.string().optional(),
  }).default({}),

  payments: z.object({ enabled: z.literal(false) }).default({ enabled: false }),
});

export type BrandInput = z.input<typeof brandSchema>;
export type Brand = z.output<typeof brandSchema>;

/** Typed helper for brand config files. Validation happens in getBrand(). */
export const defineBrand = (brand: BrandInput): BrandInput => brand;
