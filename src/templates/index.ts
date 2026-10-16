/** Template registry. A route names its template; the catch-all page renders it. */
import Home from './Home.astro';
import Movie from './Movie.astro';
import Collection from './Collection.astro';
import Discover from './Discover.astro';
import Browse from './Browse.astro';
import Page from './Page.astro';

export const templates = {
  home: Home,
  movie: Movie,
  collection: Collection,
  discover: Discover,
  browse: Browse,
  page: Page,
};
