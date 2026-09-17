/* ============================================================================
   VOLTECHARGED — PRODUCT PAGE BEHAVIOUR  (assets/vc-pdp.js)
   Drives blender.html and soft-serve.html from a per-page `window.PDP`
   config emitted by tools/build-pdp.py. Same visual language as the landing
   page: .pr-* stage + thumbs, colourway swatch repaint, Lenis smoothing,
   data-reveal, and the shared cart drawer from assets/vc-shop.js.
============================================================================ */
(function () {
  'use strict';
  var P = window.PDP;
  if (!P || !window.VC) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lenis (same settings as the landing page) ------------------- */
  var lenis = null;
  if (!reduceMotion && window.Lenis) lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
  if (lenis) VC.useLenis(lenis);
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: -60 }); else t.scrollIntoView({ behavior: 'smooth' });
    });
  });

  var nav = document.getElementById('nav');
  function navState() {
    if (!nav) return;
    if (P.navSolidTop) { nav.classList.add('solid'); return; }
    nav.classList.toggle('solid', window.scrollY > window.innerHeight * 0.82);
  }

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });

  var plxEls = [].slice.call(document.querySelectorAll('[data-plx]'));
  function tick(time) {
    if (lenis) lenis.raf(time);
    navState();
    if (!reduceMotion) {
      var vh = window.innerHeight;
      plxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var d = (r.top + r.height / 2) - vh / 2;
        el.style.transform = 'translateY(' + (-d * parseFloat(el.dataset.plx)).toFixed(1) + 'px)';
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- gallery + colourway state ---------------------------------- */
  var stage = document.getElementById('prMain');
  var thumbs = document.getElementById('prThumbs');
  var swWrap = document.getElementById('prSwatches');
  var root = document.getElementById('pdp');
  var nameEl = document.getElementById('prSwatchName');
  var h1Em = document.getElementById('prName');
  var priceEl = document.getElementById('prPrice');
  var badgeEl = document.getElementById('prBadge');
  var sizeNameEl = document.getElementById('prSizeName');
  var descEl = document.getElementById('prDesc');
  var qtyValEl = document.getElementById('qtyVal');
  var buyBtn = document.getElementById('prBuy');
  var stageNote = document.getElementById('prStageNote');

  var cwIndex = 0;
  var sizeId = P.sizes[0].id;
  var qty = 1;

  P.colorways.forEach(function (c, i) { if (c.default && !i) cwIndex = 0; });

  function active() { return P.colorways[cwIndex]; }

  function views() {
    var c = active();
    /* colourway product shot first — for the soft-serve the CDN shots sit on a
       studio background and need the same multiply blend as the landing page */
    return [{ src: c.img, label: c.name + ' — ' + P.title, prod: true }].concat(P.gallery);
  }

  function setMain(src, alt) {
    var img = document.createElement('img');
    img.src = src;
    img.alt = alt || P.title;
    img.draggable = false;
    stage.appendChild(img);
    requestAnimationFrame(function () { requestAnimationFrame(function () { img.classList.add('show'); }); });
    [].slice.call(stage.querySelectorAll('img')).forEach(function (old) {
      if (old !== img) { old.classList.remove('show'); setTimeout(function () { old.remove(); }, 550); }
    });
  }

  function renderThumbs(activeView) {
    var vs = views();
    thumbs.innerHTML = '';
    vs.forEach(function (view, i) {
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'pr-thumb' + (view.prod ? ' prod' : '') + (i === activeView ? ' on' : '');
      t.innerHTML = '<img src="' + view.src + '" alt="' + view.label + '" loading="lazy">';
      t.setAttribute('aria-label', view.label);
      t.addEventListener('click', function () {
        setMain(view.src, view.label);
        [].slice.call(thumbs.children).forEach(function (c, ci) { c.classList.toggle('on', ci === i); });
      });
      thumbs.appendChild(t);
    });
  }

  function paint() {
    var c = active();
    root.style.setProperty('--pr-accent', c.accent);
    root.style.setProperty('--pr-panel', c.panel);
    root.style.setProperty('--pr-wash', c.wash);
    root.style.setProperty('--pr-ghost', c.ghost);
    root.style.setProperty('--pr-shadow', c.shadow);
    if (badgeEl) badgeEl.textContent = c.badge || c.name;
    if (nameEl) nameEl.textContent = c.name;
    if (h1Em) h1Em.textContent = '\u2014 ' + c.name;
    if (descEl && (c.blurb || P.desc)) descEl.textContent = c.blurb || P.desc;
    [].slice.call(swWrap.children).forEach(function (s, i) { s.classList.toggle('on', i === cwIndex); });
    checkAvailability();
  }

  function selectColorway(i) {
    if (i === cwIndex) return;
    cwIndex = i;
    paint();
    setMain(active().img, active().name + ' — ' + P.title);
    renderThumbs(0);
  }

  if (swWrap) {
    P.colorways.forEach(function (c, i) {
      var s = document.createElement('button');
      s.type = 'button';
      s.className = 'pr-swatch' + (i === 0 ? ' on' : '');
      s.style.background = 'radial-gradient(circle at 32% 28%, #fff6, transparent 55%), ' + c.swatch;
      s.setAttribute('aria-label', c.name + (P.priceLabel ? ' — ' + P.priceLabel : ''));
      s.addEventListener('click', function () { selectColorway(i); });
      swWrap.appendChild(s);
    });
  }

  /* ---------- size + quantity ------------------------------------------- */
  var sizeWrap = document.getElementById('prSizes');
  if (sizeWrap) {
    [].slice.call(sizeWrap.querySelectorAll('.pr-size')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        sizeId = btn.dataset.size;
        if (sizeNameEl) sizeNameEl.textContent = btn.textContent.trim();
        [].slice.call(sizeWrap.querySelectorAll('.pr-size')).forEach(function (b) { b.classList.toggle('on', b === btn); });
        checkAvailability();
      });
    });
  }
  var qtyMinus = document.getElementById('qtyMinus');
  var qtyPlus = document.getElementById('qtyPlus');
  if (qtyMinus) qtyMinus.addEventListener('click', function () { qty = Math.max(1, qty - 1); qtyValEl.textContent = qty; });
  if (qtyPlus) qtyPlus.addEventListener('click', function () { qty = Math.min(9, qty + 1); qtyValEl.textContent = qty; });

  /* ---------- add to bag (fail-loud) ------------------------------------ */
  function checkAvailability() {
    if (!buyBtn) return;
    /* No fallback anywhere: if this colour+size has no explicit variant id the
       button is disabled instead of silently adding a different item. */
    var ok = !!VC.ITEMS[active().key] && !!VC.ITEMS[active().key].variants[sizeId];
    buyBtn.disabled = !ok;
    buyBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    buyBtn.style.opacity = ok ? '' : '.45';
    buyBtn.style.cursor = ok ? '' : 'not-allowed';
    if (stageNote) {
      stageNote.textContent = ok
        ? P.stageNote || 'In stock \u00b7 ships from Texas'
        : 'This colour/size is not orderable right now';
    }
  }

  if (buyBtn) {
    buyBtn.addEventListener('click', function () {
      if (buyBtn.disabled) return;
      VC.addToCart(active().key, sizeId, qty);
    });
  }

  /* ---------- UGC video strip ------------------------------------------- */
  var strip = document.getElementById('ugcStrip');
  var cornerSection = document.getElementById('ugc');
  var clips = P.ugc || [];
  if (strip) {
    if (!clips.length) {
      /* No community clips for this product yet → the section hides itself
         rather than shipping an empty shell or an empty promise. Add clips to
         the page's PDP.ugc array (see the TODO(ugc) block in the markup) and it
         reveals itself as a video strip with no other change. */
      if (cornerSection) cornerSection.hidden = true;
    } else {
      clips.forEach(function (clip) {
        var card = document.createElement('figure');
        card.className = 'strip-card';
        var v = document.createElement('video');
        v.src = clip.video; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
        v.preload = 'metadata';
        card.appendChild(v);
        var cap = document.createElement('figcaption');
        cap.innerHTML = '<span class="sc-cap">' + (clip.caption || P.title) + '</span>' +
          '<button class="sc-add" type="button" aria-label="Add to bag">+</button>';
        card.appendChild(cap);
        var addBtn = cap.querySelector('.sc-add');
        addBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var key = clip.color || active().key;
          var it = VC.ITEMS[key];
          if (!it) {
            /* unknown colour key: refuse loudly rather than pair a foreign key
               with this product's first variant id */
            console.warn('[voltecharged] clip colour "' + key +
                         '" is not a registered colourway — refusing the add-to-bag.');
            VC.toast('That option isn\u2019t available yet \u2014 nothing was added.');
            return;
          }
          VC.addToCart(key, Object.keys(it.variants)[0], 1);
        });
        /* only play a card while it is actually in view — cheap and calm */
        var vio = new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            if (en.isIntersecting) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
            else v.pause();
          });
        }, { threshold: 0.35 });
        vio.observe(card);
        card.addEventListener('click', function () { v.muted = !v.muted; });
        strip.appendChild(card);
      });
    }
  }

  /* ---------- secondary "add to bag" buttons (CTA at the foot of the page) */
  document.querySelectorAll('[data-pdp-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      if (VC.addToCart(active().key, sizeId, qty)) return;
    });
  });

  /* ---------- init ------------------------------------------------------- */
  paint();
  renderThumbs(0);
  setMain(active().img, active().name + ' — ' + P.title);
  checkAvailability();
})();
