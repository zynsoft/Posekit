import { POSES, CATS } from './js/poses.js';
import { extract } from './js/segment.js';
import { Cam, camError } from './js/camera.js';

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const COLORS = ['#56d8ff', '#ffffff', '#ffc857', '#ff7eb6', '#7dffb0'];
const DEF = { op: 80, sc: 100, x: 0, y: 0, flip: false, ghost: false, gop: 40 };
const S = { cat: 'All', q: '', pose: null, res: null, color: COLORS[0], timer: 0, facing: 'user', cam: false, busy: false, ...DEF };
const cam = new Cam($('#vid'));
const stage = $('#stage');
let uploads = [], tinted = null, blob = null, iv = null, retry = null;

/* ---------- helpers ---------- */
const toast = (t) => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 2200); };
const state = (s, t) => { stage.dataset.s = s; if (t) $('#loadTxt').textContent = t; };
const view = (id) => $$('.view').forEach((v) => v.classList.toggle('on', v.id === id));
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Could not open this image.')); i.src = src; });
const fail = (msg, fn) => { $('#errTxt').textContent = msg; retry = fn; state('err'); };

/* ---------- home ---------- */
const card = (p) => `<article class="card"><div class="im"><img loading="lazy" src="${p.src}" alt="${p.name}"></div>
<div class="mt"><h3>${p.name}</h3><span>${p.cat}</span></div><button class="btn sm" data-id="${p.id}">Select Pose</button></article>`;
const row = (t, a) => a.length ? `<h2>${t}</h2><div class="row">${a.map(card).join('')}</div>` : '';

function render() {
  const q = S.q.trim().toLowerCase();
  const all = [...uploads, ...POSES];
  const hit = all.filter((p) => (S.cat === 'All' || p.cat === S.cat) && (p.name + ' ' + p.cat).toLowerCase().includes(q));
  $('#sections').innerHTML = (S.cat !== 'All' || q)
    ? (hit.length ? `<h2>${hit.length} pose${hit.length > 1 ? 's' : ''}</h2><div class="grid">${hit.map(card).join('')}</div>` : '<p class="empty">No poses match. Try another word or category.</p>')
    : row('Popular poses', POSES.filter((p) => p.pop)) + row('Trending now', POSES.filter((p) => p.trend)) +
      `<h2>Recently added</h2><div class="grid">${[...uploads, ...POSES.filter((p) => p.fresh)].map(card).join('')}</div>`;
}
$('#cats').innerHTML = ['All', ...CATS].map((c) => `<button class="${c === 'All' ? 'on' : ''}">${c}</button>`).join('');
$('#cats').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.cat = b.textContent; $$('#cats button').forEach((x) => x.classList.toggle('on', x === b)); render(); };
$('#q').oninput = (e) => { S.q = e.target.value; render(); };
$('#sections').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) openPose([...uploads, ...POSES].find((p) => p.id === b.dataset.id)); };
$('#upl').onclick = () => $('#file').click();
$('#file').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const p = { id: 'u' + Date.now(), name: 'My reference', cat: 'Your photo', src: URL.createObjectURL(f) };
  uploads.unshift(p); e.target.value = ''; render(); openPose(p);
};

/* ---------- editor flow ---------- */
async function openPose(p) {
  cam.stop(); S.cam = false; $('#vid').style.opacity = ''; Object.assign(S, DEF); syncUI();
  S.pose = p; S.res = null; tinted = null;
  $('#ttl').textContent = p.name; view('editor'); state('load', 'Loading reference…'); draw();
  try {
    const img = await loadImg(p.src);
    S.res = await extract(img, (t) => state('load', t));
    state('ready'); draw();
  } catch (e) {
    console.error(e);
    fail((e.message || 'Something went wrong.') + ' If the AI model could not download, check your connection.', () => openPose(p));
  }
}

async function startCam() {
  state('load', 'Opening camera…');
  try { await cam.start(S.facing); S.cam = true; mirror(); state('cam'); }
  catch (e) { S.cam = false; fail(camError(e), startCam); }
}
const mirror = () => ($('#vid').style.transform = S.facing === 'user' ? 'scaleX(-1)' : 'none');

$('#start').onclick = startCam;
$('#errBtn').onclick = () => retry?.();
$('#back').onclick = () => { endTimer(); cam.stop(); S.cam = false; view('home'); };
$('#swap').onclick = async () => { S.facing = S.facing === 'user' ? 'environment' : 'user'; if (S.cam) await startCam(); else toast(S.facing === 'user' ? 'Front camera' : 'Back camera'); };

/* ---------- overlay drawing ---------- */
function tint() {
  const o = S.res.outline, c = Object.assign(document.createElement('canvas'), { width: o.width, height: o.height }), g = c.getContext('2d');
  g.drawImage(o, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = S.color; g.fillRect(0, 0, c.width, c.height);
  return (tinted = c);
}
function draw() {
  const c = $('#ov'), r = stage.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, r.width, r.height);
  if (!S.res) return;
  const { outline, src, bbox } = S.res, W = r.width, H = r.height;
  const ch = H * 0.7 * (S.sc / 100), k = ch / bbox.h, cw = bbox.w * k;
  g.save(); g.translate(W / 2 + (S.x / 100) * (W / 2), H * 0.46 + (S.y / 100) * (H / 2));
  if (S.flip) g.scale(-1, 1);
  if (S.ghost) { g.globalAlpha = S.gop / 100; g.drawImage(src, -cw / 2 - bbox.x * k, -ch / 2 - bbox.y * k, src.width * k, src.height * k); }
  g.globalAlpha = S.op / 100; g.shadowColor = S.color; g.shadowBlur = 10;
  g.drawImage(tinted || tint(), -cw / 2, -ch / 2, cw, ch);
  g.restore();
}
addEventListener('resize', draw);

/* ---------- controls ---------- */
const bind = (id, key, fmt) => { const el = $(id), o = el.parentElement.querySelector('output'); const f = () => { S[key] = +el.value; o.textContent = fmt(+el.value); draw(); }; el.oninput = f; el._sync = () => { el.value = S[key]; o.textContent = fmt(S[key]); }; };
bind('#op', 'op', (v) => v + '%'); bind('#sc', 'sc', (v) => v + '%'); bind('#px', 'x', (v) => v); bind('#py', 'y', (v) => v); bind('#go', 'gop', (v) => v + '%');
function syncUI() { ['#op', '#sc', '#px', '#py', '#go'].forEach((i) => $(i)._sync()); $('#gh').checked = S.ghost; }
$('#gh').onchange = (e) => { S.ghost = e.target.checked; draw(); };
$('#flip').onclick = () => { S.flip = !S.flip; $('#flip').classList.toggle('on', S.flip); draw(); };
$('#reset').onclick = () => { Object.assign(S, DEF); syncUI(); $('#flip').classList.remove('on'); draw(); };
$('#sw').innerHTML = COLORS.map((c, i) => `<button style="background:${c}" class="${i ? '' : 'on'}" data-c="${c}" aria-label="Colour ${c}"></button>`).join('');
$('#sw').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.color = b.dataset.c; tinted = null; $$('#sw button').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
$$('.tab[data-t]').forEach((b) => b.onclick = () => {
  const p = $('#panel'), open = p.dataset.o === b.dataset.t;
  open ? p.removeAttribute('data-o') : (p.dataset.o = b.dataset.t);
  $$('.tab[data-t]').forEach((x) => x.classList.toggle('on', !open && x === b));
});
$('#tm').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.timer = +b.dataset.t; $$('#tm button').forEach((x) => x.classList.toggle('on', x === b)); $('#tmLbl').textContent = S.timer ? S.timer + 's' : 'Timer'; };

/* ---------- capture ---------- */
function endTimer() { clearInterval(iv); S.busy = false; $('#cd').classList.remove('on'); $('#shutter').classList.remove('stop'); }
$('#shutter').onclick = () => {
  if (!S.cam) return S.res ? startCam() : toast('Still preparing the outline…');
  if (S.busy) return endTimer();
  if (!S.timer) return snap();
  let n = S.timer; S.busy = true; $('#shutter').classList.add('stop'); $('#panel').removeAttribute('data-o'); $$('.tab').forEach((x) => x.classList.remove('on'));
  $('#cd').textContent = n; $('#cd').classList.add('on');
  iv = setInterval(() => { if (--n <= 0) { endTimer(); snap(); } else $('#cd').textContent = n; }, 1000);
};
function snap() {
  $('#flash').classList.remove('on'); void $('#flash').offsetWidth; $('#flash').classList.add('on');
  const c = cam.capture(S.facing === 'user');
  c.toBlob((b) => { blob = b; $('#pimg').src = URL.createObjectURL(b); $('#prev').classList.add('on'); }, 'image/jpeg', 0.95);
}
$('#retake').onclick = () => { URL.revokeObjectURL($('#pimg').src); blob = null; $('#prev').classList.remove('on'); };
$('#save').onclick = () => {
  if (!blob) return;
  const a = document.createElement('a'), t = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  a.href = URL.createObjectURL(blob); a.download = `posekit-${t}.jpg`; document.body.appendChild(a); a.click(); a.remove();
  toast('Saved to your device');
};

syncUI(); render();
