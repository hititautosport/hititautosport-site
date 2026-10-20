/* Hit It Autosport — cart, product picker and checkout.
   Merch comes live from Printify through /api/products. Hard parts come from catalog.json.
   Checkout goes through /api/checkout (Stripe). Nothing in here needs editing for price changes. */
(function () {
  "use strict";
  var D = window.HIA || {};
  var page = document.body.getAttribute("data-page") || "";
  var photo = window.HIAphoto;
  var CART_KEY = "hia-cart-v1";

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function money(c) { return "$" + (c / 100).toFixed(2); }

  /* ---------- cart storage ---------- */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]") || []; } catch (e) { cart = []; }
  function save() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} updateCounts(); renderCart(); }
  function count() { return cart.reduce(function (n, i) { return n + i.qty; }, 0); }
  function subtotal() { return cart.reduce(function (n, i) { return n + i.price * i.qty; }, 0); }
  function updateCounts() {
    var n = count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = n; el.hidden = n === 0 && el.closest(".cart-top"); });
  }
  function addToCart(item) {
    var key = [item.kind, item.id, item.variantId || "", item.option || ""].join("|");
    var found = cart.find(function (i) { return i.key === key; });
    if (found) found.qty = Math.min(10, found.qty + item.qty);
    else { item.key = key; cart.push(item); }
    save();
  }

  /* ---------- cart panel ---------- */
  var panel = document.createElement("aside");
  panel.className = "cart-panel";
  panel.id = "cart";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "cart-title");
  panel.hidden = true;
  panel.innerHTML =
    '<div class="cart-head"><h2 id="cart-title">Your cart</h2><button type="button" class="icon-btn" data-cart-close aria-label="Close cart">' +
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>' +
    '<div class="cart-body" id="cart-body"></div>' +
    '<div class="cart-foot" id="cart-foot"></div>';
  var veil = document.createElement("div");
  veil.className = "cart-veil";
  veil.hidden = true;
  document.body.appendChild(veil);
  document.body.appendChild(panel);
  var lastFocus = null;

  function openCart() {
    lastFocus = document.activeElement;
    document.body.classList.remove("nav-open");
    panel.hidden = false; veil.hidden = false;
    document.body.classList.add("cart-open");
    renderCart();
    $("[data-cart-close]", panel).focus();
  }
  function closeCart() {
    panel.hidden = true; veil.hidden = true;
    document.body.classList.remove("cart-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-cart-open]")) { e.preventDefault(); openCart(); }
    if (e.target.closest("[data-cart-close]")) closeCart();
  });
  veil.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) closeCart(); });

  function renderCart() {
    var body = $("#cart-body"), foot = $("#cart-foot");
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><div class="btn-row"><a class="btn orange" href="merch-tent.html">Shop merch</a><a class="btn ghost" href="hard-parts.html">Hard parts</a></div></div>';
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = "";
    cart.forEach(function (it, idx) {
      var row = document.createElement("div");
      row.className = "cart-line";
      var ph = photo(it.image || "", null, it.name);
      ph.classList.add("thumb");
      row.appendChild(ph);
      row.insertAdjacentHTML("beforeend",
        '<div class="cl-main"><div class="cl-name">' + esc(it.name) + "</div>" +
        (it.detail ? '<div class="cl-detail">' + esc(it.detail) + "</div>" : "") +
        '<div class="cl-kind">' + (it.kind === "merch" ? "Printed and shipped by Printify" : "Ships from our shop") + "</div>" +
        '<div class="qty" role="group" aria-label="Quantity for ' + esc(it.name) + '">' +
        '<button type="button" data-q="-1" data-i="' + idx + '" aria-label="One fewer">−</button><span>' + it.qty + '</span>' +
        '<button type="button" data-q="1" data-i="' + idx + '" aria-label="One more">+</button>' +
        '<button type="button" class="remove" data-rm="' + idx + '">Remove</button></div></div>' +
        '<div class="cl-price">' + money(it.price * it.qty) + "</div>");
      body.appendChild(row);
    });
    foot.innerHTML =
      '<div class="cart-total"><span>Subtotal</span><span>' + money(subtotal()) + "</span></div>" +
      '<p class="cart-note">Shipping is added at checkout.' + (cart.some(function (i) { return i.kind === "merch"; }) ? " Merch is printed when you order and usually ships within a week." : "") + "</p>" +
      '<button type="button" class="btn orange block" id="checkout-btn">Check out</button>' +
      '<p class="form-msg" id="cart-msg" role="status" aria-live="polite"></p>';
    $("#checkout-btn").addEventListener("click", checkout);
  }
  panel.addEventListener("click", function (e) {
    var q = e.target.closest("[data-q]"), rm = e.target.closest("[data-rm]");
    if (q) {
      var it = cart[+q.dataset.i];
      it.qty = Math.max(1, Math.min(10, it.qty + +q.dataset.q));
      save();
    }
    if (rm) { cart.splice(+rm.dataset.rm, 1); save(); }
  });

  function checkout() {
    var btn = $("#checkout-btn"), msg = $("#cart-msg");
    if (!shopOpen()) { msg.className = "form-msg err"; msg.textContent = closedMsg(); return; }
    if (cart.some(function (i) { return i.kind === "merch"; }) && !H.pageOn("merch")) { msg.className = "form-msg err"; msg.textContent = "Merch is unavailable right now. Remove shirts from your cart to check out."; return; }
    var sample = cart.some(function (i) { return i.kind === "merch" && !i.variantId; });
    if (sample) {
      msg.className = "form-msg err";
      msg.textContent = "Some shirts in your cart are sample listings. Remove them; real sizes and colors appear once Printify is connected.";
      return;
    }
    btn.disabled = true; btn.textContent = "Opening secure checkout…";
    msg.className = "form-msg"; msg.textContent = "";
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.map(function (i) { return { kind: i.kind, id: i.id, variantId: i.variantId, option: i.option, qty: i.qty }; }) })
    }).then(function (r) {
      return r.json().catch(function () { return { error: "Checkout isn't connected on this copy of the site yet." }; }).then(function (b) { return { ok: r.ok, b: b }; });
    }).then(function (res) {
      if (res.ok && res.b.url) { location.href = res.b.url; return; }
      throw new Error(res.b.error || "Checkout couldn't start.");
    }).catch(function (err) {
      msg.className = "form-msg err";
      msg.textContent = (err && err.message && !/Failed to fetch|NetworkError|Load failed/i.test(err.message)) ? err.message : "Checkout isn't connected on this copy of the site yet.";
      btn.disabled = false; btn.textContent = "Check out";
    });
  }

  /* ---------- merch catalog ---------- */
  function typeOf(p) {
    var t = (p.title + " " + (p.tags || []).join(" ")).toLowerCase();
    if (/long sleeve/.test(t)) return "long sleeve";
    if (/sweatshirt|hoodie|crewneck|fleece/.test(t)) return "sweatshirt";
    return "shirt";
  }
  var products = null, sampleMode = false;
  function loadProducts() {
    if (products) return Promise.resolve(products);
    return fetch("/api/products").then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (b) { if (!b.products || !b.products.length) throw new Error(); products = b.products; return products; })
      .catch(function () {
        sampleMode = true;
        products = (D.merch || []).map(function (m, i) {
          return { id: "sample-" + i, title: m.name, fromPrice: Math.round(m.price * 100), fromLabel: m.from, images: [{ src: m.image, variants: [] }], options: [], variants: [], sample: true, type: m.type };
        });
        return products;
      });
  }
  function firstImage(p) { var d = (p.images || []).find(function (i) { return i.isDefault; }) || (p.images || [])[0]; return d ? d.src : ""; }

  function productCard(p) {
    var a = document.createElement("a");
    a.className = "product";
    a.href = "merch-tent.html#p-" + p.id;
    a.dataset.type = p.type || typeOf(p);
    a.appendChild(photo(firstImage(p), null, p.title));
    var multi = p.sample ? p.fromLabel : (p.variants || []).some(function (v) { return v.price !== p.fromPrice; });
    a.insertAdjacentHTML("beforeend", "<h3>" + esc(p.title) + '</h3><span class="price">' + (multi ? "from " : "") + money(p.fromPrice) + '</span><span class="shop">Choose size &amp; color</span>');
    a.addEventListener("click", function (e) {
      if (page === "merch") { e.preventDefault(); openProduct(p); history.replaceState(null, "", "#p-" + p.id); }
    });
    return a;
  }

  function renderMerchGrid(target, limit) {
    var el = $(target);
    if (!el) return;
    el.innerHTML = '<p class="loading">Loading designs…</p>';
    loadProducts().then(function (list) {
      el.innerHTML = "";
      list.slice(0, limit || 999).forEach(function (p) { el.appendChild(productCard(p)); });
      var note = $("#sample-note");
      if (note) note.hidden = !sampleMode;
      var countEl = $("#merch-count");
      if (countEl) countEl.textContent = "See all " + list.length + " designs";
      if (page === "merch") { filters(list); openFromHash(); shopNotice(el); }
    });
  }
  function filters(list) {
    var bar = $("#merch-filters");
    if (!bar) return;
    var types = ["all"];
    list.forEach(function (p) { var t = p.type || typeOf(p); if (types.indexOf(t) < 0) types.push(t); });
    if (types.length < 3) { bar.hidden = true; return; }
    var label = { all: "All", shirt: "Shirts", sweatshirt: "Sweatshirts", "long sleeve": "Long sleeve" };
    bar.innerHTML = types.map(function (t, i) { return '<button class="chip" type="button" data-type="' + esc(t) + '" aria-pressed="' + (i === 0) + '">' + esc(label[t] || t) + "</button>"; }).join("");
    bar.onclick = function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      bar.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
      document.querySelectorAll("#merch-grid .product").forEach(function (c) { c.hidden = !(b.dataset.type === "all" || c.dataset.type === b.dataset.type); });
    };
  }
  function openFromHash() {
    var h = location.hash;
    if (h === "#cart") { openCart(); return; }
    if (h.indexOf("#p-") === 0 && products) {
      var p = products.find(function (x) { return String(x.id) === h.slice(3); });
      if (p) openProduct(p);
    }
  }

  /* ---------- product sheet ---------- */
  var sheet = null, current = null, chosen = {}, qty = 1;
  function ensureSheet() {
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "sheet-title");
    sheet.hidden = true;
    sheet.innerHTML = '<div class="sheet-card"><button type="button" class="icon-btn sheet-close" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
      '<div class="sheet-media"><div class="sheet-main"></div><div class="sheet-thumbs"></div></div><div class="sheet-info"></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener("click", function (e) { if (e.target === sheet || e.target.closest(".sheet-close")) closeProduct(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet && !sheet.hidden) closeProduct(); });
    return sheet;
  }
  function variantFor(p, sel) {
    var ids = Object.keys(sel).map(function (k) { return sel[k]; });
    return (p.variants || []).find(function (v) { return ids.every(function (id) { return v.options.indexOf(id) >= 0; }); });
  }
  function openProduct(p) {
    ensureSheet();
    current = p; qty = 1; chosen = {};
    if (p.variants && p.variants.length) {
      var start = p.variants.slice().sort(function (a, b) { return a.price - b.price; })[0];
      (p.options || []).forEach(function (o, i) { var hit = o.values.find(function (v) { return start.options.indexOf(v.id) >= 0; }); if (hit) chosen[i] = hit.id; });
    }
    drawProduct();
    sheet.hidden = false;
    document.body.classList.add("cart-open");
    $(".sheet-close", sheet).focus();
  }
  function closeProduct() {
    sheet.hidden = true;
    document.body.classList.remove("cart-open");
    if (location.hash.indexOf("#p-") === 0) history.replaceState(null, "", location.pathname + location.search);
  }
  function drawProduct() {
    var p = current, v = variantFor(p, chosen);
    var imgs = (p.images || []).filter(function (im) { return v && im.variants && im.variants.indexOf(v.id) >= 0; });
    if (!imgs.length) imgs = p.images || [];
    var main = $(".sheet-main", sheet), thumbs = $(".sheet-thumbs", sheet);
    main.innerHTML = ""; thumbs.innerHTML = "";
    main.appendChild(photo(imgs[0] ? imgs[0].src : "", null, p.title));
    imgs.slice(0, 8).forEach(function (im, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "Show photo " + (i + 1));
      b.appendChild(photo(im.src, null, p.title));
      b.onclick = function () { main.innerHTML = ""; main.appendChild(photo(im.src, null, p.title)); };
      thumbs.appendChild(b);
    });
    if (imgs.length < 2) thumbs.innerHTML = "";

    var html = '<h2 id="sheet-title">' + esc(p.title) + '</h2><div class="sheet-price">' + money(v ? v.price : p.fromPrice) + "</div>";
    if (p.sample) {
      html += '<div class="note"><p><strong>Sample listing.</strong> Sizes, colors and real photos load from Printify once it\'s connected.</p></div>';
    }
    (p.options || []).forEach(function (o, oi) {
      var isColor = o.type === "color" || /color/i.test(o.name);
      html += '<fieldset class="opt"><legend>' + esc(o.name.replace(/s$/, "")) + ': <strong>' + esc((o.values.find(function (x) { return x.id === chosen[oi]; }) || {}).title || "") + "</strong></legend><div class=\"opt-row\">";
      o.values.forEach(function (val) {
        var test = Object.assign({}, chosen); test[oi] = val.id;
        var avail = !!variantFor(p, test) || p.variants.some(function (vv) { return vv.options.indexOf(val.id) >= 0; });
        var pressed = chosen[oi] === val.id;
        if (isColor) {
          var c = (val.colors && val.colors[0]) || "#999";
          html += '<button type="button" class="swatch" data-o="' + oi + '" data-v="' + val.id + '" aria-pressed="' + pressed + '" aria-label="' + esc(val.title) + '" title="' + esc(val.title) + '"' + (avail ? "" : " disabled") + ' style="--sw:' + esc(c) + '"></button>';
        } else {
          html += '<button type="button" class="size" data-o="' + oi + '" data-v="' + val.id + '" aria-pressed="' + pressed + '"' + (avail ? "" : " disabled") + ">" + esc(val.title) + "</button>";
        }
      });
      html += "</div></fieldset>";
    });
    html += '<div class="qty big" role="group" aria-label="Quantity"><button type="button" data-sq="-1" aria-label="One fewer">−</button><span>' + qty + '</span><button type="button" data-sq="1" aria-label="One more">+</button></div>';
    var missing = p.variants && p.variants.length && !v;
    html += '<button type="button" class="btn orange block" id="add-btn"' + (missing ? " disabled" : "") + ">" + (missing ? "That combo isn't available" : "Add to cart") + "</button>";
    html += '<p class="cart-note">Printed when you order and shipped straight to you by our print partner.</p>';
    if (p.description) html += '<details class="desc"><summary>Fabric, fit and care</summary><p>' + esc(p.description).replace(/\n/g, "<br>") + "</p></details>";
    var info = $(".sheet-info", sheet);
    info.innerHTML = html;

    info.onclick = function (e) {
      var ob = e.target.closest("[data-o]"), sq = e.target.closest("[data-sq]");
      if (ob && !ob.disabled) {
        var oi = +ob.dataset.o, vid = +ob.dataset.v;
        chosen[oi] = vid;
        if (!variantFor(p, chosen)) {
          var fix = p.variants.find(function (vv) { return vv.options.indexOf(vid) >= 0; });
          if (fix) (p.options || []).forEach(function (o, i) { var hit = o.values.find(function (x) { return fix.options.indexOf(x.id) >= 0; }); if (hit) chosen[i] = hit.id; });
        }
        drawProduct();
        var again = info.querySelector('[data-o="' + oi + '"][data-v="' + vid + '"]'); if (again) again.focus();
      }
      if (sq) { qty = Math.max(1, Math.min(10, qty + +sq.dataset.sq)); drawProduct(); }
      if (e.target.closest("#add-btn")) {
        if (!shopOpen()) { var n = info.querySelector(".cart-note"); if (n) { n.textContent = closedMsg(); n.className = "form-msg err"; } return; }
        var vv = variantFor(p, chosen);
        addToCart({
          kind: "merch", id: p.sample ? p.id : p.id, variantId: vv ? vv.id : null,
          name: p.title, detail: vv ? vv.title : "", price: vv ? vv.price : p.fromPrice,
          image: ((p.images || []).find(function (im) { return vv && im.variants.indexOf(vv.id) >= 0; }) || (p.images || [])[0] || {}).src || "",
          qty: qty
        });
        closeProduct();
        openCart();
      }
    };
  }

  /* ---------- live settings ---------- */
  var H = window.HIA;
  function settings() { return (H.live && H.live.settings) || {}; }
  function shopOpen() { var sh = settings().shop || {}; return sh.open !== false; }
  function closedMsg() { var sh = settings().shop || {}; return sh.closedMessage || "The shop is closed right now. Check back soon."; }
  function shopNotice(el) {
    if (!el) return;
    var n = el.parentNode.querySelector(".shop-closed");
    if (shopOpen()) { if (n) n.remove(); return; }
    if (!n) { n = document.createElement("div"); n.className = "note shop-closed"; el.parentNode.insertBefore(n, el); }
    n.innerHTML = "<p><strong>Shop closed.</strong> " + esc(closedMsg()) + "</p>";
  }

  /* ---------- hard parts ---------- */
  function partRow(p) {
    var opts = p.options && p.options.length ? p.options : null;
    var prices = opts ? opts.map(function (o) { return o.price; }) : [p.price];
    var low = Math.min.apply(null, prices);
    var row = document.createElement("article");
    row.className = "part" + (p.soldOut ? " sold" : "");
    var imgs = (p.images && p.images.length ? p.images : (p.image ? [p.image] : []));
    var ph = photo(imgs[0] || "", null, p.name);
    if (p.soldOut) ph.insertAdjacentHTML("afterbegin", '<span class="tag dark">Sold out</span>');
    else if (p.wasPrice) ph.insertAdjacentHTML("afterbegin", '<span class="tag">Sale</span>');
    if (imgs.length > 1) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "part-photos"; b.setAttribute("aria-label", "See all " + imgs.length + " photos of " + p.name);
      b.appendChild(ph);
      b.insertAdjacentHTML("beforeend", '<span class="photo-count">' + imgs.length + " photos</span>");
      b.addEventListener("click", function () { if (window.HIAlightbox) window.HIAlightbox(imgs.map(function (src, i) { return [src, null, p.name + " photo " + (i + 1)]; }), 0); });
      row.appendChild(b);
    } else row.appendChild(ph);
    var canBuy = !p.soldOut && shopOpen();
    row.insertAdjacentHTML("beforeend",
      "<div><h3>" + esc(p.name) + '</h3><p class="fit">' + esc(p.fit || "").replace(/\n/g, "<br>") + "</p>" +
      (opts && opts.length > 1 ? '<label class="opt-select"><span>Version</span><select data-part-opt="' + esc(p.id) + '">' + opts.map(function (o) { return '<option value="' + esc(o.label) + '">' + esc(o.label) + " – " + money(Math.round(o.price * 100)) + "</option>"; }).join("") + "</select></label>" : "") +
      '<a class="ask" href="contact.html?topic=parts&amp;item=' + encodeURIComponent(p.name) + '">Ask about fitment</a></div>' +
      '<div class="buy"><span class="price">' + (opts && opts.length > 1 ? money(Math.round(opts[0].price * 100)) : money(Math.round(low * 100))) +
      (p.wasPrice ? '<span class="was">' + money(Math.round(p.wasPrice * 100)) + "</span>" : "") + "</span>" +
      '<button type="button" class="btn orange" data-add-part="' + esc(p.id) + '"' + (canBuy ? "" : " disabled") + ">" + (p.soldOut ? "Sold out" : "Add to cart") + "</button></div>");
    return row;
  }
  var partsList = [];
  function renderParts() {
    var el = $("#parts");
    if (!el) return;
    el.innerHTML = '<p class="loading">Loading parts…</p>';
    H.liveReady.then(function (d) {
      partsList = (d && d.parts) || [];
      el.innerHTML = "";
      shopNotice(el);
      if (!partsList.length) { el.innerHTML = '<div class="empty"><h3>New parts coming soon</h3><p>We\'re building the next batch. <a href="contact.html?topic=parts">Tell us what you\'re looking for.</a></p></div>'; return; }
      partsList.forEach(function (p) { el.appendChild(partRow(p)); });
    });
    el.addEventListener("change", function (e) {
      var sel = e.target.closest("[data-part-opt]");
      if (!sel) return;
      var p = partsList.find(function (x) { return x.id === sel.dataset.partOpt; });
      var o = p && p.options.find(function (x) { return x.label === sel.value; });
      var priceEl = sel.closest(".part").querySelector(".buy .price");
      if (o && priceEl) priceEl.textContent = money(Math.round(o.price * 100));
    });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-add-part]");
      if (!b || b.disabled) return;
      var p = partsList.find(function (x) { return x.id === b.dataset.addPart; });
      if (!p) return;
      var sel = el.querySelector('[data-part-opt="' + p.id + '"]');
      var opt = p.options && p.options.length ? (p.options.find(function (o) { return sel && o.label === sel.value; }) || p.options[0]) : null;
      addToCart({
        kind: "part", id: p.id, option: opt && sel ? opt.label : "",
        name: p.name, detail: opt && sel ? opt.label : "", price: Math.round((opt ? opt.price : p.price) * 100),
        image: (p.images && p.images[0]) || p.image || "", qty: 1
      });
      openCart();
    });
  }

  /* ---------- go ---------- */
  updateCounts();
  renderCart();
  if (page === "merch") renderMerchGrid("#merch-grid");
  if (page === "home" && H.pageOn("merch")) renderMerchGrid("#featured", 4);
  if (page === "parts") renderParts();
  if (page === "order-complete") { cart = []; save(); }
  if (location.hash === "#cart" && page !== "merch") openCart();
  window.addEventListener("hashchange", openFromHash);
})();
