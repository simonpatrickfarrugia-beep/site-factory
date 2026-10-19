/**
 * Site modules: each brand's list of pages. Kept separate from brands/index.ts
 * because site modules read data snapshots, which only works inside the build.
 */
import type { Route } from '../src/lib/routes';
import { routes as trailers } from './trailers/site';
import { routes as vic } from './vic/site';

export const sites: Record<string, () => Route[]> = {
  trailers,
  vic,
};
