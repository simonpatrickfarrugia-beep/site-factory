/**
 * The embed loader served at /embed.js (one per brand). Plain ES2017 so it runs on any host site.
 *
 * Host markup (what the builder hands out):
 *   <div data-imn-widget="trailers/trailer-reel" data-id="cinema-nova-k3f9" data-title="Coming soon"
 *        data-group="halloween-movie-night" data-items="alien-1979,heat-1995" data-max="6"
 *        data-accent="#F2B53A" data-theme="dark"></div>
 *   <script async src="https://www.movietrailer.channel/embed.js"></script>
 *
 * Renders inside a shadow root (the host's CSS can't break it, ours can't leak out), counts a view when it
 * scrolls into sight, a play per trailer started and a click per link to our site (POST /api/embed, beacon).
 * Links back to us carry utm_source=embed, utm_medium=<widget>, utm_campaign=<embed id> so GA4 shows them.
 */
export function loaderJs(brandSlug: string, brandName: string, origin: string): string {
  return `/*! ${brandName} widgets · ${origin}/widgets */
(function () {
  var ORIGIN = ${JSON.stringify(origin)}, BRAND = ${JSON.stringify(brandSlug)}, NAME = ${JSON.stringify(brandName)};
  var cache = {};
  function data(w) { return cache[w] || (cache[w] = fetch(ORIGIN + '/api/embed/' + w).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function track(w, id, ev, item) {
    try {
      var body = JSON.stringify({ w: w, e: id, ev: ev, i: item || '', h: location.hostname });
      if (navigator.sendBeacon) navigator.sendBeacon(ORIGIN + '/api/embed', new Blob([body], { type: 'text/plain' }));
      else fetch(ORIGIN + '/api/embed', { method: 'POST', body: body, mode: 'no-cors', keepalive: true });
    } catch (e) {}
  }
  function link(path, w, id) {
    var u = new URL(path, ORIGIN);
    u.searchParams.set('utm_source', 'embed'); u.searchParams.set('utm_medium', w); u.searchParams.set('utm_campaign', id);
    return u.toString();
  }
  var hex = /^#[0-9a-f]{6}$/i;
  function css(accent, dark) {
    var bg = dark ? '#12162b' : '#ffffff', fg = dark ? '#f4f1ea' : '#1b1d24', mute = dark ? '#a9adbf' : '#5d6170', line = dark ? '#2a2f4a' : '#e4e4ea', card = dark ? '#1a1f38' : '#f7f7f9';
    return ':host{all:initial;display:block}' +
      '.w{font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:' + fg + ';background:' + bg + ';border:1px solid ' + line + ';border-radius:14px;padding:16px;box-sizing:border-box}' +
      '.w *{box-sizing:border-box}' +
      'h2{font-size:18px;margin:0 0 12px;font-weight:700;letter-spacing:.01em}' +
      '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}' +
      '.c{background:' + card + ';border-radius:10px;overflow:hidden;display:flex;flex-direction:column}' +
      '.v{position:relative;aspect-ratio:16/9;background:#000;border:0;padding:0;cursor:pointer;display:block;width:100%}' +
      '.v img{width:100%;height:100%;object-fit:cover;display:block;opacity:.9}' +
      '.v span{position:absolute;inset:0;margin:auto;width:46px;height:46px;border-radius:50%;background:' + accent + ';display:grid;place-items:center}' +
      '.v span:after{content:"";border-left:14px solid #12162b;border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:4px}' +
      '.v:focus-visible{outline:3px solid ' + accent + ';outline-offset:2px}' +
      '.v iframe{width:100%;height:100%;border:0;display:block}' +
      '.t{padding:8px 10px 10px;display:flex;flex-direction:column;gap:2px;flex:1}' +
      '.t b{font-size:14px;line-height:1.25}.t small{color:' + mute + ';font-size:12px}' +
      '.t a{margin-top:auto;padding-top:6px;color:' + accent + ';font-size:13px;font-weight:600;text-decoration:none}.t a:hover{text-decoration:underline}' +
      '.f{margin-top:12px;font-size:12px;color:' + mute + ';text-align:right}.f a{color:' + mute + '}' +
      '.e{color:' + mute + ';font-size:13px}';
  }
  function render(el) {
    if (el.__imn) return; el.__imn = 1;
    var spec = el.getAttribute('data-imn-widget') || '', parts = spec.split('/');
    if (parts[0] !== BRAND || !parts[1]) { el.__imn = 0; return; }
    var w = parts[1], id = (el.getAttribute('data-id') || 'unknown').slice(0, 60);
    var root = el.shadowRoot || (el.attachShadow ? el.attachShadow({ mode: 'open' }) : el);
    data(w).then(function (d) {
      var wd = d.widget, max = Math.min(24, Math.max(1, parseInt(el.getAttribute('data-max'), 10) || wd.defaults.max));
      var accent = hex.test(el.getAttribute('data-accent') || '') ? el.getAttribute('data-accent') : d.brand.accent;
      var dark = (el.getAttribute('data-theme') || 'dark') !== 'light';
      var byId = {}; wd.items.forEach(function (it) { byId[it.id] = it; });
      var pick = (el.getAttribute('data-items') || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return byId[s]; });
      if (!pick.length) {
        var gid = el.getAttribute('data-group') || wd.defaults.group, g = (wd.groups || []).filter(function (x) { return x.id === gid; })[0];
        pick = g ? g.items : wd.items.map(function (x) { return x.id; });
      }
      var items = pick.slice(0, max).map(function (k) { return byId[k]; }).filter(Boolean);
      var title = el.getAttribute('data-title') || wd.defaults.title;
      root.innerHTML = '<style>' + css(accent, dark) + '</style><div class="w" part="widget">' +
        (title ? '<h2>' + esc(title) + '</h2>' : '') +
        '<div class="g">' + items.map(function (it) {
          return '<div class="c">' +
            (it.youtube ? '<button class="v" type="button" data-yt="' + esc(it.youtube) + '" data-i="' + esc(it.id) + '" aria-label="Play the ' + esc(it.title) + ' trailer"><img loading="lazy" alt="" src="' + esc(it.image) + '"><span></span></button>'
              : (it.image ? '<div class="v"><img loading="lazy" alt="" src="' + esc(it.image) + '"></div>' : '')) +
            '<div class="t"><b>' + esc(it.title) + '</b>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') +
            '<a href="' + esc(link(it.href, w, id)) + '" target="_blank" rel="noopener" data-i="' + esc(it.id) + '">' + esc(it.cta || 'More') + ' &rarr;</a></div></div>';
        }).join('') + '</div>' +
        '<div class="f">' + esc(wd.credit) + ' <a href="' + esc(link('/', w, id)) + '" target="_blank" rel="noopener">' + esc(NAME) + '</a></div></div>';
      root.querySelectorAll('[data-yt]').forEach(function (b) {
        b.addEventListener('click', function () {
          var f = document.createElement('iframe');
          f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.getAttribute('data-yt')) + '?autoplay=1&rel=0';
          f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.title = b.getAttribute('aria-label');
          var holder = document.createElement('div'); holder.className = 'v'; holder.appendChild(f);
          b.parentNode.replaceChild(holder, b);
          track(w, id, 'play', b.getAttribute('data-i'));
        }, { once: true });
      });
      root.querySelectorAll('.t a').forEach(function (a) { a.addEventListener('click', function () { track(w, id, 'click', a.getAttribute('data-i')); }); });
      var seen = false;
      function view() { if (!seen) { seen = true; track(w, id, 'view'); } }
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { view(); io.disconnect(); } }); }, { threshold: 0.3 });
        io.observe(el);
      } else view();
    }).catch(function () { root.innerHTML = '<p class="e" style="font:13px system-ui;color:#888">' + esc(NAME) + ' widget is unavailable right now.</p>'; el.__imn = 0; });
  }
  function scan() { document.querySelectorAll('[data-imn-widget^="' + BRAND + '/"]').forEach(render); }
  window.imnWidgets = window.imnWidgets || {}; window.imnWidgets[BRAND] = { refresh: function (el) { if (el) { el.__imn = 0; render(el); } else scan(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();
`;
}
