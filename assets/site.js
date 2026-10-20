/* Hit It Autosport — builds the left navigation, footer and every section you edit in /admin.
   Content comes from the database (through live.js), with content.js as the backup copy.
   This file rarely needs editing. */
(function () {
  "use strict";
  var D = window.HIA || {};
  var H = D;
  var S = D.settings || {};
  var page = document.body.getAttribute("data-page") || "";
  var C = function (k) { return H.C ? H.C(k) : (H.content || {})[k]; };

  /* ---------- navigation map ---------- */
  var NAV = [
    { label: "Shop", items: [
      ["Home", "index.html", "home"],
      ["Merch Tent", "merch-tent.html", "merch"],
      ["Hard Parts", "hard-parts.html", "parts"],
      ["CAD & 3D Printing", "cad-3d-printing.html", "cad"]
    ]},
    { label: "Builds", group: "builds", items: "BUILDS" },
    { label: "Garage", items: [
      ["Blog", "blog.html", "blog"],
      ["Coyote Swap Guides", "coyote-swap-guides.html", "guides"]
    ]},
    { label: "The crew", items: [
      ["About Us", "about-us.html", "about"],
      ["Team", "team.html", "team"],
      ["Contact", "contact.html", "contact"]
    ]}
  ];
  // These three keep their original addresses from the old site; new builds use build.html?car=…
  var STATIC_BUILDS = ["98-autocross-mustang", "98-autocross-ranger", "93-drift-mustang"];
  function buildHref(slug) { return STATIC_BUILDS.indexOf(slug) >= 0 ? slug + ".html" : "build.html?car=" + encodeURIComponent(slug); }
  function builds() { return (C("builds") || []).filter(function (b) { return b && b.active !== false; }); }

  var ICON = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.4-.6.7-.8 1.2-.2.4-.3 1-.4 2.1C2.7 9.8 2.7 10.2 2.7 12s0 2.2.1 3.4c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.4.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.4.6-.7.8-1.2.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.2-1-.3-2.1-.4C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zm5.1-9.4a1.1 1.1 0 1 1 0 2.3 1.1 1.1 0 0 1 0-2.3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 2h-3.3v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.3 6.3 0 1 0 5.3 6.2V8.6a7.7 7.7 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.4z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21.9v-8h2.7l.4-3.1h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.6v3.1h2.7v8h3.2z"/></svg>',
    cart: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 4h2.5l2.2 11h10.6l2-8H6.6"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>'
  };

  /* ---------- helpers ---------- */
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function paras(text) { return String(text || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""); }
  function setText(sel, val) { var el = $(sel); if (el && val != null && val !== "") el.textContent = val; }

  // Image with a labeled placeholder if the file is missing.
  function photo(src, fallback, alt, cls) {
    var box = document.createElement("div");
    box.className = "photo" + (cls ? " " + cls : "");
    var img = new Image();
    img.alt = alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    var tried = false;
    img.onerror = function () {
      if (fallback && !tried) { tried = true; img.src = fallback; return; }
      img.remove();
      var ph = document.createElement("div");
      ph.className = "ph";
      ph.innerHTML = "<i>HIA</i><span>" + esc(alt || "Photo") + "</span>";
      box.appendChild(ph);
    };
    img.src = src || "";
    box.appendChild(img);
    return box;
  }
  window.HIAphoto = photo;

  /* ---------- business info (phone, email, hours, socials) ---------- */
  function syncBusiness() {
    var b = C("business") || {};
    ["phoneDisplay", "email", "city", "hours", "socials", "formAccessKey"].forEach(function (k) { if (b[k] !== undefined && b[k] !== null && b[k] !== "") S[k] = b[k]; });
    S.phone = String(S.phoneDisplay || "").replace(/[^0-9+]/g, "");
  }
  function socialsHTML() {
    var s = S.socials || {};
    return '<div class="socials">' + ["instagram", "tiktok", "facebook"].filter(function (k) { return s[k]; }).map(function (k) {
      var label = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" }[k];
      return '<a href="' + esc(s[k]) + '" target="_blank" rel="noopener" aria-label="' + label + '">' + ICON[k] + "</a>";
    }).join("") + "</div>";
  }
  function hoursHTML() {
    return '<div class="hours">' + (S.hours || []).map(function (h) {
      var v = h[1] || "Closed";
      return "<span>" + esc(h[0]) + '</span><span class="' + (/closed/i.test(v) ? "closed" : "") + '">' + esc(v) + "</span>";
    }).join("") + "</div>";
  }
  function brandHTML(tag) {
    return '<a class="brand" href="index.html">' +
      '<img class="brand-badge" src="' + esc(S.logo || "images/logo-badge-sm.png") + '" alt="Hit It Autosport home" width="480" height="243">' +
      (tag ? '<span class="brand-tag">' + esc((C("home") || {}).tagline || "Made in America") + "</span>" : "") + "</a>";
  }

  /* ---------- page switches from /admin ---------- */
  function pageKey(p) {
    if (!p || p === "home") return null;
    if (p.indexOf("build") === 0) return "builds";
    return ["merch", "parts", "cad", "guides", "blog", "about", "team", "contact"].indexOf(p) >= 0 ? p : null;
  }
  function pageOn(k) { return !H.pageOn || H.pageOn(k); }
  var thisKey = pageKey(page);
  var startedOn = pageOn(thisKey);

  function applyLive() {
    document.querySelectorAll("[data-key]").forEach(function (li) { li.hidden = !pageOn(li.getAttribute("data-key")); });
    document.querySelectorAll(".nav-group").forEach(function (g) {
      var lis = g.querySelectorAll("li");
      var any = Array.prototype.some.call(lis, function (li) { return !li.hidden; });
      g.hidden = lis.length === 0 || !any;
    });
    document.querySelectorAll("[data-requires]").forEach(function (el) { el.hidden = !pageOn(el.getAttribute("data-requires")); });
    var b = (H.live && H.live.settings && H.live.settings.banner) || {};
    var bar = $(".site-banner");
    var main = $(".main-inner");
    if (b.on && b.text && main) {
      if (!bar) { bar = document.createElement("div"); bar.className = "site-banner"; bar.setAttribute("role", "status"); main.insertBefore(bar, main.firstChild); }
      bar.innerHTML = "<span>" + esc(b.text) + "</span>" + (b.link ? ' <a href="' + esc(b.link) + '">Learn more</a>' : "");
    } else if (bar) { bar.remove(); }
  }
  function gate() {
    if (startedOn) return;
    var main = $(".main-inner");
    if (!main) return;
    main.innerHTML = '<header class="page-head"><h1>This page is taking a break</h1><p class="lede">It\'s turned off for now. Check back soon.</p></header>' +
      '<div class="btn-row"><a class="btn orange" href="index.html">Go to the home page</a><a class="btn ghost" href="contact.html">Contact us</a></div>';
    document.title = "Back soon — Hit It Autosport";
  }

  /* ---------- sidebar + topbar ---------- */
  var navBuildsOpen = page.indexOf("build") === 0;
  try { if (!navBuildsOpen && localStorage.getItem("hia-builds-open") === "1") navBuildsOpen = true; } catch (e) {}
  function navHTML() {
    var html = "";
    NAV.forEach(function (g) {
      var items = g.items === "BUILDS"
        ? [["All builds", "builds.html", "builds"]].concat(builds().map(function (b) { return [b.name, buildHref(b.slug), "build:" + b.slug]; }))
        : g.items;
      var links = items.map(function (it) {
        var cur = it[2] === page ? ' aria-current="page"' : "";
        var k = pageKey(it[2]);
        return "<li" + (k ? ' data-key="' + k + '"' : "") + '><a href="' + it[1] + '"' + cur + ">" + esc(it[0]) + "</a></li>";
      }).join("");
      if (g.group === "builds") {
        html += '<div class="nav-group"><div class="nav-group-label">' + esc(g.label) + "</div>" +
          '<button class="nav-toggle" type="button" aria-expanded="' + navBuildsOpen + '" aria-controls="nav-builds">Race &amp; build cars <span class="chev">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></span></button>' +
          '<ul class="sub" id="nav-builds"' + (navBuildsOpen ? "" : " hidden") + ">" + links + "</ul></div>";
      } else {
        html += '<div class="nav-group"><div class="nav-group-label">' + esc(g.label) + "</div><ul>" + links + "</ul></div>";
      }
    });
    return html;
  }
  function renderSide() {
    var nav = $("#sidebar .nav"), foot = $("#sidebar .side-foot");
    if (nav) nav.innerHTML = navHTML();
    if (foot) foot.innerHTML = socialsHTML() + '<div><a href="tel:' + esc(S.phone) + '">' + esc(S.phoneDisplay) + "</a><br>" + esc(S.city) + "</div>";
    var tag = $("#sidebar .brand-tag");
    if (tag) tag.textContent = (C("home") || {}).tagline || "Made in America";
  }
  function buildShell() {
    var side = $("#sidebar");
    if (!side) return;
    side.innerHTML = '<button class="close-btn" type="button" aria-label="Close menu">' + ICON.close + "</button>" +
      brandHTML(true) +
      '<button class="store-btn" type="button" data-cart-open>' + ICON.cart + ' Cart <span class="cart-count" data-cart-count>0</span></button>' +
      '<nav class="nav" aria-label="Main"></nav><div class="side-foot"></div>';
    renderSide();

    var top = document.createElement("header");
    top.className = "topbar";
    top.innerHTML = brandHTML(false) + '<button class="cart-top" type="button" data-cart-open aria-label="Open cart">' + ICON.cart + '<span class="cart-count" data-cart-count>0</span></button><button class="menu-btn" type="button" aria-controls="sidebar" aria-expanded="false">' + ICON.menu + " Menu</button>";
    document.body.insertBefore(top, document.body.firstChild);
    var scrim = document.createElement("div");
    scrim.className = "scrim";
    document.body.appendChild(scrim);

    var menuBtn = $(".menu-btn");
    function setOpen(on) {
      document.body.classList.toggle("nav-open", on);
      menuBtn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) { var f = side.querySelector("a,button"); if (f) f.focus(); } else { menuBtn.focus(); }
    }
    menuBtn.addEventListener("click", function () { setOpen(true); });
    $(".close-btn", side).addEventListener("click", function () { setOpen(false); });
    scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("nav-open")) setOpen(false); });
    side.addEventListener("click", function (e) {
      var tog = e.target.closest(".nav-toggle");
      if (!tog) return;
      navBuildsOpen = tog.getAttribute("aria-expanded") !== "true";
      tog.setAttribute("aria-expanded", navBuildsOpen ? "true" : "false");
      $("#nav-builds").hidden = !navBuildsOpen;
      try { localStorage.setItem("hia-builds-open", navBuildsOpen ? "1" : "0"); } catch (e2) {}
    });
  }

  /* ---------- footer ---------- */
  function renderFooter() {
    var main = $(".main-inner");
    if (!main) return;
    var f = $(".site-foot", main);
    if (!f) { f = document.createElement("footer"); f.className = "site-foot"; main.appendChild(f); }
    f.innerHTML =
      '<div><img class="foot-wordmark" src="images/logo-wordmark.png" alt="Hit It Autosport" width="600" height="97" loading="lazy"><p>' + esc(S.city) + '</p><p><a href="tel:' + esc(S.phone) + '">' + esc(S.phoneDisplay) + '</a></p><p><a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a></p></div>" +
      "<div><h3>Shop hours</h3>" + hoursHTML() + "</div>" +
      "<div><h3>Follow the builds</h3>" + socialsHTML() + '<p style="margin-top:12px"><a href="contact.html">Send us a message</a></p></div>' +
      '<p class="fine">© ' + new Date().getFullYear() + ' Hit It Autosport. Designed, fabricated, tested and fitted in the U.S.A. <a href="policies.html">Shipping, returns &amp; privacy</a></p>';
  }

  /* ---------- galleries + lightbox ---------- */
  var lb, lbList = [], lbIndex = 0;
  window.HIAlightbox = function (list, i) { openLightbox(list, i || 0); };
  function openLightbox(list, i) {
    lbList = list; lbIndex = i;
    if (!lb) {
      lb = document.createElement("div");
      lb.className = "lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.setAttribute("aria-label", "Photo viewer");
      lb.innerHTML = '<div class="lb-top"><span class="lb-count"></span><button type="button" class="lb-close">Close</button></div>' +
        '<div class="lb-img"><img alt=""></div>' +
        '<div class="lb-nav"><button type="button" class="lb-prev">Previous</button><button type="button" class="lb-next">Next</button></div>';
      document.body.appendChild(lb);
      $(".lb-close", lb).onclick = closeLightbox;
      $(".lb-prev", lb).onclick = function () { step(-1); };
      $(".lb-next", lb).onclick = function () { step(1); };
      lb.addEventListener("click", function (e) { if (e.target.classList.contains("lb-img")) closeLightbox(); });
      document.addEventListener("keydown", function (e) {
        if (lb.hidden) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
      });
    }
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    show();
    $(".lb-close", lb).focus();
  }
  function show() {
    var it = lbList[lbIndex], img = $(".lb-img img", lb);
    var tried = false;
    img.onerror = function () { if (it[1] && !tried) { tried = true; img.src = it[1]; } };
    img.src = it[0];
    img.alt = it[2] || "";
    $(".lb-count", lb).textContent = "Photo " + (lbIndex + 1) + " of " + lbList.length;
  }
  function step(d) { lbIndex = (lbIndex + d + lbList.length) % lbList.length; show(); }
  function closeLightbox() { lb.hidden = true; document.body.style.overflow = ""; }

  function renderGallery(target, list) {
    var el = $(target);
    if (!el) return;
    el.innerHTML = "";
    if (!list.length) { el.innerHTML = '<p class="muted">Photos coming soon.</p>'; return; }
    list.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Open photo " + (i + 1));
      b.appendChild(photo(it[0], it[1], it[2]));
      b.addEventListener("click", function () { openLightbox(list, i); });
      el.appendChild(b);
    });
  }

  /* ---------- home + text pages ---------- */
  function renderHome() {
    var h = C("home") || {};
    setText("#hero-tagline", h.tagline);
    setText("#hero-headline", h.headline);
    setText("#hero-lede", h.lede);
  }
  function renderAbout() {
    var a = C("about") || {}, el = $("#about-body");
    if (el && a.body) el.innerHTML = paras(a.body);
  }
  function renderTeam() {
    var el = $("#team-list");
    if (!el) return;
    var team = C("team") || [];
    el.innerHTML = "";
    if (!team.length) { el.innerHTML = '<div class="empty"><p>Team bios coming soon.</p></div>'; return; }
    team.forEach(function (m) {
      var row = document.createElement("article");
      row.className = "member";
      row.appendChild(photo(m.photo || "", null, m.name));
      row.insertAdjacentHTML("beforeend", "<div><h2>" + esc(m.name) + '</h2><p class="role">' + esc(m.role || "") + "</p>" + paras(m.bio) +
        ((m.creds || []).length ? '<div class="creds">' + m.creds.map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") + "</div>" : "") + "</div>");
      el.appendChild(row);
    });
  }
  function renderCad() {
    var c = C("cad") || {};
    setText("#cad-intro", c.intro);
    setText("#cad-rate", c.rate);
    setText("#cad-rate-note", c.rateNote);
    var sv = $("#cad-services");
    if (sv && c.services) sv.innerHTML = c.services.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    renderGallery("#gallery", (c.photos || []).map(function (p, i) { return [p, null, "CAD and 3D printing project " + (i + 1)]; }));
  }

  /* ---------- builds ---------- */
  function buildPhotos(b) { return (b.photos || []).map(function (src, i) { return [src, null, b.name + " photo " + (i + 1)]; }); }
  function renderBuildCards(target) {
    var el = $(target);
    if (!el) return;
    el.innerHTML = "";
    var list = builds();
    if (!list.length) { el.innerHTML = '<div class="empty"><p>Build pages coming soon.</p></div>'; return; }
    list.forEach(function (b) {
      var a = document.createElement("a");
      a.className = "build-card";
      a.href = buildHref(b.slug);
      a.appendChild(photo((b.photos || [])[0] || "", null, b.name));
      a.insertAdjacentHTML("beforeend", "<h3>" + esc(b.name) + "</h3><p>" + esc(b.blurb || "") + "</p>");
      el.appendChild(a);
    });
  }
  function currentBuildSlug() {
    if (page.indexOf("build:") === 0 && page.length > 6) return page.slice(6);
    try { var q = new URLSearchParams(location.search).get("car"); if (q) return q; } catch (e) {}
    return (location.hash || "").replace(/^#/, "");
  }
  function renderBuildPage() {
    var slug = currentBuildSlug();
    var list = builds();
    var i = list.findIndex(function (x) { return x.slug === slug; });
    var b = list[i];
    if (!b) {
      setText("#build-name", "Build not found");
      var l = $("#build-lede"); if (l) l.textContent = "This build isn't posted right now.";
      ["#specs", "#gallery"].forEach(function (s) { var el = $(s); if (el) el.closest(".section").hidden = true; });
      var n = $("#build-nav"); if (n) n.innerHTML = '<a href="builds.html"><small>Back to</small>All builds</a>';
      return;
    }
    setText("#build-name", b.name);
    setText("#build-crumb-name", b.name);
    document.title = b.name + " — Hit It Autosport";
    var lede = $("#build-lede"); if (lede) lede.textContent = b.blurb || "";
    var specs = $("#specs");
    if (specs) {
      var rows = (b.specs || []).filter(function (r) { return r && (r[0] || r[1]); });
      specs.closest(".section").hidden = !rows.length;
      specs.innerHTML = rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    }
    var count = $("#photo-count");
    if (count) count.textContent = (b.photos || []).length + " photos";
    renderGallery("#gallery", buildPhotos(b));
    var nav = $("#build-nav");
    if (nav) {
      if (list.length < 2) { nav.innerHTML = '<a href="builds.html"><small>Back to</small>All builds</a>'; return; }
      var prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
      nav.innerHTML = '<a href="' + buildHref(prev.slug) + '"><small>Previous build</small>' + esc(prev.name) + "</a>" +
        '<a href="' + buildHref(next.slug) + '" style="text-align:right"><small>Next build</small>' + esc(next.name) + "</a>";
    }
  }

  /* ---------- guides ---------- */
  function renderGuides() {
    var el = $("#guides");
    if (!el) return;
    var list = C("guides") || [];
    if (!list.length) { el.innerHTML = '<div class="empty"><p>Guides coming soon.</p></div>'; return; }
    el.innerHTML = list.map(function (g) {
      return '<article class="guide">' + (g.gen ? '<div class="gen">' + esc(g.gen) + "</div>" : "") + "<h3>" + esc(g.title) + "</h3><p>" + esc(g.body) + "</p>" +
        (g.url
          ? '<span class="status ready">Ready to use</span><div><a class="btn orange" href="' + esc(g.url) + '" target="_blank" rel="noopener">Open the guide ' + ICON.ext + "</a></div>"
          : '<span class="status wip">In progress</span><div><a class="btn ghost" href="contact.html?topic=coyote">Ask us about it</a></div>') +
        "</article>";
    }).join("");
  }

  /* ---------- contact ---------- */
  function renderContactInfo() {
    var el = $("#contact-info");
    if (!el) return;
    el.innerHTML =
      '<div><h3>Call or text</h3><div class="val"><a href="tel:' + esc(S.phone) + '">' + esc(S.phoneDisplay) + "</a></div></div>" +
      '<div><h3>Email</h3><div class="val"><a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a></div></div>" +
      '<div><h3>Shop</h3><div class="val">' + esc(S.city) + "</div></div>" +
      "<div><h3>Hours</h3>" + hoursHTML() + "</div>" +
      "<div><h3>Follow</h3>" + socialsHTML() + "</div>";
  }
  function contactForm() {
    var f = $("#contact-form");
    if (!f) return;
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("topic")) { var sel = $("#c-topic"); if (sel.querySelector('option[value="' + q.get("topic") + '"]')) sel.value = q.get("topic"); }
      if (q.get("item")) $("#c-message").value = "Hi, I have a question about the " + q.get("item") + ".\n\n";
    } catch (e) {}
    var msg = $("#form-msg");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (f.querySelector(".hp input").value) return; // spam trap
      var data = {
        name: $("#c-name").value.trim(), email: $("#c-email").value.trim(), phone: $("#c-phone").value.trim(),
        topic: $("#c-topic").selectedOptions[0].textContent, message: $("#c-message").value.trim()
      };
      if (!data.name || !data.email || !data.message) {
        msg.className = "form-msg err"; msg.textContent = "Add your name, email and a message, then send again."; return;
      }
      var subject = "Website message: " + data.topic;
      var body = data.message + "\n\n" + data.name + "\n" + data.email + (data.phone ? "\n" + data.phone : "");
      if (!S.formAccessKey) {
        location.href = "mailto:" + S.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        msg.className = "form-msg ok"; msg.textContent = "Your email app should open with the message filled in. If it doesn't, email " + S.email + ".";
        return;
      }
      var btn = f.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Sending…";
      fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: S.formAccessKey, subject: subject, from_name: "hititautosport.com", name: data.name, email: data.email, phone: data.phone, topic: data.topic, message: data.message })
      }).then(function (r) { return r.json(); }).then(function (r) {
        if (!r.success) throw new Error(r.message || "Not sent");
        f.reset(); msg.className = "form-msg ok"; msg.textContent = "Message sent. We usually reply within a day.";
      }).catch(function () {
        msg.className = "form-msg err"; msg.textContent = "The message didn't go through. Email " + S.email + " or call " + S.phoneDisplay + ".";
      }).then(function () { btn.disabled = false; btn.textContent = "Send message"; });
    });
  }

  /* ---------- blog ---------- */
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parseDay(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(s) { var d = parseDay(s); return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function renderBlog(target, limit) {
    var el = $(target);
    if (!el) return;
    var posts = (D.blog || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, limit || 999);
    if (!posts.length) { el.innerHTML = '<div class="empty"><h3>First post coming soon</h3><p>Build notes, install write-ups and test results will show up here.</p></div>'; return; }
    el.innerHTML = "";
    posts.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "post-card";
      a.href = "blog-" + p.slug + ".html";
      a.appendChild(photo(p.image, null, p.title, "wide"));
      a.insertAdjacentHTML("beforeend", '<div class="post-meta"><time datetime="' + esc(p.date) + '">' + fmtDate(p.date) + "</time>" +
        ((p.tags || []).length ? '<span>' + esc(p.tags.join(", ")) + "</span>" : "") + "</div><h3>" + esc(p.title) + "</h3><p>" + esc(p.summary) + "</p>");
      el.appendChild(a);
    });
  }
  window.HIAblog = { fmtDate: fmtDate };

  /* ---------- draw everything that depends on /admin content ---------- */
  function renderPage() {
    if (page === "home") { renderHome(); renderBuildCards("#home-builds"); renderBlog("#home-blog", 2); }
    if (page === "blog") renderBlog("#blog-list");
    if (page === "about") renderAbout();
    if (page === "team") renderTeam();
    if (page === "cad") renderCad();
    if (page === "builds") renderBuildCards("#build-cards");
    if (page.indexOf("build:") === 0) renderBuildPage();
    if (page === "guides") renderGuides();
    if (page === "contact") renderContactInfo();
  }

  /* ---------- go ---------- */
  syncBusiness();
  buildShell();
  gate();
  applyLive();
  document.querySelectorAll("[data-photo]").forEach(function (el) {
    el.replaceWith(photo(el.getAttribute("data-photo"), null, el.getAttribute("data-alt")));
  });
  if (startedOn) {
    renderPage();
    if (page === "contact") contactForm();
  }
  renderFooter();

  document.addEventListener("hia:live", function (e) {
    if (pageOn(thisKey) !== startedOn) { location.reload(); return; }
    if (e.detail && e.detail.changed === false) { applyLive(); return; }
    syncBusiness();
    renderSide();
    applyLive();
    if (startedOn) renderPage();
    renderFooter();
  });
})();
