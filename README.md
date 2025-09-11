# Projectile Motion Simulator

Live demo: https://mitikamishra05.github.io/ProjectiveApp/

An interactive, attractive browser-based simulation of projectile motion. Adjust launch angle, initial speed, and gravity (pick a planet or set a custom g), then launch to see the ball fly with live metrics and a predicted path.

## Features
- Gravity presets: Mercury, Venus, Earth, Moon, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, plus Custom g
- Angle and speed sliders with live readouts
- Predicted trajectory (dashed) and animated flight path
- Live metrics: time of flight, maximum height, and range
- Responsive layout; no build tools required (pure HTML/CSS/JS)

## How to use
- Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
- Adjust:
  - Angle (°)
  - Initial speed (m/s)
  - Gravity via planet preset or choose "Custom" and enter a value (m/s²)
- Click Launch. You can Pause/Resume or Reset at any time.

## Physics
Assuming launch from ground level (y0 = 0) with no air resistance:
- x(t) = v0 cos(θ) · t
- y(t) = v0 sin(θ) · t − ½ g t²
- Time of flight: T = 2 v0 sin(θ) / g
- Maximum height: H = (v0² sin²(θ)) / (2 g)
- Range: R = (v0² sin(2θ)) / g

## Run locally (optional server)
This is a static site; you can just open `index.html`. If you prefer a local server:
```bash
python -m http.server 8000
# then open http://localhost:8000/
```

## Project structure
- `index.html` — UI layout and canvas
- `styles.css` — Modern, responsive styling
- `script.js` — Physics, rendering, and interactivity
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow
- `.nojekyll` — Ensures Pages serves files as-is (no Jekyll processing)

## Deployment (GitHub Pages)
This repository deploys automatically on every push to `main`.
- Workflow: GitHub Actions builds an artifact and publishes to Pages.
- Live URL: https://mitikamishra05.github.io/ProjectiveApp/

## License
No license specified yet.
