export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <header class="top">
      <h1 class="logo">Energy Scanner</h1>
      <p class="tag">See the energy coming off anyone in a photo.</p>
    </header>
    <main class="stage" data-testid="stage">
      <p class="hint">Photo input arrives in the next milestone.</p>
    </main>
    <footer class="foot">
      <p>Runs entirely in your browser. Photos never leave your device.</p>
    </footer>
  `;
}
