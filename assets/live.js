/* Loads the settings you change in /admin: which pages are on, shop open/closed,
   the banner, merch shipping and the hard parts list.
   Uses the last copy saved in this browser right away, then refreshes from the server. */
(function () {
  "use strict";
  var H = window.HIA = window.HIA || {};
  var KEY = "hia-live-v1";
  var DEFAULTS = {
    settings: {
      pages: { merch: true, parts: true, cad: true, builds: true, guides: true, blog: true, about: true, team: true, contact: true },
      shop: { open: true, closedMessage: "" },
      banner: { on: false, text: "", link: "" },
      shipping: { merchFlat: 6 }
    },
    parts: null
  };
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  H.live = cached && cached.settings ? cached : DEFAULTS;
  H.liveFresh = false;

  function fromFile() {
    return fetch("assets/catalog.json").then(function (r) { return r.json(); }).then(function (cat) {
      return { settings: DEFAULTS.settings, content: {}, parts: (cat.parts || []).map(function (p) { return Object.assign({ images: p.image ? [p.image] : [], soldOut: false }, p); }), source: "file" };
    });
  }

  H.liveReady = fetch("/api/site", { headers: { Accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (d) { if (!d || !d.settings) throw new Error(); return d; })
    .catch(fromFile)
    .then(function (d) {
      var before = JSON.stringify([H.live.settings, H.live.content || {}]);
      H.live = d;
      H.liveFresh = true;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
      document.dispatchEvent(new CustomEvent("hia:live", { detail: { changed: before !== JSON.stringify([d.settings, d.content || {}]) } }));
      return d;
    })
    .catch(function () { return H.live; });

  // Everything editable in /admin: live copy when we have it, the built-in backup otherwise.
  H.C = function (key) {
    var live = H.live && H.live.content && H.live.content[key];
    if (live !== undefined && live !== null) return live;
    return H.content ? H.content[key] : undefined;
  };

  H.pageOn = function (key) {
    var p = (H.live.settings && H.live.settings.pages) || {};
    return !key || p[key] !== false;
  };
})();
