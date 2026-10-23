import type { PersonMask } from '../segment/types';
import type { AuraField } from './field';
import type { EnergyType } from './types';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';

/** Seconds the aura takes to bloom when a result first appears. */
export const REVEAL_SECONDS = 1.6;

export interface AuraScene {
  photo: HTMLCanvasElement;
  mask: PersonMask;
  field: AuraField;
}

export interface AuraRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly kind: 'webgl' | 'canvas2d';
  setEnergy(type: EnergyType): void;
  setIntensity(value: number): void;
  /** Draw one frame at the given time in seconds since the result appeared. */
  render(time: number): void;
  destroy(): void;
}

/** Ease-out reveal curve, 0 at t=0 and 1 from REVEAL_SECONDS on. */
export function revealAt(time: number): number {
  const t = Math.min(1, Math.max(0, time / REVEAL_SECONDS));
  return 1 - Math.pow(1 - t, 3);
}

export function createAuraRenderer(scene: AuraScene, canvas: HTMLCanvasElement = document.createElement('canvas')): AuraRenderer {
  canvas.width = scene.photo.width;
  canvas.height = scene.photo.height;
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  if (gl) {
    try {
      return new WebGLAuraRenderer(canvas, gl, scene);
    } catch (e) {
      console.warn('WebGL aura failed, using the simple renderer', e);
      gl.getExtension?.('WEBGL_lose_context')?.loseContext();
      // A canvas that has handed out a WebGL context can't give a 2D one, so start fresh.
      const fresh = document.createElement('canvas');
      fresh.width = canvas.width;
      fresh.height = canvas.height;
      return new Canvas2DAuraRenderer(fresh, scene);
    }
  }
  return new Canvas2DAuraRenderer(canvas, scene);
}

class WebGLAuraRenderer implements AuraRenderer {
  readonly kind = 'webgl';
  private program: WebGLProgram;
  private textures: WebGLTexture[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private energy: EnergyType | null = null;
  private intensity = 0.7;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private gl: WebGL2RenderingContext,
    scene: AuraScene,
  ) {
    this.program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    gl.useProgram(this.program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // One triangle that covers the whole viewport.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const name of ['uPhoto', 'uMask', 'uSdf', 'uTime', 'uIntensity', 'uReveal', 'uAspect', 'uBoxShort', 'uSpectrum', 'uC0', 'uC1', 'uC2']) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.textures.push(this.texture(0, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene.photo)));
    const maskBytes = new Uint8Array(scene.mask.data.length);
    for (let i = 0; i < maskBytes.length; i++) maskBytes[i] = Math.round(Math.min(1, Math.max(0, scene.mask.data[i]!)) * 255);
    this.textures.push(
      this.texture(1, () =>
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, scene.mask.width, scene.mask.height, 0, gl.RED, gl.UNSIGNED_BYTE, maskBytes),
      ),
    );
    this.textures.push(
      this.texture(2, () =>
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, scene.field.width, scene.field.height, 0, gl.RED, gl.FLOAT, scene.field.sdf),
      ),
    );
    gl.uniform1i(this.uniforms.uPhoto!, 0);
    gl.uniform1i(this.uniforms.uMask!, 1);
    gl.uniform1i(this.uniforms.uSdf!, 2);
    gl.uniform1f(this.uniforms.uAspect!, canvas.width / canvas.height);
    gl.uniform1f(this.uniforms.uBoxShort!, boxShortSide(scene.field, canvas.width, canvas.height));
    gl.viewport(0, 0, canvas.width, canvas.height);

    const err = gl.getError();
    if (err !== gl.NO_ERROR) throw new Error(`WebGL setup error ${err}`);
  }

  private texture(unit: number, upload: () => void): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Could not create a texture');
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    upload();
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  setEnergy(type: EnergyType): void {
    this.energy = type;
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  render(time: number): void {
    const gl = this.gl;
    const u = this.uniforms;
    const e = this.energy;
    if (!e) return;
    gl.useProgram(this.program);
    gl.uniform1f(u.uTime!, time);
    gl.uniform1f(u.uIntensity!, this.intensity);
    gl.uniform1f(u.uReveal!, revealAt(time));
    gl.uniform1f(u.uSpectrum!, e.spectrum ? 1 : 0);
    gl.uniform3fv(u.uC0!, e.colors[0]);
    gl.uniform3fv(u.uC1!, e.colors[1]);
    gl.uniform3fv(u.uC2!, e.colors[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy(): void {
    for (const t of this.textures) this.gl.deleteTexture(t);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/** Short side of the person's box, in units of the image's short side (1 when unknown). */
export function boxShortSide(field: AuraField, width: number, height: number): number {
  if (!field.box) return 1;
  return Math.min(field.box.width * width, field.box.height * height) / Math.min(width, height);
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create a shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create a program');
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

/**
 * Simpler aura for browsers without WebGL 2: a pulsing blurred glow of the silhouette
 * behind the person. Same interface, so the rest of the app doesn't care.
 */
class Canvas2DAuraRenderer implements AuraRenderer {
  readonly kind = 'canvas2d';
  private ctx: CanvasRenderingContext2D;
  private cutout: HTMLCanvasElement;
  private silhouette: HTMLCanvasElement;
  /** The silhouette tinted in each of the energy's colors, rebuilt only when the energy changes. */
  private tinted: HTMLCanvasElement[] = [];
  private energy: EnergyType | null = null;
  private intensity = 0.7;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private scene: AuraScene,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    const { width, height } = canvas;
    const alpha = maskCanvas(scene.mask, width, height);
    this.cutout = layer(width, height, (c) => {
      c.drawImage(scene.photo, 0, 0);
      c.globalCompositeOperation = 'destination-in';
      c.drawImage(alpha, 0, 0);
    });
    this.silhouette = alpha;
  }

  setEnergy(type: EnergyType): void {
    this.energy = type;
    const { width, height } = this.canvas;
    this.tinted = type.colors.map((rgb) =>
      layer(width, height, (c) => {
        c.drawImage(this.silhouette, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = `rgb(${rgb.map((v) => Math.round(v * 255)).join(',')})`;
        c.fillRect(0, 0, width, height);
      }),
    );
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  render(time: number): void {
    if (!this.energy) return;
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    const k = this.intensity * revealAt(time);
    const short = Math.min(width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(this.scene.photo, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    this.tinted.forEach((tinted, i) => {
      const pulse = 1 + 0.08 * Math.sin(time * 1.6 + i);
      const blur = short * (0.015 + 0.05 * (i + 1) * this.intensity) * pulse;
      ctx.globalAlpha = Math.min(1, k * (1.1 - i * 0.25));
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(tinted, 0, -blur * 0.3);
    });
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.cutout, 0, 0);
    ctx.restore();
  }

  destroy(): void {}
}

function layer(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  return c;
}

/** The mask as a white canvas whose alpha is the person probability, scaled to the photo. */
function maskCanvas(mask: PersonMask, width: number, height: number): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = mask.width;
  small.height = mask.height;
  const sctx = small.getContext('2d');
  if (sctx) {
    const img = sctx.createImageData(mask.width, mask.height);
    for (let i = 0; i < mask.data.length; i++) {
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 255;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, (mask.data[i]! - 0.3) / 0.45)) * 255);
    }
    sctx.putImageData(img, 0, 0);
  }
  return layer(width, height, (c) => c.drawImage(small, 0, 0, width, height));
}
