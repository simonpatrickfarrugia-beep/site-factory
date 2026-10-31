import type { APIRoute } from 'astro';
import { brand } from '../lib/brand';

/** ads.txt: which ad sellers may sell this site's ad space. Google's line once brand.ads.adsenseClient is set.
 *  f08c47fec0942fa0 is Google's published certification authority ID (the same on every AdSense site). */
export const GET: APIRoute = () => {
  const pub = brand.ads.adsenseClient?.replace(/^ca-/, '');
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : '# No authorised ad sellers.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
