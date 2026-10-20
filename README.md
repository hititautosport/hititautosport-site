# Hit It Autosport website

The whole site plus its own shop: one cart for merch and hard parts, Stripe checkout,
and merch orders sent to Printify automatically.

What it costs to run:
- Cloudflare Pages hosting and the shop code: free
- Stripe: about 2.9% + 30¢ per sale, no monthly fee (Stripe Tax adds 0.5% if you turn it on)
- Printify: you pay only for the shirt and its shipping when someone orders
- Domain name: about $10–20 a year

## Owner portal: hititautosport.com/admin

Sign in with your Hit It HQ login (hititautosport@gmail.com). From your phone or computer you can edit:
- **Parts:** hard parts with name, description, price, sale price, shipping, photos, versions (like 13" single / 14" dual caliper, each with its own price and shipping), sold out, order.
- **Builds:** add, edit, hide, reorder or delete cars. Name, description, spec sheet and photos. New builds get their own page and show in the menu.
- **Team:** people on the Team page with role, bio, wins and a photo.
- **Pages:** turn any page off or on, and edit the home page headline, About Us, the CAD page (intro, rate, services, photos) and the Coyote guides.
- **Business:** phone, email, town, shop hours, social links and the contact form key.
- **Shop:** pause all orders with a message, show a banner on every page, set merch shipping.
- **Links:** Stripe orders, Printify, Cloudflare and Supabase in one place.

Changes show on the site within about a minute. Everything saves to your Hit It HQ Supabase project
(tables `site_parts`, `site_settings` and `site_content`, photos in the `site-images` bucket).
`assets/content.js` is a backup copy the site uses only if the database can't be reached. Only Hit It HQ admins can change anything; the database enforces it.

**"Email me a sign-in link" setup (one time):** Supabase → Hit It HQ → Authentication → URL Configuration → add
`https://hititautosport.pages.dev/admin.html` and `https://hititautosport.com/admin.html` to Redirect URLs.
Password sign-in works without this.



| To change | Edit |
|---|---|
| Hard parts, page switches, banner, pausing orders, merch shipping | The owner portal at `/admin`. (`assets/catalog.json` is only a backup used if the database can't be reached.) |
| Merch designs, photos, sizes, colors, prices | Printify, in your **API** store. The site pulls them live. Tag a product `hidden` to hide it. |
| Hours, phone, socials, builds, team, page text | The owner portal at `/admin` |
| Blog posts | `blog-*.html` files plus the `blog:` list in `assets/data.js` (portal blog editor is a planned next step) |
| Shop code (rarely) | `functions/api/` and `server/shop.js` |

How an order flows:
1. Customer adds shirts and parts to the cart and taps **Check out**.
2. `/api/checkout` looks up real prices (Printify for merch, catalog.json for parts) and opens a Stripe checkout page.
3. After they pay, Stripe calls `/api/stripe-webhook`. Merch becomes a Printify order. Hard parts are yours: Stripe emails you the order and address.

---

## 1. Put the site on Cloudflare through GitHub

The shop code only runs when Cloudflare builds the site from GitHub. Drag-and-drop uploads skip it.

1. Make a new private GitHub repo (for example `hititautosport-site`) and upload everything in this folder.
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings: Framework preset **None**, build command **blank**, output directory **/** (a single slash).
4. Deploy. You get a test address like `hititautosport.pages.dev`.

From then on, every change you push to GitHub updates the site within a minute.

## 2. Set up Printify for the shop

1. In Printify: **My stores → Add new store → API**. Name it "Hit It Autosport website".
2. Copy your designs into that store (in **My Products**, copy or duplicate each product into the API store) and set the retail prices you want.
3. Get your token: **Account → Connections → Generate token**. Give it access to shops, products and orders.
4. Get the shop number: add the token in step 4 below (leave `PRINTIFY_SHOP_ID` out for now), redeploy, then open `https://hititautosport.pages.dev/api/products`. It lists your Printify stores with their id numbers. Copy the API store's id into `PRINTIFY_SHOP_ID`.
5. Printify will charge your card on file for each order's printing and shipping, same as now.

## 3. Set up Stripe in test mode

1. In Stripe, use the account switcher → **New account** → "Hit It Autosport". Keeps it separate from FinishFlow.
2. Turn on **Test mode**. Copy the **Secret key** (`sk_test_…`).
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://hititautosport.pages.dev/api/stripe-webhook`
   - Event: `checkout.session.completed`
   - Copy the **Signing secret** (`whsec_…`).
4. **Settings → Notifications**: turn on email for **Successful payments**. That's how you hear about hard-part orders.
5. **Settings → Emails**: turn on customer receipts.

## 4. Add the keys to Cloudflare

Pages project → **Settings → Variables and Secrets** → add each as a **Secret** for Production:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` (switch to `sk_live_…` later) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from step 3 |
| `PRINTIFY_API_TOKEN` | your Printify token |
| `PRINTIFY_SHOP_ID` | the number for your API store |
| `PRINTIFY_AUTO_PRODUCTION` | `false` while testing. Orders wait in Printify for you to approve. Set `true` later so they go straight to printing. |
| `STRIPE_AUTOMATIC_TAX` | `false` for now. `true` once you're registered for NC sales tax and set up Stripe Tax. |
| `SITE_URL` | `https://hititautosport.pages.dev` (change to `https://hititautosport.com` when the domain moves) |

Then **Deployments → Retry deployment** so the keys take effect.

## 5. Test an order

1. Open the site, add a shirt and a hard part, check out.
2. Use Stripe's test card `4242 4242 4242 4242`, any future date, any 3-digit code, any ZIP.
3. Check:
   - You land on the "Thanks, your order is in" page.
   - Stripe (test mode) shows the payment, and you get the payment email.
   - Printify shows a new order **on hold** with the shirt and the customer's address. Delete it so it doesn't get printed.
   - Stripe → Webhooks → your endpoint shows a green 200. A red one means something to fix; Stripe retries automatically.

## 6. Going live

1. Finish Stripe's account activation (business details, bank account).
2. Register for an NC sales tax Certificate of Registration (NC Department of Revenue). Then turn on Stripe Tax and set `STRIPE_AUTOMATIC_TAX` to `true`.
3. Review `policies.html` (shipping, returns, privacy) and change anything that doesn't match how you run things.
4. Repeat steps 3 and 4 with **live** keys and a live webhook. Set `PRINTIFY_AUTO_PRODUCTION` to `true` when you're comfortable.
5. Move the domain (below).

## 7. Point hititautosport.com at Cloudflare

1. Cloudflare: **Add a domain** → `hititautosport.com` → Free plan.
2. In Squarespace → Domains → DNS / Nameservers, switch to Cloudflare's two nameservers.
3. When it's active, Pages project → **Custom domains** → add `hititautosport.com` and `www.hititautosport.com`. Update `SITE_URL` and the Stripe webhook URL.
4. Email is Gmail, so nothing else moves. `_redirects` keeps old Squarespace links working.
5. Before canceling Squarespace, save your photos. See `images/PHOTO-LIST.md`.

## Logos

In `images/`: `logo-badge.png` / `logo-badge-sm.png` (orange hex badge, menu and top bar), `logo-stamp.png`
(H.I.A. EST. 2013, recolored on the home page), `logo-wordmark.png` (footer), `og.jpg` (the picture shown when
someone shares a link), `apple-touch-icon.png` (phone home-screen icon). To swap one, replace the file with the same name.

## Blog

- Each post is its own page: `blog-<name>.html`. Copy the newest one, change the words, add a line to `blog:` in `assets/data.js`.
- Add the new page to `sitemap.xml` so Google finds it.
- Photos go in `images/blog/`.

## Contact form

Free at web3forms.com: enter `hititautosport@gmail.com`, paste the key into `formAccessKey` in `assets/data.js`. Until then the form opens the visitor's email app.
