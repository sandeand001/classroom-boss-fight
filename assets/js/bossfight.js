// Bossfight main script (extracted from index.html)
// Wrapped in DOMContentLoaded to ensure elements exist before binding

document.addEventListener('DOMContentLoaded', () => {
  // ===== Utility helpers =====
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // Boss transform controls: size + position
  const bossSizeSlider = document.getElementById('bossSizeSlider');
  const bossXSlider = document.getElementById('bossXSlider');
  const bossYSlider = document.getElementById('bossYSlider');
  const bossImg = document.querySelector('.bossImg'); // container for transforms

  function updateBossTransform(){
    if(!bossImg) return;
    const s = parseFloat(bossSizeSlider?.value) || 1;
    const x = parseFloat(bossXSlider?.value) || 0;
    const y = parseFloat(bossYSlider?.value) || 0;
    bossImg.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }
  [bossSizeSlider, bossXSlider, bossYSlider].forEach(el=> el && el.addEventListener('input', updateBossTransform));
  updateBossTransform();

  // ===== Drag to pan (click-and-drag the boss to adjust X/Y)
  (function enableDragPan(){
    const container = bossImg;
    if(!container) return;
    let dragging=false, startX=0, startY=0, origX=0, origY=0;
    const clampVal = (v, el)=>{ if(!el) return v; const min = parseFloat(el.min ?? -99999); const max = parseFloat(el.max ?? 99999); return Math.max(min, Math.min(max, v)); };
    const toInt = v=> Math.round(v);
    container.addEventListener('pointerdown', (e)=>{
      if(e.button && e.button!==0) return; // only left button
      dragging = true; container.classList.add('dragging'); container.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      origX = parseFloat(bossXSlider?.value)||0; origY = parseFloat(bossYSlider?.value)||0;
      e.preventDefault();
    });
    container.addEventListener('pointermove', (e)=>{
      if(!dragging) return;
      const dx = e.clientX - startX; const dy = e.clientY - startY;
      const newX = clampVal(origX + toInt(dx), bossXSlider);
      const newY = clampVal(origY + toInt(dy), bossYSlider);
      if(bossXSlider) bossXSlider.value = newX; if(bossYSlider) bossYSlider.value = newY;
      updateBossTransform();
    });
    ['pointerup','pointercancel','pointerleave'].forEach(ev=> container.addEventListener(ev, (e)=>{ if(!dragging) return; dragging=false; container.classList.remove('dragging'); try{ container.releasePointerCapture(e.pointerId); }catch(_){} }));
  })();

  // Minimal confetti
  function confetti() {
    const root = document.body; const N = 120;
    for(let i=0;i<N;i++){
      const d = document.createElement('div');
      d.style.position='fixed'; d.style.top='-10px'; d.style.left = Math.random()*100+'vw';
      d.style.width='8px'; d.style.height='14px'; d.style.opacity='.9';
      d.style.background = `hsl(${Math.random()*360}, 85%, 65%)`;
      d.style.transform = `rotate(${Math.random()*360}deg)`;
      d.style.zIndex='90'; d.style.borderRadius='2px';
      root.appendChild(d);
      const dur = 2000 + Math.random()*2000;
      const tx = (Math.random()*2-1)*120;
      d.animate([
        { transform: d.style.transform+` translate(0,0)` },
        { transform: d.style.transform+` translate(${tx}px, 100vh)` }
      ], { duration: dur, easing:'cubic-bezier(.2,.6,.2,1)' }).onfinish = ()=> d.remove();
    }
  }

  // WebAudio fallback beeps
  let audioCtx = null; function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
  function beep(type='hit'){
    if($('#muteToggle').checked) return;
    ensureAudio();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    const now = audioCtx.currentTime;
    if(type==='hit'){ o.type='triangle'; o.frequency.setValueAtTime(520, now); g.gain.exponentialRampToValueAtTime(0.12, now+.01); g.gain.exponentialRampToValueAtTime(0.001, now+.16);
    } else if(type==='miss'){ o.type='sawtooth'; o.frequency.setValueAtTime(220, now); g.gain.exponentialRampToValueAtTime(0.11, now+.01); g.gain.exponentialRampToValueAtTime(0.001, now+.22);
    } else { o.type='sine'; o.frequency.setValueAtTime(660, now); g.gain.exponentialRampToValueAtTime(0.13, now+.01); g.gain.exponentialRampToValueAtTime(0.001, now+.4); }
    o.start(); o.stop(now+.45);
  }

  // Uploaded SFX (or loaded from assets)
  const sfx = { hit:null, miss:null, win:null };
  const SFX_PREFIX = { 'math':'dragon', 'phonics':'owl', 'story-comprehension':'sphinx' };

  async function loadSfxForSubject(subject){
    try{
      const prefix = SFX_PREFIX[subject];
      if(!prefix) return;
      const nameMap = { hit: `${prefix}_hit.wav`, miss: `${prefix}_attack.wav`, win: `${prefix}_victory.wav` };
      await Promise.all(Object.keys(nameMap).map(async kind=>{
        const fname = nameMap[kind]; const url = `assets/sfx/${fname}`;
        try{
          const res = await fetch(url, {cache:'no-store'});
          if(!res.ok){ console.warn('loadSfxForSubject: not found', url); sfx[kind] = null; return; }
          const blob = await res.blob(); sfx[kind] = blob;
        }catch(e){ console.warn('loadSfxForSubject: error loading', url, e); sfx[kind] = null; }
      }));
    }catch(e){ console.warn('loadSfxForSubject error', e); }
  }
  async function playSFX(kind){
    if($('#muteToggle').checked) return;
    const file = sfx[kind];
    if(file){
      const url = URL.createObjectURL(file);
      const a = new Audio(url); a.volume = .9; a.play(); a.onended = ()=> URL.revokeObjectURL(url);
    } else beep(kind);
  }

  // ===== State =====
  const state = {
    bossName: 'Ancient Drake',
    bossHPMax: 8, bossHP: 8,
    guilds: [
      { name:'Yellow Guild', color: getComputedStyle(document.documentElement).getPropertyValue('--guild1').trim(), hpMax:3, hp:3, hits:0 },
      { name:'Blue Guild',   color: getComputedStyle(document.documentElement).getPropertyValue('--guild2').trim(), hpMax:3, hp:3, hits:0 },
      { name:'Purple Guild', color: getComputedStyle(document.documentElement).getPropertyValue('--guild3').trim(), hpMax:3, hp:3, hits:0 },
    ],
    imgs:{ base:null, attack:null, hit:null, defeat:null },
    bossSubject: 'math',
    bossNameLocked: false,
    imageTimer: null,
    qEnabled:false, qNum:1,
    timerEnabled:false, timerRunning:false, startAt:0, elapsed:0,
    lastHit:null, history:[],
  };

  // ===== Rendering =====
  function renderHP(){
    const hp = $('#bossHP'); if(!hp) return; hp.innerHTML='';
    for(let i=0;i<state.bossHPMax;i++){
      const h = document.createElement('div'); h.className='heart'+(i<state.bossHP?'':' empty'); hp.appendChild(h);
    }
    $('#bossName').textContent = state.bossName;
  }

  const SUBJECT_NAMES = { 'math': 'Number Dragon', 'phonics': 'Phonics Wizard', 'story-comprehension': 'Story Sphinx' };

  state.bgName = state.bgName || '__default__';
  let BACKGROUND_LIST = ['__default__'];
  async function loadBackgroundManifest(){
    let list = [];
    try{
      const res = await fetch('assets/backgrounds/manifest.json', {cache:'no-store'});
      if(res && res.ok){
        try{ list = await res.json(); }catch(e){ console.warn('manifest parse error', e); }
        if(Array.isArray(list) && list.length) BACKGROUND_LIST = ['__default__', ...list];
      }
    }catch(e){ console.warn('manifest fetch failed', e); }
    const sel = $('#cfgBackground');
    if(sel){
      sel.innerHTML = '';
      const def = document.createElement('option'); def.value='__default__'; def.textContent='Default'; sel.appendChild(def);
      await Promise.all(BACKGROUND_LIST.filter(n=> n!=='__default__').map(n=> new Promise(res=>{
        const img = new Image();
        img.onload = ()=>{ const opt = document.createElement('option'); opt.value = n; const base = n.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '); opt.textContent = base.split(' ').map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' '); sel.appendChild(opt); res(true); };
        img.onerror = ()=> res(false);
        img.src = `assets/backgrounds/${n}`;
      })));
      try{ sel.value = BACKGROUND_LIST.includes(state.bgName) ? state.bgName : '__default__'; }catch{ sel.value='__default__'; }
    }
  }

  function applyBackground(name){
    const host = $('.bossView'); if(!host) return;
    if(!name || name==='__default__'){ host.style.backgroundImage = ''; state.bgName = '__default__'; return; }
    host.style.backgroundImage = `url(assets/backgrounds/${name})`;
    host.style.backgroundSize = 'cover'; host.style.backgroundPosition = 'center';
    state.bgName = name;
  }

  function renderBoss(imgType='base', animate=false){
    const img = $('#bossImg'); if(!img) return;
    const src = state.imgs[imgType] || state.imgs.base || placeholderImage();
    normalizeAndSetImage(img, src, 512).catch(()=>{ img.src = src; });
    if(animate) { img.classList.remove('shake'); void img.offsetWidth; img.classList.add('shake'); $('#flash').classList.add('show'); setTimeout(()=> $('#flash').classList.remove('show'), 280); }
  }

  async function normalizeAndSetImage(imgEl, src, size=512){
    return new Promise((resolve, reject)=>{
      try{
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = ()=>{
          try{
            const t = document.createElement('canvas'); t.width = i.width; t.height = i.height;
            const tctx = t.getContext('2d'); tctx.clearRect(0,0,t.width,t.height); tctx.drawImage(i,0,0);
            const data = tctx.getImageData(0,0,t.width,t.height).data;
            let minX=t.width, minY=t.height, maxX=0, maxY=0, found=false;
            for(let y=0;y<t.height;y++) for(let x=0;x<t.width;x++){ const idx = (y*t.width + x)*4 + 3; if(data[idx] > 10){ found = true; if(x<minX) minX=x; if(x>maxX) maxX=x; if(y<minY) minY=y; if(y>maxY) maxY=y; } }
            if(!found){ imgEl.src = src; resolve(); return; }
            const contentW = maxX - minX + 1; const contentH = maxY - minY + 1;
            const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
            const padding = 0.9;
            const scale = Math.min((canvas.width*padding)/contentW, (canvas.height*padding)/contentH);
            const destW = contentW * scale; const destH = contentH * scale;
            const dx = (canvas.width - destW)/2; const dy = (canvas.height - destH)/2;
            ctx.drawImage(i, minX, minY, contentW, contentH, dx, dy, destW, destH);
            imgEl.src = canvas.toDataURL('image/png');
            resolve();
          }catch(err){ reject(err); }
        };
        i.onerror = (e)=> reject(e);
        i.src = src;
      }catch(e){ reject(e); }
    });
  }

  function normalizeToDataURL(src, size=512){
    return new Promise((resolve, reject)=>{
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = ()=>{
        try{
          const t = document.createElement('canvas'); t.width = i.width; t.height = i.height;
          const tctx = t.getContext('2d'); tctx.clearRect(0,0,t.width,t.height); tctx.drawImage(i,0,0);
          const data = tctx.getImageData(0,0,t.width,t.height).data;
          let minX=t.width, minY=t.height, maxX=0, maxY=0, found=false;
          for(let y=0;y<t.height;y++) for(let x=0;x<t.width;x++){ const idx = (y*t.width + x)*4 + 3; if(data[idx] > 10){ found=true; if(x<minX) minX=x; if(x>maxX) maxX=x; if(y<minY) minY=y; if(y>maxY) maxY=y; } }
          if(!found){ resolve(src); return; }
          const contentW = maxX - minX + 1; const contentH = maxY - minY + 1;
          const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
            const padding = 0.9;
            const scale = Math.min((canvas.width*padding)/contentW, (canvas.height*padding)/contentH);
            const destW = contentW * scale; const destH = contentH * scale;
            const dx = (canvas.width - destW)/2; const dy = (canvas.height - destH)/2;
            ctx.drawImage(i, minX, minY, contentW, contentH, dx, dy, destW, destH);
            resolve(canvas.toDataURL('image/png'));
        }catch(err){ reject(err); }
      };
      i.onerror = (e)=> reject(e);
      i.src = src;
    });
  }

  function showTempImage(imgType, ms=1400, animate=false){
    if(state.imageTimer){ clearTimeout(state.imageTimer); state.imageTimer = null; }
    renderBoss(imgType, animate);
    if(state.bossHP===0) return;
    state.imageTimer = setTimeout(()=>{ state.imageTimer = null; renderBoss('base'); }, ms);
  }

  function setSubjectImages(subject){
    if(!subject) return;
    state.bossSubject = subject;
    try{ document.body.dataset.subject = subject; }catch{}
    const folder = `${subject}-boss`;
    const paths = {
      base: `assets/bosses/${folder}/base-position.png`,
      attack: `assets/bosses/${folder}/attack-position.png`,
      hit: `assets/bosses/${folder}/hit-position.png`,
      defeat: `assets/bosses/${folder}/defeated-position.png`,
    };
    Object.keys(paths).forEach(key=>{
      const p = paths[key];
      normalizeToDataURL(p, 512).then(dataUrl=>{ state.imgs[key] = dataUrl; if(key==='base') renderBoss('base'); })
        .catch(()=>{
          const probe = new Image();
          probe.onload = ()=>{ state.imgs[key] = p; if(key==='base') renderBoss('base'); };
          probe.onerror = ()=>{ state.imgs[key] = null; if(key==='base') renderBoss('base'); };
          probe.src = p;
        });
    });
    loadSfxForSubject(subject);
    if(!state.bossNameLocked){ const suggested = SUBJECT_NAMES[subject] || subject; state.bossName = suggested; renderHP(); }
    buildDock();
  }

  function renderGuilds(){
    const host = $('#guildList'); if(!host) return; host.innerHTML='';
    state.guilds.forEach((g,idx)=>{
      const el = document.createElement('div'); el.className='guild';
      const head = document.createElement('div'); head.className='gHead';
      const dot = document.createElement('span'); dot.className='dot'; dot.style.background = g.color; head.appendChild(dot);
      const name = document.createElement('div'); name.className='gName'; name.textContent = g.name; head.appendChild(name);
      const hearts = document.createElement('div'); hearts.className='gHearts';
      for(let i=0;i<g.hpMax;i++){ const h=document.createElement('div'); h.className='gHeart'+(i<g.hp?'':' empty'); hearts.appendChild(h); }
      const stats = document.createElement('div'); stats.className='gStats'; stats.textContent = `Hits: ${g.hits}`;
      el.appendChild(head); el.appendChild(hearts); el.appendChild(stats);
      host.appendChild(el);
    });
  }

  function logLine(text){
    const l = $('#log'); if(!l) return; const row = document.createElement('div'); row.className='logItem'; const ts = new Date().toLocaleTimeString();
    row.textContent = `[${ts}] ${text}`; l.prepend(row);
  }

  function actHit(gIndex){
    if(state.bossHP<=0) return;
    const g = state.guilds[gIndex]; const prev = snapshot();
    state.bossHP = clamp(state.bossHP-1, 0, state.bossHPMax);
    g.hits += 1; state.lastHit = gIndex;
    renderHP(); renderGuilds(); renderBoss('hit', true); playSFX('hit');
    logLine(`${g.name} landed a HIT! Boss HP ${state.bossHP}/${state.bossHPMax}`);
    state.history.push(prev);
    if(state.bossHP===0) onVictory(); else showTempImage('hit', 1400, true);
  }

  function actMiss(gIndex){
    const g = state.guilds[gIndex];
    if(g.hp<=0) { logLine(`${g.name} is already KO'd. No further penalty.`); return; }
    const prev = snapshot();
    g.hp = clamp(g.hp-1, 0, g.hpMax);
    renderGuilds(); renderBoss('attack', true); playSFX('miss');
    logLine(`${g.name} MISSED! They lose 1 heart (${g.hp}/${g.hpMax}).`);
    state.history.push(prev);
    if(state.guilds.every(x=> x.hp<=0)) onDefeat(); else showTempImage('attack', 1200, true);
  }

  function onVictory(){
    if(state.imageTimer){ clearTimeout(state.imageTimer); state.imageTimer = null; }
    renderBoss('defeat'); playSFX('win'); confetti();
    const contrib = state.guilds.map((g,i)=>({i, hits:g.hits})); contrib.sort((a,b)=> b.hits-a.hits);
    const top = contrib[0]; const last = state.lastHit;
    $('#victoryTitle').textContent = `${state.bossName} Defeated!`;
    const topGuild = top.hits>0 ? state.guilds[top.i].name+` (${top.hits})` : '—';
    const lastGuild = last!=null ? state.guilds[last].name : '—';
    $('#victorySub').innerHTML = `Final blow by <b>${lastGuild}</b>. Top contributor: <b>${topGuild}</b>.`;
    $('#victory').classList.add('show');
  }

  function onDefeat(){
    renderBoss('attack');
    logLine(`All guilds are KO'd! The boss prevails...`);
  }

  function undo(){
    const prev = state.history.pop(); if(!prev) return;
    Object.assign(state, JSON.parse(prev));
    if(state.imageTimer){ clearTimeout(state.imageTimer); state.imageTimer = null; }
    renderHP(); renderGuilds(); renderBoss('base');
  }

  function resetFight(){
    state.bossHP = state.bossHPMax; state.guilds.forEach(g=>{ g.hp = g.hpMax; g.hits=0; }); state.lastHit=null; state.history=[];
    if(state.imageTimer){ clearTimeout(state.imageTimer); state.imageTimer = null; }
    renderHP(); renderGuilds(); renderBoss('base'); $('#victory').classList.remove('show'); logLine('Fight reset.');
  }

  function snapshot(){
    return JSON.stringify({
      bossName: state.bossName, bossHPMax: state.bossHPMax, bossHP: state.bossHP,
      guilds: state.guilds.map(g=> ({...g})), imgs: {...state.imgs}, qEnabled: state.qEnabled, qNum: state.qNum,
      timerEnabled: state.timerEnabled, timerRunning: state.timerRunning, startAt: state.startAt, elapsed: state.elapsed,
      lastHit: state.lastHit
    });
  }

  // Timer
  function tick(){
    if(!state.timerRunning) return;
    const now = performance.now();
    const total = state.elapsed + (now - state.startAt);
    const sec = Math.floor(total/1000);
    const m = String(Math.floor(sec/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    $('#timerText').textContent = `${m}:${s}`;
    requestAnimationFrame(tick);
  }
  function toggleTimer(){ state.timerEnabled = !state.timerEnabled; $('#timerChip').hidden = !state.timerEnabled; }
  function startPauseTimer(){ if(!state.timerEnabled) toggleTimer(); if(!state.timerRunning){ state.timerRunning = true; state.startAt = performance.now(); requestAnimationFrame(tick); } else { state.timerRunning = false; state.elapsed += performance.now() - state.startAt; } }

  async function openCfg(){
    const host = $('#guildCfg'); if(host) host.innerHTML='';
    state.guilds.forEach((g,idx)=>{
      const block = document.createElement('div');
      block.innerHTML = `
        <div class="row"><label>Guild ${idx+1} Name</label><input type="text" id="gname${idx}" value="${g.name}"></div>
        <div class="row"><label>Color</label><input type="color" id="gcolor${idx}" value="${toColorHex(g.color)}"></div>
        <div class="row"><label>Hearts</label>
          <select id="ghp${idx}">${[2,3,4,5].map(n=>`<option ${n===g.hpMax?'selected':''}>${n}</option>`).join('')}</select>
        </div>`;
      host.appendChild(block);
    });
    $('#cfgBossName').value = state.bossName;
    $('#cfgBossHP').value = String(state.bossHPMax);
    const subj = $('#cfgSubject'); if(subj) subj.value = state.bossSubject || 'math';
    await loadBackgroundManifest();
    const bgSel = $('#cfgBackground'); if(bgSel) bgSel.value = state.bgName || '__default__';
    $('#cfgDlg').showModal();
  }

  function toColorHex(any){ const ctx = document.createElement('canvas').getContext('2d'); ctx.fillStyle = any; return ctx.fillStyle; }
  function fileToDataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); }); }

  async function saveCfg(){
    const newName = $('#cfgBossName').value.trim() || 'Boss';
    const suggested = SUBJECT_NAMES[state.bossSubject] || state.bossSubject;
    state.bossNameLocked = newName !== suggested;
    state.bossName = newName;
    const oldHP = state.bossHPMax; const oldSubject = state.bossSubject;
    let hp = parseInt($('#cfgBossHP').value,10); if(isNaN(hp)) hp = 8;
    state.bossHPMax = clamp(hp, 1, 20); state.bossHP = Math.min(state.bossHP, state.bossHPMax);
    const sel = $('#cfgSubject'); if(sel){ setSubjectImages(sel.value); }
    const bsel = $('#cfgBackground'); if(bsel){ const b = bsel.value || '__default__'; applyBackground(b); }
    if($('#sfxHit')?.files?.[0]) sfx.hit = $('#sfxHit').files[0];
    if($('#sfxMiss')?.files?.[0]) sfx.miss = $('#sfxMiss').files[0];
    if($('#sfxWin')?.files?.[0]) sfx.win = $('#sfxWin').files[0];
    state.guilds.forEach((g,idx)=>{ g.name = $(`#gname${idx}`).value.trim() || g.name; g.color = $(`#gcolor${idx}`).value || g.color; const n = parseInt($(`#ghp${idx}`).value,10) || g.hpMax; g.hpMax = n; g.hp = Math.min(g.hp, n); });
    localStorage.setItem('bossfight_settings', JSON.stringify({ bossName: state.bossName, bossHPMax: state.bossHPMax, imgs: state.imgs, bossSubject: state.bossSubject, bossNameLocked: state.bossNameLocked, bgName: state.bgName, guilds: state.guilds.map(g=> ({name:g.name, color:g.color, hpMax:g.hpMax})) }));
    const subjectChanged = oldSubject !== state.bossSubject; const hpChanged = oldHP !== state.bossHPMax;
    if(subjectChanged || hpChanged){ resetFight(); logLine('Boss changed: fight reset to apply new settings.'); } else { renderHP(); renderGuilds(); renderBoss('base'); }
    $('#cfgDlg').close();
  }

  function loadCfg(){
    const raw = localStorage.getItem('bossfight_settings'); if(!raw) return;
    try{
      const cfg = JSON.parse(raw);
      if(cfg.bossName) { state.bossName = cfg.bossName; }
      if(typeof cfg.bossNameLocked !== 'undefined') state.bossNameLocked = !!cfg.bossNameLocked;
      if(cfg.bossHPMax) { state.bossHPMax = clamp(parseInt(cfg.bossHPMax,10)||8, 1, 20); state.bossHP = state.bossHPMax; }
      if(cfg.imgs) state.imgs = {...state.imgs, ...cfg.imgs};
      if(cfg.bossSubject) state.bossSubject = cfg.bossSubject;
      if(cfg.bgName) state.bgName = cfg.bgName;
      if(Array.isArray(cfg.guilds)) cfg.guilds.forEach((g,i)=>{ if(state.guilds[i]){ state.guilds[i].name = g.name || state.guilds[i].name; state.guilds[i].color = g.color || state.guilds[i].color; state.guilds[i].hpMax = g.hpMax || state.guilds[i].hpMax; state.guilds[i].hp = state.guilds[i].hpMax; } });
    }catch(e){ console.warn('cfg parse', e); }
  }

  function placeholderImage(){
    const svg = encodeURIComponent(`<?xml version="1.0"?><svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'><defs><linearGradient id='g' x1='0' x2='0' y1='0' y2='1'><stop offset='0%' stop-color='#1c2047'/><stop offset='100%' stop-color='#0f1222'/></linearGradient></defs><rect fill='url(#g)' width='100%' height='100%'/><g transform='translate(450,320) rotate(-6)'><circle cx='0' cy='0' r='160' fill='#222a66' stroke='#4450aa' stroke-width='6' opacity='.9'/><text x='0' y='10' text-anchor='middle' font-family='Segoe UI, Arial' font-size='38' fill='#aab0d5'>Boss Image</text></g></svg>`);
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }

  function buildDock(){
    const host = $('#dockBtns'); if(!host) return; host.innerHTML='';
    state.guilds.forEach((g,idx)=>{
      const row = document.createElement('div'); row.className='gBtnRow';
      const hit = document.createElement('button'); hit.className='btn hit'; hit.textContent = `${g.name} HIT`; hit.onclick=()=>actHit(idx);
      const miss = document.createElement('button'); miss.className='btn miss'; miss.textContent = `${g.name} MISS`; miss.onclick=()=>actMiss(idx);
      try{
        hit.style.background = g.color; miss.style.background = g.color;
        const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success') || '#31d0aa';
        const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger') || '#ff6b6b';
        hit.style.color = successColor.trim(); miss.style.color = dangerColor.trim();
        miss.style.opacity = '0.92'; hit.style.border = 'none'; miss.style.border = 'none';
      }catch{}
      row.appendChild(hit); row.appendChild(miss); host.appendChild(row);
    });
  }

  function readableTextColor(hexOrRgb){
    try{ const c = document.createElement('canvas').getContext('2d'); c.fillStyle = hexOrRgb; const rgb = c.fillStyle; const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/); if(!m) return '#fff'; const r=parseInt(m[1],10), g=parseInt(m[2],10), b=parseInt(m[3],10); const lum=(0.299*r+0.587*g+0.114*b)/255; return lum>0.6?'#000':'#fff'; }catch{ return '#fff'; }
  }

  // Keyboard bindings
  window.addEventListener('keydown', (e)=>{
    if(e.key==='1'){ actHit(0); }
    else if(e.key==='2'){ actHit(1); }
    else if(e.key==='3'){ actHit(2); }
    else if(e.key==='.' ){ const d = $('#dock'); if(d) d.style.display = d.style.display === 'none' ? '' : 'none'; }
    else if(e.key==='u' || e.key==='U'){ undo(); }
    else if(e.key==='r' || e.key==='R'){ resetFight(); }
    else if(e.key==='g' || e.key==='G'){ openCfg(); }
    else if(e.key==='t' || e.key==='T'){ startPauseTimer(); }
    else if(e.key==='q' || e.key==='Q'){ $('#qChip').hidden = !$('#qChip').hidden; }
    else if(e.altKey && e.key==='1'){ actMiss(0); }
    else if(e.altKey && e.key==='2'){ actMiss(1); }
    else if(e.altKey && e.key==='3'){ actMiss(2); }
  });

  // DOM wiring
  $('#btnConfig')?.addEventListener('click', openCfg);
  $('#btnSaveCfg')?.addEventListener('click', (e)=>{ e.preventDefault(); saveCfg(); });

  const btnSliders = document.getElementById('btnSliders');
  const sliderMenu = document.getElementById('sliderMenu');
  if(btnSliders && sliderMenu){
    btnSliders.addEventListener('click', ()=>{
      sliderMenu.hidden = !sliderMenu.hidden;
      btnSliders.setAttribute('aria-expanded', String(!sliderMenu.hidden));
      btnSliders.textContent = sliderMenu.hidden ? 'Adjust Boss ▾' : 'Adjust Boss ▴';
    });
  }

  $('#victoryClose')?.addEventListener('click', ()=> $('#victory').classList.remove('show'));
  $('#btnUndo')?.addEventListener('click', undo);
  $('#btnReset')?.addEventListener('click', resetFight);
  $('#btnToggleQ')?.addEventListener('click', ()=> $('#qChip').hidden = !$('#qChip').hidden);
  $('#btnToggleTimer')?.addEventListener('click', startPauseTimer);

  const subjEl = $('#cfgSubject');
  if(subjEl){
    subjEl.addEventListener('change', ()=>{
      const v = subjEl.value;
      try{ setSubjectImages(v); }catch{}
      if(!state.bossNameLocked){ const suggested = SUBJECT_NAMES[v] || v; const nameInput = $('#cfgBossName'); if(nameInput) nameInput.value = suggested; state.bossName = suggested; renderHP(); }
    });
  }

  // Boot
  function loadAndInit(){
    loadCfg();
    if(state.bossSubject) setSubjectImages(state.bossSubject);
    loadBackgroundManifest().then(()=>{ if(state.bgName && state.bgName!=='__default__') applyBackground(state.bgName); });
    renderHP(); renderGuilds(); renderBoss('base'); buildDock();
    $('#timerText').textContent='00:00';
    logLine('Ready. Use 1/2/3 for hits and Alt+1/2/3 for misses. Open Config (G) to set subject image pack, colors, and hearts.');
  }
  loadAndInit();
});
