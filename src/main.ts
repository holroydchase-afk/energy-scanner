import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-500.css';
import '@fontsource/atkinson-hyperlegible-next/latin-600.css';
import './style.css';
import { mountApp } from './app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root');
mountApp(root);
