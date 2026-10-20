// POST /api/checkout — turns the cart into a Stripe Checkout page.
// Prices are looked up here (Printify for merch, catalog.json for hard parts), never trusted from the browser.
import { json, stripe, printify, loadCatalog, pricePart, imageForVariant } from "../../server/shop.js";

const MAX_LINES = 25;
const MAX_QTY = 10;

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Checkout isn't set up yet. Add the Stripe key in Cloudflare settings." }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "Your cart couldn't be read. Refresh the page and try again." }, 400); }
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_LINES) : [];
  if (!items.length) return json({ error: "Your cart is empty." }, 400);

  const origin = new URL(request.url).origin;
  const site = env.SITE_URL || origin;
  const catalog = await loadCatalog(context);
  const st = catalog.settings || {};
  if (st.shop && st.shop.open === false) {
    return json({ error: st.shop.closedMessage || "The shop is closed right now. Try again soon." }, 409);
  }
  const pages = st.pages || {};
  const lineItems = [];
  let hasMerch = false;
  let partShipping = 0;
  const productCache = new Map();

  for (const it of items) {
    const qty = Math.max(1, Math.min(MAX_QTY, parseInt(it.qty, 10) || 1));
    if (it.kind === "merch") {
      if (pages.merch === false) return json({ error: "Merch is unavailable right now. Remove shirts from your cart to check out." }, 409);
      if (!env.PRINTIFY_API_TOKEN || !env.PRINTIFY_SHOP_ID) return json({ error: "Merch checkout isn't connected to Printify yet." }, 503);
      if (!it.id || !it.variantId) return json({ error: "Pick a size and color for every shirt in your cart." }, 400);
      let p = productCache.get(it.id);
      if (!p) {
        try { p = await printify(env, `/shops/${env.PRINTIFY_SHOP_ID}/products/${encodeURIComponent(it.id)}.json`); }
        catch { return json({ error: "One of the designs in your cart is no longer available. Remove it and try again." }, 409); }
        productCache.set(it.id, p);
      }
      const v = (p.variants || []).find((x) => x.id === Number(it.variantId) && x.is_enabled && x.is_available !== false);
      if (!v) return json({ error: `${p.title} in that size or color sold out. Pick another and try again.` }, 409);
      hasMerch = true;
      const img = imageForVariant(p, v.id);
      lineItems.push({
        quantity: qty,
        price_data: {
          currency: "usd",
          unit_amount: v.price,
          product_data: {
            name: `${p.title} (${v.title})`,
            ...(img ? { images: [img] } : {}),
            metadata: { kind: "merch", printify_product_id: p.id, printify_variant_id: String(v.id) }
          }
        }
      });
    } else if (it.kind === "part") {
      if (pages.parts === false) return json({ error: "Hard parts are unavailable right now. Remove them from your cart to check out." }, 409);
      const known = (catalog.parts || []).find((p) => p.id === it.id);
      if (known && known.soldOut) return json({ error: `${known.name} is sold out. Remove it from your cart to check out.` }, 409);
      const priced = pricePart(catalog, it.id, it.option || "");
      if (!priced) return json({ error: "One of the hard parts in your cart changed. Remove it and add it again." }, 409);
      partShipping += priced.shipping * qty;
      const img = priced.part.image ? new URL(priced.part.image, site + "/").toString() : null;
      lineItems.push({
        quantity: qty,
        price_data: {
          currency: "usd",
          unit_amount: priced.unit,
          product_data: {
            name: priced.part.name + (priced.label ? ` (${priced.label})` : ""),
            ...(img && img.startsWith("https://") ? { images: [img] } : {}),
            metadata: { kind: "part", part_id: priced.part.id, option: priced.label || "" }
          }
        }
      });
    } else {
      return json({ error: "Something in your cart isn't recognized. Remove it and try again." }, 400);
    }
  }

  const shipping = (hasMerch ? Math.round((catalog.shipping && catalog.shipping.merchFlat || 0) * 100) : 0) + partShipping;
  const params = {
    mode: "payment",
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: ["US"] },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: shipping ? "Standard shipping" : "Free shipping",
        fixed_amount: { amount: shipping, currency: "usd" }
      }
    }],
    billing_address_collection: "auto",
    success_url: `${site}/order-complete.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/merch-tent.html#cart`,
    metadata: { source: "hititautosport.com", has_merch: String(hasMerch), has_parts: String(partShipping > 0 || lineItems.some((l) => l.price_data.product_data.metadata.kind === "part")) }
  };
  if (env.STRIPE_AUTOMATIC_TAX === "true") params.automatic_tax = { enabled: true };

  try {
    const session = await stripe(env, "POST", "/checkout/sessions", params);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: "Checkout couldn't start. " + e.message }, 502);
  }
}
