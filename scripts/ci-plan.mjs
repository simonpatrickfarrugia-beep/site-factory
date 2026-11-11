// Decides which brands CI needs to build for a set of changed files (one path per line on stdin).
// Prints JSON: {"brands": [...], "workers": true|false}. Anything it doesn't recognise rebuilds everything.
// Each brand's build reads only data/<its slug>/, except the HQ pages (trailers, vic), which also read hq/ and every stats.json.
// Test: printf 'data/vic/towns.json\n' | node scripts/ci-plan.mjs
import { readFileSync } from 'node:fs';

const ALL = ['trailers', 'vic', 'community-help-co', 'shortlisted', 'trade-admin', 'paycalc', 'simon-says-travel', 'backyard-wild'];
const HQ = ['trailers', 'vic'];
const TEMPLATE = { bw: 'backyard-wild', chc: 'community-help-co', pc: 'paycalc', sl: 'shortlisted', sst: 'simon-says-travel', ta: 'trade-admin', vic: 'vic' };
// Files that never change a site build.
const NONE = [
  /^docs\//, /^reports\//, /^leads\//, /^backups\//, /^\.claude\//, /^workers\//,
  /^[^/]+\.md$/, /^\.gitignore$/,
  /^\.github\/workflows\/(?!check\.yml$)/,
  /^scripts\/(hq|leads|vic|trailers|paycalc|backyard-wild|claude)\//,
  /^scripts\/(probe|health|review|seo_audit|domain_check|webflow-to-snapshot)\.py$/,
  /^scripts\/(test-(?!pay-tax|public-domain)[\w-]+\.(mjs|ts)|shot-traffic\.mjs|snapshot\.mjs|ci-plan\.mjs)$/,
];

export function plan(files) {
  const brands = new Set();
  let workers = false;
  for (const f of files) {
    if (/^(workers\/|src\/worker\/|\.github\/workflows\/check\.yml$)/.test(f)) workers = true;
    let m;
    if ((m = f.match(/^(brands|data)\/([^/]+)\//)) && ALL.includes(m[2])) {
      brands.add(m[2]);
      if (/^data\/[^/]+\/stats\.json$/.test(f)) HQ.forEach((b) => brands.add(b));
    } else if (/^hq\//.test(f)) HQ.forEach((b) => brands.add(b));
    else if ((m = f.match(/^src\/templates\/([^/]+)\//)) && TEMPLATE[m[1]]) brands.add(TEMPLATE[m[1]]);
    else if (/^src\/components\/vic\//.test(f)) brands.add('vic');
    else if (!NONE.some((r) => r.test(f))) {
      ALL.forEach((b) => brands.add(b));
      workers = workers || /^src\//.test(f) || !/^(brands|data|scripts)\//.test(f);
    }
  }
  return { brands: ALL.filter((b) => brands.has(b)), workers };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = readFileSync(0, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  console.log(JSON.stringify(input.includes('*') ? { brands: ALL, workers: true } : plan(input)));
}
