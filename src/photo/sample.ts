/** Shown under the sample so nobody mistakes it for a photo of a real person. */
export const SAMPLE_CAPTION = 'Illustrated sample, not a real person';

/**
 * An illustrated child in pajamas, drawn in code, for trying the photo scan without a photo.
 * It goes through the same on-device segmentation as a real photo (the selfie model finds it).
 */
export function drawSamplePerson(): HTMLCanvasElement {
  const W = 768;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d');
  if (!x) return canvas;
  const linear = (x0: number, y0: number, x1: number, y1: number, stops: string[]) => {
    const g = x.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };

  // Bedroom wall with a soft lamp glow.
  x.fillStyle = linear(0, 0, 0, H, ['#cdd7e1', '#8d9cab']);
  x.fillRect(0, 0, W, H);
  const lamp = x.createRadialGradient(640, 180, 10, 640, 180, 320);
  lamp.addColorStop(0, 'rgba(255, 236, 200, 0.7)');
  lamp.addColorStop(1, 'rgba(255, 236, 200, 0)');
  x.fillStyle = lamp;
  x.fillRect(0, 0, W, H);

  // Pajama top with stars.
  x.fillStyle = linear(0, 600, 0, H, ['#3b6fb6', '#244a80']);
  x.beginPath();
  x.moveTo(130, H);
  x.bezierCurveTo(140, 720, 220, 650, 384, 640);
  x.bezierCurveTo(548, 650, 628, 720, 638, H);
  x.closePath();
  x.fill();
  x.fillStyle = '#f5d76e';
  for (const [sx, sy] of [[250, 820], [360, 900], [480, 790], [540, 930], [300, 960], [430, 720]]) star(x, sx!, sy!, 16);

  // Neck, head and ears.
  x.fillStyle = linear(330, 0, 440, 0, ['#c98e6c', '#e2a987']);
  x.fillRect(335, 520, 98, 140);
  const skin = x.createRadialGradient(360, 380, 30, 384, 420, 190);
  skin.addColorStop(0, '#f2c4a2');
  skin.addColorStop(1, '#c98a66');
  x.fillStyle = skin;
  x.beginPath();
  x.ellipse(384, 410, 135, 170, 0, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(250, 420, 22, 38, 0, 0, Math.PI * 2);
  x.ellipse(518, 420, 22, 38, 0, 0, Math.PI * 2);
  x.fill();

  // Hair.
  x.fillStyle = '#3a2618';
  x.beginPath();
  x.ellipse(384, 300, 150, 110, 0, Math.PI, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(384, 300, 150, 60, 0, 0, Math.PI);
  x.fill();

  // Face: eyes, brows, nose, smile.
  x.fillStyle = '#fff';
  x.beginPath();
  x.ellipse(335, 410, 22, 13, 0, 0, Math.PI * 2);
  x.ellipse(433, 410, 22, 13, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#3b2a20';
  x.beginPath();
  x.arc(335, 410, 10, 0, Math.PI * 2);
  x.arc(433, 410, 10, 0, Math.PI * 2);
  x.fill();
  x.lineCap = 'round';
  x.strokeStyle = '#3a2618';
  x.lineWidth = 8;
  x.beginPath();
  x.moveTo(305, 375);
  x.quadraticCurveTo(335, 362, 362, 374);
  x.moveTo(406, 374);
  x.quadraticCurveTo(433, 362, 463, 375);
  x.stroke();
  x.strokeStyle = '#a86a4c';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(384, 425);
  x.lineTo(374, 470);
  x.lineTo(392, 472);
  x.stroke();
  x.strokeStyle = '#9b4a46';
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(340, 510);
  x.quadraticCurveTo(384, 540, 428, 510);
  x.stroke();
  return canvas;
}

function star(x: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const d = i % 2 ? r * 0.45 : r;
    x.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }
  x.closePath();
  x.fill();
}
