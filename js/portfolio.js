// js/portfolio.js
(async function () {
  // ---------- Estado ----------
  const STATE = {
    filter: 'all',
    page: 1,
    pageSize: 8,
  };

  // ---------- DOM ----------
  const grid    = document.getElementById('pf-grid');
  const pager   = document.getElementById('pf-pager');
  const filters = document.getElementById('pf-filters');

  // Overlay
  const detail   = document.getElementById('pf-detail');
  const closeBtn = detail?.querySelector('.pf-close');
  const titleEl  = document.getElementById('pf-title');
  const descEl   = document.getElementById('pf-desc');
  const tagsEl   = document.getElementById('pf-tags');
  const videoEl  = document.getElementById('pf-video');
  const reelEl   = document.getElementById('pf-reel');
  const galEl    = document.getElementById('pf-gallery');

  // ---------- Utilidades ----------
  function catsOf(p) {
    if (Array.isArray(p.categories) && p.categories.length) return p.categories;
    if (typeof p.category === 'string' && p.category.trim()) return [p.category.trim()];
    return [];
  }
  function inCat(p, cat) {
    return catsOf(p).includes(cat);
  }

  function label(id) {
    const map = {
      sheet_metal: 'Sheet Metal',
      molds_plastics: 'Plastic & Molded Parts',
      cnc_cam: 'CNC Parts & CAM',
      assemblies: 'Assemblies & Mechanisms',
      reverse_eng: 'Reverse Engineering',
      surfaces: 'Surface Modeling',
      product_enclosures: 'New Products / Enclosures',
      tooling_fixtures: 'Jigs, Fixtures & Tooling',
      mechatronics: 'Mechatronics (ESP32/PLC)',
      simulation: 'Simulation (FEA/Motion)',
      drawings_bom: 'Manufacturing Package',
      rendering: 'Rendering & Animation',
      prototyping: '3D Printing & Prototyping',
    };
    return map[id] || id;
  }
  function labelList(ids) {
    return ids.map(label).join(' • ');
  }

  // Videos (YouTube) -> embed
  function toYouTubeEmbed(url) {
    try {
      if (!url) return '';
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1].split(/[?&#]/)[0];
        return `https://www.youtube.com/embed/${id}?rel=0`;
      }
      const u = new URL(url);
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/shorts/')[1].split(/[/?#&]/)[0];
        return `https://www.youtube.com/embed/${id}?rel=0`;
      }
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : '';
    } catch {
      return '';
    }
  }

  // Reels (YouTube Shorts o Instagram) -> embed
  function toReelEmbed(url) {
    try {
      if (!url) return '';
      // Shorts / YouTube
      if (/youtube\.com\/shorts\//.test(url) || /youtu\.be\//.test(url)) {
        return toYouTubeEmbed(url);
      }
      // Instagram (post/reel); al pintar añadimos /embed si hace falta
      if (/instagram\.com/.test(url)) return url;
      return '';
    } catch {
      return '';
    }
  }

  // ---------- Carga de proyectos ----------
  const projects = [];
  try {
    const idx = await fetch('portfolio/index.json').then(r => r.json());
    for (const item of (idx.projects || [])) {
      const base = String(item.path || '').replace(/\/$/, '');
      if (!base) continue;
      try {
        const data = await fetch(`${base}/project.json`).then(r => r.json());
        projects.push({ ...data, base });
      } catch (e) {
        console.warn('No se pudo cargar project.json de', base, e);
      }
    }
  } catch (e) {
    console.warn('No pude cargar portfolio/index.json', e);
  }

  // ---------- Render base ----------
  function filtered() {
    if (STATE.filter === 'all') return projects;
    return projects.filter(p => inCat(p, STATE.filter));
  }

  function render() {
    renderCards();
    renderPager();
  }

  function renderCards() {
    grid.innerHTML = '';
    const list = filtered();
    const start = (STATE.page - 1) * STATE.pageSize;
    const end = start + STATE.pageSize;

    list.slice(start, end).forEach(p => {
      const card = document.createElement('div');
      card.className = 'pf-card';

      card.dataset.categories = catsOf(p).join(' ');
      const catText = labelList(catsOf(p));

      card.innerHTML = `
        <img class="pf-thumb" src="${p.base}/cover.jpg" alt="${p.title || ''}">
        <div class="pf-meta">
          <div class="pf-cat">${catText}</div>
          <div class="pf-title">${p.title || ''}</div>
        </div>
      `;
      card.onclick = () => openDetail(p);
      grid.appendChild(card);
    });
  }

  function renderPager() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / STATE.pageSize));
    STATE.page = Math.min(STATE.page, pages);

    pager.innerHTML = '';
    // Prev
    const prev = document.createElement('button');
    prev.textContent = 'Prev';
    prev.disabled = STATE.page === 1;
    prev.onclick = () => { STATE.page--; render(); };
    pager.appendChild(prev);

    // Números
    const W = 3;
    let a = Math.max(1, STATE.page - W);
    let b = Math.min(pages, STATE.page + W);
    for (let i = a; i <= b; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === STATE.page) btn.classList.add('active');
      btn.onclick = () => { STATE.page = i; render(); };
      pager.appendChild(btn);
    }

    // Next
    const next = document.createElement('button');
    next.textContent = 'Next';
    next.disabled = STATE.page === pages;
    next.onclick = () => { STATE.page++; render(); };
    pager.appendChild(next);
  }

  // ---------- Overlay ----------
  function openDetail(p) {
    if (!detail) return;

    // Título
    titleEl && (titleEl.textContent = p.title || '');

    // Descripción (HTML permitido con fallback)
    const desc = (p.description_html ?? p.description ?? '');
    if (descEl) descEl.innerHTML = String(desc).replace(/\n/g, '<br>');

    // Tags
    if (tagsEl) {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      tagsEl.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
    }

    // Video — 16:9
    if (videoEl) {
      const v = toYouTubeEmbed(p.video || '');
      videoEl.innerHTML = v
        ? `<div class="ratio ratio-16x9"><iframe src="${v}" allowfullscreen loading="lazy" title="Video"></iframe></div>`
        : '';
    }

    // Reel — también 16:9 (misma altura que el video)
    if (reelEl) {
      const r = toReelEmbed(p.reel || '');
      if (!r) {
        reelEl.innerHTML = '';
      } else if (/instagram\.com/.test(r)) {
        // Si el link no trae /embed, lo agregamos
        const src = /\/embed($|\?)/.test(r) ? r : `${r.replace(/\/?$/, '/') }embed`;
        reelEl.innerHTML = `
          <div class="ratio ratio-16x9">
            <iframe src="${src}" allowfullscreen loading="lazy" title="Reel"></iframe>
          </div>`;
      } else {
        // Shorts / YouTube
        reelEl.innerHTML = `
          <div class="ratio ratio-16x9">
            <iframe src="${r}" allowfullscreen loading="lazy" title="Reel"></iframe>
          </div>`;
      }
    }

    // Galería (2×2)
    if (galEl) {
      const imgs = Array.isArray(p.images) ? p.images : [];
      galEl.innerHTML = imgs
        .map(fn => `<img src="${p.base}/${fn}" alt="${p.title || ''}">`)
        .join('');
    }

    detail.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    if (!detail) return;
    detail.classList.add('hidden');
    document.body.style.overflow = '';
    if (videoEl) videoEl.innerHTML = '';
    if (reelEl)  reelEl.innerHTML  = '';
  }

  closeBtn && (closeBtn.onclick = closeDetail);
  detail && detail.addEventListener('click', (e) => {
    if (e.target === detail) closeDetail();
  });

  // ---------- Filtros ----------
  if (filters) {
    filters.addEventListener('click', (e) => {
      const b = e.target;
      if (!(b instanceof HTMLButtonElement)) return;
      STATE.filter = b.getAttribute('data-filter') || 'all';
      STATE.page = 1;
      [...filters.querySelectorAll('button')].forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      render();
    });
  }

  // ---------- Inicial ----------
  render();
})();
