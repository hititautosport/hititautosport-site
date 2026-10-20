/* Hit It Autosport — owner portal.
   Saves to the Hit It HQ Supabase project. Only accounts in hq_admins can change anything;
   the database enforces that, so this page can't be used to edit the site without your login. */
(function () {
  "use strict";
  var S = (window.HIA && window.HIA.settings) || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var money = function (n) { return "$" + Number(n).toFixed(2); };
  var BUCKET = "site-images";

  if (!window.supabase || !S.supabaseUrl) {
    $("#view-loading").textContent = "The portal couldn't load. Check your connection and refresh.";
    return;
  }
  var sb = window.supabase.createClient(S.supabaseUrl, S.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } });

  function show(id) {
    ["view-signin", "view-denied", "view-loading", "view-app"].forEach(function (v) { $("#" + v).hidden = v !== id; });
  }
  var toastTimer;
  function toast(text) {
    var t = $("#toast"); t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function setMsg(el, text, bad) { el.className = "form-msg" + (text ? (bad ? " err" : " ok") : ""); el.textContent = text || ""; }
  function friendly(err) {
    var m = (err && (err.message || err.error_description)) || String(err || "");
    if (/row-level security|permission denied/i.test(m)) return "This login isn't allowed to make changes.";
    if (/site_parts_options_valid/.test(m)) return "Every version needs a name and a price above $0, and version names can't repeat.";
    if (/site_parts_has_price/.test(m)) return "Add a price, or at least one version with a price.";
    if (/duplicate key/i.test(m)) return "A part with that name already exists. Change the name a little.";
    if (/Invalid login credentials/i.test(m)) return "That email and password don't match. Try again or use a sign-in link.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Couldn't reach the server. Check your connection and try again.";
    return m;
  }

  /* ---------- sign in ---------- */
  $("#signin-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("#si-email").value.trim(), pass = $("#si-pass").value, msg = $("#si-msg");
    if (!email || !pass) { setMsg(msg, "Enter your email and password, or use a sign-in link.", true); return; }
    $("#si-btn").disabled = true;
    sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
      $("#si-btn").disabled = false;
      if (r.error) setMsg(msg, friendly(r.error), true);
    });
  });
  $("#si-link").addEventListener("click", function () {
    var email = $("#si-email").value.trim(), msg = $("#si-msg");
    if (!email) { setMsg(msg, "Enter your email first.", true); return; }
    sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
      if (r.error) setMsg(msg, friendly(r.error), true);
      else setMsg(msg, "Check your email for a sign-in link. Open it on this device.");
    });
  });
  $("#ad-signout").addEventListener("click", function () { sb.auth.signOut(); });

  var started = false;
  function onSession(session) {
    if (!session) { $("#ad-who").hidden = true; show("view-signin"); started = false; return; }
    $("#ad-who").hidden = false;
    $("#ad-email").textContent = session.user.email || "";
    sb.from("hq_admins").select("user_id").limit(1).then(function (r) {
      if (r.error || !r.data || !r.data.length) { show("view-denied"); return; }
      show("view-app");
      if (!started) { started = true; loadParts(); loadSettings(); window.ADM.ready = true; document.dispatchEvent(new Event("adm:ready")); }
    });
  }
  sb.auth.getSession().then(function (r) { onSession(r.data.session); });
  sb.auth.onAuthStateChange(function (_evt, session) { onSession(session); });

  /* ---------- tabs ---------- */
  var tabs = Array.prototype.map.call(document.querySelectorAll('.ad-tabs [role="tab"]'), function (b) { return b.id.replace(/^tab-/, ""); });
  tabs.forEach(function (t) {
    $("#tab-" + t).addEventListener("click", function () { selectTab(t); });
  });
  function selectTab(t) {
    tabs.forEach(function (x) {
      $("#tab-" + x).setAttribute("aria-selected", x === t ? "true" : "false");
      $("#panel-" + x).hidden = x !== t;
    });
  }
  $(".ad-tabs").addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var cur = tabs.findIndex(function (x) { return $("#tab-" + x).getAttribute("aria-selected") === "true"; });
    var next = tabs[(cur + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(next); $("#tab-" + next).focus();
  });

  /* ---------- photos helper ---------- */
  function thumb(src, alt) {
    if (window.HIAphoto) return window.HIAphoto(src, null, alt);
    var d = document.createElement("div"); d.className = "photo";
    var i = new Image(); i.src = src; i.alt = alt || ""; d.appendChild(i); return d;
  }
  // Basic photo element (site.js isn't loaded here).
  window.HIAphoto = window.HIAphoto || function (src, _f, alt) {
    var box = document.createElement("div"); box.className = "photo";
    var img = new Image(); img.alt = alt || ""; img.loading = "lazy";
    img.onerror = function () { img.remove(); box.insertAdjacentHTML("beforeend", '<div class="ph"><i>HIA</i></div>'); };
    img.src = src || ""; box.appendChild(img); return box;
  };
  function siteSrc(src) { return /^https?:/.test(src) ? src : src; }
  function storagePath(url) {
    var marker = "/storage/v1/object/public/" + BUCKET + "/";
    var i = String(url).indexOf(marker);
    return i >= 0 ? decodeURIComponent(String(url).slice(i + marker.length)) : null;
  }

  /* ---------- parts list ---------- */
  var parts = [];
  function loadParts() {
    var list = $("#parts-list");
    list.innerHTML = '<p class="muted">Loading parts…</p>';
    sb.from("site_parts").select("*").order("sort", { ascending: true }).order("name", { ascending: true }).then(function (r) {
      if (r.error) { list.innerHTML = '<p class="form-msg err">' + esc(friendly(r.error)) + "</p>"; return; }
      parts = r.data || [];
      drawList();
    });
  }
  function priceSummary(p) {
    var opts = p.options || [];
    if (opts.length > 1) {
      var ps = opts.map(function (o) { return Number(o.price); });
      return opts.length + " versions, " + money(Math.min.apply(null, ps)) + "–" + money(Math.max.apply(null, ps));
    }
    if (opts.length === 1) return money(opts[0].price);
    return money(p.price) + (p.was_price ? " (was " + money(p.was_price) + ")" : "");
  }
  function drawList() {
    var list = $("#parts-list");
    list.innerHTML = "";
    if (!parts.length) { list.innerHTML = '<div class="empty-ad">No hard parts yet. Tap <strong>Add a part</strong> to list your first one.</div>'; return; }
    parts.forEach(function (p, i) {
      var row = document.createElement("article");
      row.className = "ad-row";
      row.appendChild(thumb(siteSrc((p.images || [])[0] || ""), p.name));
      row.insertAdjacentHTML("beforeend",
        "<div><h3>" + esc(p.name) + '</h3><div class="meta">' + esc(priceSummary(p)) + ", shipping " + money(p.shipping || 0) + "</div>" +
        '<div class="chips">' + (p.active ? '<span class="chip-s">On site</span>' : '<span class="chip-s off">Hidden</span>') +
        (p.sold_out ? '<span class="chip-s sold">Sold out</span>' : "") + "</div></div>" +
        '<div class="acts">' +
        '<button class="icon-sq" type="button" data-move="-1" data-i="' + i + '" aria-label="Move ' + esc(p.name) + ' up"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button class="icon-sq" type="button" data-move="1" data-i="' + i + '" aria-label="Move ' + esc(p.name) + ' down"' + (i === parts.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button class="btn small" type="button" data-edit="' + i + '">Edit</button></div>');
      list.appendChild(row);
    });
  }
  $("#parts-list").addEventListener("click", function (e) {
    var ed = e.target.closest("[data-edit]"), mv = e.target.closest("[data-move]");
    if (ed) openEditor(parts[+ed.dataset.edit]);
    if (mv && !mv.disabled) move(+mv.dataset.i, +mv.dataset.move);
  });
  function move(i, d) {
    var j = i + d;
    if (j < 0 || j >= parts.length) return;
    var tmp = parts[i]; parts[i] = parts[j]; parts[j] = tmp;
    var updates = [];
    parts.forEach(function (p, k) { var s = (k + 1) * 10; if (p.sort !== s) { p.sort = s; updates.push(p); } });
    drawList();
    Promise.all(updates.map(function (p) { return sb.from("site_parts").update({ sort: p.sort }).eq("id", p.id); })).then(function (rs) {
      var bad = rs.find(function (r) { return r.error; });
      if (bad) { toast(friendly(bad.error)); loadParts(); } else toast("Order saved");
    });
  }

  /* ---------- part editor ---------- */
  var editing = null, photos = [], removed = [], draftFolder = "";
  function slug(name) {
    return String(name).toLowerCase().replace(/["']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "part";
  }
  function modeIs(v) { return document.querySelector('input[name="pf-mode"]:checked').value === v; }
  function setMode(v) {
    document.querySelector('input[name="pf-mode"][value="' + v + '"]').checked = true;
    $("#pf-one").hidden = v !== "one";
    $("#pf-versions").hidden = v !== "versions";
  }
  document.querySelectorAll('input[name="pf-mode"]').forEach(function (r) {
    r.addEventListener("change", function () {
      setMode(r.value);
      if (r.value === "versions") {
        if (!$("#pf-vlist").children.length) { addVersion("", $("#pf-price").value, ""); addVersion("", "", ""); }
        if (!$("#pf-ship2").value) $("#pf-ship2").value = $("#pf-ship").value;
      } else if (!$("#pf-ship").value) $("#pf-ship").value = $("#pf-ship2").value;
    });
  });
  var vCount = 0;
  function addVersion(label, price, ship) {
    vCount++;
    var row = document.createElement("div");
    row.className = "vrow";
    row.innerHTML =
      '<input class="v-label" aria-label="Version name" maxlength="80" placeholder="13&quot; single caliper" value="' + esc(label) + '" id="v-l-' + vCount + '">' +
      '<input class="v-price" aria-label="Version price in dollars" inputmode="decimal" placeholder="Price" value="' + esc(price) + '" id="v-p-' + vCount + '">' +
      '<input class="v-ship" aria-label="Version shipping in dollars, blank for default" inputmode="decimal" placeholder="Default" value="' + esc(ship) + '" id="v-s-' + vCount + '">' +
      '<button class="icon-sq" type="button" data-vrm aria-label="Remove this version">×</button>';
    $("#pf-vlist").appendChild(row);
    return row;
  }
  $("#pf-vadd").addEventListener("click", function () { addVersion("", "", "").querySelector("input").focus(); });
  $("#pf-vlist").addEventListener("click", function (e) { var b = e.target.closest("[data-vrm]"); if (b) b.closest(".vrow").remove(); });

  function drawPhotos() {
    var box = $("#pf-photos");
    box.innerHTML = "";
    photos.forEach(function (src, i) {
      var d = document.createElement("div");
      d.className = "ad-photo";
      d.appendChild(thumb(siteSrc(src), "Photo " + (i + 1)));
      d.insertAdjacentHTML("beforeend", (i === 0 ? '<span class="cover">Main photo</span>' : "") +
        '<div class="row">' + (i > 0 ? '<button type="button" data-cover="' + i + '">Make main</button>' : "") +
        '<button type="button" data-prm="' + i + '">Remove</button></div>');
      box.appendChild(d);
    });
    if (!photos.length) box.innerHTML = '<p class="muted">No photos yet.</p>';
  }
  $("#pf-photos").addEventListener("click", function (e) {
    var c = e.target.closest("[data-cover]"), r = e.target.closest("[data-prm]");
    if (c) { var i = +c.dataset.cover; photos.unshift(photos.splice(i, 1)[0]); drawPhotos(); }
    if (r) { var j = +r.dataset.prm; removed.push(photos[j]); photos.splice(j, 1); drawPhotos(); }
  });

  // Shrinks a phone photo to 1600px wide JPEG before upload.
  function shrink(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b || file); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  $("#pf-files").addEventListener("change", function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    var msg = $("#pf-upmsg");
    setMsg(msg, "Uploading " + files.length + " photo" + (files.length > 1 ? "s" : "") + "…");
    var done = 0, failed = 0;
    files.reduce(function (chain, f) {
      return chain.then(function () {
        return shrink(f).then(function (blob) {
          var type = blob.type || f.type;
          if (["image/jpeg", "image/png", "image/webp"].indexOf(type) < 0) { failed++; return; }
          var ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
          var path = "parts/" + draftFolder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
          return sb.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: "604800", upsert: false }).then(function (r) {
            if (r.error) { failed++; return; }
            photos.push(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
            done++; drawPhotos();
          });
        });
      });
    }, Promise.resolve()).then(function () {
      setMsg(msg, failed ? (done + " added, " + failed + " couldn't upload. Use JPG or PNG photos under 5 MB.") : (done + " photo" + (done > 1 ? "s" : "") + " added. Save the part to keep them."), !!failed);
    });
  });

  function openEditor(p) {
    editing = p || null;
    photos = p ? (p.images || []).slice() : [];
    removed = [];
    draftFolder = p ? p.id : "new-" + Date.now().toString(36);
    $("#pf-title").textContent = p ? "Edit part" : "Add a part";
    $("#pf-name").value = p ? p.name : "";
    $("#pf-desc").value = p ? p.description || "" : "";
    $("#pf-vlist").innerHTML = "";
    var opts = p ? p.options || [] : [];
    if (opts.length) {
      setMode("versions");
      opts.forEach(function (o) { addVersion(o.label, o.price, o.shipping == null ? "" : o.shipping); });
      $("#pf-ship2").value = p.shipping != null ? Number(p.shipping).toFixed(2) : "";
      $("#pf-price").value = ""; $("#pf-was").value = ""; $("#pf-ship").value = "";
    } else {
      setMode("one");
      $("#pf-price").value = p && p.price != null ? Number(p.price).toFixed(2) : "";
      $("#pf-was").value = p && p.was_price != null ? Number(p.was_price).toFixed(2) : "";
      $("#pf-ship").value = p && p.shipping != null ? Number(p.shipping).toFixed(2) : "";
      $("#pf-ship2").value = "";
    }
    $("#pf-active").checked = p ? !!p.active : true;
    $("#pf-sold").checked = p ? !!p.sold_out : false;
    $("#pf-delete").hidden = !p;
    $("#pf-confirm").hidden = true;
    setMsg($("#pf-msg"), ""); setMsg($("#pf-upmsg"), "");
    drawPhotos();
    $("#parts-list-view").hidden = true;
    $("#part-form").hidden = false;
    window.scrollTo(0, 0);
    $("#pf-name").focus();
  }
  function closeEditor() {
    $("#part-form").hidden = true;
    $("#parts-list-view").hidden = false;
  }
  $("#part-new").addEventListener("click", function () { openEditor(null); });
  $("#pf-back").addEventListener("click", closeEditor);
  $("#pf-cancel").addEventListener("click", closeEditor);

  function dollars(v) {
    var s = String(v == null ? "" : v).replace(/[$,\s]/g, "");
    if (s === "") return null;
    var n = Number(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  $("#part-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("#pf-msg");
    var name = $("#pf-name").value.trim();
    if (name.length < 2) { setMsg(msg, "Give the part a name.", true); $("#pf-name").focus(); return; }
    var row = {
      name: name,
      description: $("#pf-desc").value.trim(),
      images: photos,
      active: $("#pf-active").checked,
      sold_out: $("#pf-sold").checked
    };
    if (modeIs("one")) {
      var price = dollars($("#pf-price").value), was = dollars($("#pf-was").value), ship = dollars($("#pf-ship").value);
      if (!(price > 0)) { setMsg(msg, "Enter a price above $0.", true); $("#pf-price").focus(); return; }
      if (was !== null && !(was > 0)) { setMsg(msg, "The was price needs to be a number, or leave it blank.", true); return; }
      if (ship !== null && !(ship >= 0)) { setMsg(msg, "Shipping needs to be a number (0 for free).", true); return; }
      row.price = price; row.was_price = was; row.shipping = ship || 0; row.options = [];
    } else {
      var seen = {}, opts = [], bad = "";
      document.querySelectorAll("#pf-vlist .vrow").forEach(function (r) {
        var label = r.querySelector(".v-label").value.trim(), pr = dollars(r.querySelector(".v-price").value), sh = dollars(r.querySelector(".v-ship").value);
        if (!label && pr === null && sh === null) return; // empty row, skip
        if (!label) { bad = bad || "Every version needs a name."; return; }
        if (!(pr > 0)) { bad = bad || "Give \"" + label + "\" a price above $0."; return; }
        if (sh !== null && !(sh >= 0)) { bad = bad || "Shipping for \"" + label + "\" needs to be a number."; return; }
        if (seen[label.toLowerCase()]) { bad = bad || "Two versions are both called \"" + label + "\". Give each a different name."; return; }
        seen[label.toLowerCase()] = true;
        var o = { label: label, price: pr };
        if (sh !== null) o.shipping = sh;
        opts.push(o);
      });
      if (bad) { setMsg(msg, bad, true); return; }
      if (!opts.length) { setMsg(msg, "Add at least one version with a name and price.", true); return; }
      var ship2 = dollars($("#pf-ship2").value);
      if (ship2 !== null && !(ship2 >= 0)) { setMsg(msg, "Default shipping needs to be a number.", true); return; }
      row.options = opts; row.price = null; row.was_price = null; row.shipping = ship2 || 0;
    }
    var btn = $("#pf-save"); btn.disabled = true; btn.textContent = "Saving…";
    var q;
    if (editing) {
      q = sb.from("site_parts").update(row).eq("id", editing.id).select().single();
    } else {
      var base = slug(name), id = base, n = 2;
      while (parts.some(function (p) { return p.id === id; })) id = base + "-" + n++;
      row.id = id;
      row.sort = (parts.length + 1) * 10;
      q = sb.from("site_parts").insert(row).select().single();
    }
    q.then(function (r) {
      btn.disabled = false; btn.textContent = "Save part";
      if (r.error) { setMsg(msg, friendly(r.error), true); return; }
      cleanup(removed);
      toast(editing ? "Part saved" : "Part added");
      closeEditor();
      loadParts();
    });
  });

  function cleanup(urls) {
    var paths = urls.map(storagePath).filter(Boolean);
    if (paths.length) sb.storage.from(BUCKET).remove(paths);
  }

  $("#pf-delete").addEventListener("click", function () { $("#pf-confirm").hidden = false; $("#pf-confirm-no").focus(); });
  $("#pf-confirm-no").addEventListener("click", function () { $("#pf-confirm").hidden = true; $("#pf-delete").focus(); });
  $("#pf-confirm-yes").addEventListener("click", function () {
    if (!editing) return;
    var id = editing.id, imgs = (editing.images || []).concat(photos, removed);
    sb.from("site_parts").delete().eq("id", id).then(function (r) {
      if (r.error) { setMsg($("#pf-msg"), friendly(r.error), true); return; }
      cleanup(Array.from(new Set(imgs)));
      toast("Part deleted");
      closeEditor();
      loadParts();
    });
  });

  /* ---------- settings ---------- */
  var PAGES = [
    ["merch", "Merch Tent", "Turn off if Printify is having problems. Shirts can't be bought while it's off."],
    ["parts", "Hard Parts", "Parts can't be bought while it's off."],
    ["cad", "CAD & 3D Printing", ""],
    ["builds", "Builds", "All three build pages."],
    ["blog", "Blog", "The blog list and every post."],
    ["guides", "Coyote Swap Guides", ""],
    ["about", "About Us", ""],
    ["team", "Team", ""],
    ["contact", "Contact", ""]
  ];
  var settings = {};
  function loadSettings() {
    sb.from("site_settings").select("key,value").then(function (r) {
      if (r.error) { toast(friendly(r.error)); return; }
      (r.data || []).forEach(function (row) { settings[row.key] = row.value || {}; });
      drawPages(); fillShop();
    });
  }
  function saveSetting(key, value) {
    return sb.from("site_settings").upsert({ key: key, value: value }).then(function (r) {
      if (r.error) throw r.error;
      settings[key] = value;
    });
  }
  function drawPages() {
    var pages = settings.pages || {};
    $("#pages-list").innerHTML = PAGES.map(function (p) {
      var on = pages[p[0]] !== false;
      return '<div class="pg-row"><div><strong>' + esc(p[1]) + "</strong>" + (p[2] ? '<div class="muted">' + esc(p[2]) + "</div>" : "") + "</div>" +
        '<label class="switch"><input type="checkbox" data-page-key="' + p[0] + '" id="pg-' + p[0] + '" aria-label="' + esc(p[1]) + ' page"' + (on ? " checked" : "") + '><span class="sr-label">' + (on ? "On" : "Off") + "</span></label></div>";
    }).join("");
  }
  $("#pages-list").addEventListener("change", function (e) {
    var cb = e.target.closest("[data-page-key]");
    if (!cb) return;
    var next = Object.assign({}, settings.pages || {});
    next[cb.dataset.pageKey] = cb.checked;
    cb.nextElementSibling.textContent = cb.checked ? "On" : "Off";
    saveSetting("pages", next).then(function () {
      toast((PAGES.find(function (p) { return p[0] === cb.dataset.pageKey; }) || [])[1] + (cb.checked ? " is on" : " is off"));
    }).catch(function (err) { cb.checked = !cb.checked; setMsg($("#pages-msg"), friendly(err), true); });
  });

  function fillShop() {
    var sh = settings.shop || {}, bn = settings.banner || {}, ms = settings.shipping || {};
    $("#sh-open").checked = sh.open !== false;
    $("#sh-msg").value = sh.closedMessage || "";
    $("#bn-on").checked = !!bn.on;
    $("#bn-text").value = bn.text || "";
    $("#bn-link").value = bn.link || "";
    $("#ms-flat").value = ms.merchFlat != null ? Number(ms.merchFlat).toFixed(2) : "";
    previewBanner();
  }
  function previewBanner() {
    var p = $("#bn-preview"), t = $("#bn-text").value.trim();
    p.hidden = !t;
    p.innerHTML = "<span>" + esc(t) + "</span>" + ($("#bn-link").value.trim() ? " <a>Learn more</a>" : "");
  }
  $("#bn-text").addEventListener("input", previewBanner);
  $("#bn-link").addEventListener("input", previewBanner);

  $("#shop-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var st = $("#sh-status");
    saveSetting("shop", { open: $("#sh-open").checked, closedMessage: $("#sh-msg").value.trim() || "The shop is closed for a few days. Orders open back up soon." })
      .then(function () { setMsg(st, $("#sh-open").checked ? "Saved. Orders are open." : "Saved. Orders are paused."); })
      .catch(function (err) { setMsg(st, friendly(err), true); });
  });
  $("#banner-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var st = $("#bn-status"), on = $("#bn-on").checked, text = $("#bn-text").value.trim();
    if (on && !text) { setMsg(st, "Add banner text, or turn the banner off.", true); return; }
    saveSetting("banner", { on: on, text: text, link: $("#bn-link").value.trim() })
      .then(function () { setMsg(st, on ? "Saved. The banner is showing." : "Saved. The banner is hidden."); })
      .catch(function (err) { setMsg(st, friendly(err), true); });
  });
  $("#ship-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var st = $("#ms-status"), v = dollars($("#ms-flat").value);
    if (v === null || !(v >= 0)) { setMsg(st, "Enter a shipping amount (0 for free).", true); return; }
    saveSetting("shipping", { merchFlat: v }).then(function () { setMsg(st, "Saved. Merch shipping is " + money(v) + "."); })
      .catch(function (err) { setMsg(st, friendly(err), true); });
  });
  /* ---------- shared with admin-content.js ---------- */
  window.ADM = { sb: sb, BUCKET: BUCKET, $: $, esc: esc, money: money, toast: toast, setMsg: setMsg, friendly: friendly,
    thumb: thumb, shrink: shrink, storagePath: storagePath, cleanup: cleanup, dollars: dollars, slug: slug, selectTab: selectTab };
})();
