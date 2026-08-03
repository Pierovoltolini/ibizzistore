/* ============================================================
   IBIZZI · utils.js
   Helpers reutilizables en toda la tienda.
   ============================================================ */

/* ---------- Selectores ---------- */

export const qs  = (sel, ctx = document) => ctx.querySelector(sel);
export const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---------- Formateo ---------- */

/** Formatea precio en pesos uruguayos por defecto. */
export function formatPrice(value, currency = 'UYU', locale = 'es-UY') {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    // Fallback si el navegador no soporta el currency
    return `$ ${Math.round(value).toLocaleString(locale)}`;
  }
}

/** Calcula % descuento entre precio y precio anterior. */
export function calcDiscount(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

/** % de descuento pagando por transferencia bancaria. Un solo lugar para
 *  no desincronizar el cartelito del precio con el descuento real del checkout. */
export const TRANSFER_DISCOUNT_PERCENT = 8;

/** Precio final pagando por transferencia bancaria. */
export function transferPrice(price) {
  return Math.round(price * (1 - TRANSFER_DISCOUNT_PERCENT / 100));
}

/** Slugify simple para búsquedas y comparaciones. */
export function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ---------- Debounce / Throttle ---------- */

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle(fn, limit = 200) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/* ---------- Fetch con caché en memoria ---------- */

const _fetchCache = new Map();

/**
 * fetchJSON con caché en memoria por URL.
 * La segunda invocación devuelve el mismo array sin ir a la red.
 */
export async function fetchJSON(url) {
  if (_fetchCache.has(url)) return _fetchCache.get(url);
  const promise = fetch(url).then(res => {
    if (!res.ok) throw new Error(`Error al cargar ${url}: ${res.status}`);
    return res.json();
  });
  _fetchCache.set(url, promise);
  try {
    return await promise;
  } catch (err) {
    _fetchCache.delete(url); // permitir reintento
    throw err;
  }
}

/* ---------- LocalStorage seguro ---------- */

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('storage.set falló', err);
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
};

/* ---------- Código de descuento ---------- */

const DISCOUNT_KEY = 'ibizzi_discount';
const DISCOUNT_CODES = {
  IBIZZI10: 10
};

/** Intenta aplicar un código de descuento. Devuelve el % aplicado, o null si el código no existe. */
export function applyDiscountCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  const percent = DISCOUNT_CODES[normalized];
  if (!percent) return null;
  storage.set(DISCOUNT_KEY, { code: normalized, percent });
  return percent;
}

/** Devuelve el descuento activo ({code, percent}) o null si no hay ninguno aplicado. */
export function getDiscount() {
  return storage.get(DISCOUNT_KEY, null);
}

export function clearDiscount() {
  storage.remove(DISCOUNT_KEY);
}

/* ---------- Event bus simple ---------- */

const _bus = new EventTarget();

export const bus = {
  on(event, handler) {
    const wrapped = (e) => handler(e.detail);
    _bus.addEventListener(event, wrapped);
    // devolver función para desuscribirse
    return () => _bus.removeEventListener(event, wrapped);
  },
  emit(event, detail) {
    _bus.dispatchEvent(new CustomEvent(event, { detail }));
  }
};

/* ---------- Contacto / WhatsApp ---------- */

/**
 * Número de WhatsApp de la tienda, en formato internacional sin "+",
 * espacios ni guiones (ej: 59891929940 para un 091 929 940 uruguayo).
 */
export const STORE_WHATSAPP = '59891929940';

/** Arma un link de WhatsApp (wa.me) con un mensaje pre-cargado. */
export function whatsappLink(message = '') {
  const base = `https://wa.me/${STORE_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/* ---------- Meta Pixel ---------- */

/** Envía un evento al Meta Pixel si está cargado (no rompe si un bloqueador lo frenó). */
export function trackPixel(event, params) {
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', event, params);
    }
  } catch {
    /* noop */
  }
}

/* ---------- DOM helpers ---------- */

/** Bloquea el scroll del body (drawers, modales). */
export function lockScroll() {
  document.body.classList.add('is-locked');
}
export function unlockScroll() {
  document.body.classList.remove('is-locked');
}

/** Trap escape key + click en overlay para cerrar. */
export function bindDrawerClose({ drawer, overlay, onClose }) {
  const close = () => {
    onClose();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay?.addEventListener('click', close, { once: true });
}

/** Obtiene un parámetro de la URL. */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Crea nodos desde una string HTML. */
export function html(strings, ...values) {
  const raw = String.raw({ raw: strings }, ...values);
  const tpl = document.createElement('template');
  tpl.innerHTML = raw.trim();
  return tpl.content;
}
