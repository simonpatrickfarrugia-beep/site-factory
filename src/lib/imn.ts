/**
 * Independent Media Network Pty Ltd: the company behind every factory site. One place for the publisher details
 * shown in every footer (src/components/Footer.astro) and in the Organization schema on every page
 * (src/layouts/Base.astro), so all IMN sites point at the same, checkable publisher (23 Nov 2026).
 */
export const IMN = {
  name: 'Independent Media Network',
  legalName: 'Independent Media Network Pty Ltd',
  abn: '89 640 199 935',
  abnUrl: 'https://abr.business.gov.au/ABN/View?abn=89640199935',
  url: 'https://imnetwork.com.au',
  email: 'hello@imnetwork.com.au',
  orgId: 'https://imnetwork.com.au/#org',
} as const;

/** Link to the publisher from another site's schema (parentOrganization, publisher). */
export const imnRef = { '@type': 'Organization', '@id': IMN.orgId, name: IMN.legalName, url: IMN.url } as const;

/** The full publisher record, added to every public page of every site. */
export const imnOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': IMN.orgId,
  name: IMN.name,
  legalName: IMN.legalName,
  url: IMN.url,
  email: IMN.email,
  taxID: IMN.abn.replace(/\s/g, ''),
  identifier: { '@type': 'PropertyValue', propertyID: 'ABN', value: IMN.abn.replace(/\s/g, '') },
  address: { '@type': 'PostalAddress', addressLocality: 'Melbourne', addressRegion: 'VIC', addressCountry: 'AU' },
};
