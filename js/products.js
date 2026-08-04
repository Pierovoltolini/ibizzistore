/* ============================================================
   IBIZZI · products.js
   Tarjeta de producto reutilizable + renderers de grillas.
   ============================================================ */

import { qs, qsa, fetchJSON, formatPrice, calcDiscount, trackPixel, whatsappLink, transferPrice } from './utils.js';
import { addItem } from './cart.js';
import { toggleFavorite, isFavorite } from './favorites.js';

/** Mensaje de WhatsApp pre-cargado para reservar un producto en preventa. */
export function preorderMessage(product) {
  return `¡Hola IBIZZI! Vengo de la tienda online y me interesó el ${product.name} que está en preventa. Quiero reservar el mío, ¿cómo sigo?`;
}

/** Línea chica con el precio pagando por transferencia (8% off), debajo del precio normal. */
function transferPriceHTML(product) {
  if (product.price == null) return '';
  return `<div class="product-card-transfer">🏦 Transferencia ${formatPrice(transferPrice(product.price), product.currency)}</div>`;
}

/** Línea chica con el tiempo de entrega ("Comprá hoy, recibís mañana" / "Entrega en 10 días"). */
function deliveryNoteHTML(product) {
  if (!product.deliveryNote) return '';
  return `<div class="product-card-delivery">🚚 ${product.deliveryNote}</div>`;
}

/** Línea chica con las cuotas, al lado del precio. */
function installmentsHTML(product) {
  if (product.price == null) return '';
  return `<div class="product-card-installments">💳 Hasta 12 cuotas sin interés</div>`;
}

/* Preventa que además se anuncia como "Próximamente": badge amarillo, cartel
   sobre la foto y sección propia en la home. Un producto en preventa con
   "preorderBadge": false se muestra como uno más de su categoría —sin ningún
   "Próximamente"— pero conserva la reserva por WhatsApp. */
export function isComingSoon(product) {
  return product.status === 'preorder' && product.preorderBadge !== false;
}

const DATA_URL = 'data/products.json';

let _products = null;

/**
 * Pisa el stock estático de products.json con el stock real de
 * Cloudflare KV (compartido entre todos los visitantes), para los
 * productos que lo manejan por talle (sizeStock). Si la función no
 * responde, se sigue usando el número estático — no rompe nada.
 */
async function applyLiveStock(products) {
  const withSizeStock = products.filter(p => p.sizeStock);
  if (!withSizeStock.length) return;
  try {
    const ids = withSizeStock.map(p => p.id).join(',');
    const res = await fetch(`/api/stock?ids=${ids}`);
    if (!res.ok) return;
    const live = await res.json();
    withSizeStock.forEach(p => {
      const liveSizeStock = live[p.id];
      if (!liveSizeStock) return;
      p.sizeStock = liveSizeStock;
      p.stock = Object.values(liveSizeStock).reduce((sum, n) => sum + n, 0);
    });
  } catch {
    // Sin conexión a la función: seguimos con los números estáticos.
  }
}

/** Carga (o reutiliza caché) el array de productos. */
export async function loadProducts() {
  if (_products) return _products;
  _products = await fetchJSON(DATA_URL);
  await applyLiveStock(_products);
  return _products;
}

/* ---------- Tarjeta ---------- */

export function productCardHTML(product) {
  const discount = product.discount || calcDiscount(product.price, product.oldPrice);
  const isPreorder = product.status === 'preorder';
  const comingSoon = isComingSoon(product);
  // Preventa no es "agotado": stock 0 es esperable, no debe verse gris ni bloqueado.
  const outOfStock = !isPreorder && (product.stock <= 0 || product.status === 'out_of_stock');
  const hasVariants = (product.sizes?.length > 1) || (product.colors?.length > 1);
  const second = product.images[1] || product.images[0];
  const fav = isFavorite(product.id);
  const hasPrice = product.price != null;

  return `
    <article class="product-card ${outOfStock ? 'is-sold' : ''} ${comingSoon ? 'is-preorder' : ''}" data-product-id="${product.id}">
      <a href="product.html?slug=${product.slug}" class="product-card-media" aria-label="${product.name}">
        <img class="product-card-img product-card-img-1" src="${product.images[0]}" alt="${product.name}" loading="lazy">
        <img class="product-card-img product-card-img-2" src="${second}" alt="" loading="lazy" aria-hidden="true">

        <div class="product-card-badges">
          ${comingSoon ? '<span class="label label-preorder">Próximamente</span>' : ''}
          ${comingSoon ? '<span class="label label-gift">🎁 10% Obsequio</span>' : ''}
          ${!comingSoon && product.new ? '<span class="label label-new">Nuevo</span>' : ''}
          ${discount > 0 ? `<span class="label label-sale">-${discount}%</span>` : ''}
          ${outOfStock ? '<span class="label label-sold">Agotado</span>' : ''}
        </div>

        ${comingSoon ? '<div class="product-card-preorder-banner"><span>Reservá el tuyo a mejor precio</span></div>' : ''}

        <button class="product-card-fav ${fav ? 'is-active' : ''}" type="button" aria-label="Guardar en favoritos" data-fav="${product.id}">
          <svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z"
              fill="${fav ? 'currentColor' : 'none'}"/>
          </svg>
        </button>
      </a>

      <div class="product-card-body">
        <span class="product-card-brand">${product.brand}</span>
        <a href="product.html?slug=${product.slug}" class="product-card-name">${product.name}</a>
        ${isPreorder
          ? `<div class="product-card-prices">
               ${product.oldPrice ? `<span class="product-card-old">${formatPrice(product.oldPrice, product.currency)}</span>` : ''}
               ${hasPrice
                 ? `<span class="product-card-price">${formatPrice(product.price, product.currency)}</span>${comingSoon ? '<span class="product-card-preorder-tag">próximamente</span>' : ''}`
                 : `<span class="product-card-preorder-note">Reservá al mejor precio</span>`}
             </div>
             ${installmentsHTML(product)}
             ${transferPriceHTML(product)}
             ${deliveryNoteHTML(product)}`
          : `<div class="product-card-prices">
               ${product.oldPrice ? `<span class="product-card-old">${formatPrice(product.oldPrice, product.currency)}</span>` : ''}
               <span class="product-card-price">${formatPrice(product.price, product.currency)}</span>
             </div>
             ${installmentsHTML(product)}
             ${transferPriceHTML(product)}
             ${deliveryNoteHTML(product)}`}
        <div class="product-card-actions">
          <a href="product.html?slug=${product.slug}" class="btn btn-secondary btn-sm btn-block">Ver producto</a>
          ${isPreorder
            ? `<a href="${whatsappLink(preorderMessage(product))}" class="btn btn-primary btn-sm btn-block product-card-reserve" target="_blank" rel="noopener" data-reserve="${product.id}">Reservá el tuyo</a>`
            : (!hasVariants && !outOfStock
              ? `<button class="btn btn-primary btn-sm btn-block product-card-add" data-add="${product.id}">Agregar</button>`
              : '')}
        </div>
      </div>
    </article>
  `;
}

/** Renderiza array de productos en un contenedor de grilla. */
export function renderGrid(container, products) {
  if (!container) return;
  if (!products.length) {
    container.innerHTML = `<p class="text-muted text-center" style="grid-column:1/-1;padding:2rem 0;">No hay productos para mostrar.</p>`;
    return;
  }
  container.innerHTML = products.map(productCardHTML).join('');
  wireCardActions(container);
}

/* En táctil (celular/tablet) no hay hover: el cartel "Reservá el tuyo a
   mejor precio" de las cards en preventa aparece cuando la card entra en
   pantalla al deslizar. Un solo observer compartido enciende/apaga la
   clase .is-inview, y el CSS hace el fade. */
let _preorderObserver = null;

function watchPreorderCards(scope = document) {
  if (!window.matchMedia('(hover: none)').matches) return;
  if (!('IntersectionObserver' in window)) {
    // Fallback viejo: sin observer, el cartel queda siempre visible.
    qsa('.product-card.is-preorder', scope).forEach(c => c.classList.add('is-inview'));
    return;
  }
  if (!_preorderObserver) {
    _preorderObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.classList.toggle('is-inview', e.isIntersecting));
    }, { threshold: 0.4 });
  }
  qsa('.product-card.is-preorder', scope).forEach(card => {
    if (card.dataset.inviewWired) return;
    card.dataset.inviewWired = '1';
    _preorderObserver.observe(card);
  });
}

/** Wireup para botones favoritos y agregar-al-carrito. */
export function wireCardActions(scope = document) {
  watchPreorderCards(scope);
  qsa('[data-fav]', scope).forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = Number(btn.dataset.fav);
      const active = toggleFavorite(id);
      btn.classList.toggle('is-active', active);
      const svgPath = btn.querySelector('svg path');
      if (svgPath) svgPath.setAttribute('fill', active ? 'currentColor' : 'none');
    });
  });

  qsa('[data-reserve]', scope).forEach(link => {
    if (link.dataset.wired) return;
    link.dataset.wired = '1';
    // No prevenimos el default: el enlace abre WhatsApp normalmente.
    // Solo registramos el interés en el pixel como Lead.
    link.addEventListener('click', () => {
      const id = Number(link.dataset.reserve);
      trackPixel('Lead', {
        content_ids: [String(id)],
        content_type: 'product',
        content_category: 'preorder'
      });
    });
  });

  qsa('[data-add]', scope).forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = Number(btn.dataset.add);
      const products = await loadProducts();
      const product = products.find(p => p.id === id);
      if (!product) return;
      addItem(product, {
        qty: 1,
        size: product.sizes?.[0] || null,
        color: product.colors?.[0]?.name || null
      });
      trackPixel('AddToCart', {
        content_ids: [String(product.id)],
        content_type: 'product',
        content_name: product.name,
        value: product.price,
        currency: product.currency
      });
      // Feedback visual breve
      btn.textContent = 'Agregado';
      setTimeout(() => (btn.textContent = 'Agregar'), 1200);
    });
  });
}

/* ---------- Filtros de utilidad ---------- */

export function filterFeatured(products) {
  return products.filter(p => p.featured);
}
export function filterByCategory(products, category) {
  if (!category) return products;
  const c = category.toLowerCase();
  return products.filter(p => p.category.toLowerCase() === c);
}
export function filterNew(products) {
  return products.filter(p => p.new);
}
export function filterPreorder(products) {
  return products.filter(isComingSoon);
}
export function filterSale(products) {
  return products.filter(p => (p.discount && p.discount > 0) || (p.oldPrice && p.oldPrice > p.price));
}

/* ---------- Home sections ---------- */

export async function renderHomeSections() {
  try {
    const products = await loadProducts();

    // Destacados
    renderGrid(qs('#home-featured'), filterFeatured(products).slice(0, 8));

    // Relojes (los que se anuncian como "Próximamente" van a su propia
    // sección de abajo, no acá)
    renderGrid(qs('#home-watches'),
      filterByCategory(products, 'Relojes').filter(p => !isComingSoon(p)));

    // Próximamente / Preventa — la sección se oculta sola si no hay ninguno
    const preorder = filterPreorder(products);
    const preorderSection = qs('#home-preorder-section');
    if (preorderSection) preorderSection.hidden = preorder.length === 0;
    renderGrid(qs('#home-preorder'), preorder);

    // Zuecos Nike Mind
    renderGrid(qs('#home-sneakers'), filterByCategory(products, 'Zuecos Nike Mind'));

  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}
