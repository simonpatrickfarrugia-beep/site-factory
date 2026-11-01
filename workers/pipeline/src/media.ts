/**
 * Film uploads into R2 (bucket "trailer-films", binding FILMS) for the free classic movies on movietrailer.channel.
 * Used only by .github/workflows/film-ingest.yml, which prepares each file (copied from the Internet Archive, sound
 * removed for silent films) and uploads it in parts: Workers accept request bodies up to 100 MB.
 *
 *   POST /media/create?key=&name=          → { uploadId }
 *   PUT  /media/part?key=&name=&uploadId=&part=N   (body = the part) → { part, etag }
 *   POST /media/complete?key=&name=&uploadId=      (body = [{ part, etag }]) → { size }
 *   POST /media/abort?key=&name=&uploadId=
 *   GET  /media/head?key=&name=            → { exists, size, uploaded }
 *   POST /media/delete?key=&name=
 *   PUT  /media/put?key=&name=             (body = a small file, ≤ 5 MB: subtitles) → { size }
 *
 * Names: lowercase "<slug>.mp4" (films) or "<slug>.<lang>.vtt" (subtitles).
 */
const NAME = /^[a-z0-9-]{3,100}(\.mp4|\.[a-z]{2}\.vtt)$/;
const typeOf = (name: string) => (name.endsWith('.vtt') ? 'text/vtt; charset=utf-8' : 'video/mp4');

export async function media(req: Request, url: URL, bucket: R2Bucket | undefined): Promise<Response> {
  if (!bucket) return Response.json({ error: 'FILMS bucket not bound' }, { status: 500 });
  const name = url.searchParams.get('name') ?? '';
  if (!NAME.test(name)) return Response.json({ error: 'bad name' }, { status: 400 });
  const op = url.pathname.slice('/media/'.length);
  const uploadId = url.searchParams.get('uploadId') ?? '';
  try {
    if (op === 'head') {
      const o = await bucket.head(name);
      return Response.json(o ? { exists: true, size: o.size, uploaded: o.uploaded } : { exists: false });
    }
    if (op === 'create' && req.method === 'POST') {
      const up = await bucket.createMultipartUpload(name, { httpMetadata: { contentType: typeOf(name), cacheControl: 'public, max-age=604800' } });
      return Response.json({ uploadId: up.uploadId });
    }
    if (op === 'part' && req.method === 'PUT' && req.body) {
      const n = Number(url.searchParams.get('part'));
      if (!(n >= 1 && n <= 10000)) return Response.json({ error: 'bad part' }, { status: 400 });
      const p = await bucket.resumeMultipartUpload(name, uploadId).uploadPart(n, req.body);
      return Response.json({ part: p.partNumber, etag: p.etag });
    }
    if (op === 'complete' && req.method === 'POST') {
      const parts = (await req.json()) as { part: number; etag: string }[];
      const o = await bucket.resumeMultipartUpload(name, uploadId).complete(parts.map((p) => ({ partNumber: p.part, etag: p.etag })));
      return Response.json({ size: o.size });
    }
    if (op === 'abort' && req.method === 'POST') {
      await bucket.resumeMultipartUpload(name, uploadId).abort();
      return Response.json({ ok: true });
    }
    if (op === 'put' && req.method === 'PUT' && req.body) {
      const body = await req.arrayBuffer();
      if (body.byteLength > 5_000_000) return Response.json({ error: 'too big for put (use create/part/complete)' }, { status: 413 });
      const o = await bucket.put(name, body, { httpMetadata: { contentType: typeOf(name), cacheControl: 'public, max-age=86400' } });
      return Response.json({ size: o?.size ?? body.byteLength });
    }
    if (op === 'delete' && req.method === 'POST') {
      await bucket.delete(name);
      return Response.json({ ok: true });
    }
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  return Response.json({ error: 'unknown operation' }, { status: 404 });
}
