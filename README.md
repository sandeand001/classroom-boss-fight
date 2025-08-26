Classroom Boss Fight — Static SPA (Firebase Auth + Realtime Teacher Controls)

Lightweight vanilla SPA that uses Firebase Authentication (Google + Email/Password) and Firebase Realtime Database for teacher/device sync. Designed to be static and deployable to GitHub Pages.

Files of interest
- `index.html` — SPA entry point
- `404.html` — GH Pages SPA fallback
- `styles/styles.css` — site styles
- `js/firebase-init.js` — imports Firebase (CDN) and initializes app (paste your config)
- `js/auth.js` — auth helpers (sign in / sign up / onAuthStateChanged)
- `js/router.js` — simple hash router
- `js/app.js` — UI + realtime controls logic

Local testing (Windows 11, PowerShell, VS Code)
1) Using VS Code Live Server extension: open the folder and "Open with Live Server" (launches https://127.0.0.1:5500 or similar).
2) Or using Node `serve` (no install globally required):

```
npx serve -s . -l 5000
# or use python simple server (no SPA rewrites needed for hash routing):
py -3 -m http.server 8000
```

Firebase setup checklist
1. Go to Firebase Console → Create Project.
2. Enable Authentication → Sign-in method → Google and Email/Password.
3. Add Authorized domains: `localhost` and your GitHub Pages domain `YOUR_GHUSER.github.io`.
4. Copy the Web SDK config object and paste it into `js/firebase-init.js` replacing the placeholder `firebaseConfig`.

GitHub Pages deployment (Actions)
1. The repo includes a workflow `.github/workflows/pages.yml` that deploys the repo root to GitHub Pages. Push to `main` and allow the action to publish.
2. If you prefer the legacy branch approach, you can set Pages to use `gh-pages` branch after running a deploy script — but Actions handles it.

Security notes
- Firebase web config is public by design. Do not store server secrets in client code. Use Firebase Rules for database/security concerns.

Smoke tests
- Load site unauthenticated: you should see Login screen.
- Sign in with Email/Password: redirected to `#/app` and see UID and welcome.
- Sign out: returns to `#/login`.
- From a second device (mobile), sign in (teacher account) and open `#/teacher`, use buttons to broadcast controls — they should sync to other devices.
Bossfight — Subject image packs

Place boss images in folders using the naming convention:

assets/bosses/{subject}-boss/
  - base-position.png      (base pose)
  - attack-position.png    (boss attacking)
  - hit-position.png       (boss being hit)
  - defeated-position.png  (boss defeated)

Examples already included: `math-boss`, `phonics-boss`, `story-comprehension-boss`.

In the app open Config (G) and choose the subject from the Image Pack dropdown. The app will load images from the matching folder and fall back to a placeholder if any image is missing.
