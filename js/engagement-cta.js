/* ============================================================
   IBIZZI · engagement-cta.js
   Aviso centrado, en cualquier página del sitio: si pasan ~10s y el
   visitante todavía no agregó nada al carrito, aparece un cartel en
   el medio de la pantalla recordándole los beneficios. Se guarda en
   localStorage — se muestra una sola vez por usuario, nunca más
   aunque vuelva otro día. Se cierra con la X, tocando afuera o con
   Escape. Si agrega algo al carrito antes de que se cumpla el
   tiempo, se cancela sin marcarlo como visto.
   ============================================================ */

import { bus, lockScroll, unlockScroll } from './utils.js';
import { getCart } from './cart.js';

const STORAGE_KEY = 'ibizzi_engagement_shown';
const DELAY_MS = 10000;

export function initEngagementCTA() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  if (getCart().length > 0) return;

  const timer = setTimeout(() => {
    if (getCart().length === 0) showModal();
  }, DELAY_MS);

  const unsub = bus.on('cart:updated', ({ cart }) => {
    if (cart.length > 0) {
      clearTimeout(timer);
      unsub();
    }
  });
}

function showModal() {
  localStorage.setItem(STORAGE_KEY, '1');

  const overlay = document.createElement('div');
  overlay.className = 'engagement-overlay';
  overlay.innerHTML = `
    <div class="engagement-modal" role="dialog" aria-modal="true" aria-label="Beneficios IBIZZI">
      <button class="engagement-modal-close" type="button" aria-label="Cerrar">×</button>
      <span class="section-eyebrow engagement-modal-eyebrow">IBIZZI</span>
      <h2 class="engagement-modal-title">La elegancia está<br>en los detalles</h2>
      <div class="engagement-modal-perks">
        <span>💳 Hasta 12 cuotas sin interés</span>
        <span>🏦 10% off pagando por transferencia</span>
        <span>🚚 Envíos a todo Uruguay</span>
        <span>🕐 Pagás antes de las 17 hs y lo despachamos hoy mismo</span>
      </div>
      <button type="button" class="btn btn-primary engagement-modal-cta">Entendido</button>
    </div>
  `;
  document.body.appendChild(overlay);
  lockScroll();

  requestAnimationFrame(() => overlay.classList.add('is-visible'));

  const close = () => {
    overlay.classList.remove('is-visible');
    unlockScroll();
    document.removeEventListener('keydown', onKey);
    setTimeout(() => overlay.remove(), 300);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.engagement-modal-close').addEventListener('click', close);
  overlay.querySelector('.engagement-modal-cta').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
}
