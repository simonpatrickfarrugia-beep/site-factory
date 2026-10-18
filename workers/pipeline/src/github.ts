/**
 * Reads and writes the site's data files in the GitHub repo.
 * Every run that changes something makes ONE commit to main; that commit
 * rebuilds and deploys the site through Workers Builds as usual.
 */

export interface Repo {
  token: string;
  owner: string;
  name: string;
  branch: string;
}

const api = (repo: Repo, path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${repo.token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'site-factory-pipeline',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined), // e.g. the raw-file accept header in readFiles
    },
  });

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`GitHub ${what}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

export interface Snapshot {
  /** Commit the files were read at. */
  sha: string;
  files: Record<string, string>;
}

/** Read several files at the current tip of the branch (all from the same commit). */
export async function readFiles(repo: Repo, paths: string[]): Promise<Snapshot> {
  const ref = await json<{ object: { sha: string } }>(await api(repo, `/git/ref/heads/${repo.branch}`), 'read branch');
  const sha = ref.object.sha;
  const files: Record<string, string> = {};
  for (const p of paths) {
    const res = await api(repo, `/contents/${p}?ref=${sha}`, { headers: { accept: 'application/vnd.github.raw+json' } });
    if (res.status === 404) {
      files[p] = '';
      continue;
    }
    if (!res.ok) throw new Error(`GitHub read ${p}: HTTP ${res.status}`);
    files[p] = await res.text();
  }
  return { sha, files };
}

/**
 * Commit changed files on top of `parentSha`. If someone pushed in the meantime
 * the branch update fails and we throw; the caller re-reads and retries.
 */
export async function commitFiles(repo: Repo, parentSha: string, changes: Record<string, string>, message: string): Promise<string> {
  const parent = await json<{ tree: { sha: string } }>(await api(repo, `/git/commits/${parentSha}`), 'read commit');
  const tree = await json<{ sha: string }>(
    await api(repo, '/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: Object.entries(changes).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
      }),
    }),
    'create tree',
  );
  const commit = await json<{ sha: string }>(
    await api(repo, '/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [parentSha],
        author: { name: 'Trailer pipeline', email: 'pipeline@movietrailer.channel' },
      }),
    }),
    'create commit',
  );
  const res = await api(repo, `/git/refs/heads/${repo.branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  if (res.status === 422) throw new StaleError();
  await json(res, 'update branch');
  return commit.sha;
}

export class StaleError extends Error {
  constructor() {
    super('Branch moved while the pipeline was running');
  }
}
