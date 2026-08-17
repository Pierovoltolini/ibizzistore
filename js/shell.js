/* ============================================================
   IBIZZI · shell.js
   Renderiza header + overlays + drawers + footer en cada página.
   Cada HTML solo necesita <div id="shell-top"></div> y
   <div id="shell-bottom"></div> como puntos de inyección.
   ============================================================ */

import { whatsappLink } from './utils.js';

const shellTopHTML = `
  <!-- Announcement bar -->
  <div class="announcement" role="region" aria-label="Beneficios de compra">
    <div class="announcement-inner">
      <span>Envíos a todo Uruguay</span>
      <span>·</span>
      <span>Hasta 12 cuotas</span>
      <span>·</span>
      <span>Todas las tarjetas</span>
      <span>·</span>
      <span>Compra segura</span>
    </div>
  </div>

  <!-- Header -->
  <header class="header" role="banner">
    <div class="container-wide header-inner">
      <div class="header-left">
        <button class="hamburger" id="hamburger-btn" type="button" aria-label="Abrir menú" aria-controls="mobile-menu" aria-expanded="false">
          <span class="hamburger-lines" aria-hidden="true"></span>
        </button>
        <nav class="header-nav" aria-label="Navegación principal">
          <ul class="header-nav-list">
            <li><a href="index.html" class="header-nav-link">Inicio</a></li>
            <li><a href="products.html?category=indumentaria" class="header-nav-link">Indumentaria</a></li>
            <li><a href="products.html?category=relojes" class="header-nav-link">Relojes</a></li>
            <li><a href="products.html?category=accesorios" class="header-nav-link">Accesorios</a></li>
            <li><a href="products.html?category=zuecos%20nike%20mind" class="header-nav-link">Nike Mind</a></li>
            <li><a href="products.html?filter=new" class="header-nav-link">Nuevos</a></li>
          </ul>
        </nav>
      </div>

      <a href="index.html" class="header-logo" aria-label="IBIZZI — inicio">IBIZZI</a>

      <div class="header-right">
        <button class="icon-btn" id="search-btn" type="button" aria-label="Buscar">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
        </button>
        <a href="favorites.html" class="icon-btn" aria-label="Favoritos">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z"/>
          </svg>
          <span class="icon-badge" data-favorites-count data-count="0"></span>
        </a>
        <button class="icon-btn" id="cart-btn" type="button" aria-label="Carrito">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16l-1.5 12a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Z"/>
            <path d="M8 7V5a4 4 0 0 1 8 0v2"/>
          </svg>
          <span class="icon-badge" data-cart-count data-count="0"></span>
        </button>
      </div>
    </div>
  </header>

  <!-- Overlay compartido -->
  <div class="overlay" id="overlay" aria-hidden="true"></div>

  <!-- Menú móvil -->
  <aside class="mobile-menu" id="mobile-menu" aria-hidden="true" aria-label="Menú de navegación">
    <div class="mobile-menu-header">
      <span class="mobile-menu-title">IBIZZI</span>
      <button class="mobile-menu-close" id="mobile-menu-close" type="button" aria-label="Cerrar menú">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12"/></svg>
      </button>
    </div>
    <div class="mobile-menu-body">
      <ul class="mobile-nav-list">
        <li><a href="index.html" class="mobile-nav-link">Inicio</a></li>
        <li><a href="products.html?category=indumentaria" class="mobile-nav-link">Indumentaria</a></li>
        <li><a href="products.html?category=relojes" class="mobile-nav-link">Relojes</a></li>
        <li><a href="products.html?category=accesorios" class="mobile-nav-link">Accesorios</a></li>
        <li><a href="products.html?category=zuecos%20nike%20mind" class="mobile-nav-link">Zuecos Nike Mind</a></li>
        <li><a href="products.html?filter=new" class="mobile-nav-link">Nuevos</a></li>
        <li><a href="products.html?filter=sale" class="mobile-nav-link">Oferta</a></li>
      </ul>
    </div>
    <div class="mobile-menu-footer">
      <a href="favorites.html">Favoritos</a>
      <a href="contact.html">Contacto</a>
      <a href="shipping.html">Envíos y devoluciones</a>
      <a href="faq.html">Preguntas frecuentes</a>
    </div>
  </aside>

  <!-- Search overlay -->
  <div class="search-overlay" id="search-overlay" aria-hidden="true" role="dialog" aria-label="Buscar productos">
    <div class="container-wide search-overlay-inner">
      <form class="search-form" role="search" onsubmit="return false;">
        <svg class="icon icon-lg" viewBox="0 0 24 24" aria-hidden="true" style="color:#8A8A8A;">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
        </svg>
        <input type="search" id="search-input" class="search-input" placeholder="Buscar productos, marcas o colecciones" autocomplete="off" aria-label="Término de búsqueda">
        <button class="icon-btn" id="search-close" type="button" aria-label="Cerrar búsqueda">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12"/></svg>
        </button>
      </form>
      <div class="search-suggestions" id="search-suggestions"></div>
    </div>
  </div>

  <!-- Cart drawer -->
  <aside class="cart-drawer" id="cart-drawer" aria-hidden="true" aria-label="Carrito">
    <div class="cart-drawer-header">
      <span class="cart-drawer-title">Tu carrito</span>
      <button class="mobile-menu-close" id="cart-drawer-close" type="button" aria-label="Cerrar carrito">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12"/></svg>
      </button>
    </div>
    <div class="cart-drawer-body" id="cart-drawer-body">
      <div class="cart-empty">
        <p class="text-secondary">Todavía no agregaste productos.</p>
        <a href="products.html" class="btn btn-secondary btn-sm" style="margin-top:1rem;">EXPLORAR PRODUCTOS</a>
      </div>
    </div>
    <div class="cart-drawer-footer" id="cart-drawer-footer" hidden>
      <div class="cart-subtotal">
        <span>Subtotal</span>
        <strong id="cart-drawer-subtotal">$ 0</strong>
      </div>
      <p class="cart-drawer-meta">Envío calculado en el checkout.</p>
      <div class="cart-drawer-actions">
        <a href="cart.html" class="btn btn-secondary btn-block">Ver carrito</a>
        <a href="checkout.html" class="btn btn-primary btn-block">Finalizar compra</a>
      </div>
    </div>
  </aside>

  <!-- Instagram flotante -->
  <a href="https://instagram.com/ibizzi.studio" target="_blank" rel="noopener" class="float-ig-btn" aria-label="Seguinos en Instagram">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  </a>
`;

const shellBottomHTML = `
  <footer class="footer" role="contentinfo">
    <div class="footer-newsletter">
      <div class="container">
        <h2 class="footer-newsletter-title">FORMÁ PARTE DE IBIZZI</h2>
        <p class="footer-newsletter-text">Recibí novedades, lanzamientos y selecciones exclusivas.</p>
        <form class="footer-newsletter-form" onsubmit="event.preventDefault(); this.querySelector('input').value=''; this.querySelector('button').textContent='LISTO';">
          <input type="email" class="footer-newsletter-input" placeholder="Tu email" aria-label="Email" required>
          <button class="btn btn-primary">Suscribirme</button>
        </form>
      </div>
    </div>

    <div class="footer-main">
      <div class="container footer-grid">
        <div class="footer-brand-col">
          <span class="footer-logo">IBIZZI</span>
          <p class="footer-tagline">Indumentaria y accesorios seleccionados para quienes cuidan cada detalle de su estilo.</p>
          <div class="footer-socials">
            <a href="https://instagram.com/ibizzi.studio" target="_blank" rel="noopener" aria-label="Instagram"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg></a>
            <a href="${whatsappLink('¡Hola IBIZZI! Tengo una consulta.')}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3.6-6.7L20 4l-1.3 3.6A8 8 0 0 1 20 12Z"/><path d="M9 10c.5 2 2 3.5 4 4l1.3-1.3c.4-.4 1-.4 1.4-.1l1.8 1.1c.5.3.6 1 .2 1.5-1 1.2-2.6 1.8-4 1.3-2.5-.9-4.5-2.9-5.4-5.4-.5-1.4.1-3 1.3-4 .5-.4 1.2-.3 1.5.2l1.1 1.8c.3.4.3 1-.1 1.4L9 10Z"/></svg></a>
            <a href="#" aria-label="TikTok"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v9a3 3 0 1 1-3-3"/><path d="M14 4c0 2 1.5 4 4 4"/></svg></a>
          </div>
        </div>
        <div>
          <h3 class="footer-col-title">Comprar</h3>
          <ul class="footer-list">
            <li><a href="products.html?category=indumentaria">Indumentaria</a></li>
            <li><a href="products.html?category=relojes">Relojes</a></li>
            <li><a href="products.html?category=accesorios">Accesorios</a></li>
            <li><a href="products.html?category=zuecos%20nike%20mind">Zuecos Nike Mind</a></li>
            <li><a href="products.html?filter=new">Nuevos ingresos</a></li>
            <li><a href="products.html?filter=sale">Oferta</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer-col-title">Ayuda</h3>
          <ul class="footer-list">
            <li><a href="contact.html">Contacto</a></li>
            <li><a href="shipping.html">Envíos y devoluciones</a></li>
            <li><a href="faq.html">Preguntas frecuentes</a></li>
            <li><a href="#">Guía de talles</a></li>
            <li><a href="#">Seguimiento de pedido</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer-col-title">Cuenta</h3>
          <ul class="footer-list">
            <li><a href="favorites.html">Mis favoritos</a></li>
            <li><a href="cart.html">Mi carrito</a></li>
            <li><a href="#">Mis pedidos</a></li>
            <li><a href="#">Política de privacidad</a></li>
            <li><a href="#">Términos y condiciones</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-payments">
      <div class="container footer-payments-inner">
        <span class="footer-payments-title">Medios de pago</span>
        <div class="footer-payments-list">
          <span class="payment-badge">Visa</span>
          <span class="payment-badge">Mastercard</span>
          <span class="payment-badge">Amex</span>
          <span class="payment-badge">OCA</span>
          <span class="payment-badge">Mercado Pago</span>
          <span class="payment-badge">Transferencia</span>
        </div>
      </div>
    </div>

    <div class="container footer-bottom">
      <span class="footer-copyright">© 2026 IBIZZI · Uruguay</span>
      <div class="footer-meta">
        <a href="#">Política de privacidad</a>
        <a href="#">Términos</a>
        <a href="#">Cookies</a>
      </div>
    </div>
  </footer>
`;

export function renderShell() {
  const top = document.getElementById('shell-top');
  const bottom = document.getElementById('shell-bottom');
  if (top) top.innerHTML = shellTopHTML;
  if (bottom) bottom.innerHTML = shellBottomHTML;
}
