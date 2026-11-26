# PoseKit

Mobile-first pose reference tool. Pick a pose, get its outline, match it on your live camera, capture, save.
100% client-side: no backend, no login, no uploads.

## Run
Camera needs https or localhost. In this folder run:

    python3 -m http.server 8000

then open http://localhost:8000 (or deploy the folder to any static host such as GitHub Pages / Netlify).

## AI
- MediaPipe Tasks Vision (deeplab_v3 person segmentation) and OpenCV.js load from CDN on first use, then the browser caches them.
- Offline use: save deeplab_v3.tflite into assets/models/ (the app tries that path first).
- Images with real transparency use their alpha channel directly; every normal photo goes through the AI model.

## Your own poses
Add photos to assets/poses/ and list them in js/poses.js (id, name, cat, src, pop, trend, fresh).
The bundled figures are illustrated placeholders made by tools/make_poses.py. Or use "Use your own reference photo" in the app.

## Files
index.html, style.css, script.js, js/ (poses, segment, camera), assets/, tools/
