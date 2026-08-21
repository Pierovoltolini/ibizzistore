/* ============================================================
   IBIZZI · engagement-cta.js
   Aviso no invasivo en las páginas de listado: si pasan ~10s y el
   visitante todavía no agregó nada al carrito, aparece un toast
   recordándole los beneficios (cuotas, transferencia) y lo invita a
   volver a la grilla. Se muestra una sola vez por sesión, y se
   cancela solo si ya agregó algo antes de que se cumpla el tiempo.
   ============================================================ */

import { bus } from './utils.js';
import { getCart } from './cart.js';

const SESSION_KEY = 'ibizzi_engagement_shown';
const DELAY_MS = 10000;
const AUTO_CLOSE_MS = 12000;

export function initEngagementCTA() {
  if (sessionStorage.getItem(SESSION_KEY)) return;
  if (getCart().length > 0) return;

  const timer = setTimeout(() => {
    if (getCart().length === 0) showToast();
  }, DELAY_MS);

  const unsub = bus.on('cart:updated', ({ cart }) => {
    if (cart.length > 0) {
      clearTimeout(timer);
      unsub();
    }
  });
}

function showToast() {
  sessionStorage.setItem(SESSION_KEY, '1');

  const toast = document.createElement('div');
  toast.className = 'engagement-toast';
  toast.innerHTML = `
    <button class="engagement-toast-close" type="button" aria-label="Cerrar">×</button>
    <p class="engagement-toast-text">¿Ya viste algo que te gustó? 💳 Hasta 12 cuotas sin interés y 🏦 10% off por transferencia.</p>
    <button class="btn btn-primary btn-sm engagement-toast-cta" type="button">Ver productos</button>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  const close = () => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 400);
  };
  const autoClose = setTimeout(close, AUTO_CLOSE_MS);

  toast.querySelector('.engagement-toast-close').addEventListener('click', () => {
    clearTimeout(autoClose);
    close();
  });
  toast.querySelector('.engagement-toast-cta').addEventListener('click', () => {
    clearTimeout(autoClose);
    close();
    document.querySelector('#products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
