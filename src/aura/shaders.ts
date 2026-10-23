export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  // Top-left origin, matching the row order of the uploaded textures.
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uPhoto;
uniform sampler2D uMask;  // person probability
uniform sampler2D uSdf;   // signed distance to the outline, + outside, in short-side units
uniform float uTime;
uniform float uIntensity; // 0..1 from the slider
uniform float uReveal;    // 0..1, ramps up when a result first appears
uniform float uAspect;    // width / height
uniform float uBoxShort;  // short side of the person's box, in short-side units
uniform float uSpectrum;  // 1 = cycle hues
uniform vec3 uC0;         // core color
uniform vec3 uC1;         // middle color
uniform vec3 uC2;         // outer color

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * (uAspect >= 1.0 ? vec2(uAspect, 1.0) : vec2(1.0, 1.0 / uAspect));
  float t = uTime;

  vec3 photo = texture(uPhoto, uv).rgb;
  float person = texture(uMask, uv).r;
  float sd = texture(uSdf, uv).r;

  float k = uIntensity * uReveal;
  // Sized to the person, so a close-up hand doesn't flood the whole frame.
  float radius = min(mix(0.05, 0.18, uIntensity), 0.6 * uBoxShort) * (0.4 + 0.6 * uReveal);

  // Flowing energy that rises off the body: domain-warped noise scrolling upward.
  vec2 q = p * 3.2;
  float warp = fbm(q * 0.7 + vec2(0.0, t * 0.22));
  float n = fbm(q + vec2(warp * 1.6, t * 0.85 + warp));
  float n2 = fbm(q * 2.4 + vec2(-t * 0.25, t * 1.3));

  // Start the glow just inside the outline so no dimmed gap shows between skin and glow.
  float outside = max(sd + 0.006, 0.0);
  // Flame tongues: high-contrast noise pulls the bright band outward in licks.
  float flame = smoothstep(0.3, 0.75, n);
  float dd = max(outside - flame * radius * 0.65 - n2 * radius * 0.15, 0.0);
  float glow = exp(-dd / (radius * 0.22)) * (0.55 + 0.45 * flame);
  float halo = exp(-outside / radius);
  float waves = pow(0.5 + 0.5 * sin(outside * 55.0 / (0.45 + uIntensity) - t * 2.4), 8.0) * halo;
  float breathe = 0.9 + 0.1 * sin(t * 1.3);
  float aura = (glow + halo * 0.35 + waves * 0.2) * breathe;

  // Main color near the body fading to the outer color; the pale core color only where hottest.
  float cd = clamp(outside / radius, 0.0, 1.0);
  vec3 col = mix(uC1, uC2, smoothstep(0.05, 0.9, cd));
  if (uSpectrum > 0.5) {
    float hue = fract(outside * 2.2 + n * 0.7 - t * 0.07 + p.y * 0.25);
    col = hsv2rgb(vec3(hue, 0.85, 1.0));
  }
  vec3 core = uC0 * pow(glow, 3.0) * 0.5;

  // Sparks drifting up through the aura.
  vec2 sp = p * 70.0 + vec2(0.0, t * 7.0);
  vec2 cell = floor(sp);
  float h = hash(cell);
  float spark = step(0.988, h) * (1.0 - smoothstep(0.0, 0.45, length(fract(sp) - 0.5)));
  spark *= 0.5 + 0.5 * sin(t * 5.0 + h * 40.0);
  aura += spark * halo * 1.2;

  // Background: dimmed and desaturated, like a dark room, so the energy reads on any photo.
  float lum = dot(photo, vec3(0.299, 0.587, 0.114));
  vec3 bg = mix(photo, vec3(lum), 0.6 * k) * (1.0 - 0.65 * k);
  vec3 energy = (col * aura + core) * k * 1.4;
  // Soft clip so bright energy keeps its color instead of blowing out to white.
  vec3 lit = bg + (1.0 - exp(-energy)) * (1.0 - 0.6 * bg);

  // The person stays true to the photo, with energy glowing along their outline.
  float rim = exp(min(sd, 0.0) / 0.01) * (1.0 - smoothstep(0.0, 0.02, sd));
  vec3 rimColor = uSpectrum > 0.5 ? hsv2rgb(vec3(fract(p.y * 0.5 - t * 0.07), 0.6, 1.0)) : mix(uC0, uC1, 0.6);
  vec3 subject = photo * (1.0 - 0.12 * k) + rimColor * rim * 0.6 * k;
  float alpha = smoothstep(0.42, 0.58, person);
  outColor = vec4(mix(lit, subject, alpha), 1.0);
}`;
