/* ============================================================================
   VOLTECHARGED — SHOP CORE  (assets/vc-shop.js)
   Shared by index.html, blender.html, soft-serve.html and coffee.html.

   Single source of truth for: products, colourways, Shopify variant IDs,
   the cart drawer, and the Shopify checkout permalink.

   ---------------------------------------------------------------------------
   HOW TO ADD ANOTHER PRODUCT (product #3, the portable capsule coffee maker,
   is DONE — see PRODUCTS.coffeeMaker below) --------------------------------
   1. Add one entry to PRODUCTS below:
        newProduct: {
          id:'newProduct', title:'Thing Maker',
          handle:'thing-maker',                // the Shopify product handle
          page:'thing.html',                   // its own product page
          price:49.99, compareAt:65.99,
          sizes:[{id:'one', label:'One size'}],
          colorways:[
            { key:'tm-cream', name:'Cream', img:'<image url or assets path>',
              panel:'#f7f1e6', variants:{ one:'<SHOPIFY VARIANT ID>' } }
          ]
        }
   2. Add the colourway key to the product page's swatch list, and build the
      page with tools/build-pdp.py (add it to that file's SPECS).
   3. Add a card to the landing page (index.html) — copy the
      `<!-- PRODUCT CARD : capsule coffee maker (product #3) -->` block (and its
      `cf*` IIFE) and change the section id, the element ids, product/page/labels.
   Nothing else: the cart, the drawer, the permalink and the fail-loud
   validation below all read from PRODUCTS.

   ⚠️ HARD RULE — NEW PRODUCTS MUST BE PUBLISHED TO THE ONLINE STORE CHANNEL.
   A variant that exists but is not published to "Online Store" makes
   /cart/{variant}:{qty} land on "something went wrong" instead of checkout.
   In Shopify admin: Products → <product> → Publishing → Online Store ✓
   (+ autoPublish=true on the Online Store publication so new products inherit it).
   Check with:  curl -sI 'https://<store>/cart/<variantId>:1' | head -1   → 200/302

   ⚠️ AND IN THE REST ADMIN API `published_at: null` UN-PUBLISHES THE PRODUCT.
   Product #3 published cleanly to Online Store — status active, `publish:
   {'userErrors': []}` — and every /cart/<variant>:1 still returned **410 Gone**,
   because the script then sent
       PUT /products/{id}.json { "status": "active", "published_at": null }
   which silently removed it from the channel again (only Point of Sale stayed
   published). So: activate the status FIRST, publish to the channel LAST, then
   assert `resourcePublicationsV2` really lists Online Store. Re-publishing with
   `publishablePublish` for gid://shopify/Publication/314115555642 fixed it.
   Never send published_at:null after publishing.

   ⚠️ VARIANTS ARE KEYED EXPLICITLY, PER PRODUCT, PER COLOURWAY, PER SIZE.
   variantId(key, size) NEVER falls back to another product or size: an unknown
   key/size returns null, warns on the console, and the caller refuses the add
   (visible toast, disabled button) so a wrong item can never be sold silently.
============================================================================ */
window.VC = (function () {
  'use strict';

  var SHOPIFY_DOMAIN = 'ehh05e-7q.myshopify.com';

  /* ---- products ---------------------------------------------------------- */
  var CDN = 'https://cdn.shopify.com/s/files/1/1010/2482/5658/files/';

  var PRODUCTS = {
    blender: {
      id: 'blender',
      title: 'Portable Blender',
      handle: 'portable-electric-juice-blender-cup',
      page: 'blender.html',
      price: 49.99,
      compareAt: 69.99,
      sizes: [{ id: '380', label: '380ml' }, { id: '420', label: '420ml' }],
      colorways: [
        { key: 'pink', name: 'Blush Pink', img: 'assets/blender-pink.png', panel: '#fbe6ec',
          variants: { '380': '53762550366522', '420': '53762550399290' } },
        { key: 'white', name: 'Porcelain White', img: 'assets/blender-white.png', panel: '#f2ede4',
          variants: { '380': '53762550432058', '420': '53762550464826' } },
        { key: 'green', name: 'Forest Green', img: 'assets/blender-green.png', panel: '#e3ece5',
          variants: { '380': '53762550497594', '420': '53762550530362' } }
      ]
    },

    softServe: {
      id: 'softServe',
      title: 'Soft Serve Maker',
      handle: 'countertop-soft-serve-maker',
      page: 'soft-serve.html',
      price: 49.99,
      compareAt: 65.99,
      sizes: [{ id: 'one', label: 'One size' }],
      colorways: [
        { key: 'ss-peach', name: 'Peach', img: CDN + 'e98aa9f03c3ff8d216213aa94b43421c.jpg?v=1789657824', panel: '#fbeaf3',
          variants: { one: '54081497465146' } },
        { key: 'ss-lightblue', name: 'Light Blue', img: CDN + '07a77eddd8bc720541b796fab2868649.jpg?v=1789657825', panel: '#e6f0ee',
          variants: { one: '54081497497914' } },
        { key: 'ss-pink', name: 'Pink', img: CDN + '9c735dbe5cfa7e92df466fd48ba8f0cb_d1d0eb90-9582-42aa-b056-5cd29989565c.jpg?v=1789657827', panel: '#fbe6ec',
          variants: { one: '54081497530682' } },
        { key: 'ss-skyblue', name: 'Sky Blue', img: CDN + '29addd380dd047407dda2a126946e68d_43a79067-7910-41d2-beec-df0dd8bbe4f6.jpg?v=1789657829', panel: '#e2f1f4',
          variants: { one: '54081497563450' } }
      ]
    },

    /* Product #3 — sourced from the supplier listing (SPU SUHOASA00487), hero is
       the Coffee Extractor + Bracket Stand + 5.1 cm powder bowl KIT in five
       colourways. Shopify product 10444968100154 / handle `capsule-coffee-maker`,
       published to the Online Store channel (verified 302 on /cart/<id>:1).
       Kit SKUs AI/AJ/AK/AL/AM. Images are the 8 generated shots in assets/. */
    coffeeMaker: {
      id: 'coffeeMaker',
      title: 'Capsule Coffee Maker',
      handle: 'capsule-coffee-maker',
      page: 'coffee.html',
      price: 49.99,
      compareAt: 65.99,
      sizes: [{ id: 'one', label: 'One size' }],
      colorways: [
        { key: 'cm-white', name: 'Porcelain White', img: 'assets/coffee-hero-white.jpg', panel: '#f4f1ec',
          variants: { one: '54083967385914' } },
        { key: 'cm-green', name: 'Sage Green', img: 'assets/coffee-hero-green.jpg', panel: '#eaf0e8',
          variants: { one: '54083967418682' } },
        { key: 'cm-silver', name: 'Brushed Silver', img: 'assets/coffee-hero-silver.jpg', panel: '#eceef1',
          variants: { one: '54083967451450' } },
        { key: 'cm-black', name: 'Matte Black', img: 'assets/coffee-hero-black.jpg', panel: '#e9e9ec',
          variants: { one: '54083967484218' } },
        { key: 'cm-purple', name: 'Deep Purple', img: 'assets/coffee-hero-purple.jpg', panel: '#efe9f5',
          variants: { one: '54083967516986' } }
      ]
    }
  };

  /* ---- derived lookups (flat colour key → colourway / variant) ----------- */
  var ITEMS = {};     // 'pink' → {key,name,img,panel,product,productTitle,title,price,variants}
  var VARIANTS = {};  // 'pink' → {'380':'537…','420':'537…'}   (legacy read-only shape)
  var BY_ID = {};     // Shopify product id → product

  Object.keys(PRODUCTS).forEach(function (pid) {
    var p = PRODUCTS[pid];
    BY_ID[pid] = p;
    p.colorways.forEach(function (c) {
      if (ITEMS[c.key]) console.warn('[voltecharged] duplicate colourway key "' + c.key + '" — the second one wins');
      c.product = p.id;
      c.productTitle = p.title;
      c.title = p.title + ' — ' + c.name;
      c.page = p.page;
      c.price = p.price;
      ITEMS[c.key] = c;
      VARIANTS[c.key] = c.variants;
    });
  });

  function productOf(key) {
    var it = ITEMS[key];
    return it ? PRODUCTS[it.product] : null;
  }

  /* ---- fail-loud variant resolution -------------------------------------- */
  var _warned = {};
  function refuse(key, size) {
    var msg = '[voltecharged] no variant for product key "' + key + '" size "' + size +
              '" — refusing the add-to-bag so the wrong item is never sold.';
    if (!_warned[key + '|' + size]) { _warned[key + '|' + size] = 1; console.warn(msg); }
    toast('That option isn\u2019t available yet \u2014 nothing was added.');
    return null;
  }

  /* Returns the Shopify variant id, or null when the key/size is unknown.
     There is deliberately NO fallback to another colourway or size. */
  function variantId(key, size) {
    var it = ITEMS[key];
    if (!it) return refuse(key, size);
    var id = it.variants && it.variants[size];
    if (!id) return refuse(key, size);
    return String(id);
  }

  function priceOf(key) {
    var it = ITEMS[key];
    return it ? it.price : null;
  }

  function sizeLabel(key, size) {
    var p = productOf(key);
    if (!p) return size;
    for (var i = 0; i < p.sizes.length; i++) if (p.sizes[i].id === size) return p.sizes[i].label;
    return size;
  }

  /* ---- tiny toast (built from JS so the landing markup stays untouched) --- */
  function toast(msg) {
    var el = document.getElementById('vcToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vcToast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;z-index:400;max-width:min(92vw,430px);' +
        'padding:14px 20px;border-radius:16px;background:#3d2c32;color:#fdf6f8;' +
        'font:600 13px/1.5 "DM Sans",system-ui,sans-serif;text-align:center;' +
        'box-shadow:0 18px 44px rgba(61,44,50,.34);opacity:0;pointer-events:none;' +
        'transform:translateX(-50%) translateY(14px);' +
        'transition:opacity .28s ease,transform .28s cubic-bezier(.16,1,.3,1)';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(14px)';
    }, 3600);
  }

  /* ---- cart ------------------------------------------------------------- */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem('vc_cart') || '[]'); } catch (e) { cart = []; }
  cart = Array.isArray(cart)
    ? cart.filter(function (i) {
        return i && ITEMS[i.key] && ITEMS[i.key].variants[i.size] && i.qty > 0;
      })
    : [];

  var elDrawer, elOverlay, elItems, elCount, elSubtotal, elFoot, elCheckout, elSubLabel;
  var lenisRef = null;

  function saveCart() { try { localStorage.setItem('vc_cart', JSON.stringify(cart)); } catch (e) {} }
  function money(n) { return '$' + Number(n).toFixed(2); }

  function addToCart(key, size, qty) {
    var vid = variantId(key, size);
    if (!vid) return false;               // fail loud, add nothing
    var q = Math.max(1, Math.min(9, parseInt(qty, 10) || 1));
    var found = cart.filter(function (i) { return i.key === key && i.size === size; })[0];
    if (found) found.qty = Math.min(9, found.qty + q);
    else cart.push({ key: key, size: size, qty: q });
    saveCart();
    renderCart();
    openCart();
    return true;
  }

  function clearCart() {
    cart.length = 0;
    saveCart();
    renderCart();
  }

  function renderCart() {
    if (!elItems) return;
    var count = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var subtotal = cart.reduce(function (s, i) { return s + i.qty * (priceOf(i.key) || 0); }, 0);
    elCount.textContent = count ? '(' + count + ')' : '';
    elSubtotal.textContent = money(subtotal);
    if (elSubLabel) elSubLabel.textContent = count ? 'Checkout — ' + money(subtotal) : 'Checkout';
    if (elFoot) elFoot.style.display = cart.length ? '' : 'none';

    if (!cart.length) {
      elItems.innerHTML = '<div class="cd-empty">Your cart is empty.<br>Pick a color you love.' +
        '<button class="btn btn-outline" id="cdKeep">Keep browsing</button></div>';
      var keep = document.getElementById('cdKeep');
      if (keep) keep.addEventListener('click', closeCart);
      return;
    }

    elItems.innerHTML = '';
    cart.forEach(function (item, idx) {
      var it = ITEMS[item.key];
      if (!it) return;
      var unit = priceOf(item.key) || 0;
      var el = document.createElement('div');
      el.className = 'cd-item';
      el.innerHTML =
        '<div class="thumb' + (it.product === 'softServe' ? ' ss' : '') + '" style="background:' + it.panel + '">' +
          '<img src="' + it.img + '" alt="' + it.title + '">' +
        '</div>' +
        '<div class="info">' +
          '<div class="name">' + it.title + '</div>' +
          '<div class="meta">' + sizeLabel(item.key, item.size) + ' · ' + money(unit) + ' each</div>' +
          '<div class="row">' +
            '<div class="cd-qty">' +
              '<button data-a="minus" aria-label="Decrease quantity">−</button>' +
              '<span>' + item.qty + '</span>' +
              '<button data-a="plus" aria-label="Increase quantity">+</button>' +
            '</div>' +
            '<div class="price">' + money(item.qty * unit) + '</div>' +
          '</div>' +
          '<button class="rm" data-a="rm">Remove</button>' +
        '</div>';
      el.querySelector('[data-a="minus"]').addEventListener('click', function () {
        if (item.qty > 1) item.qty--; else cart.splice(idx, 1);
        saveCart(); renderCart();
      });
      el.querySelector('[data-a="plus"]').addEventListener('click', function () {
        item.qty = Math.min(9, item.qty + 1);
        saveCart(); renderCart();
      });
      el.querySelector('[data-a="rm"]').addEventListener('click', function () {
        cart.splice(idx, 1);
        saveCart(); renderCart();
      });
      elItems.appendChild(el);
    });
  }

  function openCart() {
    if (!elDrawer) return;
    elDrawer.classList.add('open');
    elOverlay.classList.add('open');
    if (lenisRef) lenisRef.stop(); else document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    if (!elDrawer) return;
    elDrawer.classList.remove('open');
    elOverlay.classList.remove('open');
    if (lenisRef) lenisRef.start(); else document.body.style.overflow = '';
  }

  /* One permalink for the whole cart. Returns null (and refuses) if any line
     cannot be resolved — no silent wrong-variant checkout. */
  function checkoutUrl() {
    if (!cart.length) return null;
    var parts = [];
    for (var i = 0; i < cart.length; i++) {
      var vid = variantId(cart[i].key, cart[i].size);
      if (!vid) return null;
      parts.push(vid + ':' + cart[i].qty);
    }
    return 'https://' + SHOPIFY_DOMAIN + '/cart/' + parts.join(',');
  }

  function goCheckout() {
    var url = checkoutUrl();
    if (!url) { toast('Your cart needs attention before checkout.'); return; }
    window.location.href = url;
  }

  function init() {
    elDrawer = document.getElementById('cartDrawer');
    elOverlay = document.getElementById('cartOverlay');
    elItems = document.getElementById('cdItems');
    elCount = document.getElementById('cdCount');
    elSubtotal = document.getElementById('cdSubtotal');
    elFoot = document.getElementById('cdFoot');
    elCheckout = document.getElementById('cdCheckout');
    elSubLabel = document.getElementById('cdCheckoutLabel');
    if (!elDrawer || !elItems) return;             // page has no cart drawer
    var close = document.getElementById('cdClose');
    if (close) close.addEventListener('click', closeCart);
    if (elOverlay) elOverlay.addEventListener('click', closeCart);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
    if (elCheckout) elCheckout.addEventListener('click', goCheckout);
    renderCart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    SHOPIFY_DOMAIN: SHOPIFY_DOMAIN,
    PRODUCTS: PRODUCTS,
    ITEMS: ITEMS,
    VARIANTS: VARIANTS,
    productOf: productOf,
    variantId: variantId,
    priceOf: priceOf,
    sizeLabel: sizeLabel,
    addToCart: addToCart,
    clearCart: clearCart,
    openCart: openCart,
    closeCart: closeCart,
    renderCart: renderCart,
    checkoutUrl: checkoutUrl,
    goCheckout: goCheckout,
    toast: toast,
    /* let a page hand in its Lenis instance so the drawer can stop the scroll */
    useLenis: function (l) { lenisRef = l; },
    /* cart contents (read-only) — used by QA and by page-level UI */
    cart: function () { return cart.slice(); }
  };
})();
