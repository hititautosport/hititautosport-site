// Shared server code for the shop (used by the files in /functions/api).
// Runs on Cloudflare. Secrets come from Cloudflare > your Pages project > Settings > Variables and Secrets:
//   STRIPE_SECRET_KEY        sk_test_... while testing, sk_live_... when you go live
//   STRIPE_WEBHOOK_SECRET    whsec_... from the Stripe webhook you create
//   PRINTIFY_API_TOKEN       Printify > Account > Connections > API token
//   PRINTIFY_SHOP_ID         the number for your Printify "API" store
//   PRINTIFY_AUTO_PRODUCTION "true" sends paid merch orders straight to printing.
//                            Anything else leaves them waiting in Printify for you to approve.
//   STRIPE_AUTOMATIC_TAX     "true" turns on Stripe Tax (0.5% per sale) once you're registered for NC sales tax.

export const STRIPE_VERSION = "2024-06-20";
const PRINTIFY = "https://api.printify.com/v1";

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }
  });
}

/* ---------- Printify ---------- */
export async function printify(env, path, init = {}) {
  const res = await fetch(PRINTIFY + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + env.PRINTIFY_API_TOKEN,
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "HitItAutosport-Site",
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error("Printify " + res.status + ": " + (body.error || body.message || text).toString().slice(0, 300));
    err.status = res.status;
    throw err;
  }
  return body;
}

const stripTags = (h) => String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();

// Turns a Printify product into the small shape the site needs.
export function slimProduct(p) {
  const variants = (p.variants || [])
    .filter((v) => v.is_enabled && v.is_available !== false)
    .map((v) => ({ id: v.id, title: v.title, price: v.price, options: v.options || [] }));
  if (!variants.length) return null;
  const used = new Set(variants.flatMap((v) => v.options));
  const options = (p.options || []).map((o) => ({
    name: o.name,
    type: o.type,
    values: (o.values || []).filter((val) => used.has(val.id)).map((val) => ({ id: val.id, title: val.title, colors: val.colors || null }))
  })).filter((o) => o.values.length);
  const images = (p.images || []).slice(0, 40).map((im) => ({ src: im.src, variants: im.variant_ids || [], isDefault: !!im.is_default }));
  return {
    id: p.id,
    title: p.title,
    description: stripTags(p.description).slice(0, 1200),
    tags: p.tags || [],
    fromPrice: Math.min(...variants.map((v) => v.price)),
    options,
    variants,
    images
  };
}

export async function listProducts(env) {
  const out = [];
  for (let page = 1; page <= 4; page++) {
    const res = await printify(env, `/shops/${env.PRINTIFY_SHOP_ID}/products.json?limit=50&page=${page}`);
    for (const p of res.data || []) {
      if ((p.tags || []).some((t) => String(t).toLowerCase() === "hidden")) continue;
      const s = slimProduct(p);
      if (s) out.push(s);
    }
    if (!res.last_page || page >= res.last_page) break;
  }
  return out;
}

export function imageForVariant(product, variantId) {
  const imgs = product.images || [];
  const forV = imgs.filter((im) => (im.variant_ids || im.variants || []).includes(variantId));
  const pick = forV.find((im) => im.is_default || im.isDefault) || forV[0] || imgs.find((im) => im.is_default || im.isDefault) || imgs[0];
  return pick ? pick.src : null;
}

/* ---------- Stripe ---------- */
// Stripe wants form encoding with bracket keys: line_items[0][price_data][currency]=usd
export function formEncode(obj, prefix = "", out = []) {
  if (Array.isArray(obj)) obj.forEach((v, i) => formEncode(v, `${prefix}[${i}]`, out));
  else if (obj !== null && typeof obj === "object") for (const [k, v] of Object.entries(obj)) formEncode(v, prefix ? `${prefix}[${k}]` : k, out);
  else if (obj !== undefined && obj !== null) out.push(encodeURIComponent(prefix) + "=" + encodeURIComponent(String(obj)));
  return out.join("&");
}

export async function stripe(env, method, path, params) {
  const res = await fetch("https://api.stripe.com/v1" + path, {
    method,
    headers: {
      Authorization: "Bearer " + env.STRIPE_SECRET_KEY,
      "Stripe-Version": STRIPE_VERSION,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: params ? formEncode(params) : undefined
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error("Stripe: " + ((body.error && body.error.message) || res.status));
    err.status = res.status;
    throw err;
  }
  return body;
}

// Checks that a webhook really came from Stripe (Stripe-Signature header, HMAC-SHA256).
export async function verifyStripeSignature(payload, header, secret, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const sigs = [];
  let t = null;
  for (const piece of header.split(",")) {
    const [k, v] = piece.split("=");
    if (k === "t") t = v;
    if (k === "v1") sigs.push(v);
  }
  if (!t || !sigs.length) return false;
  if (Math.abs(nowSec - Number(t)) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => timingSafeEqual(s, hex));
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- site data (Supabase, with catalog.json as backup) ---------- */
// The Supabase address and publishable key are public by design (anyone can read; only
// Hit It HQ admins can change anything). Set SUPABASE_URL / SUPABASE_KEY in Cloudflare to override.
export const SUPABASE_URL = "https://fwikgcxmdibizkconcok.supabase.co";
export const SUPABASE_KEY = "sb_publishable_6SQxrwoYjR0RLzQ6x_KpRw_8TScfGpU";

export const DEFAULT_SETTINGS = {
  pages: { merch: true, parts: true, cad: true, builds: true, guides: true, blog: true, about: true, team: true, contact: true },
  shop: { open: true, closedMessage: "The shop is closed for a few days. Orders open back up soon." },
  banner: { on: false, text: "", link: "" },
  shipping: { merchFlat: 6 }
};

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

// One database row -> the shape the site and checkout use.
export function partFromRow(r) {
  const images = (r.images || []).filter(Boolean);
  return {
    id: r.id,
    name: r.name,
    fit: r.description || "",
    price: num(r.price),
    wasPrice: num(r.was_price),
    shipping: num(r.shipping) || 0,
    options: (r.options || []).map((o) => ({ label: o.label, price: num(o.price), ...(o.shipping === null || o.shipping === undefined ? {} : { shipping: num(o.shipping) }) })),
    image: images[0] || "",
    images,
    soldOut: !!r.sold_out
  };
}

async function supa(env, path) {
  const base = env.SUPABASE_URL || SUPABASE_URL;
  const key = env.SUPABASE_KEY || SUPABASE_KEY;
  const res = await fetch(base + "/rest/v1/" + path, { headers: { apikey: key, Accept: "application/json" } });
  if (!res.ok) throw new Error("Supabase " + res.status);
  return res.json();
}

// Returns { settings, parts, shipping, source }. Falls back to catalog.json if Supabase can't be reached.
export async function loadCatalog(context) {
  const env = context.env || {};
  if (env.SITE_DATA !== "file") {
    try {
      const [rows, settingsRows, contentRows] = await Promise.all([
        supa(env, "site_parts?select=*&active=eq.true&order=sort.asc,name.asc"),
        supa(env, "site_settings?select=key,value"),
        supa(env, "site_content?select=key,value").catch(() => [])
      ]);
      const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      for (const r of settingsRows) settings[r.key] = { ...(settings[r.key] || {}), ...(r.value || {}) };
      const content = {};
      for (const r of contentRows) content[r.key] = r.value;
      return { settings, content, shipping: settings.shipping, parts: rows.map(partFromRow), source: "supabase" };
    } catch (e) {
      // fall through to the file
    }
  }
  const url = new URL("/assets/catalog.json", context.request.url);
  const res = await (env.ASSETS ? env.ASSETS.fetch(url) : fetch(url));
  if (!res.ok) throw new Error("catalog.json missing");
  const cat = await res.json();
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.shipping = { merchFlat: (cat.shipping && cat.shipping.merchFlat) || 0 };
  return { settings, content: {}, shipping: settings.shipping, parts: (cat.parts || []).map((p) => ({ images: p.image ? [p.image] : [], soldOut: false, ...p })), source: "file" };
}

export const cents = (dollars) => Math.round(Number(dollars) * 100);

// Prices a hard part (with optional option label) from the catalog.
export function pricePart(catalog, id, optionLabel) {
  const part = (catalog.parts || []).find((p) => p.id === id);
  if (!part || part.soldOut) return null;
  let price = part.price, label = "", ship = part.shipping || 0;
  if (part.options && part.options.length) {
    const opt = part.options.find((o) => o.label === optionLabel) || (optionLabel ? null : part.options[0]);
    if (!opt) return null;
    price = opt.price;
    if (typeof opt.shipping === "number") ship = opt.shipping; // an option can have its own shipping
    label = part.options.length > 1 || optionLabel ? opt.label : "";
  }
  if (typeof price !== "number" || !(price > 0)) return null;
  return { part, unit: cents(price), label, shipping: cents(ship) };
}

// Builds a Printify order body from a paid Stripe Checkout session + its line items.
export function buildPrintifyOrder(session, lineItems) {
  const items = [];
  for (const li of lineItems) {
    const md = (li.price && li.price.product && li.price.product.metadata) || {};
    if (md.kind !== "merch") continue;
    items.push({ product_id: md.printify_product_id, variant_id: Number(md.printify_variant_id), quantity: li.quantity });
  }
  if (!items.length) return null;
  const ship = session.shipping_details || (session.collected_information && session.collected_information.shipping_details) || {};
  const addr = ship.address || {};
  const cust = session.customer_details || {};
  const fullName = (ship.name || cust.name || "Customer").trim();
  const space = fullName.indexOf(" ");
  return {
    external_id: session.id,
    label: "hititautosport.com " + session.id.slice(-8),
    line_items: items,
    shipping_method: 1,
    send_shipping_notification: true,
    address_to: {
      first_name: space > 0 ? fullName.slice(0, space) : fullName,
      last_name: space > 0 ? fullName.slice(space + 1) : "",
      email: cust.email || "",
      phone: cust.phone || "",
      country: addr.country || "US",
      region: addr.state || "",
      address1: addr.line1 || "",
      address2: addr.line2 || "",
      city: addr.city || "",
      zip: addr.postal_code || ""
    }
  };
}
