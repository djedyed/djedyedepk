// DJ Eddie Ed — public EPK
// Renders instantly from content.json, then refreshes from Supabase (the live
// back office) when it is reachable. Booking inquiries go straight to Supabase.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let supabase = null;
async function getClient() {
  if (supabase) return supabase;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  return supabase;
}

// Only ever link out to http(s) addresses.
function safeUrl(url) {
  try {
    const u = new URL(url, location.href);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

function link(label, url) {
  const href = safeUrl(url);
  if (!href) return document.createTextNode(label);
  return el('a', { href, target: '_blank', rel: 'noopener', text: label });
}

const PROOF_LABEL = {
  third_party: 'Third-party record',
  artist_published: 'Artist-published',
  artist_stated: 'Artist-stated',
};

function render(data) {
  const p = data.profile || {};

  // simple text bindings
  for (const node of $$('[data-bind]')) {
    const key = node.dataset.bind;
    if (key === 'full_bio') {
      node.replaceChildren(...String(p.full_bio || '').split(/\n\s*\n/).filter(Boolean).map((t) => el('p', { text: t })));
    } else if (key === 'aka') {
      if (p.aka) node.textContent = `aka ${p.aka}`;
    } else if (key === 'generated_at') {
      const d = data.generated_at ? new Date(data.generated_at) : null;
      if (d && !isNaN(d)) node.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } else if (p[key]) {
      node.textContent = p[key];
    }
  }

  const links = data.links || [];
  const mixcloud = links.find((l) => l.kind === 'social' && /mixcloud\.com/.test(l.url));
  const booking = p.booking_url || links.find((l) => l.kind === 'booking')?.url;
  for (const a of $$('[data-bind-href]')) {
    const want = a.dataset.bindHref === 'mixcloud' ? mixcloud?.url : booking;
    const href = want && safeUrl(want);
    if (href) a.href = href;
  }

  // booking email (set in the back office); the page keeps its built-in address if none is set
  const mail = String(p.booking_email || '').trim();
  if (/^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']+$/.test(mail)) {
    for (const a of $$('[data-bind-mailto]')) {
      a.href = `mailto:${mail}`;
      a.textContent = `Email ${mail}`;
    }
  }

  // booking phone (set in the back office); the page keeps its built-in number if none is set
  const phone = String(p.booking_phone || '').trim();
  const dial = phone.replace(/[^\d+]/g, '');
  if (/^\+?\d{7,15}$/.test(dial)) {
    for (const a of $$('[data-bind-tel]')) {
      a.href = `tel:${dial}`;
      a.textContent = `Call ${phone}`;
    }
  }

  // press photo (uploaded from the back office)
  const photo = p.hero_image_url && safeUrl(p.hero_image_url);
  $('.press-photo').hidden = !photo;
  if (photo) $('[data-press-photo]').src = photo;

  // genres
  $('[data-list="genres"]').replaceChildren(...(p.genres || []).map((g) => el('li', { text: g })));

  // featured highlight (newest featured one)
  const highlights = [...(data.highlights || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const featured = highlights.filter((h) => h.featured).sort((a, b) => b.sort_year - a.sort_year)[0];
  const fBox = $('.featured');
  if (featured) {
    $('[data-featured="title"]').textContent = featured.title;
    $('[data-featured="meta"]').textContent = [featured.year_label, featured.detail].filter(Boolean).join(' — ');
    $('[data-featured="sources"]').replaceChildren(...sourceLinks(featured));
    fBox.hidden = false;
  } else {
    fBox.hidden = true;
  }

  // timeline
  $('[data-list="highlights"]').replaceChildren(
    ...highlights.map((h) =>
      el('li', { class: h.featured ? 'is-featured' : null },
        el('span', { class: 'year', text: h.year_label }),
        el('h3', { text: h.title }),
        h.detail ? el('p', { text: h.detail }) : null,
        h.venue || h.city ? el('p', { class: 'where', text: [h.venue, h.city].filter(Boolean).join(' · ') }) : null,
        el('p', { class: 'src' },
          el('span', { class: `tag tag-${h.proof_level}`, text: PROOF_LABEL[h.proof_level] || 'Source' }),
          ...sourceLinks(h)),
      )),
  );

  $('.legend-stated').hidden = !highlights.some((h) => h.proof_level === 'artist_stated');

  // mixes
  const mixes = links.filter((l) => l.kind === 'mix').sort((a, b) => a.sort_order - b.sort_order);
  $('[data-list="mixes"]').replaceChildren(...mixes.map(mixCard));

  // reviews
  $('[data-list="reviews"]').replaceChildren(
    ...(data.reviews || []).map((r) =>
      el('figure', {},
        el('blockquote', { text: `“${r.quote.replace(/^[“"]|[”"]$/g, '')}”` }),
        el('figcaption', {}, `— ${r.author}`, r.source_label ? ' · ' : '', r.source_label ? link(r.source_label, r.source_url) : null),
      )),
  );

  // rider
  $('[data-list="rider_bring"]').replaceChildren(...(p.rider_bring || []).map((t) => el('li', { text: t })));
  $('[data-list="rider_venue"]').replaceChildren(...(p.rider_venue || []).map((t) => el('li', { text: t })));

  // footer socials
  const social = links.filter((l) => l.kind === 'social' || l.kind === 'booking').sort((a, b) => a.sort_order - b.sort_order);
  $('[data-list="social"]').replaceChildren(...social.map((l) => el('li', {}, link(l.label, l.url))));
}

function sourceLinks(h) {
  const out = [];
  if (h.source_label && h.source_url) out.push(link(h.source_label, h.source_url));
  else if (h.source_label) out.push(document.createTextNode(h.source_label));
  if (h.source2_label && h.source2_url) out.push(link(h.source2_label, h.source2_url));
  return out;
}

function mixCard(m) {
  const card = el('article', { class: 'mix' }, el('h3', { text: m.label }), m.note ? el('p', { text: m.note }) : null);
  const href = safeUrl(m.url);
  if (href && new URL(href).hostname.endsWith('mixcloud.com')) {
    const feed = encodeURIComponent(new URL(href).pathname);
    card.append(el('iframe', {
      src: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&hide_artwork=0&feed=${feed}`,
      title: `Mixcloud player: ${m.label}`,
      loading: 'lazy',
      allow: 'encrypted-media; fullscreen; autoplay',
    }));
  } else if (href) {
    card.append(link('Listen →', href));
  }
  return card;
}

async function loadStatic() {
  const res = await fetch('content.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('content.json missing');
  return res.json();
}

async function loadLive() {
  const sb = await getClient();
  const [profile, highlights, links, reviews] = await Promise.all([
    sb.from('epk_profile').select('*').eq('id', 1).maybeSingle(),
    sb.from('epk_highlights').select('*').eq('is_published', true).order('sort_order'),
    sb.from('epk_links').select('*').eq('is_published', true).order('sort_order'),
    sb.from('epk_reviews').select('*').eq('is_published', true).order('sort_order'),
  ]);
  const err = profile.error || highlights.error || links.error || reviews.error;
  if (err || !profile.data) throw err || new Error('No profile yet');
  return {
    generated_at: profile.data.updated_at,
    profile: profile.data,
    highlights: highlights.data,
    links: links.data,
    reviews: reviews.data,
  };
}

async function boot() {
  try {
    render(await loadStatic());
  } catch (e) {
    console.warn('Static content unavailable', e);
  }
  try {
    render(await loadLive());
  } catch (e) {
    console.info('Live content not available yet; showing the static press kit.', e?.message || e);
  }
}

// ---------- booking inquiry ----------
function setupForm() {
  const form = $('#inquiry');
  const status = $('.form-status', form);
  const button = $('button[type="submit"]', form);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.className = 'form-status';
    const fd = new FormData(form);
    if (fd.get('website')) return; // honeypot: bots fill hidden fields

    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      status.textContent = 'Please add your name and a valid email.';
      status.classList.add('err');
      return;
    }
    const guests = fd.get('guests') ? Number(fd.get('guests')) : null;
    const row = {
      name,
      email,
      phone: String(fd.get('phone') || '').trim() || null,
      event_date: fd.get('event_date') || null,
      event_type: fd.get('event_type') || null,
      venue: String(fd.get('venue') || '').trim() || null,
      city: String(fd.get('city') || '').trim() || null,
      guests: Number.isFinite(guests) ? guests : null,
      budget: String(fd.get('budget') || '').trim() || null,
      message: String(fd.get('message') || '').trim() || null,
      source: 'epk-site',
    };

    button.disabled = true;
    status.textContent = 'Sending…';
    try {
      const sb = await getClient();
      const { error } = await sb.from('epk_inquiries').insert(row);
      if (error) throw error;
      form.reset();
      status.textContent = 'Thank you — your inquiry is in. DJ Eddie Ed will be in touch.';
      status.classList.add('ok');
    } catch (e) {
      console.error(e);
      status.textContent = 'That didn’t go through. Please use the Calendly button above to reach DJ Eddie Ed.';
      status.classList.add('err');
    } finally {
      button.disabled = false;
    }
  });
}

boot();
setupForm();
