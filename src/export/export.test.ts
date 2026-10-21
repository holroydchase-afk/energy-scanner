import { describe, expect, it } from 'vitest';
import { energyTypeById } from '../aura/presets';
import { canShareFiles, exportFileName, extensionFor, pickVideoType } from './export';

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
    expect(exportFileName(energyTypeById('mystic'), 'image/png')).toBe('energy-scanner-mystic.png');
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
