import { getBrand } from './brand-loader';
import type { Brand } from './brand-schema';

/** The brand for the current build. __BRAND__ is injected from BRAND in astro.config.ts. */
export const brand: Brand = getBrand(__BRAND__);
