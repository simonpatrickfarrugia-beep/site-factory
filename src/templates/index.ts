/** Template registry. A route names its template; the catch-all page renders it. */
import Home from './Home.astro';
import Movie from './Movie.astro';
import Collection from './Collection.astro';
import Discover from './Discover.astro';
import Browse from './Browse.astro';
import Page from './Page.astro';
import Dashboard from './Dashboard.astro';
import Hq from './Hq.astro';
import HqAnswers from './HqAnswers.astro';
import VicHome from './vic/VicHome.astro';
import VicTowns from './vic/Towns.astro';
import VicTown from './vic/Town.astro';
import VicTownSection from './vic/TownSection.astro';
import VicCollection from './vic/VicCollection.astro';
import VicPage from './vic/VicPage.astro';
import VicLoop from './vic/VicLoop.astro';
import VicLoops from './vic/VicLoops.astro';
import ChcHome from './chc/Home.astro';
import ChcService from './chc/Service.astro';
import ChcSteps from './chc/Steps.astro';
import ChcPage from './chc/Page.astro';
import ChcFaq from './chc/Faq.astro';
import ChcContact from './chc/Contact.astro';
import ChcJournal from './chc/Journal.astro';
import ChcResumeBuilder from './chc/ResumeBuilder.astro';
import ChcCoverLetter from './chc/CoverLetter.astro';
import VicBundle from './vic/VicBundle.astro';
import VicBundles from './vic/VicBundles.astro';
import SlHome from './sl/SlHome.astro';
import SlGuide from './sl/SlGuide.astro';
import SlPolicy from './sl/SlPolicy.astro';
import SlEnquiry from './sl/SlEnquiry.astro';
import SlPage from './sl/SlPage.astro';
import TaHome from './ta/TaHome.astro';
import TaBuilder from './ta/TaBuilder.astro';
import TaCompare from './ta/TaCompare.astro';
import TaPage from './ta/TaPage.astro';

export const templates = {
  home: Home,
  movie: Movie,
  collection: Collection,
  discover: Discover,
  browse: Browse,
  page: Page,
  dashboard: Dashboard,
  hq: Hq,
  hqAnswers: HqAnswers,
  vicHome: VicHome,
  vicTowns: VicTowns,
  vicTown: VicTown,
  vicTownSection: VicTownSection,
  vicCollection: VicCollection,
  vicPage: VicPage,
  vicLoop: VicLoop,
  vicLoops: VicLoops,
  chcHome: ChcHome,
  chcService: ChcService,
  chcSteps: ChcSteps,
  chcPage: ChcPage,
  chcFaq: ChcFaq,
  chcContact: ChcContact,
  chcJournal: ChcJournal,
  chcResumeBuilder: ChcResumeBuilder,
  chcCoverLetter: ChcCoverLetter,
  vicBundle: VicBundle,
  vicBundles: VicBundles,
  slHome: SlHome,
  slGuide: SlGuide,
  slPolicy: SlPolicy,
  slEnquiry: SlEnquiry,
  slPage: SlPage,
  taHome: TaHome,
  taBuilder: TaBuilder,
  taCompare: TaCompare,
  taPage: TaPage,
};
