import { describe, expect, it } from 'vitest';
import { cameraErrorMessage, cameraSupported } from './camera';

describe('cameraSupported', () => {
  it('is false without mediaDevices', () => {
    expect(cameraSupported({} as Navigator)).toBe(false);
  });
  it('is true with getUserMedia', () => {
    expect(cameraSupported({ mediaDevices: { getUserMedia: () => undefined } } as unknown as Navigator)).toBe(true);
  });
});

describe('cameraErrorMessage', () => {
  it('explains a blocked camera', () => {
    expect(cameraErrorMessage(new DOMException('x', 'NotAllowedError'))).toMatch(/blocked/);
  });
  it('explains a missing camera', () => {
    expect(cameraErrorMessage(new DOMException('x', 'NotFoundError'))).toMatch(/No camera/);
  });
  it('has a generic fallback', () => {
    expect(cameraErrorMessage('weird')).toMatch(/could not start/);
  });
});
