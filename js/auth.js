"use strict";
/**
 * auth.js
 * - Small wrapper around Firebase Auth (modular SDK).
 * - Exports: initAuth(onChange), signInWithGooglePopup(), signUpWithEmail(), signInWithEmail(), signOutUser()
 */

import { getAuthInstance } from './firebase-init.js';

/**
 * Initialize auth state listener. Callback receives the firebase user or null.
 * @param {(user: any)=>void} onChange
 */
export async function initAuth(onChange){
  const auth = await getAuthInstance();
  if(!auth){ onChange(null); return; }
  const modAuth = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
  const { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = modAuth;
  onAuthStateChanged(auth, (u)=> onChange(u));
  // attach helpers
  initAuth._auth = auth;
  initAuth._provider = new GoogleAuthProvider();
  initAuth._impl = { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut };
}

/** Sign in with Google (popup). Throws on error. */
export async function signInWithGooglePopup(){
  if(!initAuth._auth) throw new Error('auth not initialized');
  const { signInWithPopup } = initAuth._impl;
  return signInWithPopup(initAuth._auth, initAuth._provider);
}

/** Sign up using email/password */
export async function signUpWithEmail(email, password){
  if(!initAuth._auth) throw new Error('auth not initialized');
  const { createUserWithEmailAndPassword } = initAuth._impl;
  return createUserWithEmailAndPassword(initAuth._auth, email, password);
}

/** Sign in using email/password */
export async function signInWithEmail(email, password){
  if(!initAuth._auth) throw new Error('auth not initialized');
  const { signInWithEmailAndPassword } = initAuth._impl;
  return signInWithEmailAndPassword(initAuth._auth, email, password);
}

/** Sign out */
export async function signOutUser(){ if(!initAuth._auth) return; return initAuth._impl.signOut(initAuth._auth); }
