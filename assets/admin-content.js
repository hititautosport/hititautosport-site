/* Owner portal: builds, team, page text and business info.
   Saves to the site_content table (Hit It HQ Supabase). Uses helpers shared by admin.js. */
(function () {
  "use strict";
  function start() {
    var A = window.ADM;
    if (!A || start.done) return;
    start.done = true;
    var sb = A.sb, $ = A.$, esc = A.esc;
    var content = {};
    var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    function load() {
      return sb.from("site_content").select("key,value").then(function (r) {
        if (r.error) { A.toast(A.friendly(r.error)); return; }
        (r.data || []).forEach(function (row) { content[row.key] = row.value; });
        drawBuilds(); drawTeam(); fillHome(); fillAbout(); fillCad(); fillGuides(); fillBusiness();
      });
    }
    function save(key, value) {
      return sb.from("site_content").upsert({ key: key, value: value }).then(function (r) {
        if (r.error) throw r.error;
        content[key] = value;
      });
    }
    function lines(t) { return String(t || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }

    /* ---------- photo picker (used by builds, team, CAD) ---------- */
    function Photos(box, input, msg, folder, single) {
      var list = [], removed = [];
      function draw() {
        box.innerHTML = "";
        list.forEach(function (src, i) {
          var d = document.createElement("div");
          d.className = "ad-photo";
          d.appendChild(A.thumb(src, "Photo " + (i + 1)));
          d.insertAdjacentHTML("beforeend", (i === 0 && !single ? '<span class="cover">Main photo</span>' : "") +
            '<div class="row">' + (i > 0 ? '<button type="button" data-cover="' + i + '">Make main</button>' : "") +
            '<button type="button" data-prm="' + i + '">Remove</button></div>');
          box.appendChild(d);
        });
        if (!list.length) box.innerHTML = '<p class="muted">No photo' + (single ? "" : "s") + " yet.</p>";
      }
      box.addEventListener("click", function (e) {
        var c = e.target.closest("[data-cover]"), r = e.target.closest("[data-prm]");
        if (c) { list.unshift(list.splice(+c.dataset.cover, 1)[0]); draw(); }
        if (r) { removed.push(list[+r.dataset.prm]); list.splice(+r.dataset.prm, 1); draw(); }
      });
      input.addEventListener("change", function (e) {
        var files = Array.prototype.slice.call(e.target.files || []);
        e.target.value = "";
        if (!files.length) return;
        if (single) files = files.slice(0, 1);
        A.setMsg(msg, "Uploading " + files.length + " photo" + (files.length > 1 ? "s" : "") + "…");
        var done = 0, failed = 0;
        files.reduce(function (chain, f) {
          return chain.then(function () {
            return A.shrink(f).then(function (blob) {
              var type = blob.type || f.type;
              if (["image/jpeg", "image/png", "image/webp"].indexOf(type) < 0) { failed++; return; }
              var ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
              var path = folder() + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
              return sb.storage.from(A.BUCKET).upload(path, blob, { contentType: type, cacheControl: "604800", upsert: false }).then(function (r) {
                if (r.error) { failed++; return; }
                var url = sb.storage.from(A.BUCKET).getPublicUrl(path).data.publicUrl;
                if (single) { if (list[0]) removed.push(list[0]); list = [url]; } else list.push(url);
                done++; draw();
              });
            });
          });
        }, Promise.resolve()).then(function () {
          A.setMsg(msg, failed ? (done + " added, " + failed + " couldn't upload. Use JPG or PNG photos under 5 MB.") : ((done > 1 ? done + " photos" : "Photo") + " added. Save to keep " + (done > 1 ? "them" : "it") + "."), !!failed);
        });
      });
      return {
        set: function (l) { list = (l || []).slice(); removed = []; A.setMsg(msg, ""); draw(); },
        get: function () { return list.slice(); },
        flushRemoved: function () { var r = removed.filter(function (u) { return list.indexOf(u) < 0; }); removed = []; A.cleanup(r); }
      };
    }

    function moveIn(arr, i, d) {
      var j = i + d;
      if (j < 0 || j >= arr.length) return false;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      return true;
    }
    function listRow(thumbSrc, title, meta, chips, i, n, kind) {
      var row = document.createElement("article");
      row.className = "ad-row";
      row.appendChild(A.thumb(thumbSrc || "", title));
      row.insertAdjacentHTML("beforeend",
        "<div><h3>" + esc(title) + '</h3><div class="meta">' + esc(meta) + "</div>" + (chips ? '<div class="chips">' + chips + "</div>" : "") + "</div>" +
        '<div class="acts">' +
        '<button class="icon-sq" type="button" data-' + kind + '-move="-1" data-i="' + i + '" aria-label="Move ' + esc(title) + ' up"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button class="icon-sq" type="button" data-' + kind + '-move="1" data-i="' + i + '" aria-label="Move ' + esc(title) + ' down"' + (i === n - 1 ? " disabled" : "") + ">↓</button>" +
        '<button class="btn small" type="button" data-' + kind + '-edit="' + i + '">Edit</button></div>');
      return row;
    }

    /* ---------- builds ---------- */
    var buildsArr = function () { return content.builds || []; };
    function drawBuilds() {
      var box = $("#builds-list"), arr = buildsArr();
      box.innerHTML = "";
      if (!arr.length) { box.innerHTML = '<div class="empty-ad">No builds yet. Tap <strong>Add a build</strong> to post your first car.</div>'; return; }
      arr.forEach(function (b, i) {
        box.appendChild(listRow((b.photos || [])[0], b.name, (b.photos || []).length + " photos, " + (b.specs || []).length + " specs",
          b.active === false ? '<span class="chip-s off">Hidden</span>' : '<span class="chip-s">On site</span>', i, arr.length, "build"));
      });
    }
    $("#builds-list").addEventListener("click", function (e) {
      var ed = e.target.closest("[data-build-edit]"), mv = e.target.closest("[data-build-move]");
      if (ed) openBuild(+ed.dataset.buildEdit);
      if (mv && !mv.disabled) {
        var arr = buildsArr().slice();
        if (moveIn(arr, +mv.dataset.i, +mv.dataset.buildMove)) save("builds", arr).then(function () { drawBuilds(); A.toast("Order saved"); }).catch(function (err) { A.toast(A.friendly(err)); });
      }
    });
    var bIndex = -1, bSlug = "";
    var bPhotos = Photos($("#bf-photos"), $("#bf-files"), $("#bf-upmsg"), function () { return "builds/" + (bSlug || "new"); });
    function specRow(label, val) {
      var r = document.createElement("div");
      r.className = "vrow two";
      r.innerHTML = '<input class="s-label" aria-label="Spec item" maxlength="60" placeholder="Item" value="' + esc(label) + '">' +
        '<input class="s-val" aria-label="Spec details" maxlength="200" placeholder="Details" value="' + esc(val) + '">' +
        '<button class="icon-sq" type="button" data-srm aria-label="Remove this spec">×</button>';
      $("#bf-specs").appendChild(r);
      return r;
    }
    $("#bf-spec-add").addEventListener("click", function () { specRow("", "").querySelector("input").focus(); });
    $("#bf-specs").addEventListener("click", function (e) { var b = e.target.closest("[data-srm]"); if (b) b.closest(".vrow").remove(); });
    function openBuild(i) {
      bIndex = i;
      var b = i >= 0 ? buildsArr()[i] : null;
      bSlug = b ? b.slug : "new-" + Date.now().toString(36);
      $("#bf-title").textContent = b ? "Edit build" : "Add a build";
      $("#bf-name").value = b ? b.name : "";
      $("#bf-blurb").value = b ? b.blurb || "" : "";
      $("#bf-specs").innerHTML = "";
      (b ? b.specs || [] : []).forEach(function (s) { specRow(s[0], s[1]); });
      if (!b) { specRow("Engine", ""); specRow("Transmission", ""); }
      bPhotos.set(b ? b.photos : []);
      $("#bf-active").checked = b ? b.active !== false : true;
      $("#bf-delete").hidden = !b;
      $("#bf-confirm").hidden = true;
      A.setMsg($("#bf-msg"), "");
      $("#builds-list-view").hidden = true;
      $("#build-form").hidden = false;
      window.scrollTo(0, 0);
      $("#bf-name").focus();
    }
    function closeBuild() { $("#build-form").hidden = true; $("#builds-list-view").hidden = false; }
    $("#build-new").addEventListener("click", function () { openBuild(-1); });
    $("#bf-back").addEventListener("click", closeBuild);
    $("#bf-cancel").addEventListener("click", closeBuild);
    $("#build-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("#bf-msg"), name = $("#bf-name").value.trim();
      if (name.length < 2) { A.setMsg(msg, "Give the build a name.", true); $("#bf-name").focus(); return; }
      var specs = [];
      document.querySelectorAll("#bf-specs .vrow").forEach(function (r) {
        var k = r.querySelector(".s-label").value.trim(), v = r.querySelector(".s-val").value.trim();
        if (v) specs.push([k, v]);
      });
      var arr = buildsArr().slice();
      var existing = bIndex >= 0 ? arr[bIndex] : null;
      var slug = existing ? existing.slug : A.slug(name);
      if (!existing) { var base = slug, n = 2; while (arr.some(function (x) { return x.slug === slug; })) slug = base + "-" + n++; }
      var item = { slug: slug, name: name, blurb: $("#bf-blurb").value.trim(), specs: specs, photos: bPhotos.get(), active: $("#bf-active").checked };
      if (existing) arr[bIndex] = item; else arr.push(item);
      var btn = $("#bf-save"); btn.disabled = true;
      save("builds", arr).then(function () {
        bPhotos.flushRemoved();
        A.toast(existing ? "Build saved" : "Build added");
        closeBuild(); drawBuilds();
      }).catch(function (err) { A.setMsg(msg, A.friendly(err), true); }).then(function () { btn.disabled = false; });
    });
    $("#bf-delete").addEventListener("click", function () { $("#bf-confirm").hidden = false; $("#bf-confirm-no").focus(); });
    $("#bf-confirm-no").addEventListener("click", function () { $("#bf-confirm").hidden = true; });
    $("#bf-confirm-yes").addEventListener("click", function () {
      var arr = buildsArr().slice(), gone = arr.splice(bIndex, 1)[0];
      save("builds", arr).then(function () {
        A.cleanup((gone.photos || []).concat(bPhotos.get()));
        A.toast("Build deleted"); closeBuild(); drawBuilds();
      }).catch(function (err) { A.setMsg($("#bf-msg"), A.friendly(err), true); });
    });

    /* ---------- team ---------- */
    var teamArr = function () { return content.team || []; };
    function drawTeam() {
      var box = $("#team-admin-list"), arr = teamArr();
      box.innerHTML = "";
      if (!arr.length) { box.innerHTML = '<div class="empty-ad">No one on the Team page yet.</div>'; return; }
      arr.forEach(function (m, i) { box.appendChild(listRow(m.photo, m.name, m.role || "", "", i, arr.length, "member")); });
    }
    $("#team-admin-list").addEventListener("click", function (e) {
      var ed = e.target.closest("[data-member-edit]"), mv = e.target.closest("[data-member-move]");
      if (ed) openMember(+ed.dataset.memberEdit);
      if (mv && !mv.disabled) {
        var arr = teamArr().slice();
        if (moveIn(arr, +mv.dataset.i, +mv.dataset.memberMove)) save("team", arr).then(function () { drawTeam(); A.toast("Order saved"); }).catch(function (err) { A.toast(A.friendly(err)); });
      }
    });
    var mIndex = -1;
    var mPhoto = Photos($("#mf-photos"), $("#mf-files"), $("#mf-upmsg"), function () { return "team"; }, true);
    function openMember(i) {
      mIndex = i;
      var m = i >= 0 ? teamArr()[i] : null;
      $("#mf-title").textContent = m ? "Edit " + m.name : "Add a person";
      $("#mf-name").value = m ? m.name : "";
      $("#mf-role").value = m ? m.role || "" : "";
      $("#mf-bio").value = m ? m.bio || "" : "";
      $("#mf-creds").value = m ? (m.creds || []).join("\n") : "";
      mPhoto.set(m && m.photo ? [m.photo] : []);
      $("#mf-delete").hidden = !m;
      $("#mf-confirm").hidden = true;
      A.setMsg($("#mf-msg"), "");
      $("#team-list-view").hidden = true;
      $("#member-form").hidden = false;
      window.scrollTo(0, 0);
      $("#mf-name").focus();
    }
    function closeMember() { $("#member-form").hidden = true; $("#team-list-view").hidden = false; }
    $("#member-new").addEventListener("click", function () { openMember(-1); });
    $("#mf-back").addEventListener("click", closeMember);
    $("#mf-cancel").addEventListener("click", closeMember);
    $("#member-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("#mf-msg"), name = $("#mf-name").value.trim();
      if (name.length < 2) { A.setMsg(msg, "Add the person's name.", true); $("#mf-name").focus(); return; }
      var arr = teamArr().slice();
      var item = { name: name, role: $("#mf-role").value.trim(), bio: $("#mf-bio").value.trim(), creds: lines($("#mf-creds").value), photo: mPhoto.get()[0] || "" };
      if (mIndex >= 0) arr[mIndex] = item; else arr.push(item);
      save("team", arr).then(function () {
        mPhoto.flushRemoved();
        A.toast(mIndex >= 0 ? "Saved" : "Added to the team"); closeMember(); drawTeam();
      }).catch(function (err) { A.setMsg(msg, A.friendly(err), true); });
    });
    $("#mf-delete").addEventListener("click", function () { $("#mf-confirm").hidden = false; $("#mf-confirm-no").focus(); });
    $("#mf-confirm-no").addEventListener("click", function () { $("#mf-confirm").hidden = true; });
    $("#mf-confirm-yes").addEventListener("click", function () {
      var arr = teamArr().slice(), gone = arr.splice(mIndex, 1)[0];
      save("team", arr).then(function () {
        A.cleanup([gone.photo].concat(mPhoto.get()).filter(Boolean));
        A.toast("Removed"); closeMember(); drawTeam();
      }).catch(function (err) { A.setMsg($("#mf-msg"), A.friendly(err), true); });
    });

    /* ---------- page text ---------- */
    function fillHome() { var h = content.home || {}; $("#hm-tagline").value = h.tagline || ""; $("#hm-headline").value = h.headline || ""; $("#hm-lede").value = h.lede || ""; }
    $("#home-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("#hm-status"), v = { tagline: $("#hm-tagline").value.trim(), headline: $("#hm-headline").value.trim(), lede: $("#hm-lede").value.trim() };
      if (!v.headline) { A.setMsg(st, "The home page needs a headline.", true); return; }
      save("home", v).then(function () { A.setMsg(st, "Saved."); }).catch(function (err) { A.setMsg(st, A.friendly(err), true); });
    });
    function fillAbout() { $("#ab-body").value = (content.about || {}).body || ""; }
    $("#about-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("#ab-status"), body = $("#ab-body").value.trim();
      if (!body) { A.setMsg(st, "Add some text, or turn the About Us page off on this tab.", true); return; }
      save("about", { body: body }).then(function () { A.setMsg(st, "Saved."); }).catch(function (err) { A.setMsg(st, A.friendly(err), true); });
    });
    var cPhotos = Photos($("#cd-photos"), $("#cd-files"), $("#cd-upmsg"), function () { return "cad"; });
    function fillCad() {
      var c = content.cad || {};
      $("#cd-intro").value = c.intro || ""; $("#cd-rate").value = c.rate || ""; $("#cd-rate-note").value = c.rateNote || "";
      $("#cd-services").value = (c.services || []).join("\n");
      cPhotos.set(c.photos || []);
    }
    $("#cad-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("#cd-status");
      var v = { intro: $("#cd-intro").value.trim(), rate: $("#cd-rate").value.trim(), rateNote: $("#cd-rate-note").value.trim(), services: lines($("#cd-services").value), photos: cPhotos.get() };
      save("cad", v).then(function () { cPhotos.flushRemoved(); A.setMsg(st, "Saved."); }).catch(function (err) { A.setMsg(st, A.friendly(err), true); });
    });

    function guideRow(g) {
      var d = document.createElement("div");
      d.className = "guide-edit";
      d.innerHTML = '<div class="top"><input class="g-gen" aria-label="Label, like Gen 1" maxlength="20" placeholder="Gen 1" value="' + esc(g.gen) + '">' +
        '<input class="g-title" aria-label="Guide title" maxlength="100" placeholder="Coyote Wiring Guide" value="' + esc(g.title) + '">' +
        '<div class="tools"><button class="icon-sq" type="button" data-gup aria-label="Move up">↑</button><button class="icon-sq" type="button" data-gdown aria-label="Move down">↓</button><button class="icon-sq" type="button" data-grm aria-label="Remove this guide">×</button></div></div>' +
        '<textarea class="g-body" aria-label="Guide description" rows="2" maxlength="600" placeholder="What the guide covers">' + esc(g.body) + "</textarea>" +
        '<input class="g-url" aria-label="Link to the guide" type="url" maxlength="500" placeholder="Link (Google Sheet, PDF…), blank = In progress" value="' + esc(g.url) + '">';
      $("#gd-list").appendChild(d);
      return d;
    }
    function fillGuides() { $("#gd-list").innerHTML = ""; (content.guides || []).forEach(guideRow); }
    $("#gd-add").addEventListener("click", function () { guideRow({}).querySelector("input").focus(); });
    $("#gd-list").addEventListener("click", function (e) {
      var row = e.target.closest(".guide-edit");
      if (!row) return;
      if (e.target.closest("[data-grm]")) row.remove();
      if (e.target.closest("[data-gup]") && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
      if (e.target.closest("[data-gdown]") && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    });
    $("#guides-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("#gd-status"), out = [], bad = "";
      document.querySelectorAll("#gd-list .guide-edit").forEach(function (r) {
        var g = { gen: r.querySelector(".g-gen").value.trim(), title: r.querySelector(".g-title").value.trim(), body: r.querySelector(".g-body").value.trim(), url: r.querySelector(".g-url").value.trim() };
        if (!g.gen && !g.title && !g.body && !g.url) return;
        if (!g.title) { bad = bad || "Every guide needs a title."; return; }
        if (g.url && !/^https?:\/\//i.test(g.url)) { bad = bad || "Links need to start with https://"; return; }
        out.push(g);
      });
      if (bad) { A.setMsg(st, bad, true); return; }
      save("guides", out).then(function () { A.setMsg(st, "Saved."); }).catch(function (err) { A.setMsg(st, A.friendly(err), true); });
    });

    /* ---------- business ---------- */
    function fillBusiness() {
      var b = content.business || {}, hours = {};
      (b.hours || []).forEach(function (h) { hours[h[0]] = h[1]; });
      $("#bz-phone").value = b.phoneDisplay || ""; $("#bz-email").value = b.email || ""; $("#bz-city").value = b.city || "";
      $("#bz-hours").innerHTML = DAYS.map(function (d) {
        var v = hours[d] && !/^closed$/i.test(hours[d]) ? hours[d] : "";
        return '<label for="bz-h-' + d + '">' + d + '</label><input id="bz-h-' + d + '" maxlength="60" placeholder="Closed" value="' + esc(v) + '">';
      }).join("");
      var s = b.socials || {};
      $("#bz-ig").value = s.instagram || ""; $("#bz-tt").value = s.tiktok || ""; $("#bz-fb").value = s.facebook || "";
      $("#bz-form").value = b.formAccessKey || "";
    }
    $("#biz-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("#bz-status");
      var phone = $("#bz-phone").value.trim(), email = $("#bz-email").value.trim();
      if (phone && phone.replace(/\D/g, "").length < 10) { A.setMsg(st, "Enter the full phone number with area code.", true); return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { A.setMsg(st, "That email doesn't look complete.", true); return; }
      var socials = { instagram: $("#bz-ig").value.trim(), tiktok: $("#bz-tt").value.trim(), facebook: $("#bz-fb").value.trim() };
      var badLink = Object.keys(socials).find(function (k) { return socials[k] && !/^https?:\/\//i.test(socials[k]); });
      if (badLink) { A.setMsg(st, "Social links need to start with https://", true); return; }
      var v = {
        phoneDisplay: phone, email: email, city: $("#bz-city").value.trim(),
        hours: DAYS.map(function (d) { return [d, $("#bz-h-" + d).value.trim() || "Closed"]; }),
        socials: socials, formAccessKey: $("#bz-form").value.trim()
      };
      save("business", v).then(function () { A.setMsg(st, "Saved. The menu, footer and Contact page update within a minute."); }).catch(function (err) { A.setMsg(st, A.friendly(err), true); });
    });

    load();
  }
  if (window.ADM && window.ADM.ready) start();
  document.addEventListener("adm:ready", start);
})();
