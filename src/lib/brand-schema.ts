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

  theme: z.enum(['cinematic', 'editorial', 'coastal', 'roadtrip', 'calm', 'shortlist']),
  /** Optional logo mark shown before the name in the header (file in brands/<slug>/public). */
  logo: z.object({ src: z.string(), alt: z.string().default(''), width: z.number(), height: z.number() }).optional(),
  /** Default social share image (1200x630) in brands/<slug>/public, used when a page has none. */
  shareImage: z.string().optional(),
  /** Optional favicon in brands/<slug>/public. */
  favicon: z.string().optional(),
  colors: z.object({ brand: hex, accent: hex }),
  fonts: z.object({ display: z.string(), body: z.string() }),

  seo: z.object({
    titleSuffix: z.string(),
    defaultDescription: z.string().max(170, 'Keep meta descriptions under 170 characters'),
  }),

  nav: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  footer: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  /** Small print shown in every footer, e.g. an affiliate disclosure. */
  footerNote: z.string().optional(),

  data: z.object({
    /** Where snapshots come from. 'snapshot' = JSON committed in data/<slug>/. */
    source: z.enum(['snapshot', 'airtable', 'none']),
    base: z.string().regex(/^app[A-Za-z0-9]{14}$/).optional(),
  }).refine((d) => d.source !== 'airtable' || !!d.base, 'Airtable source needs a base ID'),

  forms: z.array(z.enum(['contact', 'quote', 'supplier-signup', 'enquiry', 'referral', 'shortlist'])).default([]),

  analytics: z.object({
    /** Cloudflare Web Analytics site token (public, safe to commit). */
    cloudflareToken: z.string().optional(),
    /** Google Analytics 4 Measurement ID (public, safe to commit). */
    ga4Id: z.string().regex(/^G-[A-Z0-9]+$/, 'GA4 IDs look like G-XXXXXXXXXX').optional(),
  }).default({}),

  payments: z.object({ enabled: z.literal(false) }).default({ enabled: false }),
});

export type BrandInput = z.input<typeof brandSchema>;
export type Brand = z.output<typeof brandSchema>;

/** Typed helper for brand config files. Validation happens in getBrand(). */
export const defineBrand = (brand: BrandInput): BrandInput => brand;
