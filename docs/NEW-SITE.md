# Add a new site

1. Copy `brands/trailers/` to `brands/<new-slug>/`.
2. Edit `brand.config.ts`: slug, name, domain, theme, colours, fonts, SEO defaults. Keep `launched: false`.
3. Edit `wrangler.jsonc`: set `name` to the new slug.
4. Add one line to `brands/index.ts`.
5. Push, then do the one-time Cloudflare setup in `DEPLOY.md`.
6. When ready to go live: add the custom domain to the Worker in Cloudflare, set `launched: true`, push.
