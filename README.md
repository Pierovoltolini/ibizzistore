# IBIZZI · Ecommerce completo

Tienda online de indumentaria, relojes, accesorios y zuecos Nike Mind.
HTML + CSS + JavaScript modular. Datos en JSON. Sin frameworks.

**Frase:** *La elegancia está en los detalles.*

---

## Cómo abrir el proyecto

1. Abrí la carpeta `ibizzi-store/` en **Visual Studio Code**.
2. Instalá la extensión **Live Server** (Ritwick Dey).
3. Click derecho en `index.html` → **Open with Live Server**.
4. Se abre en `http://127.0.0.1:5500`.

> ⚠️ No abras los `.html` con doble click. Los módulos ES6 y `fetch` necesitan un servidor.

Alternativas:
```bash
npx serve .
# o
python3 -m http.server 5500
```

### (Opcional) Vite
```bash
npm init -y && npm install --save-dev vite
npx vite
```

---

## Estructura

```
ibizzi-store/
├── index.html          Home: hero + 4 iconos + categorías + destacados + banner + relojes + zuecos Nike Mind + beneficios + reseñas + galería social
├── products.html       Listado con filtros y ordenamiento
├── product.html        Detalle dinámico (?slug= o ?id=)
├── cart.html           Carrito completo con nota y código de descuento
├── checkout.html       Checkout multi-sección + confirmación
├── favorites.html      Favoritos guardados
├── contact.html        Contacto (form + WhatsApp/email)
├── shipping.html       Envíos y devoluciones
├── faq.html            Preguntas frecuentes
├── 404.html            Página no encontrada
│
├── css/                Estilos separados por responsabilidad
│   ├── variables.css   Design tokens
│   ├── reset.css       Reset moderno
│   ├── global.css      Tipografía base, botones, container
│   ├── animations.css  Fades, skeleton, spinner
│   ├── header.css      Announcement + header + menú móvil + search
│   ├── footer.css      Footer editorial
│   ├── home.css        Hero, quick icons, categorías, banner, beneficios, reseñas
│   ├── product-card.css  Tarjeta reutilizable + carrusel
│   ├── product-page.css  Detalle + galería + sticky bar + filtros
│   ├── cart.css        Cart drawer + cart + checkout + favoritos
│   └── responsive.css  Breakpoints tablet/desktop
│
├── js/                 Módulos ES6 (import/export)
│   ├── app.js          Entry point global
│   ├── utils.js        Helpers reutilizables
│   ├── shell.js        Inyecta header/drawer/footer en cada página
│   ├── products.js     Renderer de tarjetas + grillas + home sections
│   ├── product-page.js Detalle: galería, variantes, sticky bar
│   ├── cart.js         Estado del carrito (LocalStorage)
│   ├── cart-drawer.js  UI del drawer lateral
│   ├── filters.js      Filtros + ordenamiento
│   ├── search.js       Buscador con debounce + sugerencias
│   ├── favorites.js    Estado de favoritos (LocalStorage)
│   ├── recommendations.js  Completá tu look + También te puede interesar
│   └── checkout.js     Validaciones + processPayment() stub
│
├── data/               Datos en JSON
│   ├── products.json   Catálogo (datos de arranque — todavía no son los reales del negocio)
│   ├── categories.json Las 4 categorías principales
│   └── reviews.json    Reseñas globales
│
├── assets/
│   ├── images/         Fotos reales (reemplazan a los placeholders)
│   ├── icons/          SVGs de UI
│   └── placeholders/   SVGs editoriales locales (fallback)
│
├── functions/
│   └── api/
│       └── create-preference.js   Cloudflare Pages Function: crea la preferencia de pago en Mercado Pago
│
├── .env / .dev.vars    Credenciales locales (gitignorados, NO se suben)
└── README.md
```

---

## Cargar productos nuevos

Editar `data/products.json` y agregar un objeto con el mismo esquema. La tienda los detecta y renderiza automáticamente en:

- Home (destacados / relojes / zuecos Nike Mind si aplica)
- `products.html` (grid completo + filtros)
- `product.html?slug=…` (URL limpia)
- Cart drawer "Completá tu compra"
- Búsqueda global (por nombre, marca, tags, categoría)
- Filtros por marca/talle/color/precio (se generan solos)

Campos mínimos:
```json
{
  "id": 9,
  "slug": "producto-nuevo",
  "sku": "IBZ-NEW-009",
  "name": "Nombre",
  "brand": "Marca",
  "category": "Indumentaria",
  "price": 3990,
  "currency": "UYU",
  "stock": 10,
  "sizes": ["S","M","L"],
  "colors": [{"name":"Negro","hex":"#101010"}],
  "images": ["assets/images/products/nuevo-1.jpg"],
  "shortDescription": "…"
}
```

Los campos opcionales dan más funcionalidad: `oldPrice` (calcula descuento auto), `new` (badge), `featured` (aparece en destacados home), `complementaryProducts` (array de ids para "Completá tu look"), `recommendedProducts` (array de ids para "También te puede interesar"), `specifications`, `reviews`.

---

## Cómo funciona el carrito

El carrito vive en `LocalStorage` bajo la clave `ibizzi_cart`.

- Agregar → `cart.js:addItem()` emite `cart:updated`
- El header actualiza el contador
- El cart drawer se re-renderiza y se abre automáticamente
- `cart.html` y `checkout.html` escuchan `cart:updated` y se re-renderizan solos
- Un mismo producto con distinto talle/color = línea distinta en el carrito

Persistencia garantizada al refrescar. Reset manual: en la consola del navegador, `localStorage.removeItem('ibizzi_cart')`.

---

## Design system

Todos los tokens viven en `css/variables.css`:

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg-primary` | `#1A1A1A` | Fondo global |
| `--color-bg-card` | `#2D2D2D` | Tarjetas |
| `--color-text-primary` | `#F5F5F5` | Texto principal |
| `--color-border` | `#444444` | Bordes |
| `--font-serif` | Cormorant Garamond | Títulos editoriales |
| `--font-sans` | Inter | UI, precios, botones |
| `--btn-height` | `52px` | Alto mínimo botones |

Cambiar la paleta en un solo lugar.

---

## Deploy — Cloudflare Pages + GitHub

El sitio está en producción, conectado así:

- **Repo**: [github.com/Pierovoltolini/ibizzistore](https://github.com/Pierovoltolini/ibizzistore), rama `main`.
- **Hosting**: proyecto de **Cloudflare Pages** "ibizzistore" (⚡, no confundir con el Worker `ibizzistore.volpie88.workers.dev` que quedó del setup automático de Cloudflare y no se usa para nada).
- **Dominios**: `ibizzistore.uy` (real) y `ibizzistore.pages.dev` (siempre disponible, útil para debug).
- **Deploy automático**: cada `git push` a `main` dispara un build nuevo solo. Si cambiaste una variable de entorno en el panel de Cloudflare, **hace falta un deploy nuevo para que la tome** — no aplica retroactivamente al deployment que ya está corriendo. Si no querés esperar al próximo push, se puede forzar con un commit vacío:
  ```bash
  git commit --allow-empty -m "Trigger redeploy" && git push origin main
  ```

### Variable de entorno obligatoria

`MP_ACCESS_TOKEN` — se configura en el panel de Cloudflare: proyecto Pages → **Settings → Variables and secrets** → tipo **Secret**, aplicada a Production (y Preview). **Sin esto, el pago con Mercado Pago no funciona** (la función devuelve error 500). Nunca vive en el código ni en git — local se usa `.env` / `.dev.vars` (gitignorados) solo para pruebas manuales con `curl`.

---

## Mercado Pago (integración real, ya conectada)

El checkout usa **Checkout Pro** (redirección) con credenciales de **producción** — cobra plata real.

Cómo funciona (`js/checkout.js` + `functions/api/create-preference.js`):

1. Al pagar con Mercado Pago, el frontend arma `orderData` (cliente, carrito, envío, descuento, total) y lo guarda como "pendiente" en `localStorage` (`ibizzi_pending_order`).
2. Llama a `POST /api/create-preference` — una **Cloudflare Pages Function** que crea la preferencia en la API de Mercado Pago usando `MP_ACCESS_TOKEN` (nunca se expone al navegador) y devuelve el `init_point` real.
3. El navegador redirige al cliente a pagar en Mercado Pago.
4. Mercado Pago redirige de vuelta a `checkout.html?status=success|failure|pending&order=...` (configurado vía `back_urls` + `auto_return: 'approved'`).
5. `handleMPReturn()` en `checkout.js` confirma el pedido (limpia carrito, trackea `Purchase` en el Pixel) o muestra la pantalla de pendiente/rechazado según corresponda.

Transferencia bancaria y efectivo **no pasan por Mercado Pago** — se confirman directo en el sitio porque se coordinan por fuera (WhatsApp).

⚠️ **Pendiente importante**: hoy, si un pago se confirma, **nadie recibe un aviso** — el pedido solo queda en el `localStorage` del navegador del cliente. Falta conectar un webhook de Mercado Pago que avise por email/WhatsApp cuando entra un pedido real.

---

## Fases completadas

- [x] **Fase 1** — Arquitectura, variables, estilos globales, header, menú móvil, footer.
- [x] **Fase 2** — Home: hero + 4 iconos de categoría + categorías editoriales + destacados + banner + relojes + zuecos Nike Mind + beneficios + reseñas + galería social + newsletter.
- [x] **Fase 3** — `products.html`: filtros (marca/talle/color/precio/estado), ordenamiento, drawer móvil, tarjetas.
- [x] **Fase 4** — `product.html`: galería con swipe + thumbnails + counter, variantes (color/talle), sticky bar móvil, especificaciones, reseñas, completá tu look, recomendaciones.
- [x] **Fase 5** — Cart drawer con "completá tu compra", `cart.html` con nota + descuento, `checkout.html` con validación + resumen + confirmación, LocalStorage sync.
- [x] **Fase 6** — Favoritos, accesibilidad (aria-*, focus visible, escape, contraste), SEO (Open Graph, JSON-LD Product, canonical), 404, contacto, envíos, FAQ.

---

## Notas técnicas

- **Cero frameworks**: JS vanilla ES6+, imports/exports nativos.
- **Placeholders SVG** locales en `assets/placeholders/`. Reemplazables por fotos reales (cambiá el path en `products.json` y listo).
- **Header/footer inyectados por JS** desde `shell.js`. Editás una vez y aplica a todas las páginas.
- **Caché en memoria del JSON** de productos. Primera llamada red, resto memoria.
- **LocalStorage**: `ibizzi_cart`, `ibizzi_favorites`, `ibizzi_last_order`.
- **Reduce motion** respetado (los que activan esa preferencia OS ven todo estático).

---

## Meta Pixel (ya conectado)

Pixel ID `1561978585573327`, cargado en el `<head>` de las 10 páginas. Eventos trackeados (vía `trackPixel()` en `js/utils.js`):

| Evento | Dónde se dispara |
|---|---|
| `PageView` | Automático en cada página |
| `ViewContent` | Al abrir la ficha de un producto |
| `AddToCart` | Tarjeta rápida y página de producto (incl. sticky bar móvil) |
| `InitiateCheckout` | Al entrar a `checkout.html` con carrito no vacío |
| `Purchase` | Al confirmarse un pedido (transferencia, efectivo o vuelta de Mercado Pago) |

---

## Pendientes conocidos

- **Aviso de pedidos**: no hay notificación automática (email/WhatsApp/webhook) cuando se confirma un pedido — ver sección de Mercado Pago arriba. Es lo más urgente.
- **Catálogo real**: `data/products.json` todavía tiene productos/precios inventados durante el desarrollo, no el catálogo real del negocio (que incluye categorías como remeras y gorras que hoy no están). El precio del "Reloj Clásico Carbón" además quedó en un valor de prueba ($50) para testear el pago con Mercado Pago — revisar antes de promocionar la tienda.
- **Fotos reales**: reemplazar los placeholders SVG por fotos de producto.
- Cuentas de usuario (registro/login) → requiere backend
- Multi-idioma (es/en) → i18n en JSON
- Wishlist compartible por link
- Blog editorial
- Chat de WhatsApp flotante
- Formularios de contacto/newsletter no envían nada todavía (solo muestran un mensaje)
- Links del footer sin destino real (Política de privacidad, Términos, Mis pedidos, Seguimiento de pedido, Guía de talles)
