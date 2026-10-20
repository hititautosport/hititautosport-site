// GET /api/site — page switches, shop open/closed, banner, merch shipping and hard parts.
// Edited from /admin. Cached for 15 seconds so changes show up almost right away.
import { json, loadCatalog } from "../../server/shop.js";

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(new URL("/api/site?v=1", context.request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const data = await loadCatalog(context);
    const res = json({ settings: data.settings, content: data.content || {}, parts: data.parts, source: data.source }, 200, { "Cache-Control": "public, max-age=15" });
    context.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ error: "Site settings couldn't load. " + e.message }, 502);
  }
}
