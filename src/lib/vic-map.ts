/**
 * At-a-glance map of Victoria (no tiles, no third-party requests): an inline SVG outline from Natural Earth
 * (public domain, 1:50m admin-1 states, extracted 28 Oct 2026), plus a simple projection for placing points.
 * Used by the town and plan pages (VicMiniMap.astro) and the Trip Builder cards (drawn in the browser).
 */
export const VIC_MAP = {
  width: 400, height: 292.8,
  bounds: { lon0: 140.9, lon1: 150.05, lat0: -39.25, lat1: -33.9 },
  /** Victoria's outline (mainland plus Phillip and French islands), already projected into the viewBox. */
  path: 'M2.9,228.3 3.0,5.8 4.2,6.3 5.5,7.8 8.5,9.1 12.8,9.5 18.3,11.6 24.9,15.5 30.0,16.0 33.5,13.0 37.6,11.6 44.9,11.9 55.0,15.0 59.1,17.7 60.6,21.1 62.4,23.1 64.4,23.7 65.3,26.6 65.1,32.0 66.7,37.9 70.3,44.4 73.1,47.9 75.1,48.4 77.1,46.0 78.9,41.0 80.5,38.2 81.9,37.6 83.6,38.7 85.6,41.3 90.3,43.3 101.5,45.6 106.0,48.6 107.6,53.7 107.7,62.0 108.3,67.2 109.5,69.4 111.9,71.3 115.4,73.0 117.3,75.5 117.4,78.1 123.0,82.7 134.3,89.1 142.7,94.9 148.2,100.1 152.1,105.1 154.2,109.7 158.4,114.6 164.7,119.7 170.5,121.8 175.6,120.8 177.7,119.0 176.8,116.5 176.7,113.7 177.6,110.7 179.6,108.6 182.9,107.4 189.0,106.5 198.1,105.9 205.0,107.4 209.5,111.2 214.9,113.7 224.6,115.8 232.4,118.0 237.1,117.9 240.6,116.7 243.5,114.6 248.7,115.2 255.6,118.3 262.1,120.4 268.7,120.7 271.0,117.7 273.5,116.9 278.5,117.6 280.8,118.7 282.0,117.8 282.9,115.1 284.5,113.4 286.7,112.4 288.6,112.7 290.2,114.0 292.5,114.0 296.1,112.4 300.0,112.5 307.4,116.0 309.3,117.4 311.9,124.8 316.8,144.8 319.0,149.1 317.4,154.9 316.2,157.5 319.8,158.9 395.3,197.1 394.9,198.6 389.5,199.6 385.1,203.4 378.8,209.6 375.1,211.9 367.1,213.6 351.6,212.8 321.9,215.1 316.1,216.5 305.0,220.8 294.3,227.4 284.0,236.4 260.4,260.7 242.0,263.3 238.5,263.3 235.7,262.7 232.5,264.2 232.4,267.2 235.4,270.4 237.7,273.3 241.6,269.3 243.4,270.4 244.0,277.9 244.1,282.7 242.9,285.3 240.4,287.1 237.8,285.9 237.5,283.3 234.1,277.2 229.9,271.8 226.0,270.0 223.7,271.8 220.1,273.7 217.1,266.9 213.8,260.9 209.5,260.3 205.7,260.3 202.6,257.8 196.6,253.7 197.8,250.5 199.5,247.2 202.9,245.9 201.9,241.4 200.0,237.7 195.3,236.7 192.0,237.4 190.1,240.3 187.6,245.4 177.5,251.8 172.6,248.3 166.9,243.0 169.6,243.4 175.4,243.2 180.1,238.5 182.2,235.6 184.5,229.4 181.4,225.0 178.6,221.8 174.5,218.9 159.1,228.6 155.9,230.0 152.8,231.9 158.2,233.5 161.3,233.0 164.6,235.9 159.3,239.9 155.1,241.0 149.9,243.4 140.0,249.7 127.3,262.6 121.8,266.4 115.4,269.3 106.6,265.9 101.7,265.1 95.4,259.7 84.8,256.2 74.9,249.1 68.0,245.5 63.1,244.8 56.3,246.3 44.8,239.9 36.1,239.2 30.3,245.6 25.9,245.2 22.9,244.3 13.7,233.8 4.8,228.6 2.9,228.3ZM193.0,251.2 194.5,253.8 194.8,254.9 191.1,252.8 184.8,253.3 188.8,249.5 191.8,250.2 193.0,251.2ZM197.9,241.6 200.5,243.8 193.9,247.4 191.5,245.8 191.7,243.0 192.1,241.8 197.9,241.6Z',
};

/** Fixed reference points. Coordinates: Melbourne CBD (Flinders St), Melbourne Airport (Tullamarine), Avalon Airport. */
export const VIC_REFS = [
  { key: 'cbd', name: 'Melbourne', lat: -37.8136, lon: 144.9631 },
  { key: 'mel', name: 'Melbourne Airport', lat: -37.669, lon: 144.841 },
  { key: 'avv', name: 'Avalon Airport', lat: -38.0394, lon: 144.4694 },
] as const;

/** Latitude / longitude → SVG x, y in the VIC_MAP viewBox (equirectangular, fine at state scale). */
export function vicXY(lat: number, lon: number): [number, number] {
  const b = VIC_MAP.bounds;
  return [((lon - b.lon0) / (b.lon1 - b.lon0)) * VIC_MAP.width, ((b.lat1 - lat) / (b.lat1 - b.lat0)) * VIC_MAP.height];
}

/** Straight-line distance in km (for the map label only; road distances live in towns.json). */
export function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371, r = Math.PI / 180;
  const s = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * The mini map as an SVG string (shared by the Astro component and the Trip Builder's browser code).
 * Zooms to fit the town, Melbourne CBD and both airports (so towns near Melbourne aren't a dot), with a small
 * whole-of-Victoria inset in the corner for bearings.
 */
export function vicMapSvg(town: { name: string; lat: number; lon: number }, opts: { km?: number | null } = {}): string {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const f = (n: number) => n.toFixed(1);
  const [tx, ty] = vicXY(town.lat, town.lon);
  const refs = VIC_REFS.map((r) => vicXY(r.lat, r.lon));
  const [cx, cy] = refs[0];
  // View box: everything that matters, padded, at least ~1.5° wide, 4:3, clamped to the state.
  const xs = [tx, ...refs.map((r) => r[0])], ys = [ty, ...refs.map((r) => r[1])];
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = Math.max(x1 - x0, y1 - y0) * 0.22 + 14;
  x0 -= pad; x1 += pad * 1.6; y0 -= pad; y1 += pad;  // extra room on the right for the label
  let w = Math.max(x1 - x0, 66), h = Math.max(y1 - y0, 66 * 0.75);
  if (w / h > 4 / 3) h = w * 0.75; else w = h * (4 / 3);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2 + pad * 0.3, my = (Math.min(...ys) + Math.max(...ys)) / 2;
  x0 = mx - w / 2; y0 = my - h / 2;
  const k = w / 400; // scale for text and symbols, so they look the same size at any zoom
  const plane = ([x, y]: [number, number]) =>
    `<g transform="translate(${f(x)},${f(y)}) scale(${k.toFixed(3)})"><circle r="7" fill="#fff" stroke="#1f4e79" stroke-width="1.6"/><path d="M-4,0.6 L4,0.6 M0,-4 L0,4 M-2,3.4 L2,3.4" stroke="#1f4e79" stroke-width="1.6" stroke-linecap="round"/></g>`;
  const text = (x: number, y: number, t: string, size: number, color: string, anchor: string, weight = 800) =>
    `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" font-family="system-ui,sans-serif" font-size="${(size * k).toFixed(2)}" font-weight="${weight}" fill="${color}" stroke="#fff" stroke-width="${(4 * k).toFixed(2)}" paint-order="stroke">${t}</text>`;
  const right = tx < x0 + w * 0.62;
  const far = Math.hypot(tx - cx, ty - cy) > 40 * k;
  const iw = w * 0.3, ih = iw * (VIC_MAP.height / VIC_MAP.width), ix = x0 + w - iw - 6 * k, iy = y0 + 6 * k;
  const inset = `<g><rect x="${f(ix)}" y="${f(iy)}" width="${f(iw)}" height="${f(ih)}" fill="#fff" stroke="#9bb5a6" stroke-width="${(1 * k).toFixed(2)}"/>`
    + `<svg x="${f(ix)}" y="${f(iy)}" width="${f(iw)}" height="${f(ih)}" viewBox="0 0 ${VIC_MAP.width} ${VIC_MAP.height}"><path d="${VIC_MAP.path}" fill="#DCEFE3" stroke="#00653B" stroke-width="3"/>`
    + `<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="#8A4B26" stroke-width="6"/><circle cx="${f(tx)}" cy="${f(ty)}" r="9" fill="#8A4B26"/></svg></g>`;
  return `<svg viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map showing ${esc(town.name)}, Melbourne and its airports" class="vicmap__svg">`
    + `<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" fill="#EAF3F8"/>`
    + `<path d="${VIC_MAP.path}" fill="#F3F7F1" stroke="#7FA58E" stroke-width="${(1.4 * k).toFixed(2)}" stroke-linejoin="round"/>`
    + (far ? `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(tx)}" y2="${f(ty)}" stroke="#8A4B26" stroke-width="${(2.4 * k).toFixed(2)}" stroke-dasharray="${(7 * k).toFixed(2)} ${(5 * k).toFixed(2)}"/>` : '')
    + plane(refs[1]) + plane(refs[2])
    + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${(6 * k).toFixed(2)}" fill="#1f2a24" stroke="#fff" stroke-width="${(2 * k).toFixed(2)}"/>`
    + text(cx + 10 * k, cy - 9 * k, 'Melbourne', 13, '#1f2a24', 'start', 700)
    + `<g transform="translate(${f(tx)},${f(ty)}) scale(${k.toFixed(3)})"><circle r="10" fill="#8A4B26" stroke="#fff" stroke-width="3"/><circle r="3.5" fill="#fff"/></g>`
    + text(right ? tx + 15 * k : tx - 15 * k, ty + 6 * k, esc(town.name), 17, '#1f2a24', right ? 'start' : 'end')
    + (opts.km && far ? text((tx + cx) / 2, (ty + cy) / 2 - 8 * k, `${opts.km} km`, 14, '#8A4B26', 'middle') : '')
    + inset
    + `</svg>`;
}
