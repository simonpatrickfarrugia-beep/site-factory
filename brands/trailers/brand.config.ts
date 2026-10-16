import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'trailers',
  name: 'MovieTrailer.Channel',
  domain: 'movietrailer.channel',
  launched: false, // keep false until DNS cutover; previews stay out of Google

  theme: 'cinematic',
  colors: { brand: '#0B0B10', accent: '#E4B04A' }, // placeholders until the design sessions
  fonts: { display: 'Fraunces', body: 'Inter' },

  seo: {
    titleSuffix: ' | MovieTrailer.Channel',
    defaultDescription:
      'Watch trailers for new releases, award winners, indie films, and hidden gems. Free 24/7 trailer stream, plus where to rent, buy, or stream each movie.',
  },

  data: { source: 'none' }, // switches to airtable once the trailer base exists

  forms: ['contact'],
  analytics: {},
  payments: { enabled: false },
});
