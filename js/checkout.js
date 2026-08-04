/* ============================================================
   IBIZZI · checkout.js
   Validaciones + resumen + pago con Mercado Pago (Checkout Pro).
   Transferencia/efectivo se confirman directo; "mp" crea una
   preferencia vía functions/api/create-preference.js (Cloudflare
   Pages Function) y redirige al cliente a pagar en Mercado Pago.
   ============================================================ */

import { qs, qsa, formatPrice, storage, bus, getDiscount, clearDiscount, getQueryParam, trackPixel, TRANSFER_DISCOUNT_PERCENT, whatsappLink } from './utils.js';
import { getCart, subtotal, clearCart } from './cart.js';
import { sendOrderEmails } from './email-notifications.js';

const NOTE_KEY = 'ibizzi_cart_note';

const SHIPPING_METHODS = [
  { id: 'mvd',      name: 'Montevideo · 4 a 24 hs (Tres Cruces)', price: 0,
    desc: 'Envío a coordinar' },
  { id: 'interior', name: 'Interior · DAC 24-72 hs',              price: 0,
    desc: 'Envío por DAC — si tenés agencia de preferencia, avisanos en la nota del pedido' },
  { id: 'pickup',   name: 'Retiro en local',                      price: 0,
    desc: 'Entrega estimada según zona' }
];

const PAYMENT_METHODS = [
  { id: 'mp',       name: 'Mercado Pago',          desc: 'Todas las tarjetas · Hasta 12 cuotas' },
  { id: 'transfer', name: 'Transferencia bancaria', desc: '10% de descuento en el total' },
  { id: 'cash',     name: 'Efectivo al retirar',    desc: 'Solo retiro en local' }
];

const state = {
  shipping: SHIPPING_METHODS[0],
  payment: PAYMENT_METHODS[0]
};

/* ---------- Totales ---------- */

/**
 * Aplica primero el código de descuento (si hay uno cargado desde el
 * carrito) y luego, si corresponde, el descuento por transferencia bancaria
 * (ver PAYMENT_METHODS / FAQ). Ambos se aplican sobre el subtotal, no
 * sobre el envío.
 */
function computeTotals() {
  const sub = subtotal();
  const shipping = state.shipping.price;
  const code = getDiscount();

  let discounted = sub;
  let discountAmount = 0;

  if (code) {
    const amount = Math.round(discounted * code.percent / 100);
    discounted -= amount;
    discountAmount += amount;
  }
  if (state.payment.id === 'transfer') {
    const amount = Math.round(discounted * TRANSFER_DISCOUNT_PERCENT / 100);
    discounted -= amount;
    discountAmount += amount;
  }

  return { sub, shipping, discountAmount, total: discounted + shipping };
}

/* ---------- Render resumen ---------- */

function renderSummary() {
  const cart = getCart();
  const linesEl = qs('#checkout-lines');
  const { sub, shipping, discountAmount, total } = computeTotals();

  linesEl.innerHTML = cart.map(item => `
    <li class="order-summary-line">
      <img src="${item.image}" alt="">
      <div>
        <span class="order-summary-line-name">${item.name}</span>
        <span class="order-summary-line-meta">
          ${item.size ? `T. ${item.size}` : ''} ${item.color ? `· ${item.color}` : ''} · x${item.qty}
        </span>
      </div>
      <strong>${formatPrice(item.price * item.qty)}</strong>
    </li>
  `).join('');

  qs('#checkout-subtotal').textContent = formatPrice(sub);
  qs('#checkout-shipping').textContent = state.shipping.id === 'pickup' ? 'Gratis' : 'A coordinar';

  const discountRow = qs('#checkout-discount-row');
  if (discountRow) {
    if (discountAmount > 0) {
      discountRow.hidden = false;
      qs('#checkout-discount').textContent = `- ${formatPrice(discountAmount)}`;
    } else {
      discountRow.hidden = true;
    }
  }

  qs('#checkout-total').textContent = formatPrice(total);
}

/* ---------- Render métodos ---------- */

function renderShipping() {
  qs('#checkout-shipping-list').innerHTML = SHIPPING_METHODS.map((s, i) => `
    <label class="checkout-radio">
      <input type="radio" name="shipping" value="${s.id}" ${i===0?'checked':''}>
      <div class="checkout-radio-body">
        <div>
          <div class="checkout-radio-name">${s.name}</div>
          <div class="checkout-radio-desc">${s.desc}</div>
        </div>
        <div class="checkout-radio-price">${s.id === 'pickup' ? 'Gratis' : 'A coordinar'}</div>
      </div>
    </label>
  `).join('');

  qsa('input[name="shipping"]').forEach(input => {
    input.addEventListener('change', () => {
      state.shipping = SHIPPING_METHODS.find(s => s.id === input.value);
      renderSummary();
    });
  });
}

function renderPayment() {
  qs('#checkout-payment-list').innerHTML = PAYMENT_METHODS.map((p, i) => `
    <label class="checkout-radio">
      <input type="radio" name="payment" value="${p.id}" ${i===0?'checked':''}>
      <div class="checkout-radio-body">
        <div>
          <div class="checkout-radio-name">${p.name}</div>
          <div class="checkout-radio-desc">${p.desc}</div>
        </div>
      </div>
    </label>
  `).join('');

  qsa('input[name="payment"]').forEach(input => {
    input.addEventListener('change', () => {
      state.payment = PAYMENT_METHODS.find(p => p.id === input.value);
      renderSummary();
    });
  });
}

/* ---------- Validación ---------- */

function validateForm() {
  const form = qs('#checkout-form');
  let valid = true;

  qsa('.form-field', form).forEach(f => f.classList.remove('error'));

  const requiredFields = ['email', 'name', 'phone', 'address', 'city', 'state'];
  requiredFields.forEach(name => {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input?.value?.trim()) {
      input?.closest('.form-field')?.classList.add('error');
      valid = false;
    }
  });

  // Email básico
  const emailInput = form.querySelector('[name="email"]');
  if (emailInput?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
    emailInput.closest('.form-field')?.classList.add('error');
    valid = false;
  }

  return valid;
}

/* ---------- Pago con Mercado Pago (Checkout Pro) ---------- */

const PENDING_KEY = 'ibizzi_pending_order';

/**
 * Pide al backend (functions/api/create-preference.js, Cloudflare Pages
 * Function) que cree la preferencia de pago en Mercado Pago y devuelva el
 * link de Checkout Pro al que hay que redirigir al cliente. El access
 * token vive solo en el backend — nunca se expone acá.
 */
async function requestMPPreference(orderData) {
  const res = await fetch('/api/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.initPoint) {
    throw new Error(data.error || 'No se pudo iniciar el pago con Mercado Pago.');
  }
  return data.initPoint;
}

function showOrderConfirmed(orderNumber) {
  qs('#checkout-layout').hidden = true;
  qs('#order-confirmed').hidden = false;
  qs('#order-number').textContent = orderNumber || '-';
}

/** Arma el mensaje de WhatsApp con el carrito, los datos de envío y el total, para pagos por transferencia. */
function buildTransferMessage(orderData) {
  const c = orderData.customer;
  const itemLines = orderData.items.map(i =>
    `• ${i.name}${i.size ? ` (talle ${i.size})` : ''}${i.color ? ` - ${i.color}` : ''} x${i.qty} — ${formatPrice(i.price * i.qty)}`
  ).join('\n');

  const parts = [
    `¡Hola IBIZZI! Deseo abonar con transferencia mi pedido ${orderData.orderNumber}.`,
    '',
    'Productos:',
    itemLines,
    '',
    `Envío: ${orderData.shipping.name}`,
    `Nombre: ${c.name}`,
    `Teléfono: ${c.phone}`,
    `Dirección: ${c.address}, ${c.city}, ${c.state}`
  ];
  if (c.notes) parts.push(`Nota: ${c.notes}`);
  parts.push('', `Total a transferir: ${formatPrice(orderData.total)}`);

  return parts.join('\n');
}

/** Confirma el pedido: limpia carrito/descuento/nota, trackea la compra y muestra la pantalla de éxito. */
function confirmOrder(orderData) {
  storage.set('ibizzi_last_order', orderData);
  storage.remove(PENDING_KEY);
  clearCart();
  clearDiscount();
  storage.remove(NOTE_KEY);

  trackPixel('Purchase', {
    content_ids: (orderData.items || []).map(i => String(i.id)),
    content_type: 'product',
    contents: (orderData.items || []).map(i => ({ id: String(i.id), quantity: i.qty })),
    num_items: (orderData.items || []).reduce((sum, i) => sum + (i.qty || 1), 0),
    value: orderData.total,
    currency: 'UYU'
  });

  sendOrderEmails(orderData).catch(() => {});
  decrementStock(orderData).catch(() => {});

  showOrderConfirmed(orderData.orderNumber);
}

/** Avisa al stock compartido (Cloudflare KV) qué se vendió, para que baje
 *  para todos los visitantes. Idempotente por orderNumber del lado del
 *  servidor — no importa si esto se llama más de una vez. */
async function decrementStock(orderData) {
  await fetch('/api/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: orderData.orderNumber,
      items: (orderData.items || []).map(i => ({ id: i.id, size: i.size, qty: i.qty }))
    })
  });
}

/**
 * Si la URL trae ?status=... es porque Mercado Pago acaba de redirigir de
 * vuelta después del pago (back_urls / auto_return). Devuelve true si ya
 * se hizo cargo de la pantalla, para que initCheckout no siga de largo.
 */
function handleMPReturn() {
  const status = getQueryParam('status');
  if (!status) return false;

  qs('#checkout-layout').hidden = true;
  qs('#checkout-empty').hidden = true;

  const pending = storage.get(PENDING_KEY, null);

  if (status === 'success' && pending) {
    confirmOrder(pending);
  } else if (status === 'success') {
    // El pedido ya se confirmó antes (ej: el cliente refrescó la pantalla
    // de éxito) — no hay nada pendiente, así que solo re-mostramos la
    // confirmación sin volver a tocar el carrito ni trackear la compra de nuevo.
    const last = storage.get('ibizzi_last_order', null);
    showOrderConfirmed(last?.orderNumber || getQueryParam('order'));
  } else if (status === 'pending') {
    qs('#order-pending').hidden = false;
    qs('#order-pending-number').textContent = pending?.orderNumber || getQueryParam('order') || '-';
  } else {
    qs('#order-failed').hidden = false;
  }
  return true;
}

/* ---------- Submit ---------- */

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const form = qs('#checkout-form');
  const formData = new FormData(form);
  const customer = Object.fromEntries(formData.entries());
  const cart = getCart();
  const { sub, discountAmount, total } = computeTotals();
  const orderNumber = 'IB-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const orderData = {
    orderNumber,
    customer,
    items: cart,
    shipping: state.shipping,
    payment: state.payment,
    discount: getDiscount(),
    subtotal: sub,
    discountAmount,
    total,
    createdAt: new Date().toISOString()
  };

  const btn = qs('#checkout-submit');
  btn.disabled = true;
  btn.textContent = 'PROCESANDO…';

  try {
    if (state.payment.id === 'mp') {
      // El pedido queda "pendiente" hasta que Mercado Pago confirme el pago
      // y redirija de vuelta a checkout.html (ver handleMPReturn).
      storage.set(PENDING_KEY, orderData);
      const initPoint = await requestMPPreference(orderData);
      window.location.href = initPoint;
      return;
    }

    // Transferencia bancaria: confirmamos el pedido y mandamos al cliente a
    // WhatsApp con el carrito, los datos de envío y el total ya cargados,
    // para coordinar el pago directo con la tienda.
    confirmOrder(orderData);
    if (state.payment.id === 'transfer') {
      window.open(whatsappLink(buildTransferMessage(orderData)), '_blank');
    }
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = 'PAGAR AHORA';
    alert('Hubo un problema procesando el pago. Intentá nuevamente.');
  }
}

/* ---------- Init ---------- */

function showEmptyState() {
  qs('#checkout-layout').hidden = true;
  qs('#checkout-empty').hidden = false;
}

export function initCheckout() {
  if (handleMPReturn()) return;

  const cart = getCart();
  if (cart.length === 0) {
    showEmptyState();
    return;
  }

  renderShipping();
  renderPayment();
  renderSummary();

  trackPixel('InitiateCheckout', {
    content_ids: cart.map(i => String(i.id)),
    content_type: 'product',
    contents: cart.map(i => ({ id: String(i.id), quantity: i.qty })),
    num_items: cart.reduce((sum, i) => sum + (i.qty || 1), 0),
    value: subtotal(),
    currency: 'UYU'
  });

  const notesInput = qs('#checkout-form [name="notes"]');
  const savedNote = localStorage.getItem(NOTE_KEY) || '';
  if (notesInput && savedNote) notesInput.value = savedNote;

  qs('#checkout-form')?.addEventListener('submit', handleSubmit);

  // El resumen (y el estado de "carrito vacío") debe reflejar cambios
  // hechos desde el drawer sin recargar la página del checkout.
  bus.on('cart:updated', ({ cart }) => {
    if (cart.length === 0) showEmptyState();
    else renderSummary();
  });
}
