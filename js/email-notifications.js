/* ============================================================
   IBIZZI · email-notifications.js
   Avisos de pedido por email vía EmailJS (emailjs.com) — manda los
   mails usando la cuenta de Gmail conectada en el panel de EmailJS,
   sin necesitar backend de correo propio. Se llama desde
   checkout.js apenas se confirma un pedido.

   ⚠️ Completá estas 5 constantes con los datos de tu cuenta de
   EmailJS (Account → API Keys, Email Services, Email Templates)
   para que esto funcione. Hasta entonces, no hace nada (falla en
   silencio, no rompe el checkout).
   ============================================================ */

import { formatPrice } from './utils.js';

const EMAILJS_PUBLIC_KEY = 'PENDIENTE';
const EMAILJS_SERVICE_ID = 'PENDIENTE';
const TEMPLATE_STORE = 'PENDIENTE';              // aviso de pedido nuevo, para nosotros
const TEMPLATE_CUSTOMER_PENDING = 'PENDIENTE';   // cliente: "recibimos tu pedido"
const TEMPLATE_CUSTOMER_CONFIRMED = 'PENDIENTE'; // cliente: "pedido confirmado"

const isConfigured = () =>
  ![EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, TEMPLATE_STORE, TEMPLATE_CUSTOMER_PENDING, TEMPLATE_CUSTOMER_CONFIRMED]
    .includes('PENDIENTE');

let _ready = false;
function ensureInit() {
  if (_ready || typeof emailjs === 'undefined') return;
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  _ready = true;
}

/** Tabla HTML con foto + detalle de cada línea del pedido (para el mail de la tienda). */
function itemsHTML(items) {
  return (items || []).map(i => `
    <tr>
      <td style="padding:8px 8px 8px 0;">
        <img src="${location.origin}/${i.image}" width="64" height="64"
             style="object-fit:cover;border-radius:4px;display:block;" alt="">
      </td>
      <td style="padding:8px;">
        <strong>${i.name}</strong><br>
        <span style="color:#999;font-size:13px;">
          ${i.size ? `Talle ${i.size} · ` : ''}${i.color ? `${i.color} · ` : ''}x${i.qty}
        </span>
      </td>
      <td style="padding:8px;text-align:right;white-space:nowrap;">${formatPrice(i.price * i.qty)}</td>
    </tr>`).join('');
}

/** Lista de texto simple de cada línea (para los mails al cliente). */
function itemsText(items) {
  return (items || [])
    .map(i => `• ${i.qty}x ${i.name}${i.size ? ` (talle ${i.size})` : ''}${i.color ? ` — ${i.color}` : ''} · ${formatPrice(i.price * i.qty)}`)
    .join('\n');
}

function buildParams(orderData) {
  const c = orderData.customer || {};
  return {
    order_number: orderData.orderNumber,
    customer_name: c.name || '',
    customer_email: c.email || '',
    customer_phone: c.phone || '',
    shipping_address: c.address || '',
    shipping_city: c.city || '',
    shipping_state: c.state || '',
    items_html: itemsHTML(orderData.items),
    items_text: itemsText(orderData.items),
    subtotal: formatPrice(orderData.subtotal),
    discount: orderData.discountAmount ? `- ${formatPrice(orderData.discountAmount)}` : 'Sin descuento',
    total: formatPrice(orderData.total),
    payment_method: orderData.payment?.name || '',
    shipping_method: orderData.shipping?.name || '',
    notes: c.notes || 'Sin notas'
  };
}

/**
 * Manda los 3 mails del pedido: aviso a la tienda + los 2 al cliente.
 * Cada uno falla en silencio si EmailJS no está configurado, no cargó,
 * o hay un error de red — nunca bloquea ni rompe la confirmación del
 * pedido en pantalla.
 */
export async function sendOrderEmails(orderData) {
  if (!isConfigured()) {
    console.warn('[email-notifications] Faltan credenciales de EmailJS — no se mandó ningún mail.');
    return;
  }
  ensureInit();
  if (typeof emailjs === 'undefined') {
    console.warn('[email-notifications] El SDK de EmailJS no cargó (¿bloqueado, sin internet?).');
    return;
  }

  const params = buildParams(orderData);
  const sends = [TEMPLATE_STORE, TEMPLATE_CUSTOMER_PENDING, TEMPLATE_CUSTOMER_CONFIRMED]
    .map(templateId =>
      emailjs.send(EMAILJS_SERVICE_ID, templateId, params)
        .catch(err => console.error(`[email-notifications] Fallo al mandar ${templateId}:`, err))
    );
  await Promise.all(sends);
}
