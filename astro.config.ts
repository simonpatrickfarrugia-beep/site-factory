import { defineConfig } from 'astro/config';
import { getBrand } from './src/lib/brand-loader';

// Fails the build early with a clear message if BRAND is missing or its config is invalid.
const brand = getBrand(process.env.BRAND);

export default defineConfig({
  site: `https://${brand.domain}`,
  output: 'static',
  // Match Webflow's URL style: /movies/slug, never /movies/slug/
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    define: {
      __BRAND__: JSON.stringify(brand.slug),
    },
  },
});
