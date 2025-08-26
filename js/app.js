"use strict";
/**
 * app.js
 * - Bootstraps UI, wires auth -> router, and sets up realtime teacher controls sync.
 * - Protected /app shows simple boss UI; /teacher is a dock that pushes controls to DB.
 */

import { initAuth, signInWithGooglePopup, signInWithEmail, signUpWithEmail, signOutUser } from './auth.js';
import { defineRoutes, setNotFound, startRouter, setUser, navigate } from './router.js';
import { controlsRef } from './firebase-init.js';

const root = document.getElementById('root');

// Application state that will be mirrored via Realtime DB when teacher controls are used
const state = {
  bossHPMax: 8, bossHP: 8,
  guilds: [ { name:'Yellow', hpMax:3, hp:3, hits:0 }, { name:'Blue', hpMax:3, hp:3, hits:0 }, { name:'Purple', hpMax:3, hp:3, hits:0 } ],
  bossName: 'Ancient Drake',
};

// helpers for rendering small views
function el(html){ const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

function renderLogin(){
  root.innerHTML = '';
  const node = el(`
    <section class="card">
      <h2>Sign In</h2>
      <div class="form-row">
        <button id="btnGoogle">Sign in with Google</button>
      </div>
      <form id="emailForm" class="form-row">
        <label>Email <input id="email" type="email" required></label>
        <label>Password <input id="password" type="password" required></label>
        <div class="row">
          <button id="btnSignin" type="button">Sign In</button>
          <button id="btnSignup" type="button" class="ghost">Create account</button>
        </div>
      </form>
      <p class="muted">Use the same credentials on mobile; teacher dock uses realtime DB to sync controls.</p>
    </section>
  `);
  root.appendChild(node);
  document.getElementById('btnGoogle').addEventListener('click', async ()=>{ try{ await signInWithGooglePopup(); navigate('/app'); }catch(e){ alert(e.message||e); } });
  document.getElementById('btnSignin').addEventListener('click', async ()=>{ const em = document.getElementById('email').value; const pw = document.getElementById('password').value; try{ await signInWithEmail(em,pw); navigate('/app'); }catch(e){ alert(e.message||e); } });
  document.getElementById('btnSignup').addEventListener('click', async ()=>{ const em = document.getElementById('email').value; const pw = document.getElementById('password').value; try{ await signUpWithEmail(em,pw); navigate('/app'); }catch(e){ alert(e.message||e); } });
}

function renderApp({ user }){
  root.innerHTML = '';
  const node = el(`
    <section class="card">
      <h2>Welcome ${user.displayName || user.email}</h2>
      <p class="muted">UID: ${user.uid}</p>
      <div id="bossPane" class="card"></div>
      <div class="row" style="margin-top:12px">
        <button id="btnSignOut">Sign Out</button>
      </div>
    </section>
  `);
  root.appendChild(node);
  document.getElementById('btnSignOut').addEventListener('click', async ()=>{ await signOutUser(); navigate('/login'); });
  renderBossPane();
}

function renderBossPane(){
  const bp = document.getElementById('bossPane'); bp.innerHTML = '';
  const html = `
    <h3>${state.bossName}</h3>
    <div class="muted">HP: ${state.bossHP}/${state.bossHPMax}</div>
    <div style="margin-top:10px">
      ${state.guilds.map((g,i)=> `<button data-g="${i}" class="btn-attack">${g.name} HIT</button>`).join(' ')}
    </div>
  `;
  bp.innerHTML = html;
  bp.querySelectorAll('.btn-attack').forEach(b=> b.addEventListener('click', (e)=>{
    const idx = parseInt(e.currentTarget.dataset.g,10); actHit(idx); broadcastControl('hit',{g:idx});
  }));
}

function renderTeacher(){
  root.innerHTML = '';
  const node = el(`
    <section class="card">
      <h2>Teacher Dock</h2>
      <div class="row">
        ${state.guilds.map((g,i)=> `<button data-g="${i}" class="btn-attack">${g.name} HIT</button>`).join(' ')}
      </div>
      <div style="margin-top:10px" class="row">
        <button id="btnReset">Reset Fight</button>
      </div>
    </section>
  `);
  root.appendChild(node);
  root.querySelectorAll('.btn-attack').forEach(b=> b.addEventListener('click', (e)=>{ const idx = parseInt(e.dataset.g,10); actHit(idx); broadcastControl('hit',{g:idx}); }));
  document.getElementById('btnReset').addEventListener('click', ()=>{ resetFight(); broadcastControl('reset',{}); });
}

// ===== state mutators =====
function snapshot(){ return JSON.stringify(state); }

function actHit(gIndex){
  if(state.bossHP<=0) return;
  state.bossHP = Math.max(0, state.bossHP-1);
  state.guilds[gIndex].hits += 1;
  renderBossPane();
}

function resetFight(){ state.bossHP = state.bossHPMax; state.guilds.forEach(g=>{ g.hp=g.hpMax; g.hits=0 }); renderBossPane(); }

// ===== Realtime DB sync (teacher controls) =====
let controlsDbRef = null;
async function setupRealtime(){
  try{
    controlsDbRef = await controlsRef();
    if(!controlsDbRef) return; // DB not configured
    const modDb = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js');
    modDb.onValue(controlsDbRef, (snap)=>{
      const msg = snap.val(); if(!msg) return;
      // dedupe not implemented here for brevity; assume id contains time
      if(msg.action === 'hit' && msg.payload && typeof msg.payload.g === 'number') actHit(msg.payload.g);
      else if(msg.action === 'reset') resetFight();
    });
  }catch(e){ console.warn('realtime setup failed', e); }
}

async function broadcastControl(action,payload={}){
  try{
    const r = await controlsRef(); if(!r) return;
    const modDb = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js');
    const id = Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    await modDb.set(r, { id, action, payload, ts: Date.now() });
  }catch(e){ console.warn('broadcast failed', e); }
}

// ===== Router wiring =====
defineRoutes({
  '/': { render: ()=> navigate('/login') },
  '/login': { render: ()=> renderLogin() },
  '/app': { requiresAuth:true, render: ({user})=> renderApp({user}) },
  '/profile': { requiresAuth:true, render: ({user})=> { root.innerHTML = `<section class="card"><h2>Profile</h2><pre>${JSON.stringify({ uid:user.uid, name:user.displayName, email:user.email },null,2)}</pre></section>` } },
  '/teacher': { requiresAuth:true, render: ()=> renderTeacher() }
});
setNotFound((r)=>{ root.innerHTML = `<section class="card"><h2>404</h2><p>Unknown route ${r}</p></section>` });

// Boot
initAuth((u)=>{
  setUser(u); // inform router
  // set simple global user in router module by re-import pattern
  // start realtime DB always so teacher controls can work if enabled
  setupRealtime();
  // simple route guard handling
  if(u){ if(location.hash==='#/login' || location.hash===''||location.hash==='#/') navigate('/app'); }
  else { if(location.hash.startsWith('#/app')||location.hash.startsWith('#/profile')||location.hash.startsWith('#/teacher')) navigate('/login'); }
  startRouter();
});
