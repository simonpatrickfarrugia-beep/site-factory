// Contract tests for the AI workers' skills (.claude/skills/*/SKILL.md). Runs in CI on every push (check.yml, plan job).
// Catches the edits that would quietly break a scheduled worker: bad frontmatter, a lost run-log step, a worker
// missing from the roster or the health check, a required report section dropped, or a forbidden action added.
// Run locally: node scripts/test-skills.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const dir = '.claude/skills';
const skills = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const health = JSON.parse(readFileSync('hq/health.json', 'utf8'));
const watched = Object.keys(health.workersMaxAgeDays ?? {});
const roster = readFileSync('docs/WORKERS.md', 'utf8');
const rules = readFileSync('CLAUDE.md', 'utf8');

// What each worker's output must keep (the bits Simon relies on).
const REQUIRED = {
  'morning-report': ['Needs you', 'Radar', 'Sites', 'Google', 'Day job', "Today's one thing", 'Ready for you', 'milestones.json'],
  'weekly-autopilot': ['Weekly brief', 'hq/reports/weekly/', 'Affiliate inbox', 'Ready for you', 'autopilot-log.md'],
  'imn-radar': ['opted_out_at', "won't contact you again", 'radar_last_run', 'Never UPDATE or DELETE'],
  'rba-rate-day': ['rba.gov.au', 'test-pay-tax.ts', "don't guess"],
};
// Things no worker may be told to do.
const FORBIDDEN = [/send_message|outlook_send|send_mail|\bsend the email\b/i, /--force\b|push -f\b/, /\bDROP TABLE\b|\bDELETE FROM\b/i];

check(rules.includes('Hard rules'), 'CLAUDE.md lost its Hard rules section');

for (const name of skills) {
  const p = `${dir}/${name}/SKILL.md`;
  if (!existsSync(p)) { fails.push(`${name}: no SKILL.md`); continue; }
  const s = readFileSync(p, 'utf8');
  const fm = s.match(/^---\n([\s\S]*?)\n---\n/);
  check(fm, `${name}: missing frontmatter`);
  if (fm) {
    check(new RegExp(`^name: ${name}$`, 'm').test(fm[1]), `${name}: frontmatter name must be "${name}"`);
    const d = fm[1].match(/^description: (.+)$/m)?.[1] ?? '';
    check(d.length > 20 && d.length <= 1024, `${name}: description must be 21-1024 characters (is ${d.length})`);
  }
  check(s.includes('CLAUDE.md'), `${name}: must tell the worker to follow CLAUDE.md`);
  check(roster.includes(`\`${name}\``), `${name}: not in the docs/WORKERS.md roster`);
  if (watched.includes(name)) check(s.includes(`log_run.py ${name}`), `${name}: lost its run-log step (log_run.py ${name})`);
  for (const r of REQUIRED[name] ?? []) check(s.includes(r), `${name}: must still mention "${r}"`);
  for (const f of FORBIDDEN) check(!f.test(s), `${name}: contains a forbidden action (${f})`);
}
for (const w of watched) check(skills.includes(w), `hq/health.json watches "${w}" but there's no skill for it`);

if (fails.length) {
  console.log(fails.map((f) => `✗ ${f}`).join('\n'));
  console.log(`::error title=Skill tests::${fails.join(' | ')}`);
  process.exit(1);
}
console.log(`Skill tests: ${skills.length} skills, all checks pass`);
