import type { Page } from '@playwright/test';

/** Make a synthetic PNG of the given size in the browser (no real photos in tests). */
export async function makePng(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = new OffscreenCanvas(w!, h!);
      const ctx = canvas.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, w!, h!);
      g.addColorStop(0, '#334');
      g.addColorStop(1, '#889');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w!, h!);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    },
    [width, height],
  );
  return Buffer.from(base64, 'base64');
}
