"use strict";
/**
 * router.js
 * - Minimal hash router for SPA: routes defined as render functions.
 * - Uses #/login, #/app, #/profile, #/teacher
 */

let routes = {};
let onNotFound = null;
let currentUser = null;

export function defineRoutes(map){ routes = map; }
export function setNotFound(fn){ onNotFound = fn; }

export function setUser(u){ currentUser = u; }

function getHash(){ return location.hash.replace(/^#/, '') || '/'; }

export function navigate(path){ location.hash = path; }

function handleRoute(){
  const raw = getHash();
  const route = raw.split('?')[0];
  const r = routes[route];
  if(!r){ if(onNotFound) onNotFound(route); return; }
  // guard logic: if route.requiresAuth and no user, redirect
  if(r.requiresAuth && !currentUser){ navigate('/login'); return; }
  r.render({ user: currentUser, params: {} });
}

export function startRouter(){ window.addEventListener('hashchange', handleRoute); handleRoute(); }
