// Standard Web Push, no libraries: VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291), all WebCrypto.
// The VAPID key pair is made by the Worker on first use and kept in D1 `settings`, so there is no secret to set up.

export interface PushSub { endpoint: string; p256dh: string; auth: string }
export interface PushResult { ok: boolean; status: number; gone: boolean }

const enc = new TextEncoder();
type Bytes = Uint8Array<ArrayBuffer>;
const te = (t: string) => enc.encode(t) as Bytes;

export function b64u(buf: ArrayBuffer | Uint8Array) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(s: string): Bytes {
  const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) out[i] = t.charCodeAt(i);
  return out;
}
function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export interface Vapid { publicKey: string; privateJwk: JsonWebKey; subject: string }

export async function makeVapidKeys() {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey('jwk', kp.privateKey)) as JsonWebKey;
  const raw = new Uint8Array((await crypto.subtle.exportKey('raw', kp.publicKey)) as ArrayBuffer);
  return { publicKey: b64u(raw), privateJwk: jwk };
}

async function vapidAuth(endpoint: string, v: Vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64u(te(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(te(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: v.subject })));
  const key = await crypto.subtle.importKey('jwk', { ...v.privateJwk, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${v.publicKey}`;
}

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/** RFC 8291 aes128gcm body for one subscription. */
export async function encryptPayload(sub: PushSub, payload: Bytes) {
  const uaPublic = unb64u(sub.p256dh);
  const authSecret = unb64u(sub.auth);
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', local.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhAlg = { name: 'ECDH', public: uaKey }; // a variable (not a literal) so both DOM and workers-types accept it
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits(ecdhAlg, local.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(te('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 0x10, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export async function sendPush(sub: PushSub, data: unknown, v: Vapid, ttl = 4 * 3600): Promise<PushResult> {
  const body = await encryptPayload(sub, te(JSON.stringify(data)));
  try {
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        authorization: await vapidAuth(sub.endpoint, v),
        'content-encoding': 'aes128gcm',
        'content-type': 'application/octet-stream',
        ttl: String(ttl),
        urgency: 'high',
      },
      body,
    });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, gone: r.status === 404 || r.status === 410 };
  } catch {
    return { ok: false, status: 0, gone: false };
  }
}
