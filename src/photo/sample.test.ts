import { describe, expect, it } from 'vitest';
import { SAMPLE_CAPTION, drawSamplePerson } from './sample';

describe('drawSamplePerson', () => {
  it('makes a portrait-sized canvas', () => {
    const canvas = drawSamplePerson();
    expect([canvas.width, canvas.height]).toEqual([768, 1024]);
  });
  it('says it is illustrated, not a real person', () => {
    expect(SAMPLE_CAPTION).toMatch(/Illustrated.*not a real person/);
  });
});
