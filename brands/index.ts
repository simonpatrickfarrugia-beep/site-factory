/**
 * Brand registry. Adding a site = add a folder under brands/ and one line here.
 */
import trailers from './trailers/brand.config';
import vic from './vic/brand.config';
import communityHelpCo from './community-help-co/brand.config';
import shortlisted from './shortlisted/brand.config';
import tradeAdmin from './trade-admin/brand.config';
import paycalc from './paycalc/brand.config';
import simonSaysTravel from './simon-says-travel/brand.config';
import backyardWild from './backyard-wild/brand.config';

export const brands = {
  trailers,
  vic,
  'community-help-co': communityHelpCo,
  shortlisted,
  'trade-admin': tradeAdmin,
  paycalc,
  'simon-says-travel': simonSaysTravel,
  'backyard-wild': backyardWild,
} as const;
