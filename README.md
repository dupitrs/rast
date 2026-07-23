# rast — studio landing page

A dark, high-craft landing page for **rast**, a web design & development studio.
*("Rast" means "to find / obtain" in Latvian — the studio's idea is the bridge **atrast → radīt**: find the right idea, then create it.)*

Built as a self-contained static site — no build step, no framework. Open it or drag
it to any host. Inspired in spirit by award-winning agency sites (fiddle.digital).

---

## Preview locally

```powershell
# from this folder
python serve.py
# then open http://localhost:5173
```

Use `serve.py` — **not** `python -m http.server`. The site links to clean URLs with no
`.html` extension (`/majaslapu-izstrade`, `/raksti/cik-maksa-majaslapa`), which GitHub
Pages resolves natively but `http.server` does not — every internal link would 404
locally. `serve.py` is ~50 lines of standard library: it falls back to `<path>.html`
when `<path>` has no file, keeps the usual `index.html` behaviour for folders, and
sends `Cache-Control: no-store` so the browser never serves you stale CSS/JS while you
work. Pass a port to override the default: `python serve.py 8080`.

(You need an internet connection the first time so the CDN libraries — Lenis + GSAP —
and Google Fonts can load. The page still works if they fail; it just shows without
the fancy motion.)

---

## Deploy (pick one — all free)

- **Netlify Drop:** drag this folder onto https://app.netlify.com/drop — live in seconds.
- **Vercel:** `vercel` in this folder, or import the repo at vercel.com.
- **GitHub Pages:** push to a repo → Settings → Pages → deploy from branch root.
- **Cloudflare Pages:** connect the repo, framework preset = "None", output dir = `/`.

No build command is needed for any of them.

---

## What to customize (search for these)

| What | Where | Notes |
|------|-------|-------|
| **Email** | `hello@rast.studio` (in `index.html`) | Replace everywhere with your real address. |
| **Social links** | footer `href="#"` | Add your Instagram / Dribbble / Behance / LinkedIn URLs. |
| **Work projects** | `index.html` → `.work__grid` | The cards are **CONCEPT placeholders** (tagged "Concept"). Swap in real work as you land it — update the title, category and the `.work__media--1/2/3` art (or drop in a real `<img>`). |
| **Copy** | hero / studio / capabilities | Wording is a strong starting point — make it yours. |
| **Accent colour** | `css/styles.css` → `--accent` | The single vermilion accent `#FF4A2E` (one accent only, ≤10% of any view; text on an accent fill is `--bg`, never white). Change one variable to re-skin. |
| **Parallax band image** | `css/styles.css` → `.band__bg` | It's a generated gradient by default. To use a real photo, uncomment `background-image: url('assets/band.jpg')` and drop your image in `assets/`. |
| **WebGL wave colours** | `js/main.js` → `uColorA` / `uColorB` | The hero particle field's two colours. |
| **Fonts** | `<link>` in `index.html` + `--font-*` | Two families only: Bricolage Grotesque (display) · Inter (UI + labels). No monospace. |
| **OG share image** | `assets/og.png` | Add a 1200×630 image for nice link previews (referenced in `<meta og:image>`). |

### Honesty note
Because the studio is brand-new with no clients yet, this build intentionally avoids
fake client logos, awards, or testimonials. The "work" section ships as clearly-labelled
**concept** pieces, and social proof is the studio's own manifesto + process. Replace the
concepts with real projects over time.

---

## Tech

- **HTML / CSS / vanilla JS** — zero build. Content is in **Latvian** (the manifesto slogan is kept in English on purpose).
- **[Three.js](https://threejs.org/)** — the hero's interactive **WebGL particle-wave** field, written with custom GLSL shaders (simplex-noise displacement + mouse ripple + scroll parallax). Falls back to a 2D canvas if WebGL is unavailable.
- **[Lenis](https://github.com/darkroomengineering/lenis)** — smooth scrolling (CDN).
- **[GSAP](https://gsap.com/) + ScrollTrigger** — headline reveals, scroll animation, split-text, marquee, and the parallax band (CDN).
- Fully responsive, accessible (skip link, focus states, reduced-motion support, semantic HTML),
  and degrades gracefully if any CDN is unavailable.

---

## File structure

```
rast/
├─ index.html        # markup + content
├─ css/styles.css    # design system + all styling
├─ js/main.js        # interactions (guarded; safe if a CDN fails)
├─ serve.py          # local dev server (clean URLs, no caching)
├─ assets/           # add og.png, real project images here
└─ README.md
```
