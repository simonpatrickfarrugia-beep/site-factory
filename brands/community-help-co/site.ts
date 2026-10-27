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
    seo: { title: 'Life Mentoring & Job Coaching, Melbourne & Online | Community Help Co', rawTitle: true, description: 'Practical 1:1 life goals mentoring and job coaching from Melbourne, online across Australia. NDIS or private. Weekly sessions with written notes.' },
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
    props: { ...common, title: how.title, lede: how.lede, steps: how.steps, sections: (how as any).sections ?? [] },
  });

  for (const slug of ['about', 'privacy-policy'] as const) {
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'chcPage',
      seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description },
      schema: [crumbs([{ name: 'Home', path: '' }, { name: p.title, path: slug }])],
      // The About page is about a person: lead with him, not the company name (the SEO title keeps the company name).
      props: { ...common, title: slug === 'about' ? 'Hi, I’m Simon' : p.title, paragraphs: p.paragraphs, showCta: slug === 'about' },
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

  const rb = (pages as unknown as Record<string, any>)['resume-builder'];
  if (rb) {
    out.push({
      path: 'resume-builder',
      template: 'chcResumeBuilder',
      seo: { title: rb.seoTitle, rawTitle: true, description: rb.description },
      schema: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Free resume builder', url: `${SITE}/resume-builder`, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (runs in your web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, description: rb.description, publisher: { '@id': `${SITE}/#org` } },
        faqSchema(rb.faq.map((f: { q: string; a: string }) => ({ q: f.q, a: f.a, service: null }))),
        crumbs([{ name: 'Home', path: '' }, { name: 'Free resume builder', path: 'resume-builder' }]),
      ],
      props: { ...common, page: rb },
    });
  }

  const cl = (pages as unknown as Record<string, any>)['cover-letter-builder'];
  if (cl) {
    out.push({
      path: 'cover-letter-builder',
      template: 'chcCoverLetter',
      seo: { title: cl.seoTitle, rawTitle: true, description: cl.description },
      schema: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Free cover letter builder', url: `${SITE}/cover-letter-builder`, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (runs in your web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, description: cl.description, publisher: { '@id': `${SITE}/#org` } },
        faqSchema(cl.faq.map((f: { q: string; a: string }) => ({ q: f.q, a: f.a, service: null }))),
        crumbs([{ name: 'Home', path: '' }, { name: 'Free cover letter builder', path: 'cover-letter-builder' }]),
      ],
      props: { ...common, page: cl },
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
