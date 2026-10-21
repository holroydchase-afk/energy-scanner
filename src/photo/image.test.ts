import { describe, expect, it } from 'vitest';
import { fitWithin, isAcceptedImage } from './image';

describe('fitWithin', () => {
  it('scales a large landscape photo down to the max side', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1280)).toEqual({ width: 1280, height: 960 });
  });
  it('scales a large portrait photo down to the max side', () => {
    expect(fitWithin({ width: 3024, height: 4032 }, 1280)).toEqual({ width: 960, height: 1280 });
  });
  it('never scales up', () => {
    expect(fitWithin({ width: 300, height: 200 }, 1280)).toEqual({ width: 300, height: 200 });
  });
  it('keeps at least one pixel on extreme aspect ratios', () => {
    expect(fitWithin({ width: 100000, height: 10 }, 1000)).toEqual({ width: 1000, height: 1 });
  });
  it('rejects empty images', () => {
    expect(() => fitWithin({ width: 0, height: 10 })).toThrow();
  });
});

describe('isAcceptedImage', () => {
  it('accepts image mime types', () => {
    expect(isAcceptedImage({ type: 'image/jpeg', name: 'a.jpg' })).toBe(true);
    expect(isAcceptedImage({ type: 'image/heic', name: 'a.heic' })).toBe(true);
  });
  it('rejects other mime types', () => {
    expect(isAcceptedImage({ type: 'application/pdf', name: 'a.pdf' })).toBe(false);
  });
  it('falls back to the extension when the type is missing', () => {
    expect(isAcceptedImage({ type: '', name: 'IMG_0001.HEIC' })).toBe(true);
    expect(isAcceptedImage({ type: '', name: 'notes.txt' })).toBe(false);
  });
});
