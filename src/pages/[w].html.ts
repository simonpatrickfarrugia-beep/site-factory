import type { APIRoute, GetStaticPaths } from 'astro';
import { brand } from '../lib/brand';
import { widgetSets } from '../../brands/widgets';
import type { WidgetDef } from '../widgets/types';

/**
 * /widgets: the widget builder (src/widgets/types.ts). Pick options, see the real widget live, copy one line of code.
 * Prefilled from the URL so outreach can link a ready-made preview, e.g.
 *   /widgets?for=Cinema%20Nova&title=Coming%20soon&g=1980s-action-classics&accent=%23e63946&n=6
 *   params: for (organisation), title, w (widget id), g (group id), items (comma ids), n (count), accent (#hex), theme (dark|light), id (embed id)
 * Not in the sitemap and noindex: it's a tool page for partners, not a search landing page.
 */
export const getStaticPaths: GetStaticPaths = () => (widgetSets[brand.slug] ? [{ params: { w: 'widgets' } }] : []);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const GET: APIRoute = ({ site }) => {
  const widgets: WidgetDef[] = widgetSets[brand.slug]();
  const origin = (site?.origin ?? `https://${brand.domain}`).replace(/\/$/, '');
  const mailDomain = brand.domain.replace(/^www\./, '');
  const opts = widgets.map((w) => ({
    id: w.id, name: w.name, pitch: w.pitch, audience: w.audience, defaults: w.defaults,
    groups: (w.groups ?? []).map((g) => ({ id: g.id, name: g.name, n: g.items.length })),
    items: w.items.map((i) => ({ id: i.id, t: i.title, s: i.sub ?? '' })),
  }));
  const first = widgets[0];
  const html = `<!doctype html>
<html lang="en-AU"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Free ${esc(first.name.toLowerCase())} for your website | ${esc(brand.name)}</title>
<meta name="description" content="${esc(first.pitch)} Add it to your site with one line of code.">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${origin}/widgets">
<style>
:root{--brand:${brand.colors.brand};--accent:${brand.colors.accent};--bg:#f6f5f2;--fg:#1b1d24;--mute:#5d6170;--line:#dddbd4;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0e1122;--fg:#f1efe9;--mute:#a7abbd;--line:#2a2f4a;--card:#161a31}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--brand);color:#fff;padding:14px 16px}header a{color:#fff;text-decoration:none;font-weight:700}
main{max-width:1100px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.15;margin:0 0 8px}.lead{color:var(--mute);margin:0 0 24px;max-width:60ch}
.made{display:inline-block;background:var(--accent);color:#12162b;font-weight:700;border-radius:999px;padding:3px 12px;font-size:.85rem;margin-bottom:10px}
.cols{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:24px;align-items:start}
@media (max-width:820px){.cols{grid-template-columns:minmax(0,1fr)}}
.panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
label{display:block;font-weight:600;font-size:.9rem;margin:12px 0 4px}label:first-child{margin-top:0}
input,select,textarea{width:100%;font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
input[type=color]{padding:2px;height:40px}select[multiple]{min-height:160px}
.row{display:flex;gap:8px}.row>*{flex:1}
.hint{color:var(--mute);font-size:.82rem;margin:4px 0 0}
h2{font-size:1.15rem;margin:24px 0 8px}
pre{white-space:pre-wrap;word-break:break-all;background:#12162b;color:#f1efe9;border-radius:10px;padding:14px;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;margin:0}
button.copy{margin-top:10px;background:var(--accent);color:#12162b;border:0;border-radius:8px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer}
ol{padding-left:20px}li{margin:4px 0}.small{color:var(--mute);font-size:.88rem}
</style></head>
<body>
<header><a href="/">${esc(brand.name)}</a></header>
<main>
  <div id="made" class="made" hidden></div>
  <h1 id="h1">Free ${esc(first.name.toLowerCase())} for your website</h1>
  <p class="lead">${esc(first.pitch)} It updates itself, has no ads and sets no cookies. Copy one line of code, paste it where you want it, done.</p>
  <div class="cols">
    <form class="panel" id="f" onsubmit="return false">
      ${widgets.length > 1 ? `<label for="w">Widget</label><select id="w">${widgets.map((w) => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}</select>` : `<input type="hidden" id="w" value="${esc(first.id)}">`}
      <label for="org">Your organisation</label><input id="org" placeholder="e.g. Cinema Nova">
      <label for="title">Heading</label><input id="title">
      <label for="g">Which films</label><select id="g"></select>
      <div id="pickwrap" hidden><label for="q">Search and pick (Ctrl/Cmd-click for several)</label><input id="q" placeholder="Search titles"><select id="items" multiple></select></div>
      <div class="row"><div><label for="n">How many</label><input id="n" type="number" min="1" max="12"></div><div><label for="accent">Colour</label><input id="accent" type="color"></div></div>
      <label for="theme">Style</label><select id="theme"><option value="dark">Dark</option><option value="light">Light</option></select>
    </form>
    <div>
      <div id="preview"></div>
      <h2>Your code</h2>
      <pre id="code"></pre>
      <button class="copy" id="copy" type="button">Copy code</button>
      <h2>How to add it</h2>
      <ol>
        <li><b>WordPress:</b> edit the page, add a <i>Custom HTML</i> block, paste the code, update.</li>
        <li><b>Squarespace:</b> add a <i>Code</i> block, paste, save.</li>
        <li><b>Wix:</b> Add → <i>Embed code</i> → <i>Embed HTML</i>, paste, then drag it to size.</li>
        <li><b>Anything else:</b> paste it into the page's HTML where you want the widget.</li>
      </ol>
      <p class="small">Free to use. Please keep the small "${esc(first.credit)} ${esc(brand.name)}" credit. Remove it any time by deleting the code. Help or a custom version: <a href="mailto:hello@${esc(mailDomain)}">hello@${esc(mailDomain)}</a>.</p>
    </div>
  </div>
</main>
<script>
var ORIGIN = ${JSON.stringify(origin)}, BRAND = ${JSON.stringify(brand.slug)}, W = ${JSON.stringify(opts).replace(/</g, '\\u003c')};
var $ = function (s) { return document.querySelector(s); };
var P = new URLSearchParams(location.search);
var slug = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); };
var rnd = Math.random().toString(36).slice(2, 6);
function cur() { return W.filter(function (w) { return w.id === $('#w').value; })[0] || W[0]; }
function fillGroups() {
  var w = cur();
  $('#g').innerHTML = w.groups.map(function (g) { return '<option value="' + g.id + '">' + g.name.replace(/</g, '&lt;') + ' (' + g.n + ')</option>'; }).join('') + '<option value="__pick">Pick my own…</option>';
  $('#items').innerHTML = w.items.map(function (i) { return '<option value="' + i.id + '">' + (i.t + (i.s ? ' · ' + i.s : '')).replace(/</g, '&lt;') + '</option>'; }).join('');
}
function attrs(preview) {
  var w = cur(), org = $('#org').value.trim();
  var id = preview ? 'preview' : (P.get('id') || ((slug(org) || 'site') + '-' + rnd));
  var a = { 'data-imn-widget': BRAND + '/' + w.id, 'data-id': id };
  if ($('#title').value.trim() !== w.defaults.title) a['data-title'] = $('#title').value.trim();
  if ($('#g').value === '__pick') { var sel = [].slice.call($('#items').selectedOptions).map(function (o) { return o.value; }); if (sel.length) a['data-items'] = sel.join(','); }
  else if ($('#g').value !== w.defaults.group) a['data-group'] = $('#g').value;
  if (Number($('#n').value) !== w.defaults.max) a['data-max'] = String(Math.min(12, Math.max(1, Number($('#n').value) || w.defaults.max)));
  if ($('#accent').value.toLowerCase() !== ${JSON.stringify(brand.colors.accent.toLowerCase())}) a['data-accent'] = $('#accent').value;
  if ($('#theme').value !== 'dark') a['data-theme'] = $('#theme').value;
  return a;
}
function attrStr(a) { return Object.keys(a).map(function (k) { return k + '="' + String(a[k]).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"'; }).join(' '); }
function update() {
  var org = $('#org').value.trim();
  $('#made').hidden = !org; $('#made').textContent = 'Made for ' + org;
  $('#pickwrap').hidden = $('#g').value !== '__pick';
  var code = '<div ' + attrStr(attrs(false)) + '></div>\\n<script async src="' + ORIGIN + '/embed.js"><\\/script>';
  $('#code').textContent = code;
  var el = document.createElement('div'); var a = attrs(true); Object.keys(a).forEach(function (k) { el.setAttribute(k, a[k]); });
  $('#preview').innerHTML = ''; $('#preview').appendChild(el);
  if (window.imnWidgets && window.imnWidgets[BRAND]) window.imnWidgets[BRAND].refresh(el);
}
$('#q').addEventListener('input', function () { var q = this.value.toLowerCase(); [].forEach.call($('#items').options, function (o) { o.hidden = q && o.textContent.toLowerCase().indexOf(q) < 0; }); });
function init() {
  var wid = P.get('w'); if (wid && W.some(function (w) { return w.id === wid; })) $('#w').value = wid;
  fillGroups();
  var w = cur();
  $('#org').value = P.get('for') || '';
  $('#title').value = P.get('title') || w.defaults.title;
  var items = (P.get('items') || '').split(',').filter(Boolean);
  if (items.length) { $('#g').value = '__pick'; [].forEach.call($('#items').options, function (o) { o.selected = items.indexOf(o.value) > -1; }); }
  else $('#g').value = (P.get('g') && w.groups.some(function (g) { return g.id === P.get('g'); })) ? P.get('g') : (w.defaults.group || '__pick');
  $('#n').value = P.get('n') || w.defaults.max;
  $('#accent').value = /^#[0-9a-f]{6}$/i.test(P.get('accent') || '') ? P.get('accent') : ${JSON.stringify(brand.colors.accent)};
  $('#theme').value = P.get('theme') === 'light' ? 'light' : 'dark';
  if (P.get('for')) $('#h1').textContent = 'Your free ' + w.name.toLowerCase() + ', ready to go';
  ['#org', '#title', '#g', '#items', '#n', '#accent', '#theme'].forEach(function (s) { $(s).addEventListener('input', update); $(s).addEventListener('change', update); });
  if ($('#w').tagName === 'SELECT') $('#w').addEventListener('change', function () { fillGroups(); var d = cur().defaults; $('#title').value = d.title; $('#n').value = d.max; $('#g').value = d.group || '__pick'; update(); });
  update();
}
$('#copy').addEventListener('click', function () { var t = $('#code').textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('#copy').textContent = 'Copied ✓'; setTimeout(function () { $('#copy').textContent = 'Copy code'; }, 1800); }, function () { var r = document.createRange(); r.selectNodeContents($('#code')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }); });
init();
</script>
<script async src="/embed.js" onload="window.imnWidgets && imnWidgets[BRAND] && imnWidgets[BRAND].refresh()"></script>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
