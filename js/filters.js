/* ============================================================
   IBIZZI · filters.js
   Filtros, ordenamiento y drawer móvil para products.html
   ============================================================ */

import { qs, qsa, lockScroll, unlockScroll } from './utils.js';
import { loadProducts, renderGrid } from './products.js';

const state = {
  category: null,
  brand: [],
  size: [],
  color: [],
  minPrice: null,
  maxPrice: null,
  onlyAvailable: false,
  onlyNew: false,
  onlySale: false,
  sort: 'featured',
  search: ''
};

function readURL() {
  const p = new URLSearchParams(window.location.search);
  state.category = p.get('category') || null;
  state.search = p.get('q') || '';
  if (p.get('filter') === 'new') state.onlyNew = true;
  if (p.get('filter') === 'sale') state.onlySale = true;
}

function applyFilters(products) {
  return products.filter(p => {
    if (state.category && p.category.toLowerCase() !== state.category.toLowerCase()) return false;
    if (state.brand.length && !state.brand.includes(p.brand)) return false;
    if (state.size.length && !p.sizes?.some(s => state.size.includes(s))) return false;
    if (state.color.length && !p.colors?.some(c => state.color.includes(c.name))) return false;
    if (state.minPrice != null && p.price < state.minPrice) return false;
    if (state.maxPrice != null && p.price > state.maxPrice) return false;
    if (state.onlyAvailable && (p.stock <= 0 || p.status === 'out_of_stock')) return false;
    if (state.onlyNew && !p.new) return false;
    if (state.onlySale && !(p.discount > 0 || (p.oldPrice && p.oldPrice > p.price))) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = [p.name, p.brand, p.category, ...(p.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function applySort(products) {
  const arr = [...products];
  switch (state.sort) {
    case 'price-asc':  arr.sort((a, b) => a.price - b.price); break;
    case 'price-desc': arr.sort((a, b) => b.price - a.price); break;
    case 'newest':     arr.sort((a, b) => (b.new === true) - (a.new === true)); break;
    case 'bestseller': arr.sort((a, b) => (b.sold || 0) - (a.sold || 0)); break;
    default:           arr.sort((a, b) => (b.featured === true) - (a.featured === true));
  }
  return arr;
}

function renderResults(products) {
  const grid = qs('#products-grid');
  const count = qs('#products-count');
  const filtered = applySort(applyFilters(products));
  if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'}`;

  // Los "hechos a pedido" (hoy, relojes) se muestran en su propia sección
  // aparte, debajo de los que hay en stock — no mezclados en la misma grilla.
  const mainItems = filtered.filter(p => !p.madeToOrder);
  const moreItems = filtered.filter(p => p.madeToOrder);

  renderGrid(grid, mainItems);

  const moreSection = qs('#products-more-section');
  if (moreSection) {
    moreSection.hidden = moreItems.length === 0;
    if (moreItems.length > 0) renderGrid(qs('#products-grid-more'), moreItems);
  }
}

function buildFilterUI(products) {
  const brands = [...new Set(products.map(p => p.brand))].sort();
  const sizes  = [...new Set(products.flatMap(p => p.sizes || []))].sort();
  const colors = [...new Set(products.flatMap(p => (p.colors || []).map(c => c.name)))].sort();

  qs('#filter-brands').innerHTML = brands.map(b => filterChip('brand', b)).join('');
  qs('#filter-sizes').innerHTML  = sizes.map(s => filterChip('size', s)).join('');
  qs('#filter-colors').innerHTML = colors.map(c => filterChip('color', c)).join('');
}

function filterChip(group, value) {
  return `
    <label class="filter-chip">
      <input type="checkbox" data-group="${group}" value="${value}">
      <span>${value}</span>
    </label>`;
}

function wireFilters(products) {
  qsa('input[type="checkbox"][data-group]').forEach(input => {
    input.addEventListener('change', () => {
      const g = input.dataset.group;
      const v = input.value;
      if (input.checked) state[g].push(v);
      else state[g] = state[g].filter(x => x !== v);
      renderResults(products);
    });
  });

  qs('#filter-available')?.addEventListener('change', (e) => {
    state.onlyAvailable = e.target.checked;
    renderResults(products);
  });
  qs('#filter-new')?.addEventListener('change', (e) => {
    state.onlyNew = e.target.checked;
    renderResults(products);
  });
  qs('#filter-sale')?.addEventListener('change', (e) => {
    state.onlySale = e.target.checked;
    renderResults(products);
  });

  qs('#filter-min')?.addEventListener('input', (e) => {
    state.minPrice = e.target.value ? Number(e.target.value) : null;
    renderResults(products);
  });
  qs('#filter-max')?.addEventListener('input', (e) => {
    state.maxPrice = e.target.value ? Number(e.target.value) : null;
    renderResults(products);
  });

  qs('#sort-select')?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderResults(products);
  });

  qs('#filter-clear')?.addEventListener('click', () => {
    state.brand = []; state.size = []; state.color = [];
    state.minPrice = null; state.maxPrice = null;
    state.onlyAvailable = state.onlyNew = state.onlySale = false;
    qsa('input[type="checkbox"]').forEach(i => (i.checked = false));
    qsa('input[type="number"]').forEach(i => (i.value = ''));
    renderResults(products);
  });
}

function wireDrawer() {
  const drawer = qs('#filters-drawer');
  const overlay = qs('#overlay');
  const openBtn = qs('#filters-open');
  const closeBtn = qs('#filters-close');
  const applyBtn = qs('#filters-apply');
  if (!drawer || !openBtn) return;

  const open = () => {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    lockScroll();
  };
  const close = () => {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    unlockScroll();
  };
  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  applyBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
}

/* ---------- Init ---------- */

export async function initProductsPage() {
  readURL();

  const products = await loadProducts();

  // Título dinámico según categoría
  const titleEl = qs('#products-title');
  if (titleEl) {
    if (state.category)   titleEl.textContent = state.category.charAt(0).toUpperCase() + state.category.slice(1);
    else if (state.onlyNew)  titleEl.textContent = 'Nuevos ingresos';
    else if (state.onlySale) titleEl.textContent = 'Oferta';
    else                  titleEl.textContent = 'Todos los productos';
  }

  buildFilterUI(products);
  wireFilters(products);
  wireDrawer();
  renderResults(products);
}
