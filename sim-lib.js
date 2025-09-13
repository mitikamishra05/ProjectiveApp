// sim-lib.js - Shared utilities for simulation pages
// - Auth gate and Firestore helpers
// - Lightweight chart drawing on canvas with axes and units
// - Snapshot capture and save to Firestore under users/{uid}/simulations

export async function ensureAuthAndDb() {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const firebaseConfig = {
    apiKey: 'YOUR_API_KEY', authDomain: 'YOUR_AUTH_DOMAIN', projectId: 'YOUR_PROJECT_ID', storageBucket: 'YOUR_STORAGE_BUCKET', messagingSenderId: 'YOUR_MESSAGING_SENDER_ID', appId: 'YOUR_APP_ID',
  };
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = await new Promise(resolve => {
    onAuthStateChanged(auth, u => resolve(u));
  });
  if (!user) { window.location.replace('login.html'); throw new Error('Not signed in'); }
  return { auth, db, user };
}

export async function saveSimulation(db, user, { title, topic, params, results, snapshot, resumeUrl }) {
  const { collection, addDoc, serverTimestamp, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const docRef = await addDoc(collection(db, 'users', user.uid, 'simulations'), {
    title: title || topic || 'Simulation',
    topic: topic || null,
    params: params || null,
    results: results || null,
    snapshot: snapshot || null, // dataURL (small)
    resumeUrl: resumeUrl || null,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'users', user.uid), { lastSim: { id: docRef.id, title: title || topic, resumeUrl: resumeUrl || null } }, { merge: true });
  return docRef.id;
}

export function getQueryParams() {
  const q = new URLSearchParams(window.location.search);
  const entries = {}; q.forEach((v, k) => { entries[k] = v; });
  return entries;
}

export function bindSlider(id, outId, unit='') {
  const el = document.getElementById(id);
  const out = document.getElementById(outId);
  if (!el || !out) return () => {};
  const fmt = () => { out.textContent = `${el.value}${unit}`; };
  el.addEventListener('input', fmt); fmt();
  return fmt;
}

export function snapshotCanvas(canvas, width=320, height=160) {
  try {
    const tmp = document.createElement('canvas');
    tmp.width = width; tmp.height = height;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(canvas, 0, 0, width, height);
    return tmp.toDataURL('image/png');
  } catch (e) {
    console.warn('snapshot failed', e); return null;
  }
}

// Lightweight chart util
export function makeChart(canvas, { xLabel='x', yLabel='y', xUnit='', yUnit='', xMax=10, yMax=10 }={}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const margins = { left: 50, right: 20, top: 20, bottom: 50 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const cw = Math.max(320, Math.floor(rect.width));
    const ch = Math.max(160, Math.floor(rect.height));
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    drawAxes();
  }

  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

  function worldToCanvas(x, y) {
    const w = canvas.width, h = canvas.height;
    const ux = w - margins.left - margins.right;
    const uy = h - margins.top - margins.bottom;
    const px = margins.left + (x / xMax) * ux;
    const py = h - margins.bottom - (y / yMax) * uy;
    return { x: px, y: py };
  }

  function drawAxes() {
    clear();
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0,0,w,h);
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    const xTicks = 10, yTicks = 5;
    for (let i=0;i<=xTicks;i++) {
      const x = margins.left + ((w - margins.left - margins.right) * i / xTicks);
      ctx.beginPath(); ctx.moveTo(x, margins.top); ctx.lineTo(x, h - margins.bottom); ctx.stroke();
      const val = (xMax * i / xTicks).toFixed(1);
      ctx.fillStyle = 'rgba(230,233,240,0.8)'; ctx.font = `${12*dpr}px Inter, sans-serif`;
      ctx.fillText(val, x-6*dpr, h - margins.bottom + 16*dpr);
    }
    for (let i=0;i<=yTicks;i++) {
      const y = h - margins.bottom - ((h - margins.top - margins.bottom) * i / yTicks);
      ctx.beginPath(); ctx.moveTo(margins.left, y); ctx.lineTo(w - margins.right, y); ctx.stroke();
      const val = (yMax * i / yTicks).toFixed(1);
      ctx.fillStyle = 'rgba(230,233,240,0.8)'; ctx.font = `${12*dpr}px Inter, sans-serif`;
      ctx.fillText(val, 8*dpr, y+4*dpr);
    }
    // Axis labels
    ctx.fillStyle = 'rgba(230,233,240,0.9)'; ctx.font = `${14*dpr}px Inter, sans-serif`;
    ctx.fillText(`${xLabel} (${xUnit})`, margins.left, h - 12*dpr);
    ctx.save(); ctx.translate(12*dpr, h - margins.bottom); ctx.rotate(-Math.PI/2);
    ctx.fillText(`${yLabel} (${yUnit})`, 0, 0);
    ctx.restore();
  }

  function plotSeries(series) {
    // series: [{points:[{x,y}], color:'#..', label:'..', markers?:true, annotate?:function(pt,index)}]
    drawAxes();
    for (const s of series) {
      if (!s.points || s.points.length < 1) continue;
      ctx.strokeStyle = s.color || '#6aa6ff'; ctx.lineWidth = 2*dpr; ctx.beginPath();
      const p0 = worldToCanvas(s.points[0].x, s.points[0].y); ctx.moveTo(p0.x, p0.y);
      for (let i=1;i<s.points.length;i++) {
        const p = worldToCanvas(s.points[i].x, s.points[i].y); ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      if (s.markers) {
        for (let i=0;i<s.points.length;i++) {
          const p = worldToCanvas(s.points[i].x, s.points[i].y);
          ctx.fillStyle = s.color || '#6aa6ff'; ctx.beginPath(); ctx.arc(p.x, p.y, 3*dpr, 0, Math.PI*2); ctx.fill();
          if (s.annotate) s.annotate(s.points[i], i, p, ctx);
        }
      }
    }
  }

  window.addEventListener('resize', resize);
  resize();
  return { resize, plotSeries, drawAxes };
}

