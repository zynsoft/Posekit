// Person extraction: MediaPipe (deeplab_v3, class 15 = person) + OpenCV.js refinement. All on-device.
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODELS = [
  'assets/models/deeplab_v3.tflite', // optional local copy for offline use
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite',
];
const CV_URL = 'https://docs.opencv.org/4.10.0/opencv.js';
const MAXD = 720;
let seg = null, cvP = null;

const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

async function getSeg() {
  if (seg) return seg;
  const { ImageSegmenter, FilesetResolver } = await import(MP + '/vision_bundle.mjs');
  const fs = await FilesetResolver.forVisionTasks(MP + '/wasm');
  let last;
  for (const m of MODELS) for (const d of ['GPU', 'CPU']) {
    try {
      return (seg = await ImageSegmenter.createFromOptions(fs, {
        baseOptions: { modelAssetPath: m, delegate: d },
        runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false,
      }));
    } catch (e) { last = e; }
  }
  throw last || new Error('AI model could not be loaded. Check your connection.');
}

function loadCV() {
  if (window.cv && cv.Mat) return Promise.resolve();
  return (cvP ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = CV_URL; s.async = true;
    s.onerror = () => { cvP = null; rej(new Error('OpenCV failed to load')); };
    s.onload = () => (cv.Mat ? res() : (cv.onRuntimeInitialized = res));
    document.head.appendChild(s);
  }));
}

// Images with real transparency (PNG/SVG cut-outs) already carry the silhouette.
function alphaMask(c, w, h) {
  try {
    const d = c.getContext('2d').getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    let t = 0;
    for (let i = 0; i < m.length; i++) d[i * 4 + 3] > 128 ? (m[i] = 255) : t++;
    return t > m.length * 0.05 && t < m.length * 0.95 ? m : null;
  } catch { return null; }
}

function cleanCV(mask, w, h) {
  const m = new cv.Mat(h, w, cv.CV_8UC1); m.data.set(mask);
  const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7));
  cv.morphologyEx(m, m, cv.MORPH_CLOSE, k); cv.morphologyEx(m, m, cv.MORPH_OPEN, k);
  cv.GaussianBlur(m, m, new cv.Size(9, 9), 0); cv.threshold(m, m, 127, 255, cv.THRESH_BINARY);
  const area = (cs) => { let mx = 0; for (let i = 0; i < cs.size(); i++) mx = Math.max(mx, cv.contourArea(cs.get(i))); return mx; };
  const cs = new cv.MatVector(), hi = new cv.Mat();
  cv.findContours(m, cs, hi, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
  const mx = area(cs), ext = cv.Mat.zeros(h, w, cv.CV_8UC1), fill = new cv.Mat();
  for (let i = 0; i < cs.size(); i++) if (cv.contourArea(cs.get(i)) >= mx * 0.04) {
    const v = new cv.MatVector(); v.push_back(cs.get(i));
    cv.drawContours(ext, v, -1, new cv.Scalar(255), cv.FILLED); v.delete();
  }
  cv.bitwise_and(m, ext, fill); // drops specks, keeps gaps (e.g. between arm and torso)
  const c2 = new cv.MatVector(), line = cv.Mat.zeros(h, w, cv.CV_8UC1);
  cv.findContours(fill, c2, new cv.Mat(), cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
  const keep = new cv.MatVector();
  for (let i = 0; i < c2.size(); i++) if (cv.contourArea(c2.get(i)) >= mx * 0.003) keep.push_back(c2.get(i));
  cv.drawContours(line, keep, -1, new cv.Scalar(255), Math.max(3, Math.round(w / 120)), cv.LINE_AA);
  const out = { fill: fill.data.slice(), line: line.data.slice() };
  [m, k, cs, hi, ext, fill, c2, line, keep].forEach((x) => x.delete());
  return out;
}

function edgeFallback(m, w, h) { // no OpenCV: simple edge trace
  const r = Math.max(2, Math.round(w / 200)), o = new Uint8Array(w * h);
  for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) {
    const i = y * w + x;
    if (m[i] && (!m[i - r] || !m[i + r] || !m[i - r * w] || !m[i + r * w])) o[i] = 255;
  }
  return { fill: m, line: o };
}

export async function extract(img, status = () => {}) {
  const sc = Math.min(1, MAXD / Math.max(img.naturalWidth, img.naturalHeight));
  let w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
  let src = mk(w, h); src.getContext('2d').drawImage(img, 0, 0, w, h);
  let mask = alphaMask(src, w, h);
  if (!mask) {
    status('Loading AI model…');
    const s = await getSeg();
    status('Detecting the person…');
    const r = s.segment(src), cm = r.categoryMask, d = cm.getAsUint8Array();
    if (cm.width !== w || cm.height !== h) {
      w = cm.width; h = cm.height; src = mk(w, h); src.getContext('2d').drawImage(img, 0, 0, w, h);
    }
    mask = new Uint8Array(w * h);
    let n = 0;
    for (let i = 0; i < mask.length; i++) if (d[i] === 15) { mask[i] = 255; n++; }
    r.close?.();
    if (n < mask.length * 0.01) throw new Error('No person found. Try a clearer full-body photo.');
  }
  status('Tracing the silhouette…');
  let res;
  try { await loadCV(); res = cleanCV(mask, w, h); }
  catch (e) { console.warn('OpenCV unavailable, using fallback', e); res = edgeFallback(mask, w, h); }

  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (res.fill[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 <= x0) throw new Error('No person found in this photo.');
  const pad = Math.round(w * 0.02);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + pad); y1 = Math.min(h, y1 + pad);
  const full = mk(w, h), id = new ImageData(w, h);
  for (let i = 0; i < res.line.length; i++) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = res.line[i]; }
  full.getContext('2d').putImageData(id, 0, 0);
  const bbox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, outline = mk(bbox.w, bbox.h);
  outline.getContext('2d').drawImage(full, x0, y0, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
  return { outline, src, bbox };
}
