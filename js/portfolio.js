<script>
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

  // Carga índice maestro
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
      'sheet_metal': 'Sheet Metal',
      'molds_plastics': 'Plastic & Molded Parts',
      'cnc_cam': 'CNC Parts & CAM',
      'assemblies': 'Assemblies & Mechanisms',
      'reverse_eng': 'Reverse Engineering',
      'surfaces': 'Surface Modeling',
      'product_enclosures': 'New Products / Enclosures',
      'tooling_fixtures': 'Jigs, Fixtures & Tooling',
      'mechatronics': 'Mechatronics (ESP32/PLC)',
      'simulation': 'Simulation (FEA/Motion)',
      'drawings_bom': 'Manufacturing Package',
      'rendering': 'Rendering & Animation',
      'prototyping': '3D Printing & Prototyping'
    };
    return map[id] || id;
  }

  // ---- utilidades de categorías (múltiples)
  function catsOf(p) {
    if (Array.isArray(p.categories)) return p.categories;
    if (typeof p.category === 'string' && p.category) return [p.category];
    return [];
  }
  function inCat(p, cat) { return catsOf(p).includes(cat); }

  // ---- filtrado y render
  function filtered() {
    return STATE.filter === 'all' ? projects : projects.filter(p => inCat(p, STATE.filter));
  }

  function render() { renderCards(); renderPager(); }

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
      // guarda todas las categorías para data-attributes
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
    let a = Math.max(1, STATE.page - win),
        b = Math.min(pages, STATE.page + win);
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

  // ---- detalle (overlay)
  function openDetail(p) {
    titleEl.textContent = p.title;
    descEl.textContent  = p.description || '';
    tagsEl.innerHTML    = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

    // YouTube (16:9)
    if (p.video) {
      const src = toEmbedYouTube(p.video);
      videoEl.innerHTML = `<div class="ratio-16x9"><iframe src="${src}" allowfullscreen loading="lazy"></iframe></div>`;
    } else {
      videoEl.innerHTML = '';
    }

    // Reel (Instagram o YouTube Shorts) — 9:16
    renderReel(p.reel || '');

    // Galería (2×2)
    const imgs = (p.images && p.images.length) ? p.images : [];
    galEl.innerHTML = imgs.map(fn => `<img src="${p.base}/${fn}" alt="${p.title}">`).join('');

    detail.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // ---- helpers de embed
  function toEmbedYouTube(url) {
    try {
      if (/youtu\.be\//.test(url)) {
        const id = url.split('youtu.be/')[1].split(/[?&]/)[0];
        return `https://www.youtube.com/embed/${id}?rel=0`;
      }
      if (/youtube\.com\/shorts\//.test(url)) {
        const id = url.split('/shorts/')[1].split(/[?&]/)[0];
        return `https://www.youtube.com/embed/${id}?rel=0`;
      }
      if (/youtube\.com/.test(url)) {
        const u = new URL(url);
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
      }
      return url;
    } catch (e) { return url; }
  }

  function ensureInstagramScript() {
    if (document.getElementById('ig-embed-js')) return;
    const s = document.createElement('script');
    s.id = 'ig-embed-js';
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    document.body.appendChild(s);
  }

  function renderReel(url) {
    reelEl.innerHTML = '';
    if (!url) return; // sin hueco

    // Instagram (la publicación debe ser pública)
    if (url.includes('instagram.com') || url.includes('instagr.am')) {
      reelEl.innerHTML = `
        <blockquote class="instagram-media"
                    data-instgrm-permalink="${url}"
                    data-instgrm-version="14"
                    style="background:#fff; border:0; margin:0 auto; max-width:540px; width:100%;">
        </blockquote>`;
      ensureInstagramScript();
      const tryProcess = () => {
        if (window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process) {
          window.instgrm.Embeds.process();
        } else {
          setTimeout(tryProcess, 200);
        }
      };
      tryProcess();
      return;
    }

    // YouTube (Shorts o normal) presentado como reel (vertical)
    if (url.includes('youtu')) {
      const src = toEmbedYouTube(url);
      reelEl.innerHTML = `<div class="ratio-9x16"><iframe src="${src}" allowfullscreen loading="lazy"></iframe></div>`;
    }
  }

  // Cerrar overlay
  closeBtn.onclick = () => {
    detail.classList.add('hidden');
    document.body.style.overflow = '';
  };
  detail.addEventListener('click', e => { if (e.target === detail) closeBtn.click(); });

  // Filtros
  filters.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    STATE.filter = e.target.getAttribute('data-filter');
    STATE.page = 1;
    [...filters.querySelectorAll('button')].forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    render();
  });

  // Inicial
  render();
})();
</script>
