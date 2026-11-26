// Camera access + full-resolution capture.
export class Cam {
  constructor(video) { this.v = video; this.s = null; }
  async start(facing = 'user') {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'Insecure' });
    this.stop();
    this.s = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    this.v.srcObject = this.s;
    await this.v.play();
  }
  stop() { this.s?.getTracks().forEach((t) => t.stop()); this.s = null; this.v.srcObject = null; }
  // Native camera resolution, no downscaling. Mirrored for the front camera to match what you saw.
  capture(mirror) {
    const c = document.createElement('canvas'), w = (c.width = this.v.videoWidth), h = (c.height = this.v.videoHeight);
    const g = c.getContext('2d');
    if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(this.v, 0, 0, w, h);
    return c;
  }
}

export function camError(e) {
  const n = e?.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera access is blocked. Allow the camera for this site in your browser settings, then try again.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No camera was found on this device.';
  if (n === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  if (n === 'Insecure') return 'The camera needs a secure page. Open this site over https or localhost.';
  return 'The camera could not start. Try again.';
}
