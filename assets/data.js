/* =====================================================================
   HIT IT AUTOSPORT — SITE CONTENT
   This is the one file to edit for day-to-day changes:
   logo, blog list and the backup merch list.
   Everything else (hours, phone, builds, team, page text, hard parts) is edited in /admin.
   Save, then re-upload the folder to Cloudflare (or push to GitHub).
   ===================================================================== */
window.HIA = {

  settings: {
    // Free contact-form delivery from web3forms.com (enter your email there, paste the key here).
    // Leave blank and the form opens the visitor's email app instead.
    formAccessKey: "",

    // Owner admin (/admin) and live settings live in your Hit It HQ Supabase project.
    // This key is a public "publishable" key: anyone can read, only your login can change things.
    supabaseUrl: "https://fwikgcxmdibizkconcok.supabase.co",
    supabaseKey: "sb_publishable_6SQxrwoYjR0RLzQ6x_KpRw_8TScfGpU",

    // Backup copy only. Change phone, email, hours and socials in /admin > Business.
    email: "hititautosport@gmail.com",
    phone: "3364101861",
    phoneDisplay: "(336) 410-1861",
    city: "Thomasville, NC",
    hours: [
      ["Mon", "Closed"],
      ["Tue", "5:30 pm – 9:00 pm"],
      ["Wed", "5:30 pm – 9:00 pm"],
      ["Thu", "5:30 pm – 9:00 pm"],
      ["Fri", "5:30 pm – 9:00 pm"],
      ["Sat", "7:00 am – 5:30 pm"],
      ["Sun", "Closed"]
    ],
    socials: {
      instagram: "https://instagram.com/hit_it_autosport",
      tiktok: "https://www.tiktok.com/@hit_it_autosport",
      facebook: "https://www.facebook.com/hititautosport/"
    },
    // Logo in the menu and phone top bar.
    logo: "images/logo-badge-sm.png"
  },

  /* ---------- MERCH TENT backup list ----------
     Once Printify is connected, the Merch Tent loads designs, photos, sizes, colors and
     prices straight from your Printify API store, and this list is ignored.
     It's only shown when Printify isn't connected yet (like in the preview). */
  merch: [
    { name: "F100 H.I.A.", price: 19.53, from: true, type: "shirt", image: "images/merch/f100-hia.jpg", url: "" },
    { name: "HIA Orange Hex", price: 25.41, from: true, type: "shirt", image: "images/merch/hia-orange-hex.jpg", url: "" },
    { name: "Vintage H.I.A. F100", price: 20.83, from: true, type: "shirt", image: "images/merch/vintage-hia-f100.jpg", url: "" },
    { name: "H.I.A. Cyberpunk", price: 25.41, from: true, type: "shirt", image: "images/merch/hia-cyberpunk.jpg", url: "" },
    { name: "H.I.A. Drift100", price: 20.83, from: true, type: "shirt", image: "images/merch/hia-drift100.jpg", url: "" },
    { name: "H.I.A. Fox Mountain", price: 22.31, from: true, type: "shirt", image: "images/merch/hia-fox-mountain.jpg", url: "" },
    { name: "La Troca H.I.A. Fitted Shirt", price: 25.41, from: true, type: "shirt", image: "images/merch/la-troca-hia.jpg", url: "" },
    { name: "H.I.A. Fall Mountains Drift100", price: 23.85, from: true, type: "shirt", image: "images/merch/fall-mountains-drift100.jpg", url: "" },
    { name: "Fall Drift100 Sweatshirt", price: 24.40, from: true, type: "sweatshirt", image: "images/merch/fall-drift100-sweatshirt.jpg", url: "" },
    { name: "Offroad “Tourie” Shirt", price: 22.70, from: true, type: "shirt", image: "images/merch/offroad-tourie.jpg", url: "" },
    { name: "Ride Vintage Vibes 1950 Truck Shirt", price: 24.21, from: true, type: "shirt", image: "images/merch/1950-truck.jpg", url: "" },
    { name: "#44 “Purpdrank” Sweatshirt", price: 32.53, from: true, type: "sweatshirt", image: "images/merch/44-purpdrank-sweatshirt.jpg", url: "" },
    { name: "#44 “Purpdrank” Shirt", price: 25.00, from: false, type: "shirt", image: "images/merch/44-purpdrank-shirt.jpg", url: "" },
    { name: "H.I.A. “Timmie” Ranger Shirt", price: 22.70, from: true, type: "shirt", image: "images/merch/timmie-ranger-shirt.jpg", url: "" },
    { name: "Vintage Style Ranger H.I.A. “Timmie” Shirt", price: 24.21, from: true, type: "shirt", image: "images/merch/vintage-timmie-shirt.jpg", url: "" },
    { name: "H.I.A. “Timmie” Ranger Sweatshirt", price: 32.53, from: true, type: "sweatshirt", image: "images/merch/timmie-ranger-sweatshirt.jpg", url: "" },
    { name: "Purple Hex H.I.A. Logo", price: 22.70, from: true, type: "shirt", image: "images/merch/purple-hex.jpg", url: "" },
    { name: "Women’s Long Sleeve Fall Drift100", price: 25.00, from: false, type: "long sleeve", image: "images/merch/womens-ls-fall-drift100.jpg", url: "" }
  ],




  /* ---------- BLOG ----------
     Newest first. Each post is its own page named blog-<slug>.html.
     To add one: copy the newest blog-*.html file, change the words, then add a line here. */
  blog: [
    {
      slug: "ron-sutton-steering-rack",
      title: "Testing Ron Sutton Race Technology's New Mustang Power Rack",
      date: "2026-10-16",
      summary: "A new power rack for 1974–2004 Mustangs with your pick of ratio and torsion bar. We're testing it on several cars for lighter parking-lot steering on 315s and a quicker ratio for tight autocross elements.",
      tags: ["Steering", "Autocross", "Fox body", "SN95", "Ron Sutton Race Technology"],
      image: "images/blog/ron-sutton-rack.jpg"
    }
  ]
};
