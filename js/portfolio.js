(async function(){
  const STATE = { filter:'all', page:1, pageSize:8 }; // cambia pageSize si quieres
  const grid     = document.getElementById('pf-grid');
  const pager    = document.getElementById('pf-pager');
  const filters  = document.getElementById('pf-filters');

  // Overlay
  const detail   = document.getElementById('pf-detail');
  const closeBtn = detail.querySelector('.pf-close');
  const titleEl  = document.getElementById('pf-title');
  const descEl   = document.getElementById('pf-desc');
  const tagsEl   = document.getElementById('pf-tags');
  const videoEl  = document.getElementById('pf-video');
  const galEl    = document.getElementById('pf-gallery');

  // Cargar índice maestro
  const idx = await fetch('portfolio/index.json').then(r=>r.json()).catch(()=>({projects:[]}));
  // Cargar todos los project.json
  const projects = [];
  for (const item of idx.projects){
    try{
      const base = item.path.replace(/\/$/,'');
      const data = await fetch(`${base}/project.json`).then(r=>r.json());
      projects.push({...data, base});
    }catch(e){ console.warn('No pude cargar', item.path, e); }
  }

  function label(id){
    const map = {
      'sheet_metal':'Sheet Metal','molds_plastics':'Plastic & Molded Parts','cnc_cam':'CNC Parts & CAM',
      'assemblies':'Assemblies & Mechanisms','reverse_eng':'Reverse Engineering','surfaces':'Surface Modeling',
      'product-enclosures':'New Products / Enclosures','tooling_fixtures':'Jigs, Fixtures & Tooling',
      'mechatronics':'Mechatronics (ESP32/PLC)','simulation':'Simulation (FEA/Motion)',
      'drawings_bom':'Manufacturing Package','rendering':'Rendering & Animation','prototyping':'3D Printing & Prototyping'
    };
    return map[id] || id;
  }

  function filtered(){
    return STATE.filter==='all' ? projects : projects.filter(p=>p.category===STATE.filter);
  }

  function render(){
    renderCards(); renderPager();
  }

  function renderCards(){
    grid.innerHTML = '';
    const list = filtered();
    const start = (STATE.page-1)*STATE.pageSize;
    const end   = start + STATE.pageSize;
    list.slice(start, end).forEach(p=>{
      const card = document.createElement('div');
      card.className = 'pf-card';
      card.setAttribute('data-category', p.category);
      card.innerHTML = `
        <img class="pf-thumb" src="${p.base}/cover.jpg" alt="${p.title}">
        <div class="pf-meta">
          <div class="pf-cat">${label(p.category)}</div>
          <div class="pf-title">${p.title}</div>
        </div>`;
      card.onclick = ()=>openDetail(p);
      grid.appendChild(card);
    });
  }

  function renderPager(){
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / STATE.pageSize));
    STATE.page = Math.min(STATE.page, pages);
    pager.innerHTML = '';
    // Prev
    const prev = document.createElement('button');
    prev.textContent = 'Prev';
    prev.disabled = STATE.page===1;
    prev.onclick = ()=>{ STATE.page--; render(); };
    pager.appendChild(prev);
    // Números (máximo 7)
    const window = 3;
    let a = Math.max(1, STATE.page - window), b = Math.min(pages, STATE.page + window);
    for (let i=a; i<=b; i++){
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i===STATE.page) btn.classList.add('active');
      btn.onclick = ()=>{ STATE.page=i; render(); };
      pager.appendChild(btn);
    }
    // Next
    const next = document.createElement('button');
    next.textContent = 'Next';
    next.disabled = STATE.page===pages;
    next.onclick = ()=>{ STATE.page++; render(); };
    pager.appendChild(next);
  }

  function openDetail(p){
    titleEl.textContent = p.title;
    descEl.textContent  = p.description || '';
    tagsEl.innerHTML    = (p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');
    // Video (opcional)
    if (p.video){
      const src = toEmbed(p.video);
      videoEl.innerHTML = `<div class="ratio"><iframe src="${src}" allowfullscreen loading="lazy"></iframe></div>`;
    } else { videoEl.innerHTML = ''; }
    // Galería 2×2
    // Si no trae "images", asumimos img0..img8 (si existen) – exige que estén listadas o presentes
    const imgs = (p.images && p.images.length) ? p.images : [];
    galEl.innerHTML = imgs.map(fn=>`<img src="${p.base}/${fn}" alt="${p.title}">`).join('');
    detail.classList.remove('hidden');
    document.body.style.overflow='hidden';
  }

  function toEmbed(url){
    try{
      if (url.includes('youtu.be/')){ const id = url.split('youtu.be/')[1].split(/[?&]/)[0]; return `https://www.youtube.com/embed/${id}?rel=0`; }
      const u = new URL(url); const id = u.searchParams.get('v'); return `https://www.youtube.com/embed/${id}?rel=0`;
    }catch(e){ return url; }
  }

  // Cerrar overlay
  closeBtn.onclick = ()=>{ detail.classList.add('hidden'); document.body.style.overflow=''; };
  detail.addEventListener('click', e=>{ if (e.target===detail) closeBtn.click(); });

  // Filtros
  filters.addEventListener('click', e=>{
    if (e.target.tagName!=='BUTTON') return;
    STATE.filter = e.target.getAttribute('data-filter');
    STATE.page = 1;
    // UI activa
    [...filters.querySelectorAll('button')].forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active');
    render();
  });

  // Inicial
  render();
})();
