/* ============================================================
   IBIZZI · app.js
   Entry point. Se importa desde <script type="module"> en cada
   página. Renderiza el shell (header + drawers + footer) y
   conecta todas las interacciones globales.
   ============================================================ */

import { qs, lockScroll, unlockScroll, bus } from './utils.js';
import { renderShell } from './shell.js';
import { openCartDrawer, initCartDrawer } from './cart-drawer.js';
import { getItemCount } from './cart.js';
import { getFavorites } from './favorites.js';

/* ---------- Overlay compartido ---------- */

function closeAllOverlays() {
  qs('#overlay')?.classList.remove('is-open');
  qs('#mobile-menu')?.classList.remove('is-open');
  qs('#search-overlay')?.classList.remove('is-open');
  qs('#cart-drawer')?.classList.remove('is-open');
  unlockScroll();
}

/* ---------- Mobile menu ---------- */

function initMobileMenu() {
  const menu    = qs('#mobile-menu');
  const overlay = qs('#overlay');
  const openBtn = qs('#hamburger-btn');
  const closeBtn = qs('#mobile-menu-close');
  if (!menu || !overlay || !openBtn) return;

  const open = () => {
    menu.classList.add('is-open');
    overlay.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    lockScroll();
  };
  const close = () => {
    menu.classList.remove('is-open');
    overlay.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    unlockScroll();
  };

  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  menu.querySelectorAll('a').forEach(l => l.addEventListener('click', close));
}

/* ---------- Search overlay ---------- */

function initSearchOverlay() {
  const overlay   = qs('#search-overlay');
  const openBtn   = qs('#search-btn');
  const closeBtn  = qs('#search-close');
  const input     = qs('#search-input');
  const bgOverlay = qs('#overlay');
  if (!overlay || !openBtn) return;

  const open = () => {
    overlay.classList.add('is-open');
    bgOverlay?.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    lockScroll();
    setTimeout(() => input?.focus(), 200);
  };
  const close = () => {
    overlay.classList.remove('is-open');
    bgOverlay?.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    unlockScroll();
  };
  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  bgOverlay?.addEventListener('click', close);
}

/* ---------- Cart button ---------- */

function initCartButton() {
  const btn = qs('#cart-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openCartDrawer();
  });
}

/* ---------- Contadores ---------- */

function updateBadges() {
  const cartCount = getItemCount();
  const favCount  = getFavorites().length;

  const cartBadge = qs('[data-cart-count]');
  const favBadge  = qs('[data-favorites-count]');
  if (cartBadge) {
    cartBadge.textContent = cartCount > 0 ? cartCount : '';
    cartBadge.dataset.count = cartCount;
  }
  if (favBadge) {
    favBadge.textContent = favCount > 0 ? favCount : '';
    favBadge.dataset.count = favCount;
  }
}

/* ---------- Header scroll ---------- */

/* El header se esconde al bajar y reaparece apenas se sube un poco, así
   el menú queda a mano sin tener que volver hasta el tope de la página. */
function initHeaderScroll() {
  const header = qs('.header');
  if (!header) return;

  // Recién se esconde pasado el primer viewport de contenido: cerca del tope
  // molesta más de lo que suma.
  const HIDE_AFTER = 240;
  // Margen para no reaccionar al temblequeo del dedo ni al rebote de iOS.
  const DELTA = 6;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = Math.max(0, window.scrollY);
    const diff = y - lastY;

    header.classList.toggle('is-scrolled', y > 40);

    if (Math.abs(diff) < DELTA) return;

    if (diff > 0 && y > HIDE_AFTER) {
      header.classList.add('is-hidden');   // bajando
    } else if (diff < 0) {
      header.classList.remove('is-hidden'); // subiendo: vuelve enseguida
    }
    lastY = y;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
}

/* ---------- Marcar link activo ---------- */

function markActiveLink() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const params = new URLSearchParams(window.location.search);
  document.querySelectorAll('.header-nav-link, .mobile-nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) link.classList.add('is-active');
    // Match también por category en products.html
    if (path === 'products.html' && href?.startsWith('products.html?category=')) {
      const cat = new URL(href, window.location.origin).searchParams.get('category');
      if (cat === params.get('category')) link.classList.add('is-active');
    }
  });
}

/* ---------- Escape global ---------- */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllOverlays();
});

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderShell();
  initMobileMenu();
  initSearchOverlay();
  initCartButton();
  initCartDrawer();
  initHeaderScroll();
  markActiveLink();
  updateBadges();

  // Buscador (carga diferida — solo si el overlay se abre)
  import('./search.js').then(mod => mod.initSearch()).catch(() => {});
});

bus.on('cart:updated', updateBadges);
bus.on('favorites:updated', updateBadges);
