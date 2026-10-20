/** Template registry. A route names its template; the catch-all page renders it. */
import Home from './Home.astro';
import Movie from './Movie.astro';
import Collection from './Collection.astro';
import Discover from './Discover.astro';
import Browse from './Browse.astro';
import Page from './Page.astro';
import Dashboard from './Dashboard.astro';
import Hq from './Hq.astro';
import VicHome from './vic/VicHome.astro';
import VicTowns from './vic/Towns.astro';
import VicTown from './vic/Town.astro';
import VicTownSection from './vic/TownSection.astro';
import VicCollection from './vic/VicCollection.astro';
import VicPage from './vic/VicPage.astro';
import VicLoop from './vic/VicLoop.astro';
import VicLoops from './vic/VicLoops.astro';

export const templates = {
  home: Home,
  movie: Movie,
  collection: Collection,
  discover: Discover,
  browse: Browse,
  page: Page,
  dashboard: Dashboard,
  hq: Hq,
  vicHome: VicHome,
  vicTowns: VicTowns,
  vicTown: VicTown,
  vicTownSection: VicTownSection,
  vicCollection: VicCollection,
  vicPage: VicPage,
  vicLoop: VicLoop,
  vicLoops: VicLoops,
};
