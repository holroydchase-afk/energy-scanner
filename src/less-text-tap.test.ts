// ES-M2.5 step 5, commit 4b (TXT-R4, pending Chase's call): a tap never fails.
// Kept in its own file so `git revert` of the 4b commit takes this test with it. When 4b lands, it also
// removes the AC-TXT4b ("Keep holding") test in src/less-text.test.ts, which this behavior replaces.
// Written red first by qa-tdd.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp, type AppHandle } from './app';

// Test-only stand-in: jsdom has no WebGL or canvas pixels.
vi.mock('./aura/renderer', () => ({
  createAuraRenderer: () => ({
    canvas: document.createElement('canvas'),
    kind: 'webgl',
    render: () => undefined,
    setEnergy: () => undefined,
    setIntensity: () => undefined,
    destroy: () => undefined,
  }),
}));

const mounted: AppHandle[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ES-M2.5 4b tap never fails', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    for (const app of mounted.splice(0)) app.destroy();
  });

  it('AC-TXT4 TXT-R4 a press released after 200ms (holdMs 600) carries on and the reading appears after holdMs', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    mounted.push(mountApp(root, { random: () => 0.5, holdMs: 600 }));
    const pad = root.querySelector('.pad')!;
    const card = root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!;
    pad.dispatchEvent(new Event('pointerdown'));
    await wait(200);
    pad.dispatchEvent(new Event('pointerup'));
    expect(pad.classList.contains('scanning'), 'the ring keeps filling after the release').toBe(true);
    expect(card.hidden, 'not before holdMs').toBe(true);
    await wait(700);
    expect(card.hidden, 'the reading appears once the ring fills').toBe(false);
    expect(root.textContent).not.toMatch(/Too fast|Keep holding/);
    expect(root.querySelector('[data-hint]')!.textContent).toBe('Done');
  });
});
