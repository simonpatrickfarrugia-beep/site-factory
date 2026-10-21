// Writes dist/version.txt with the commit this build came from, so the daily health check can
// spot a deploy that silently didn't happen (Workers Builds skipped one on 21 Oct 2026).
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
let sha = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || '';
if (!sha) try { sha = execSync('git rev-parse HEAD').toString().trim(); } catch { sha = 'unknown'; }
if (existsSync('dist')) writeFileSync('dist/version.txt', `${sha}\n${new Date().toISOString()}\n`);
console.log(`version.txt: ${sha}`);
