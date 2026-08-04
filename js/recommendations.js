/* ============================================================
   IBIZZI · recommendations.js
   Renderiza "Completá tu look" y "También te puede interesar"
   ============================================================ */

import { qs, formatPrice } from './utils.js';
import { loadProducts, productCardHTML, wireCardActions } from './products.js';
import { setDrawerRecommendations } from './cart-drawer.js';

function findByIds(products, ids) {
  if (!ids?.length) return [];
  return ids
    .map(id => products.find(p => p.id === id))
    .filter(p => p && p.stock > 0);
}

/**
 * "Completá tu look" para el carrito: junta las sugerencias de
 * complementaryProducts de TODO lo que hay en el carrito (no de un
 * solo producto), sin repetir y sin sugerir algo que ya está en el
 * carrito. Así con un buzo + un zueco ya en el carrito, no repite
 * sugerencias redundantes entre sí.
 */
export async function getCartComplementary(cart, max = 8) {
  if (!cart?.length) return [];
  const products = await loadProducts();
  const cartIds = new Set(cart.map(i => i.id));
  const seen = new Set();
  const picks = [];

  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    (product?.complementaryProducts || []).forEach(id => {
      if (cartIds.has(id) || seen.has(id)) return;
      const candidate = products.find(p => p.id === id);
      if (!candidate || candidate.stock <= 0) return;
      seen.add(id);
      picks.push(candidate);
    });
  });

  return picks.slice(0, max);
}

export async function renderRecommendations(product) {
  const products = await loadProducts();

  const complementary = findByIds(products, product.complementaryProducts);
  const recommended   = findByIds(products, product.recommendedProducts);

  const compContainer = qs('#complementary-list');
  const recContainer  = qs('#recommended-list');

  if (compContainer) {
    compContainer.innerHTML = complementary.map(productCardHTML).join('');
    wireCardActions(compContainer);
  }
  if (recContainer) {
    recContainer.innerHTML = recommended.map(productCardHTML).join('');
    wireCardActions(recContainer);
  }

  // Pasamos algunas al cart drawer para el bloque "Completá tu compra"
  setDrawerRecommendations([...complementary, ...recommended].slice(0, 6));
}

/** Carrusel horizontal simple con flechas para desktop. */
export function initCarousel(scrollerSelector) {
  const scroller = qs(scrollerSelector);
  if (!scroller) return;
  const wrapper = scroller.closest('.carousel');
  if (!wrapper) return;
  const prev = wrapper.querySelector('.carousel-prev');
  const next = wrapper.querySelector('.carousel-next');

  const step = () => scroller.clientWidth * 0.8;
  prev?.addEventListener('click', () => scroller.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => scroller.scrollBy({ left:  step(), behavior: 'smooth' }));
}
