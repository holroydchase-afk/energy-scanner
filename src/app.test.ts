import { describe, expect, it } from 'vitest';
import { mountApp } from './app';

function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  mountApp(root);
  return root;
}

describe('mountApp', () => {
  it('renders the shell with the privacy promise', () => {
    const root = mount();
    expect(root.querySelector('h1')?.textContent).toBe('Energy Scanner');
    expect(root.textContent).toContain('Photos never leave your device');
  });

  it('offers camera and upload on the start screen', () => {
    const root = mount();
    expect(root.querySelector('[data-action="camera"]')?.textContent).toBe('Take a photo');
    expect(root.querySelector('[data-action="upload"]')?.textContent).toBe('Upload a photo');
  });

  it('falls back to the native capture input when there is no camera API', () => {
    const root = mount();
    const capture = root.querySelector<HTMLInputElement>('[data-input="capture"]')!;
    let clicked = false;
    capture.click = () => {
      clicked = true;
    };
    root.querySelector<HTMLButtonElement>('[data-action="camera"]')!.click();
    expect(capture.getAttribute('capture')).toBe('user');
    expect(clicked).toBe(true);
  });

  it('shows an error for a file that is not an image', async () => {
    const root = mount();
    const upload = root.querySelector<HTMLInputElement>('[data-input="upload"]')!;
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    Object.defineProperty(upload, 'files', { value: [file], configurable: true });
    upload.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    const error = root.querySelector<HTMLElement>('.error')!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toMatch(/not an image/);
  });
});
