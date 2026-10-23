import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EnergyType } from '../aura/types';

const mystic: EnergyType = { id: 'mystic', name: 'Mystic', colors: [[1, 1, 1], [0.6, 0.4, 1], [0.2, 0.1, 0.7]] };
import { canShareFiles, captionFor, exportFileName, exportVideo, extensionFor, pickVideoType } from './export';

describe('pickVideoType', () => {
  it('prefers MP4 where supported (Safari)', () => {
    expect(pickVideoType((t) => t.startsWith('video/mp4'))).toBe('video/mp4;codecs=avc1');
  });
  it('uses WebM VP9 on Chrome', () => {
    expect(pickVideoType((t) => t.startsWith('video/webm'))).toBe('video/webm;codecs=vp9');
  });
  it('returns null when nothing is supported', () => {
    expect(pickVideoType(() => false)).toBeNull();
  });
});

describe('file names', () => {
  it('maps types to extensions', () => {
    expect(extensionFor('video/webm;codecs=vp9')).toBe('webm');
    expect(extensionFor('video/mp4')).toBe('mp4');
    expect(extensionFor('image/png')).toBe('png');
  });
  it('names exports after the energy type', () => {
    expect(exportFileName(mystic, 'image/png')).toBe('energy-scanner-mystic.png');
  });
});

describe('canShareFiles', () => {
  const file = new File(['x'], 'a.png', { type: 'image/png' });
  it('is false without the Web Share API', () => {
    expect(canShareFiles(file, {} as Navigator)).toBe(false);
  });
  it('asks canShare about files', () => {
    const nav = { share: () => Promise.resolve(), canShare: (d: ShareData) => Boolean(d.files?.length) } as unknown as Navigator;
    expect(canShareFiles(file, nav)).toBe(true);
  });
});

describe('captionFor', () => {
  it('adds "energy" only when missing', () => {
    expect(captionFor(mystic)).toBe('Mystic energy');
    expect(captionFor({ ...mystic, id: 'grey', name: 'Grey Energy' })).toBe('Grey Energy');
  });
});

describe('exportVideo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ES-R42 stops recording and returns no file when cancelled', async () => {
    // Test-only stand-ins for the browser's recorder and canvas stream.
    let stops = 0;
    class FakeRecorder {
      static isTypeSupported = () => true;
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {}
      stop() {
        stops++;
        this.onstop?.();
      }
    }
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    HTMLCanvasElement.prototype.captureStream = () => ({ getTracks: () => [] }) as unknown as MediaStream;
    const controller = new AbortController();
    const recording = exportVideo(document.createElement('canvas'), () => mystic, 60, undefined, controller.signal);
    controller.abort();
    await expect(recording).rejects.toMatchObject({ name: 'AbortError' });
    expect(stops).toBe(1);
  });
});
