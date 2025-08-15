// js/portfolio.js
(async function () {
  // Estado y refs
  const STATE = { filter: 'all', page: 1, pageSize: 8 };
  const grid    = document.getElementById('pf-grid');
  const pager   = document.getElementById('pf-pager');
  const filters = document.getElementById('pf-filters');

  // Overlay (detalle)
  const detail   = document.getElementById('pf-detail');
  const closeBtn = detail.querySelector('.pf-close');
  const titleEl  = document.getElementById('pf-title');
  const descEl   = document.getElementById('pf-desc');
  const tagsEl   = document.getElementById('pf-tags');
  const videoEl  = document.getElementById('pf-video');
  const reelEl   = document.getElementById('pf-reel');
  const galEl    = document.getElementById('pf-gallery');

  // ---------------------------
  // Cargar índice maestro
  // ---------------------------
  const idx = await fetch('portfolio/index.json')
    .then(r => r.json())
    .catch(() => ({ projects: [] }));

  // Cargar cada project.json
  const projects = [];
  for (const item of idx.projects) {
    try {
      const base = item.path.replace(/\/$/, '');
      const data = await fetch(`${base}/project.json`).then(r => r.json());
      projects.push({ ...data, base });
    } catch (e) {
      console.warn('No pude cargar', item.path, e);
    }
  }

  // Mapa legible de categorías
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

  // Utilidades de categorías (múltiples)
  function catsOf(p) {
    if (Array.isArray(p.categories)) return p.categories;
    if (typeof p.category === 'string' && p.category) return [p.category];
    return [];
  }
  function inCat(p, cat) { return catsOf(p).includes(cat); }

  // Filtrado
  function filtered() {
    return STATE.filter === 'all' ? projects : projects.filter(p => inCat(p, STATE.filter));
  }

  // Render general
  function render() {
    renderCards();
    renderPager();
  }

  // Tarjetas
  function renderCards() {
    grid.innerHTML = '';
    const list  = filtered();
    const start = (STATE.page - 1) * STATE.pageSize;
    const end   = start + STATE.pageSize;

    list.slice(start, end).forEach(p => {
      const cats    = catsOf(p);
      const catText = cats.map(c => label(c)).join(' • ');

      const card = document.createElement('div');
      card.className = 'pf-card';

      // Guarda todas las categorías
      card.setAttribute('data-category', cats.join(' '));
      card.dataset.categories = cats.join(' ');

      card.innerHTML = `
        <img class="pf-thumb" src="${p.base}/cover.jpg" alt="${p.title}">
        <div class="pf-meta">
          <div class="pf-cat">${catText}</div>
          <div class="pf-title">${p.title}</div>
        </div>`;
      card.onclick = () => openDetail(p);
      grid.appendChild(card);
    });
  }

  // Paginación
  function renderPager() {
    const list  = filtered();
    const pages = Math.max(1, Math.ceil(list.length / STATE.pageSize));
    STATE.page = Math.min(STATE.page, pages);

    pager.innerHTML = '';

    const prev = document.createElement('button');
    prev.textContent = 'Prev';
    prev.disabled = STATE.page === 1;
    prev.onclick = () => { STATE.page--; render(); };
    pager.appendChild(prev);

    const win = 3;
    let a = Math.max(1, STATE.page - win), b = Math.min(pages, STATE.page + win);
    for (let i = a; i <= b; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === STATE.page) btn.classList.add('active');
      btn.onclick = () => { STATE.page = i; render(); };
      pager.appendChild(btn);
    }

    const next = document.createElement('button');
    next.textContent = 'Next';
    next.disabled = STATE.page === pages;
    next.onclick = () => { STATE.page++; render(); };
    pager.appendChild(next);
  }

  // Detalle (overlay)
  function openDetail(p) {
    titleEl.textContent = p.title;
    descEl.textContent  = p.description || '';
    tagsEl.innerHTML    = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

    // Video YouTube 16:9
    if (p.video) {
      const src = toEmbedYouTube(p.video);
      videoEl.innerHTML = `<div class="ratio-16x9"><iframe src="${src}" allowfullscreen loading="lazy"></iframe></div>`;
    } else {
      videoEl.innerHTML = '';
    }

    // Reel (YouTube Shorts o Instagram) 9:16
    //renderReel(p.reel || '');
    
    // Reel (YouTube Shorts o Instagram) 16:9
    if (p.reel) {
  const src = toEmbedReel(p.reel); // tu función que construye el embed de Shorts
  reelEl.innerHTML =
    `<div class="ratio ratio-16x9"><iframe src="${src}" allowfullscreen loading="lazy"></iframe></div>`;
} else {
  reelEl.innerHTML = '';
}


    // Galería 2×2
    const imgs = (p.images && p.images.length) ? p.images : [];
    galEl.innerHTML = imgs.map(fn => `<img src="${p.base}/${fn}" alt="${p.title}">`).join('');

    detail.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Cerrar overlay
  closeBtn.onclick = () => { detail.classList.add('hidden'); document.body.style.overflow = ''; };
  detail.addEventListener('click', e => { if (e.target === detail) closeBtn.click(); });

  // Filtros (tabs)
  filters.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    STATE.filter = e.target.getAttribute('data-filter');
    STATE.page = 1;
    [...filters.querySelectorAll('button')].forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    render();
  });

  // Helpers de embed
  function toEmbedYouTube(url) {
    try {
      let id = '';
      if (url.includes('youtu.be/')) {
        id = url.split('youtu.be/')[1].split(/[?&]/)[0];
      } else {
        const u = new URL(url);
        if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1].split('/')[0];
        else id = u.searchParams.get('v');
      }
      return `https://www.youtube.com/embed/${id}?rel=0`;
    } catch (e) { return url; }
  }

  function renderReel(url='') {
    if (!url) { reelEl.innerHTML = ''; return; }
    let html = '';
    if (/instagram\.com/i.test(url)) {
      const m = url.match(/instagram\.com\/(reel|p)\/([^/?#]+)/i);
      if (m) html = `<div class="ratio-9x16"><iframe src="https://www.instagram.com/${m[1]}/${m[2]}/embed" allowfullscreen loading="lazy"></iframe></div>`;
    } else {
      const src = toEmbedYouTube(url); // también sirve para Shorts
      html = `<div class="ratio-9x16"><iframe src="${src}" allowfullscreen loading="lazy"></iframe></div>`;
    }
    reelEl.innerHTML = html;
  }

  // Inicial
  render();
})();
