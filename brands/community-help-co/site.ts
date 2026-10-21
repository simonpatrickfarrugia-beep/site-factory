/**
 * Every page on communityhelp.com.au. Content lives in data/community-help-co/*.json (edited by chat).
 * Lead generation only: "Email Simon for a free chat" (mailto) and enquiry / referral forms. No payments.
 */
import { getCollection, getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import type { Faq, Pages, Service, SiteInfo, Testimonial } from './model';

const SITE = 'https://communityhelp.com.au';
const SUFFIX = ' | Community Help Co';

export function routes(): Route[] {
  const site = getSingleton<SiteInfo>('site');
  const services = getCollection<Service>('services').filter((s) => s.published).sort((a, b) => a.order - b.order);
  const faqs = getCollection<Faq>('faqs');
  const testimonials = getCollection<Testimonial>('testimonials').filter((t) => t.published && t.consent);
  const pages = getSingleton<Pages>('pages');
  const org = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE}/#org`,
    name: 'Community Help Co',
    url: SITE,
    logo: `${SITE}/logo-mark.png`,
    email: site.email,
    taxID: site.abn.replace(/\s/g, ''),
    founder: { '@type': 'Person', name: 'Simon Farrugia' },
    // No street address on purpose: sessions are online.
    address: { '@type': 'PostalAddress', addressLocality: 'Melbourne', addressRegion: 'VIC', addressCountry: 'AU' },
    areaServed: [{ '@type': 'City', name: 'Melbourne' }, { '@type': 'Country', name: 'Australia' }],
    description: 'Practical 1:1 life goals mentoring, employment coaching and advocacy support, online. NDIS (self-managed and plan-managed) or private clients.',
  };
  const crumbs = (items: { name: string; path: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
  });
  const faqSchema = (list: Faq[]) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  });
  const common = { book: site.book };
  const out: Route[] = [];

  out.push({
    path: '',
    template: 'chcHome',
    seo: { title: 'Community Help Co: life goals mentoring and job coaching, online (NDIS or private)', rawTitle: true, description: 'Practical 1:1 life goals mentoring and employment coaching, online from Melbourne. NDIS or private. Weekly sessions with written notes. Email for a free chat.' },
    schema: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Community Help Co', url: SITE }],
    props: { ...common, hero: site.hero, audiences: site.audiences, services: services.map(({ slug, name, short }) => ({ slug, name, short })), steps: pages['how-it-works'].steps, testimonials, faqs: faqs.slice(0, 4) },
  });

  for (const s of services) {
    const others = services.filter((o) => o.slug !== s.slug).map(({ slug, name, short }) => ({ slug, name, short }));
    out.push({
      path: s.slug,
      template: 'chcService',
      seo: { title: s.seoTitle + SUFFIX, rawTitle: true, description: s.seoDescription },
      schema: [
        { '@context': 'https://schema.org', '@type': 'Service', name: s.name, description: s.short, serviceType: s.name, provider: { '@id': `${SITE}/#org` }, areaServed: { '@type': 'Country', name: 'Australia' }, url: `${SITE}/${s.slug}` },
        crumbs([{ name: 'Home', path: '' }, { name: s.name, path: s.slug }]),
      ],
      props: { ...common, service: s, steps: pages['how-it-works'].steps, others },
    });
  }

  const how = pages['how-it-works'];
  out.push({
    path: 'how-it-works',
    template: 'chcSteps',
    seo: { title: how.title + SUFFIX, rawTitle: true, description: how.description },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: how.title, path: 'how-it-works' }])],
    props: { ...common, title: how.title, lede: how.lede, steps: how.steps },
  });

  for (const slug of ['about', 'privacy-policy'] as const) {
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'chcPage',
      seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description },
      schema: [crumbs([{ name: 'Home', path: '' }, { name: p.title, path: slug }])],
      props: { ...common, title: p.title, paragraphs: p.paragraphs, showCta: slug === 'about' },
    });
  }

  const j = (pages as unknown as Record<string, any>)['free-daily-journal'];
  if (j) {
    out.push({
      path: 'free-daily-journal',
      template: 'chcJournal',
      seo: { title: j.seoTitle + SUFFIX, rawTitle: true, description: j.description, image: `${SITE}${j.preview}` },
      schema: [
        { '@context': 'https://schema.org', '@type': 'DigitalDocument', name: 'Daily Intentions & Reflections: free 90-day gratitude journal', description: j.description, encodingFormat: 'application/pdf', isAccessibleForFree: true, url: `${SITE}${j.files.full.href}`, author: { '@type': 'Person', name: 'Simon Farrugia' }, publisher: { '@id': `${SITE}/#org` } },
        crumbs([{ name: 'Home', path: '' }, { name: 'Free daily journal', path: 'free-daily-journal' }]),
      ],
      props: { ...common, page: j },
    });
  }

  out.push({
    path: 'faq',
    template: 'chcFaq',
    seo: { title: 'Questions about mentoring and NDIS funding' + SUFFIX, rawTitle: true, description: 'Answers about the free chat, NDIS funding for self-managed and plan-managed participants, online sessions, written notes and referrals.' },
    schema: [faqSchema(faqs), crumbs([{ name: 'Home', path: '' }, { name: 'FAQ', path: 'faq' }])],
    props: { ...common, faqs },
  });

  out.push({
    path: 'contact',
    template: 'chcContact',
    seo: { title: 'Contact or refer someone' + SUFFIX, rawTitle: true, description: 'Email Simon for a free chat, send an enquiry, or refer someone to Community Help Co. Support coordinators and plan managers welcome.' },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: 'Contact', path: 'contact' }])],
    props: { ...common, email: site.email, endpoint: site.formsEndpoint, services: services.map(({ slug, name }) => ({ slug, name })) },
  });

  return out;
}
