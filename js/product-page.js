/* ============================================================
   IBIZZI · product-page.js
   Detalle de producto: galería + variantes + sticky bar móvil
   ============================================================ */

import { qs, qsa, getQueryParam, formatPrice, calcDiscount, trackPixel, whatsappLink, transferPrice } from './utils.js';
import { loadProducts, preorderMessage, isComingSoon } from './products.js';
import { addItem } from './cart.js';
import { toggleFavorite, isFavorite } from './favorites.js';
import { renderRecommendations, initCarousel } from './recommendations.js';

let currentProduct = null;
let selectedSize = null;
let selectedColor = null;
let currentImageIndex = 0;

async function findProduct() {
  const products = await loadProducts();
  const slug = getQueryParam('slug');
  const id = getQueryParam('id');
  if (slug) return products.find(p => p.slug === slug);
  if (id)   return products.find(p => p.id === Number(id));
  return null;
}

function updateSEO(p) {
  document.title = `${p.name} · IBIZZI`;
  qs('meta[name="description"]')?.setAttribute('content', p.shortDescription);
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": p.name,
    "image": p.images,
    "description": p.shortDescription,
    "sku": p.sku,
    "brand": { "@type": "Brand", "name": p.brand },
    "offers": {
      "@type": "Offer",
      "priceCurrency": p.currency,
      "price": p.price,
      "availability": p.status === 'preorder'
        ? "https://schema.org/PreOrder"
        : (p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock")
    }
  };
  let script = qs('#product-jsonld');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-jsonld';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(jsonLd);
}

/* ---------- Render principal ---------- */

function render(p) {
  currentProduct = p;
  selectedSize = p.sizes?.length === 1 ? p.sizes[0] : null;
  selectedColor = p.colors?.length === 1 ? p.colors[0].name : null;

  const discount = p.discount || calcDiscount(p.price, p.oldPrice);
  const isPreorder = p.status === 'preorder';
  const comingSoon = isComingSoon(p);
  const outOfStock = !isPreorder && (p.stock <= 0 || p.status === 'out_of_stock');

  // Breadcrumbs
  qs('#pp-breadcrumbs').innerHTML = `
    <a href="index.html">Inicio</a>
    <span>/</span>
    <a href="products.html?category=${p.category.toLowerCase()}">${p.category}</a>
    <span>/</span>
    <span>${p.name}</span>
  `;

  // Galería
  qs('#pp-gallery-main').innerHTML = p.images.map((img, i) => `
    <div class="pp-slide" data-index="${i}">
      <img src="${img}" alt="${p.name} ${i+1}" ${i > 0 ? 'loading="lazy"' : ''}>
    </div>
  `).join('');
  qs('#pp-gallery-counter').textContent = `1 / ${p.images.length}`;
  qs('#pp-thumbs').innerHTML = p.images.map((img, i) => `
    <button type="button" class="pp-thumb ${i===0?'is-active':''}" data-index="${i}" aria-label="Ver imagen ${i+1}">
      <img src="${img}" alt="">
    </button>
  `).join('');

  // Info
  qs('#pp-brand').textContent = p.brand;
  qs('#pp-name').textContent = p.name;
  qs('#pp-short').textContent = p.shortDescription;

  const priceEl = qs('#pp-price');
  const oldEl = qs('#pp-old-price');
  const discEl = qs('#pp-discount');
  const transferEl = qs('#pp-transfer');
  if (isPreorder && p.price == null) {
    // Preventa sin precio confirmado: mostramos el gancho en vez del número.
    priceEl.textContent = 'Reservá al mejor precio';
    priceEl.classList.add('pp-price-preorder');
    oldEl.hidden = true;
    discEl.hidden = true;
    transferEl.hidden = true;
  } else {
    priceEl.textContent = formatPrice(p.price, p.currency);
    if (p.oldPrice && p.oldPrice > p.price) {
      oldEl.textContent = formatPrice(p.oldPrice, p.currency);
      oldEl.hidden = false;
      discEl.textContent = comingSoon ? 'Próximamente' : `-${discount}%`;
      discEl.hidden = false;
    } else {
      oldEl.hidden = true;
      discEl.hidden = true;
    }
    transferEl.textContent = `🏦 Transferencia ${formatPrice(transferPrice(p.price), p.currency)}`;
    transferEl.hidden = false;
  }

  // Colores
  const colorsEl = qs('#pp-colors');
  if (p.colors?.length) {
    colorsEl.innerHTML = p.colors.map((c, i) => `
      <button type="button" class="pp-color-swatch ${i===0 && selectedColor===c.name?'is-active':''}"
              data-color="${c.name}"${c.image != null ? ` data-image="${c.image}"` : ''} aria-label="${c.name}" title="${c.name}"
              style="background-color:${c.hex};"></button>
    `).join('');
    qs('#pp-color-label').textContent = selectedColor || 'Elegí un color';
  } else {
    qs('#pp-colors-block').hidden = true;
  }

  // Talles
  const sizesEl = qs('#pp-sizes');
  if (p.sizes?.length) {
    sizesEl.innerHTML = p.sizes.map(s => `
      <button type="button" class="pp-size-btn ${selectedSize===s?'is-active':''}" data-size="${s}">${s}</button>
    `).join('');
  } else {
    qs('#pp-sizes-block').hidden = true;
  }

  // Estado y sticky
  const stickyPrice = qs('#sticky-price');
  const stickyBtn = qs('#sticky-add-btn');

  if (isPreorder) {
    // Preventa: sin carrito ni compra directa. Ocultamos los controles de
    // compra (cantidad, agregar, comprar) y ponemos un botón que abre
    // WhatsApp. Dejamos intacto el botón de favoritos y su cableado.
    const waHref = whatsappLink(preorderMessage(p));
    const actions = qs('.pp-actions');
    actions.querySelector('.qty-picker')?.closest('.pp-actions-row')?.setAttribute('hidden', '');
    qs('#pp-add-btn')?.setAttribute('hidden', '');
    qs('#pp-buy-btn')?.setAttribute('hidden', '');
    const favRow = qs('#pp-fav-btn')?.closest('.pp-actions-row') || actions;
    favRow.insertAdjacentHTML('afterbegin',
      `<a href="${waHref}" class="btn btn-primary pp-reserve-btn" id="pp-reserve-btn" target="_blank" rel="noopener" style="flex:1;">Reservá el tuyo por WhatsApp</a>`);
    const hint = document.createElement('p');
    hint.className = 'pp-preorder-hint';
    hint.textContent = 'Modelo en preventa. Coordinás seña y entrega por WhatsApp y te lo aseguramos al mejor precio de lanzamiento.';
    actions.appendChild(hint);
    stickyPrice.textContent = p.price != null
      ? formatPrice(p.price, p.currency)
      : (comingSoon ? 'Próximamente' : 'A reservar');
    stickyBtn.textContent = 'Reservá el tuyo';
  } else {
    const addBtn = qs('#pp-add-btn');
    const buyBtn = qs('#pp-buy-btn');
    if (outOfStock) {
      addBtn.textContent = 'Agotado';
      addBtn.disabled = true;
      buyBtn.disabled = true;
      stickyBtn.textContent = 'Agotado';
      stickyBtn.disabled = true;
    }
    stickyPrice.textContent = formatPrice(p.price, p.currency);
  }

  // Descripción larga y specs
  qs('#pp-long').textContent = p.longDescription || p.shortDescription;
  const specsEl = qs('#pp-specs');
  if (p.specifications?.length) {
    specsEl.innerHTML = p.specifications.map(s => `
      <div class="pp-spec-row">
        <dt>${s.label}</dt>
        <dd>${s.value}</dd>
      </div>
    `).join('');
  } else {
    qs('#pp-specs-block').hidden = true;
  }

  // Reseñas
  const reviewsEl = qs('#pp-reviews');
  if (p.reviews?.length) {
    reviewsEl.innerHTML = p.reviews.map(r => `
      <article class="pp-review">
        <div class="pp-review-head">
          <span class="pp-review-author">${r.author}</span>
          <span class="pp-review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
        </div>
        <p class="pp-review-comment">${r.comment}</p>
        <span class="pp-review-date">${new Date(r.date).toLocaleDateString('es-UY')}</span>
      </article>
    `).join('');
  } else {
    qs('#pp-reviews-block').innerHTML = `<p class="text-muted">Sé el primero en dejar una reseña.</p>`;
  }

  // Favorito
  const favBtn = qs('#pp-fav-btn');
  const setFavUI = () => {
    const active = isFavorite(p.id);
    favBtn.classList.toggle('is-active', active);
    favBtn.querySelector('svg path').setAttribute('fill', active ? 'currentColor' : 'none');
  };
  setFavUI();
  favBtn.addEventListener('click', () => {
    toggleFavorite(p.id);
    setFavUI();
  });

  wireGallery();
  wireVariants();
  wireAdd();
  wireStickyBar();
  updateSEO(p);

  trackPixel('ViewContent', {
    content_ids: [String(p.id)],
    content_type: 'product',
    content_name: p.name,
    value: p.price,
    currency: p.currency
  });
}

/* ---------- Galería (swipe + thumbs + counter) ---------- */

function wireGallery() {
  const main = qs('#pp-gallery-main');
  const counter = qs('#pp-gallery-counter');
  const prevBtn = qs('#pp-prev');
  const nextBtn = qs('#pp-next');
  if (!main) return;

  const goTo = (idx) => {
    const total = currentProduct.images.length;
    currentImageIndex = (idx + total) % total;
    main.scrollTo({ left: currentImageIndex * main.clientWidth, behavior: 'smooth' });
    counter.textContent = `${currentImageIndex + 1} / ${total}`;
    qsa('.pp-thumb').forEach((t, i) => t.classList.toggle('is-active', i === currentImageIndex));
  };

  prevBtn?.addEventListener('click', () => goTo(currentImageIndex - 1));
  nextBtn?.addEventListener('click', () => goTo(currentImageIndex + 1));

  qsa('.pp-thumb').forEach(t => {
    t.addEventListener('click', () => goTo(Number(t.dataset.index)));
  });

  // Sync counter con scroll táctil
  let scrollTimeout;
  main.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const idx = Math.round(main.scrollLeft / main.clientWidth);
      if (idx !== currentImageIndex) {
        currentImageIndex = idx;
        counter.textContent = `${idx + 1} / ${currentProduct.images.length}`;
        qsa('.pp-thumb').forEach((t, i) => t.classList.toggle('is-active', i === idx));
      }
    }, 50);
  }, { passive: true });
}

/* ---------- Variantes ---------- */

function wireVariants() {
  qsa('.pp-color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      qsa('.pp-color-swatch').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      qs('#pp-color-label').textContent = selectedColor;
      // Si el color tiene una foto asociada, llevamos la galería a esa imagen
      // (reutiliza el click del thumbnail, que ya hace el scroll suave).
      if (btn.dataset.image != null) {
        qsa('.pp-thumb')[Number(btn.dataset.image)]?.click();
      }
    });
  });
  qsa('.pp-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSize = btn.dataset.size;
      qsa('.pp-size-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
}

/* ---------- Add + Buy ---------- */

function validate() {
  if (currentProduct.sizes?.length > 1 && !selectedSize) {
    alert('Elegí un talle antes de agregar al carrito.');
    return false;
  }
  if (currentProduct.colors?.length > 1 && !selectedColor) {
    alert('Elegí un color antes de agregar al carrito.');
    return false;
  }
  return true;
}

function trackAddToCart(qty) {
  const p = currentProduct;
  trackPixel('AddToCart', {
    content_ids: [String(p.id)],
    content_type: 'product',
    content_name: p.name,
    value: p.price * qty,
    currency: p.currency
  });
}

function wireAdd() {
  // Preventa: no hay carrito. Tanto el botón principal como el sticky
  // abren WhatsApp; solo registramos el interés en el pixel.
  if (currentProduct?.status === 'preorder') {
    const waHref = whatsappLink(preorderMessage(currentProduct));
    const lead = () => trackPixel('Lead', {
      content_ids: [String(currentProduct.id)],
      content_type: 'product',
      content_category: 'preorder'
    });
    qs('#pp-reserve-btn')?.addEventListener('click', lead);
    qs('#sticky-add-btn')?.addEventListener('click', () => {
      lead();
      window.open(waHref, '_blank', 'noopener');
    });
    return;
  }

  const qtyValue = qs('#pp-qty-value');
  qs('#pp-qty-dec')?.addEventListener('click', () => {
    qtyValue.textContent = Math.max(1, parseInt(qtyValue.textContent, 10) - 1);
  });
  qs('#pp-qty-inc')?.addEventListener('click', () => {
    qtyValue.textContent = Math.min(99, parseInt(qtyValue.textContent, 10) + 1);
  });
  qs('#pp-add-btn')?.addEventListener('click', () => {
    if (!validate()) return;
    const qty = parseInt(qtyValue.textContent, 10);
    addItem(currentProduct, { qty, size: selectedSize, color: selectedColor });
    trackAddToCart(qty);
  });
  qs('#pp-buy-btn')?.addEventListener('click', () => {
    if (!validate()) return;
    const qty = parseInt(qtyValue.textContent, 10);
    addItem(currentProduct, { qty, size: selectedSize, color: selectedColor });
    trackAddToCart(qty);
    setTimeout(() => window.location.href = 'checkout.html', 400);
  });
  qs('#sticky-add-btn')?.addEventListener('click', () => {
    if (!validate()) return;
    const qty = parseInt(qtyValue.textContent, 10);
    addItem(currentProduct, { qty, size: selectedSize, color: selectedColor });
    trackAddToCart(qty);
  });
}

/* ---------- Sticky bar móvil ---------- */

function wireStickyBar() {
  const target = qs('#pp-add-btn');
  const bar = qs('#pp-sticky-bar');
  if (!target || !bar) return;
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) bar.classList.remove('is-visible');
    else bar.classList.add('is-visible');
  }, { rootMargin: '-80px 0px 0px 0px' });
  io.observe(target);
}

/* ---------- Init ---------- */

export async function initProductPage() {
  const product = await findProduct();
  if (!product) {
    window.location.href = '404.html';
    return;
  }
  render(product);
  await renderRecommendations(product);
  initCarousel('#complementary-list');
  initCarousel('#recommended-list');
}
