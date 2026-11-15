/**
 * Right-sized Wikimedia Commons images for Vic.
 *
 * data/vic/photos.json stores one hot-linked URL per photo (a 500px or 1280px thumbnail, or the
 * full-size original). Cards show them at ~330px, so we rewrite to Wikimedia's standard thumbnail
 * widths and let the browser pick with srcset. Non-Wikimedia URLs pass through unchanged.
 */
import type { Photo } from '../../brands/vic/model';

/** Wikimedia's standard (cached) thumbnail widths we use. Other widths are slower and may be refused. */
const STEPS = [120, 250, 330, 500, 960, 1280];

const THUMB = /^(https:\/\/(?:thumb|upload)\.wikimedia\.org\/wikipedia\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+\/)(\d+)px-([^/]+)$/;
const ORIGINAL = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.(?:jpe?g|png|webp))$/i;

/** A function that gives this photo at width w, plus the widest width it can give (null if we can't resize). */
function resizer(url: string, width?: number): { at: (w: number) => string; max: number } | null {
  const bare = url.split('?')[0];
  const t = bare.match(THUMB);
  if (t) return { at: (w) => `${t[1]}${w}px-${t[3]}`, max: Number(t[2]) };
  const o = bare.match(ORIGINAL);
  if (o && width) return { at: (w) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${o[1]}/${o[2]}/${w}px-${o[2]}`, max: width };
  return null;
}

/**
 * src, srcset and sizes for an <img>. `base` is the width used for src (what older browsers and
 * our site check load); `widths` are the srcset candidates. Widths wider than the stored image are dropped.
 */
export function photoAttrs(photo: Pick<Photo, 'url' | 'width'>, base: number, widths: number[], sizes: string) {
  const r = resizer(photo.url, photo.width);
  if (!r) return { src: photo.url };
  const ok = widths.filter((w) => STEPS.includes(w) && w <= r.max);
  const srcW = STEPS.includes(base) && base <= r.max ? base : ok[ok.length - 1];
  if (!srcW) return { src: photo.url };
  return {
    src: r.at(srcW),
    ...(ok.length > 1 ? { srcset: ok.map((w) => `${r.at(w)} ${w}w`).join(', '), sizes } : {}),
  };
}
