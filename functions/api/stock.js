/* ============================================================
   IBIZZI · stock (Cloudflare Pages Function)
   Stock real por producto/talle en Cloudflare KV — así todos los
   visitantes ven el mismo número, y baja solo con cada venta
   confirmada (no depende del navegador de quién compró).

   GET  /api/stock?ids=10,11,12
        -> { "10": {"40/41":5,"42/43":6,...}, "11": {...} }
        Solo devuelve los ids que ya están inicializados en KV; el
        frontend usa el número estático de products.json como
        respaldo para el resto.

   POST /api/stock  { orderNumber, items: [{id, size, qty}, ...] }
        Descuenta stock. Idempotente: si se llama dos veces con el
        mismo orderNumber (ej. el cliente refresca la pantalla de
        éxito), la segunda vez no vuelve a descontar.
   ============================================================ */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.STOCK_KV) return json({ error: 'STOCK_KV no configurado' }, 500);

  const ids = (new URL(request.url).searchParams.get('ids') || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  const result = {};
  await Promise.all(ids.map(async id => {
    const v = await env.STOCK_KV.get(`stock:${id}`, 'json');
    if (v) result[id] = v;
  }));
  return json(result);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.STOCK_KV) return json({ error: 'STOCK_KV no configurado' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const { orderNumber, items } = body || {};
  if (!orderNumber || !Array.isArray(items)) {
    return json({ error: 'Faltan orderNumber o items' }, 400);
  }

  const marker = `decremented:${orderNumber}`;
  if (await env.STOCK_KV.get(marker)) {
    return json({ ok: true, alreadyProcessed: true });
  }

  for (const item of items) {
    if (!item?.id || !item?.size) continue;
    const key = `stock:${item.id}`;
    const current = await env.STOCK_KV.get(key, 'json');
    if (!current || !(item.size in current)) continue;
    current[item.size] = Math.max(0, current[item.size] - (item.qty || 1));
    await env.STOCK_KV.put(key, JSON.stringify(current));
  }

  // Marca este pedido como ya procesado por 60 días (evita doble descuento).
  await env.STOCK_KV.put(marker, '1', { expirationTtl: 60 * 60 * 24 * 60 });

  return json({ ok: true });
}
