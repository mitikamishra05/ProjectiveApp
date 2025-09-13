// Projectile Motion Simulator
// Tech: Vanilla JS, Canvas

(() => {
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  // Elements
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const angleEl = document.getElementById('angle');
  const angleOut = document.getElementById('angleOut');
  const speedEl = document.getElementById('speed');
  const speedOut = document.getElementById('speedOut');
  const massEl = document.getElementById('mass');
  const massOut = document.getElementById('massOut');
  const planetEl = document.getElementById('planet');
  const customGEl = document.getElementById('customG');
  const gOut = document.getElementById('gOut');
  const tOut = document.getElementById('tOut');
  const hOut = document.getElementById('hOut');
  const rOut = document.getElementById('rOut');
  const launchBtn = document.getElementById('launch');
  const pauseBtn = document.getElementById('pause');
  const resetBtn = document.getElementById('reset');
  const keOut = document.getElementById('keOut');
  const chartCanvas = document.getElementById('chart');
  const chartCtx = chartCanvas ? chartCanvas.getContext('2d') : null;

  const planets = {
    Mercury: 3.7,
    Venus: 8.87,
    Earth: 9.81,
    Moon: 1.62,
    Mars: 3.71,
    Jupiter: 24.79,
    Saturn: 10.44,
    Uranus: 8.69,
    Neptune: 11.15,
    Pluto: 0.62,
  };

  // State
  const state = {
    running: false,
    paused: false,
    t: 0, // seconds
    lastTime: 0,
    path: [], // world coordinates [{x,y}]
    predictedPath: [],
    scale: 2, // pixels per meter (dynamic)
    margins: { left: 60, right: 40, top: 40, bottom: 70 },
    groundY: 0, // world y of ground (0)
  };

  function formatNum(n, digits = 2) {
    if (!isFinite(n)) return '—';
    return Number(n).toFixed(digits);
  }

  function getG() {
    const sel = planetEl.value;
    if (sel === 'Custom') {
      const val = parseFloat(customGEl.value);
      return isFinite(val) && val > 0 ? val : 9.81;
    }
    return planets[sel] ?? 9.81;
  }

  function getSettings() {
    const angleDeg = parseFloat(angleEl.value);
    const angleRad = (angleDeg * Math.PI) / 180;
    const speed = parseFloat(speedEl.value);
    const mass = parseFloat(massEl ? massEl.value : '1');
    const g = getG();
    return { angleDeg, angleRad, speed, mass, g };
  }

  function computeAnalytics(v0, theta, g) {
    // Ideal projectile (no air), from ground level (y0 = 0)
    const vSin = v0 * Math.sin(theta);
    const vCos = v0 * Math.cos(theta);
    const T = g > 0 ? (2 * vSin) / g : Infinity;
    const H = g > 0 ? (vSin * vSin) / (2 * g) : Infinity;
    const R = g > 0 ? (v0 * v0 * Math.sin(2 * theta)) / g : Infinity;
    return { T: Math.max(0, T), H: Math.max(0, H), R: Math.max(0, R), vSin, vCos };
  }

  function predictTrajectoryPoints(v0, theta, g) {
    // Sample 200 points until y <= 0
    const pts = [];
    const { T } = computeAnalytics(v0, theta, g);
    const steps = 200;
    const totalT = Math.max(0.01, T);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * totalT;
      const x = v0 * Math.cos(theta) * t;
      const y = v0 * Math.sin(theta) * t - 0.5 * g * t * t;
      if (y < 0 && i > 0) break;
      pts.push({ x, y });
    }
    return pts;
  }

  function computeScale(v0, theta, g) {
    const { H, R } = computeAnalytics(v0, theta, g);
    const width = canvas.clientWidth * dpr;
    const height = canvas.clientHeight * dpr;
    const { left, right, top, bottom } = state.margins;
    const usableW = Math.max(10, width - left - right);
    const usableH = Math.max(10, height - top - bottom);

    const marginMetersX = Math.max(5, R * 0.05);
    const marginMetersY = Math.max(5, H * 0.3);

    const scaleX = usableW / Math.max(1, R + marginMetersX);
    const scaleY = usableH / Math.max(1, H + marginMetersY);
    // Choose the smaller to ensure both dimensions fit
    return Math.max(0.1, Math.min(scaleX, scaleY));
  }

  function worldToCanvas(x, y) {
    const { left, bottom } = state.margins;
    const width = canvas.width; // in CSS pixels * dpr
    const height = canvas.height;
    const px = left + x * state.scale;
    const py = height - bottom - y * state.scale; // invert y
    return { x: px, y: py };
  }

  function resizeCanvas() {
    // Make canvas responsive to container size, account for DPR
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(320, Math.floor(rect.width));
    const cssH = Math.max(240, Math.floor(rect.height));
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    // Recompute scale when size changes
    const { speed, angleRad, g } = getSettings();
    state.scale = computeScale(speed, angleRad, g);
    state.predictedPath = predictTrajectoryPoints(speed, angleRad, g);
    draw();
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    const { left, right, top, bottom } = state.margins;
    const width = canvas.width;
    const height = canvas.height;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0d1632');
    sky.addColorStop(1, '#0b1020');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Ground
    const groundY = height - bottom;
    ctx.fillStyle = '#1a2a3e';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 0.5);
    ctx.lineTo(width, groundY + 0.5);
    ctx.stroke();

    // Major grid lines (every ~10 meters horizontally, ~5 meters vertically)
    const metersPerMajorX = Math.max(5, Math.round(100 / state.scale));
    const metersPerMajorY = Math.max(2, Math.round(60 / state.scale));

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let mx = 0; mx < 100000; mx += metersPerMajorX) {
      const p = worldToCanvas(mx, 0).x;
      if (p > width - right) break;
      if (p < state.margins.left) continue;
      ctx.beginPath();
      ctx.moveTo(Math.floor(p) + 0.5, top);
      ctx.lineTo(Math.floor(p) + 0.5, groundY);
      ctx.stroke();
    }
    // Horizontal lines
    for (let my = 0; my < 100000; my += metersPerMajorY) {
      const p = worldToCanvas(0, my).y;
      if (p < top) break;
      if (p > groundY) continue;
      ctx.beginPath();
      ctx.moveTo(state.margins.left, Math.floor(p) + 0.5);
      ctx.lineTo(width - right, Math.floor(p) + 0.5);
      ctx.stroke();
    }
  }

  function drawPredictedPath() {
    const pts = state.predictedPath;
    if (!pts || pts.length < 2) return;

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const p0 = worldToCanvas(pts[0].x, pts[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) {
      const p = worldToCanvas(pts[i].x, pts[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPath() {
    const pts = state.path;
    if (pts.length < 2) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#6aa6ff');
    gradient.addColorStop(1, '#4a8bf3');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = worldToCanvas(pts[0].x, pts[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) {
      const p = worldToCanvas(pts[i].x, pts[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function drawBall(x, y) {
    const p = worldToCanvas(x, y);
    const r = Math.max(4, Math.min(10, 8));

    // Glow
    const g = ctx.createRadialGradient(p.x - r/2, p.y - r/2, r/4, p.x, p.y, r*2);
    g.addColorStop(0, 'rgba(106,166,255,0.5)');
    g.addColorStop(1, 'rgba(106,166,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    const ballGrad = ctx.createLinearGradient(p.x, p.y - r, p.x, p.y + r);
    ballGrad.addColorStop(0, '#d1e2ff');
    ballGrad.addColorStop(1, '#89b5ff');
    ctx.fillStyle = ballGrad;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawHUD() {
    const { angleDeg, speed, g } = getSettings();
    const { H, R, T } = computeAnalytics(speed, (angleDeg * Math.PI) / 180, g);
    tOut.textContent = formatNum(T, 2);
    hOut.textContent = formatNum(H, 2);
    rOut.textContent = formatNum(R, 2);
    gOut.textContent = formatNum(g, 2);

    // Axes labels (simple)
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${14 * dpr}px Inter, sans-serif`;
    // X axis label
    const y = canvas.height - state.margins.bottom + 24 * dpr;
    ctx.fillText('Distance (m)', state.margins.left, y);
    // Y axis label (rotated)
    ctx.translate(18 * dpr, canvas.height - state.margins.bottom - 10 * dpr);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Height (m)', 0, 0);
    ctx.restore();
  }

  function draw() {
    clearCanvas();
    drawGrid();
    drawPredictedPath();

    // Current path + ball
    if (state.path.length) {
      drawPath();
      const last = state.path[state.path.length - 1];
      drawBall(last.x, last.y);
    }

    drawHUD();
  }

  function resetSimulation(hard = false) {
    state.running = false;
    state.paused = false;
    state.t = 0;
    state.lastTime = 0;
    state.path = [];

    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    resetBtn.disabled = !hard ? false : true; // keep reset enabled after a run
    draw();
  }

  function startSimulation() {
    const { speed, angleRad, g } = getSettings();
    if (!isFinite(speed) || speed <= 0) return;
    if (!isFinite(g) || g <= 0) return;

    // Recompute scale & predicted path before launching
    state.scale = computeScale(speed, angleRad, g);
    state.predictedPath = predictTrajectoryPoints(speed, angleRad, g);

    state.running = true;
    state.paused = false;
    state.t = 0;
    state.lastTime = 0;
    state.path = [{ x: 0, y: 0 }];

    launchBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;

    requestAnimationFrame(tick);
  }

  function drawKE(t, v) {
    if (!chartCtx || !isFinite(v)) return;
    // Scroll-like chart: shift left by 2px, draw new line point
    const w = chartCanvas.width, h = chartCanvas.height;
    const img = chartCtx.getImageData(2, 0, w - 2, h);
    chartCtx.putImageData(img, 0, 0);
    chartCtx.clearRect(w - 2, 0, 2, h);
    // Normalize KE to chart height heuristically
    const scale = Math.max(1, 0.5 * h / 1000); // arbitrary scale for visibility
    const y = Math.max(0, h - Math.min(h, 0.5 * v * v * scale));
    chartCtx.fillStyle = '#6aa6ff';
    chartCtx.fillRect(w - 2, y, 2, 2);
  }

  function tick(ts) {
    if (!state.running) {
      draw();
      return;
    }

    if (state.lastTime === 0) state.lastTime = ts;
    const dt = Math.min(0.05, (ts - state.lastTime) / 1000); // clamp to avoid big jumps
    state.lastTime = ts;

    if (!state.paused) {
      state.t += dt;
      const { speed, angleRad, g, mass } = getSettings();
      const x = speed * Math.cos(angleRad) * state.t;
      const y = speed * Math.sin(angleRad) * state.t - 0.5 * g * state.t * state.t;

      if (y >= 0) {
        state.path.push({ x, y });
        // KE = 1/2 m v^2; here v is instantaneous speed; we use planar components
        const vx = speed * Math.cos(angleRad);
        const vy = speed * Math.sin(angleRad) - g * state.t;
        const v = Math.sqrt(vx*vx + vy*vy);
        const ke = 0.5 * mass * v * v;
        if (keOut) keOut.textContent = formatNum(ke, 1);
        if (chartCtx) drawKE(state.t, v);
      } else {
        // Landed
        state.running = false;
        launchBtn.disabled = false;
        pauseBtn.disabled = true;
      }
    }

    draw();
    if (state.running) requestAnimationFrame(tick);
  }

  // Event handlers
  function onAngleChange() {
    angleOut.textContent = `${angleEl.value}°`;
    refreshPreview();
  }
  function onMassChange() {
    if (!massOut) return;
    massOut.textContent = `${massEl.value} kg`;
  }

  function onSpeedChange() {
    speedOut.textContent = `${speedEl.value} m/s`;
    refreshPreview();
  }
  function onPlanetChange() {
    if (planetEl.value === 'Custom') {
      customGEl.disabled = false;
      customGEl.focus();
    } else {
      customGEl.disabled = true;
      customGEl.value = planets[planetEl.value] ?? 9.81;
    }
    refreshPreview();
  }
  function onCustomGChange() {
    refreshPreview();
  }

  function refreshPreview() {
    const { speed, angleRad, g } = getSettings();
    state.scale = computeScale(speed, angleRad, g);
    state.predictedPath = predictTrajectoryPoints(speed, angleRad, g);
    draw();
  }

  // Buttons
  launchBtn.addEventListener('click', startSimulation);
  pauseBtn.addEventListener('click', () => {
    if (!state.running) return;
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
  });
  resetBtn.addEventListener('click', () => resetSimulation(true));

  // Inputs
  angleEl.addEventListener('input', onAngleChange);
  speedEl.addEventListener('input', onSpeedChange);
  if (massEl) massEl.addEventListener('input', onMassChange);
  planetEl.addEventListener('change', onPlanetChange);
  customGEl.addEventListener('input', onCustomGChange);

  // Resize
  window.addEventListener('resize', resizeCanvas);

  // Initial UI sync
  angleOut.textContent = `${angleEl.value}°`;
  speedOut.textContent = `${speedEl.value} m/s`;
  if (massOut && massEl) massOut.textContent = `${massEl.value} kg`;
  customGEl.value = planets[planetEl.value] ?? 9.81;

  // Initial sizing & draw
  resizeCanvas();
  resetSimulation();
})();

