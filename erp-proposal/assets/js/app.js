/* ==========================================================================
   CanvasOne ERP proposal — rendering + interactions (vanilla JS, no deps)
   ========================================================================== */
(() => {
  'use strict';

  const P = window.PROPOSAL;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------------ */
  /*  Icons (stroke, 24×24)                                              */
  /* ------------------------------------------------------------------ */
  const ICONS = {
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    kanban: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    crane: '<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    cup: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  };
  const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ------------------------------------------------------------------ */
  /*  Language                                                           */
  /* ------------------------------------------------------------------ */
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang') || localStorage.getItem('c1-lang') || 'ar';
  if (!['ar', 'en'].includes(lang)) lang = 'ar';

  const t = (v) => (v && typeof v === 'object' && ('ar' in v || 'en' in v) ? v[lang] ?? v.ar : v ?? '');
  const get = (path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), P);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n, opts) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', opts).format(n);
  const pad2 = (n) => (lang === 'ar' ? num(n, { minimumIntegerDigits: 2 }) : String(n).padStart(2, '0'));
  const moduleById = (id) => P.modules.find((m) => m.id === id);

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */
  const state = {
    module: 0,
    sector: 0,
    market: 0,
    compare: 'after',
    builder: { market: 'both', size: 'm', deploy: 'cloud', sector: 'retail', modules: new Set(['finance', 'einvoice', 'bi', ...P.sectors[0].modules]) },
  };

  /* ------------------------------------------------------------------ */
  /*  Static text binding                                                */
  /* ------------------------------------------------------------------ */
  function bindText() {
    $$('[data-t]').forEach((el) => {
      const v = t(get(el.dataset.t));
      if (el.classList.contains('split')) splitWords(el, v);
      else el.textContent = v;
    });
    $$('[data-t-title]').forEach((el) => {
      const v = t(get(el.dataset.tTitle));
      el.title = v;
      el.setAttribute('aria-label', v);
    });
    $$('[data-icon]').forEach((el) => {
      if (!el.querySelector('.ico')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
    });
  }

  function splitWords(el, text) {
    el.innerHTML = text
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`)
      .join(' ');
  }

  /* ------------------------------------------------------------------ */
  /*  Renderers                                                          */
  /* ------------------------------------------------------------------ */
  function renderHero() {
    $('#heroChips').innerHTML = P.hero.chips.map((c) => `<li>${icon('check')}${esc(t(c))}</li>`).join('');

    $('#dashKpis').innerHTML = P.hero.dash.kpis
      .map((k) => {
        const down = k.trend < 0;
        const trend = num(k.trend / 100, { style: 'percent', signDisplay: 'always', minimumFractionDigits: 1 });
        return `<div class="kpi"><p class="kpi__label">${esc(t(k.label))}</p>
          <p class="kpi__value" data-count="${k.value}" data-suffix="${esc(t(k.suffix))}" data-decimals="${String(k.value).includes('.') ? 1 : 0}">0</p>
          <span class="kpi__trend ${down ? 'down' : 'up'}">${trend}</span></div>`;
      })
      .join('');

    const inv = [
      ['INV-2041', true],
      ['INV-2040', true],
      ['INV-2039', false],
    ];
    $('#dashInv').innerHTML = inv
      .map(([no, ok]) => `<li><span class="inv__no">${no}</span><span class="inv__st ${ok ? '' : 'is-pending'}">${ok ? icon('check') : icon('clock')}${ok ? esc(t(P.hero.dash.cleared)) : '…'}</span></li>`)
      .join('');

    // chart bars (static shape)
    const bars = [38, 52, 46, 64, 58, 76, 70, 88, 82, 98];
    $('.chart__bars').innerHTML = bars
      .map((h, i) => `<rect x="${i * 30 + 6}" y="${120 - h}" width="18" height="${h}" rx="4" style="transition-delay:${0.4 + i * 0.06}s"/>`)
      .join('');
  }

  function renderStats() {
    $('#stats').innerHTML = P.stats
      .map((s) => {
        const prefix = s.prefix ? (lang === 'ar' ? s.prefix.replace(/\d/g, (d) => num(+d)) : s.prefix) : '';
        return `<div class="stat"><span class="stat__num">${prefix}<span data-count="${s.value}">0</span>${s.suffix || ''}</span><p class="stat__label">${esc(t(s.label))}</p></div>`;
      })
      .join('');
  }

  function renderMarquee() {
    const items = P.modules.map((m) => `<span class="marquee__item">${icon(m.icon)}${esc(t(m.name))}</span>`).join('');
    $('#marquee').innerHTML = items + items;
  }

  function renderChallenge() {
    $('#pains').innerHTML = P.challenge.pains
      .map(
        (p, i) => `<article class="card glass" data-reveal data-tilt style="--d:${i * 0.08}s">
          <span class="card__num">${pad2(i + 1)}</span>
          <div class="card__icon">${icon(p.icon)}</div>
          <h3>${esc(t(p.title))}</h3><p>${esc(t(p.text))}</p></article>`
      )
      .join('');
    renderCompare(false);
  }

  function renderCompare(animate = true) {
    const list = $('#compareList');
    const sw = $('#compareSwitch');
    const mode = state.compare;
    sw.dataset.mode = mode;
    $$('button', sw).forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
    });
    const draw = () => {
      list.dataset.mode = mode;
      list.innerHTML = P.challenge.compare.rows
        .map((r) => `<li><span class="mark">${icon(mode === 'after' ? 'check' : 'x')}</span><span class="txt">${esc(t(r[mode]))}</span></li>`)
        .join('');
    };
    if (!animate || reduceMotion) return draw();
    list.classList.add('is-swapping');
    setTimeout(() => {
      draw();
      list.classList.add('is-swapping');
      requestAnimationFrame(() => requestAnimationFrame(() => list.classList.remove('is-swapping')));
    }, 260);
  }

  function renderPlatform() {
    $('#platformPoints').innerHTML = P.platform.points.map((p) => `<li>${icon('check')}<span>${esc(t(p))}</span></li>`).join('');
    const n = P.modules.length;
    $('#orbitSpin').innerHTML = P.modules
      .map((m, i) => `<div class="orbit__node"><span style="--a:${(360 / n) * i}deg" data-tip="${esc(t(m.name))}">${icon(m.icon)}</span></div>`)
      .join('');
  }

  function renderModules() {
    $('#modGrid').innerHTML = P.modules
      .map(
        (m, i) => `<button class="mod-btn" role="tab" type="button" data-i="${i}" aria-selected="${i === state.module}" aria-controls="modPanel">
          <span class="mod-btn__idx">${pad2(i + 1)}</span>
          <span class="mod-btn__ico">${icon(m.icon)}</span>
          <span class="mod-btn__name">${esc(t(m.name))}</span></button>`
      )
      .join('');
    renderModulePanel(false);

    $('#modPrint').innerHTML = P.modules
      .map((m) => `<div class="pm"><h3>${esc(t(m.name))}</h3><p>${esc(t(m.desc))}</p><ul>${m.features.map((f) => `<li>${esc(t(f))}</li>`).join('')}</ul></div>`)
      .join('');
  }

  function renderModulePanel(animate = true) {
    const m = P.modules[state.module];
    $$('.mod-btn').forEach((b, i) => {
      b.classList.toggle('is-active', i === state.module);
      b.setAttribute('aria-selected', i === state.module);
      b.tabIndex = i === state.module ? 0 : -1;
    });
    const panel = $('#modPanel');
    panel.innerHTML = `<div class="${animate ? 'mp-anim' : ''}">
      <div class="mp__top"><span class="mp__icon">${icon(m.icon)}</span>
        <span class="mp__count"><b>${pad2(state.module + 1)}</b> / ${pad2(P.modules.length)}</span></div>
      <h3 class="mp__name">${esc(t(m.name))}</h3>
      <p class="mp__desc">${esc(t(m.desc))}</p>
      <ul class="mp__features">${m.features.map((f, i) => `<li style="--i:${i}">${icon('check')}<span>${esc(t(f))}</span></li>`).join('')}</ul>
      <div class="mp__outcome">${icon('award')}<div><small>${esc(t(P.modulesSection.outcomeLabel))}</small><strong>${esc(t(m.outcome))}</strong></div></div>
    </div>`;
  }

  function renderSectors() {
    $('#sectorTabs').innerHTML =
      P.sectors
        .map((s, i) => `<button class="tab" role="tab" type="button" data-i="${i}" aria-selected="${i === state.sector}">${icon(s.icon)}<span>${esc(t(s.name))}</span></button>`)
        .join('') + '<span class="tabs__ind" aria-hidden="true"></span>';
    renderSectorPanel(false);
  }

  function renderSectorPanel(animate = true) {
    const s = P.sectors[state.sector];
    const S = P.sectorsSection;
    $$('#sectorTabs .tab').forEach((b, i) => {
      b.classList.toggle('is-active', i === state.sector);
      b.setAttribute('aria-selected', i === state.sector);
    });
    moveIndicator();
    const panel = $('#sectorPanel');
    panel.classList.remove('sector-anim');
    panel.innerHTML = `
      <div class="sector__col sector__col--pain">
        <h3 class="sector__name">${icon(s.icon)}${esc(t(s.name))}</h3>
        <h4><i></i>${esc(t(S.painLabel))}</h4><p>${esc(t(s.pain))}</p>
      </div>
      <div class="sector__col sector__col--fix"><h4><i></i>${esc(t(S.fixLabel))}</h4><p>${esc(t(s.fix))}</p></div>
      <div class="sector__col sector__col--mods"><h4><i></i>${esc(t(S.modulesLabel))}</h4>
        <div class="pill-list">${s.modules.map((id) => { const m = moduleById(id); return `<span class="pill">${icon(m.icon)}${esc(t(m.name))}</span>`; }).join('')}</div>
      </div>`;
    if (animate) { void panel.offsetWidth; panel.classList.add('sector-anim'); }
  }

  function moveIndicator() {
    const wrap = $('#sectorTabs');
    const active = $('.tab.is-active', wrap);
    const ind = $('.tabs__ind', wrap);
    if (!active || !ind) return;
    ind.style.width = active.offsetWidth + 'px';
    ind.style.height = active.offsetHeight + 'px';
    ind.style.left = active.offsetLeft + 'px';
    ind.style.top = active.offsetTop + 'px';
  }

  function renderCompliance() {
    const C = P.compliance;
    $('#marketSwitch').innerHTML =
      C.markets.map((m, i) => `<button type="button" role="tab" data-i="${i}" aria-selected="${i === state.market}"><b>${m.flag}</b><small>${esc(t(m.name))}</small></button>`).join('') +
      '<span class="ms-thumb" aria-hidden="true"></span>';
    renderMarket();
  }

  function renderMarket() {
    const m = P.compliance.markets[state.market];
    const sw = $('#marketSwitch');
    sw.dataset.m = state.market;
    $$('button', sw).forEach((b, i) => {
      b.classList.toggle('is-active', i === state.market);
      b.setAttribute('aria-selected', i === state.market);
    });
    $('#complianceHeadline').innerHTML = `${icon('shield')}<span>${esc(t(m.headline))}</span>`;
    $('#complianceGrid').innerHTML = m.items
      .map((it, i) => `<div class="c-item" style="--i:${i}"><span class="c-item__n">${pad2(i + 1)}</span><h3>${esc(t(it.title))}</h3><p>${esc(t(it.text))}</p></div>`)
      .join('');
  }

  function renderTech() {
    $('#techGrid').innerHTML = P.tech.items
      .map((it, i) => `<article class="card glass" data-reveal data-tilt style="--d:${(i % 3) * 0.08}s"><div class="card__icon">${icon(it.icon)}</div><div><h3>${esc(t(it.title))}</h3><p>${esc(t(it.text))}</p></div></article>`)
      .join('');
  }

  function renderJourney() {
    const rail = '<span class="timeline__rail"><i id="timelineFill"></i></span>';
    $('#timeline').innerHTML =
      rail +
      P.journey.steps
        .map(
          (s, i) => `<li class="step" data-reveal>
            <span class="step__dot">${pad2(i + 1)}</span>
            <div class="step__card card glass" data-tilt style="grid-column:${i % 2 ? 2 : 1}">
              <span class="step__time">${icon('clock')}${esc(t(s.time))}</span>
              <h3>${esc(t(s.title))}</h3><p>${esc(t(s.text))}</p>
              <p class="step__deliv">${icon('flag')}<span>${esc(t(s.deliverable))}</span></p>
            </div></li>`
        )
        .join('');
  }

  function renderWhy() {
    $('#pillars').innerHTML = P.why.pillars
      .map(
        (p, i) => `<article class="card glass" data-reveal data-tilt style="--d:${i * 0.1}s">
          <span class="card__big">${pad2(i + 1)}</span>
          <div class="card__icon">${icon(p.icon)}</div><h3>${esc(t(p.title))}</h3><p>${esc(t(p.text))}</p></article>`
      )
      .join('');
    $('#promises').innerHTML = P.why.promises.map((p) => `<li>${icon('check')}<span>${esc(t(p))}</span></li>`).join('');
  }

  /* ----- Builder ----- */
  function renderBuilder() {
    const B = P.builder;
    const seg = (el, opts, key) => {
      $(el).innerHTML = opts.map((o) => `<button type="button" data-k="${key}" data-v="${o.id}" aria-pressed="${state.builder[key] === o.id}">${esc(t(o.label))}</button>`).join('');
    };
    seg('#bMarket', B.marketOpts, 'market');
    seg('#bSize', B.sizeOpts, 'size');
    seg('#bDeploy', B.deployOpts, 'deploy');
    $('#bSector').innerHTML = P.sectors
      .map((s) => `<button type="button" data-k="sector" data-v="${s.id}" aria-pressed="${state.builder.sector === s.id}">${icon(s.icon)}${esc(t(s.name))}</button>`)
      .join('');
    $('#bModules').innerHTML = P.modules
      .map((m) => `<button type="button" data-k="modules" data-v="${m.id}" aria-pressed="${state.builder.modules.has(m.id)}">${icon(m.icon)}${esc(t(m.name))}</button>`)
      .join('');
    renderSummary();
  }

  function estimateWeeks() {
    const n = state.builder.modules.size;
    const sizeAdd = { s: 0, m: 1, l: 3, xl: 5 }[state.builder.size];
    const marketAdd = state.builder.market === 'both' ? 1 : 0;
    const deployAdd = state.builder.deploy === 'onprem' ? 1 : 0;
    const low = Math.max(4, Math.round(3 + n * 0.55 + sizeAdd + marketAdd + deployAdd));
    const high = low + Math.max(2, Math.round(n * 0.3 + sizeAdd / 2));
    return [low, high];
  }

  function summaryText() {
    const B = P.builder;
    const b = state.builder;
    const label = (opts, id) => t(opts.find((o) => o.id === id).label);
    const sector = P.sectors.find((s) => s.id === b.sector);
    const [lo, hi] = estimateWeeks();
    const mods = [...b.modules].map((id) => '• ' + t(moduleById(id).name)).join('\n');
    return [
      `${t(B.mailSubject)}`,
      '',
      `${t(B.marketQ)}: ${label(B.marketOpts, b.market)}`,
      `${t(B.sizeQ)}: ${label(B.sizeOpts, b.size)}`,
      `${t(B.deployQ)}: ${label(B.deployOpts, b.deploy)}`,
      `${t(B.sectorQ)}: ${t(sector.name)}`,
      `${t(B.timeline)}: ${num(lo)}–${num(hi)} ${counted(hi, B.weeks, B.weeksFew)}`,
      '',
      `${t(B.modulesQ)} (${num(b.modules.size)}):`,
      mods,
    ].join('\n');
  }

  // Arabic counted nouns: 3–10 take the plural, 11+ the singular
  const counted = (n, many, few, one) => (n === 1 && one ? t(one) : lang === 'ar' && n >= 2 && n <= 10 ? t(few) : t(many));

  function renderSummary() {
    const B = P.builder;
    const b = state.builder;
    const label = (opts, id) => t(opts.find((o) => o.id === id).label);
    const sector = P.sectors.find((s) => s.id === b.sector);
    const [lo, hi] = estimateWeeks();
    const brand = P.brand;
    const wa = brand.whatsapp
      ? `<a class="btn btn--glass" target="_blank" rel="noopener" href="https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(summaryText())}">${icon('chat')}<span>${esc(t(B.whatsapp))}</span></a>`
      : '';
    $('#builderSummary').innerHTML = `
      <h3 class="bs__title"><span>${esc(t(B.summaryTitle))}</span><span class="bs__count">${num(b.modules.size)} ${esc(counted(b.modules.size, B.selected, B.selectedFew, B.selectedOne))}</span></h3>
      <div class="bs__rows">
        <div class="bs__row"><span>${esc(t(B.marketQ))}</span><span>${esc(label(B.marketOpts, b.market))}</span></div>
        <div class="bs__row"><span>${esc(t(B.sizeQ))}</span><span>${esc(label(B.sizeOpts, b.size))}</span></div>
        <div class="bs__row"><span>${esc(t(B.deployQ))}</span><span>${esc(label(B.deployOpts, b.deploy))}</span></div>
        <div class="bs__row"><span>${esc(t(B.sectorQ))}</span><span>${esc(t(sector.name))}</span></div>
      </div>
      <div class="bs__mods">${[...b.modules].map((id) => `<span>${esc(t(moduleById(id).name))}</span>`).join('')}</div>
      <div class="bs__time"><small>${esc(t(B.timeline))}</small><span><b>${num(lo)}–${num(hi)}</b><em>${esc(counted(hi, B.weeks, B.weeksFew))}</em></span></div>
      <div class="bs__actions">
        <a class="btn btn--primary magnetic" id="sendMail" href="${mailHref()}">${icon('mail')}<span>${esc(t(B.send))}</span></a>
        ${wa}
        <button class="btn btn--glass" type="button" id="copySummary">${icon('copy')}<span>${esc(t(B.copy))}</span></button>
      </div>
      <p class="bs__note">${esc(t(B.note))}</p>`;
  }

  const mailHref = () => `mailto:${P.brand.email}?subject=${encodeURIComponent(t(P.builder.mailSubject))}&body=${encodeURIComponent(summaryText())}`;

  function renderFaq() {
    $('#faqList').innerHTML = P.faq
      .map(
        (f, i) => `<div class="faq__item${i === 0 ? ' is-open' : ''}" data-reveal style="--d:${i * 0.05}s">
          <button class="faq__q" type="button" aria-expanded="${i === 0}" aria-controls="faq-a-${i}" id="faq-q-${i}"><span>${esc(t(f.q))}</span><span class="pm" aria-hidden="true"></span></button>
          <div class="faq__a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${esc(t(f.a))}</p></div></div></div>`
      )
      .join('');
  }

  function renderClosing() {
    const b = P.brand;
    const items = [`<a href="${b.websiteUrl}" target="_blank" rel="noopener">${icon('globe')}${esc(b.website)}</a>`, `<a href="mailto:${b.email}">${icon('mail')}${esc(b.email)}</a>`];
    if (b.whatsapp) items.push(`<a href="https://wa.me/${b.whatsapp}" target="_blank" rel="noopener">${icon('chat')}+${esc(b.whatsapp)}</a>`);
    $('#closingContact').innerHTML = items.join('');
    $('#footerYear').textContent = lang === 'ar' ? num(b.year, { useGrouping: false }) : b.year;
    $$('.js-book').forEach((a) => {
      a.href = b.bookingUrl || `mailto:${b.email}?subject=${encodeURIComponent(t(P.hero.primary))}`;
      if (b.bookingUrl) { a.target = '_blank'; a.rel = 'noopener'; }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Render all                                                         */
  /* ------------------------------------------------------------------ */
  function renderAll() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' ? 'CanvasOne ERP · عرض Code & Canvas' : 'CanvasOne ERP — Code & Canvas proposal';
    bindText();
    renderHero();
    renderStats();
    renderMarquee();
    renderChallenge();
    renderPlatform();
    renderModules();
    renderSectors();
    renderCompliance();
    renderTech();
    renderJourney();
    renderWhy();
    renderBuilder();
    renderFaq();
    renderClosing();
    observeReveals();
    bindTilt();
    bindMagnetic();
  }

  /* ------------------------------------------------------------------ */
  /*  Effects                                                            */
  /* ------------------------------------------------------------------ */
  let revealIO;
  function observeReveals() {
    if (!revealIO) {
      revealIO = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add('is-in');
            $$('[data-count]', e.target).forEach(countUp);
            revealIO.unobserve(e.target);
          }),
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
    }
    $$('[data-reveal]:not(.is-in)').forEach((el) => revealIO.observe(el));
    // counters outside reveal wrappers
    if (!countIO) {
      countIO = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); } }), { threshold: 0.4 });
    }
    $$('#stats [data-count], #dashKpis [data-count]').forEach((el) => countIO.observe(el));
  }
  let countIO;

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    const fmt = (v) => num(v, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const dur = 1600 + Math.min(target, 2000) * 0.2;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(dec ? target * e : Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function bindTilt() {
    if (!finePointer || reduceMotion) return;
    $$('[data-tilt]:not([data-tilt-bound])').forEach((el) => {
      el.dataset.tiltBound = '1';
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function bindMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('.magnetic:not([data-mag])').forEach((el) => {
      el.dataset.mag = '1';
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function bindGlobalEffects() {
    const glow = $('#cursorGlow');
    const dash = $('#dash');
    const chips = $$('.float-chip');
    if (finePointer && !reduceMotion) {
      document.body.classList.add('has-pointer');
      let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my;
      addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
      const loop = () => {
        gx += (mx - gx) * 0.12;
        gy += (my - gy) * 0.12;
        glow.style.transform = `translate3d(${gx - 260}px, ${gy - 260}px, 0)`;
        // hero parallax
        const nx = mx / innerWidth - 0.5, ny = my / innerHeight - 0.5;
        if (scrollY < innerHeight) {
          const base = document.documentElement.dir === 'rtl' ? 8 : -8;
          dash.style.setProperty('--ry', `${base + nx * 10}deg`);
          dash.style.setProperty('--rx', `${6 - ny * 8}deg`);
          chips.forEach((c) => { const d = +c.dataset.depth || 1; c.style.transform = `translate(${nx * 18 * d}px, ${ny * 18 * d}px)`; });
        }
        requestAnimationFrame(loop);
      };
      loop();
    }

    // Scroll: progress, nav, timeline, active links
    const nav = $('#nav');
    const bar = $('#scrollProgress');
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h > 0 ? scrollY / h : 0;
      bar.style.transform = `scaleX(${p})`;
      nav.classList.toggle('is-scrolled', scrollY > 20);

      const tl = $('#timeline');
      const fill = $('#timelineFill');
      if (tl && fill) {
        const r = tl.getBoundingClientRect();
        const prog = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
        fill.style.transform = `scaleY(${prog})`;
        $$('.step', tl).forEach((s) => {
          const sr = $('.step__dot', s).getBoundingClientRect();
          s.classList.toggle('is-lit', sr.top < innerHeight * 0.6);
        });
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Safety net: never leave content hidden if the observer misses a fast jump
    let sweepT = 0;
    const sweep = () => {
      sweepT = 0;
      if (!document.body.classList.contains('is-ready')) return;
      $$('[data-reveal]:not(.is-in)').forEach((el) => {
        if (el.getBoundingClientRect().top < innerHeight * 0.92) {
          el.classList.add('is-in');
          $$('[data-count]', el).forEach(countUp);
        }
      });
    };
    addEventListener('scroll', () => { if (!sweepT) sweepT = setTimeout(sweep, 180); }, { passive: true });

    const links = $$('#navLinks a');
    const secIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
      }),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) secIO.observe(s); });

    addEventListener('resize', () => moveIndicator(), { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /*  Event delegation                                                   */
  /* ------------------------------------------------------------------ */
  function bindEvents() {
    // Language
    $('#langBtn').addEventListener('click', () => {
      const next = lang === 'ar' ? 'en' : 'ar';
      document.body.classList.add('is-switching');
      setTimeout(() => {
        lang = next;
        localStorage.setItem('c1-lang', lang);
        const url = new URL(location.href);
        url.searchParams.set('lang', lang);
        history.replaceState(null, '', url);
        renderAll();
        $$('[data-reveal]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
        });
        requestAnimationFrame(() => { document.body.classList.remove('is-switching'); moveIndicator(); });
      }, 280);
    });

    $('#printBtn').addEventListener('click', () => {
      $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      window.print();
    });

    // Mobile menu
    const burger = $('#burger');
    const links = $('#navLinks');
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', open);
      links.classList.toggle('is-open', open);
    });
    links.addEventListener('click', (e) => { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); links.classList.remove('is-open'); } });

    // Compare
    $('#compareSwitch').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.dataset.mode === state.compare) return;
      state.compare = b.dataset.mode;
      renderCompare();
    });

    // Modules
    const grid = $('#modGrid');
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.mod-btn');
      if (!b) return;
      state.module = +b.dataset.i;
      renderModulePanel();
      if (innerWidth <= 1024) $('#modPanel').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    });
    grid.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      let d = keys[e.key];
      if (document.documentElement.dir === 'rtl' && Math.abs(d) === 1) d = -d;
      state.module = (state.module + d + P.modules.length) % P.modules.length;
      renderModulePanel();
      $$('.mod-btn')[state.module].focus();
    });

    // Sectors
    $('#sectorTabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      state.sector = +b.dataset.i;
      renderSectorPanel();
    });

    // Compliance
    $('#marketSwitch').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || +b.dataset.i === state.market) return;
      state.market = +b.dataset.i;
      renderMarket();
    });

    // Builder
    $('#builderForm').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      const { k, v } = b.dataset;
      const st = state.builder;
      if (k === 'modules') {
        if (st.modules.has(v)) { if (st.modules.size > 1) st.modules.delete(v); } else st.modules.add(v);
        b.setAttribute('aria-pressed', st.modules.has(v));
      } else {
        st[k] = v;
        $$(`button[data-k="${k}"]`).forEach((x) => x.setAttribute('aria-pressed', x.dataset.v === v));
        if (k === 'sector') {
          P.sectors.find((s) => s.id === v).modules.forEach((id) => st.modules.add(id));
          $$('button[data-k="modules"]').forEach((x) => x.setAttribute('aria-pressed', st.modules.has(x.dataset.v)));
        }
      }
      renderSummary();
      bindMagnetic();
    });
    $('#builderSummary').addEventListener('click', async (e) => {
      const b = e.target.closest('#copySummary');
      if (!b) return;
      try {
        await navigator.clipboard.writeText(summaryText());
      } catch {
        const ta = document.createElement('textarea');
        ta.value = summaryText();
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast(t(P.builder.copied));
    });

    // FAQ
    $('#faqList').addEventListener('click', (e) => {
      const q = e.target.closest('.faq__q');
      if (!q) return;
      const item = q.parentElement;
      const open = !item.classList.contains('is-open');
      $$('.faq__item').forEach((x) => { x.classList.remove('is-open'); $('.faq__q', x).setAttribute('aria-expanded', 'false'); });
      if (open) { item.classList.add('is-open'); q.setAttribute('aria-expanded', 'true'); }
    });
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                               */
  /* ------------------------------------------------------------------ */
  renderAll();
  bindEvents();
  bindGlobalEffects();

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    const pre = $('#preloader');
    pre.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    setTimeout(() => pre.remove(), 1200);
    moveIndicator();
  };
  const minDelay = reduceMotion ? 0 : 1700;
  const t0 = performance.now();
  const ready = () => setTimeout(finish, Math.max(0, minDelay - (performance.now() - t0)));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
  setTimeout(finish, 4000); // safety net
})();
