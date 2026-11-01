// Minimal MIME reader for the mail hub: pulls the readable text out of an email so the CRM
// can show what people wrote. Handles nested multipart, base64, quoted-printable and common
// charsets; falls back to stripped HTML when there is no text part. Never throws.

type Part = { headers: Map<string, string>; body: Uint8Array };

const enc = new TextEncoder();

// Byte-to-char without TextDecoder (Workers' TextDecoder may only know UTF-8).
function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return s;
}

export function emailText(raw: Uint8Array, maxChars = 6000): string {
  try {
    const part = parsePart(raw);
    const plain = findPart(part, 'text/plain');
    let text = plain ? decodeText(plain) : '';
    if (!text.trim()) {
      const html = findPart(part, 'text/html');
      if (html) text = htmlToText(decodeText(html));
    }
    return stripQuoted(text).slice(0, maxChars).trim();
  } catch {
    return '';
  }
}

function indexOf(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

function parsePart(bytes: Uint8Array): Part {
  // Headers end at the first blank line (CRLFCRLF or LFLF).
  let split = indexOf(bytes, enc.encode('\r\n\r\n'));
  let skip = 4;
  const lf = indexOf(bytes, enc.encode('\n\n'));
  if (split === -1 || (lf !== -1 && lf < split)) { split = lf; skip = 2; }
  if (split === -1) return { headers: new Map(), body: bytes };
  const headText = latin1(bytes.subarray(0, split)).replace(/\r?\n[ \t]+/g, ' ');
  const headers = new Map<string, string>();
  for (const line of headText.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) headers.set(line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim());
  }
  return { headers, body: bytes.subarray(split + skip) };
}

function param(value: string, name: string): string | null {
  const m = value.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]+)"|([^;\\s]+))`, 'i'));
  return m ? (m[1] ?? m[2]) : null;
}

function findPart(part: Part, want: string, depth = 0): Part | null {
  const type = (part.headers.get('content-type') ?? 'text/plain').toLowerCase();
  const disposition = (part.headers.get('content-disposition') ?? '').toLowerCase();
  if (type.startsWith('multipart/') && depth < 6) {
    const boundary = param(part.headers.get('content-type') ?? '', 'boundary');
    if (!boundary) return null;
    const marker = enc.encode('--' + boundary);
    let pos = indexOf(part.body, marker);
    while (pos !== -1) {
      const start = pos + marker.length;
      if (part.body[start] === 45 && part.body[start + 1] === 45) break; // closing "--"
      const next = indexOf(part.body, marker, start);
      const chunk = part.body.subarray(start, next === -1 ? part.body.length : next);
      // Drop the line break right after the boundary.
      let s = 0;
      while (s < chunk.length && (chunk[s] === 13 || chunk[s] === 10)) s++;
      const found = findPart(parsePart(chunk.subarray(s)), want, depth + 1);
      if (found) return found;
      pos = next;
    }
    return null;
  }
  if (type.startsWith(want) && !disposition.startsWith('attachment')) return part;
  return null;
}

function decodeText(part: Part): string {
  const cte = (part.headers.get('content-transfer-encoding') ?? '').toLowerCase();
  const charset = (param(part.headers.get('content-type') ?? '', 'charset') ?? 'utf-8').toLowerCase();
  let bytes = part.body;
  if (cte === 'base64') {
    const s = latin1(bytes).replace(/[^A-Za-z0-9+/=]/g, '');
    const bin = atob(s);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else if (cte === 'quoted-printable') {
    const s = latin1(bytes).replace(/=\r?\n/g, '');
    const out: number[] = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) { out.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
      else out.push(s.charCodeAt(i) & 0xff);
    }
    bytes = new Uint8Array(out);
  }
  if (/^(iso-8859-1|latin1|windows-1252|us-ascii|ascii)$/.test(charset)) return latin1(bytes);
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

// Cut the quoted thread: everything from "On … wrote:" / Outlook's "From: … Sent:" block / "> " lines.
function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^On .{4,200}wrote:\s*$/i.test(l) || (/^On .{4,200}$/i.test(l) && /wrote:\s*$/i.test(lines[i + 1] ?? ''))) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(l)) break;
    if (/^_{8,}\s*$/.test(l)) break;
    if (/^From:\s.+/i.test(l) && lines.slice(i + 1, i + 5).some((x) => /^(Sent|Date):\s/i.test(x))) break;
    if (/^>/.test(l)) continue;
    out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
