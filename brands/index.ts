/**
 * Brand registry. Adding a site = add a folder under brands/ and one line here.
 */
import trailers from './trailers/brand.config';
import vic from './vic/brand.config';
import communityHelpCo from './community-help-co/brand.config';

export const brands = {
  trailers,
  vic,
  'community-help-co': communityHelpCo,
} as const;
