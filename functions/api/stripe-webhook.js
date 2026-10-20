// POST /api/stripe-webhook — Stripe calls this after a customer pays.
// Merch lines become a Printify order. Hard parts are yours to ship: Stripe emails you every paid order
// (turn on Stripe Dashboard > Settings > Notifications > Successful payments).
import { json, stripe, printify, verifyStripeSignature, buildPrintifyOrder } from "../../server/shop.js";

export async function onRequestPost(context) {
  const { env, request } = context;
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: "Signature check failed" }, 400);

  const event = JSON.parse(payload);
  if (event.type !== "checkout.session.completed") return json({ received: true, ignored: event.type });

  const session = event.data.object;
  if (session.payment_status !== "paid") return json({ received: true, note: "not paid yet" });
  if (session.metadata && session.metadata.has_merch === "false") return json({ received: true, note: "hard parts only" });

  // Full session (for shipping address) and its line items with product metadata.
  const full = await stripe(env, "GET", `/checkout/sessions/${session.id}`);
  const li = await stripe(env, "GET", `/checkout/sessions/${session.id}/line_items?limit=100&expand[]=data.price.product`);
  const order = buildPrintifyOrder(full, li.data || []);
  if (!order) return json({ received: true, note: "no merch in order" });

  if (!env.PRINTIFY_API_TOKEN || !env.PRINTIFY_SHOP_ID) {
    // Tell Stripe it failed so it retries and flags the webhook in your dashboard.
    return json({ error: "Printify not configured; merch order not placed" }, 500);
  }

  let created;
  try {
    created = await printify(env, `/shops/${env.PRINTIFY_SHOP_ID}/orders.json`, { method: "POST", body: JSON.stringify(order) });
  } catch (e) {
    return json({ error: "Printify order failed: " + e.message }, 500);
  }

  let production = "waiting for your approval in Printify";
  if (env.PRINTIFY_AUTO_PRODUCTION === "true" && created && created.id) {
    try {
      await printify(env, `/shops/${env.PRINTIFY_SHOP_ID}/orders/${created.id}/send_to_production.json`, { method: "POST", body: "{}" });
      production = "sent to production";
    } catch (e) {
      production = "created, but sending to production failed: " + e.message;
    }
  }
  return json({ received: true, printify_order: created && created.id, production });
}
