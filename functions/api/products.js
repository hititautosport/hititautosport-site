// GET /api/products — the Merch Tent's designs, photos, sizes, colors and prices, live from Printify.
import { json, listProducts, printify } from "../../server/shop.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.PRINTIFY_API_TOKEN) {
    return json({ error: "Printify isn't connected yet. Add PRINTIFY_API_TOKEN in Cloudflare." }, 503);
  }
  if (!env.PRINTIFY_SHOP_ID) {
    // Helper: list your Printify stores so you can copy the right number into PRINTIFY_SHOP_ID.
    try {
      const shops = await printify(env, "/shops.json");
      return json({ error: "Add PRINTIFY_SHOP_ID in Cloudflare. Use the id of your API store below.", shops: (shops || []).map((s) => ({ id: s.id, title: s.title, type: s.sales_channel })) }, 503);
    } catch (e) {
      return json({ error: "Printify token didn't work: " + e.message }, 503);
    }
  }
  const cache = caches.default;
  const key = new Request(new URL("/api/products?v=1", request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const products = await listProducts(env);
    const res = json({ products }, 200, { "Cache-Control": "public, max-age=600" });
    context.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ error: "Couldn't load products from Printify. " + e.message }, 502);
  }
}
