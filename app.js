/* ==========================================================================
   RETAW Solutions — shared behaviour (no dependencies)
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     CONFIG — client-supplied values live here.
     ------------------------------------------------------------------------ */
  var CONFIG = {
    /*
     * RUNNING COSTS — PLACEHOLDER, NOT REAL FIGURES.
     * The RETAW brochure does not list replacement costs, so these stay null
     * until RETAW confirms them. While null, the calculator shows bottled-water
     * spend avoided and labels running costs as "placeholder / to be confirmed".
     * Once real MVR figures are supplied, enter them here and the calculator
     * subtracts them automatically.
     *
     * Known from the brochure (safe to rely on):
     *   - PCT Composite Filter Element: replacement interval every 6 months
     *   - 400 GPD DOW RO Membrane: 2-year lifespan
     */
    pctElementCostMVR: null,   // TODO(RETAW): price of one PCT composite filter element replacement
    roMembraneCostMVR: null,   // TODO(RETAW): price of one RO membrane replacement
    pctReplacementsPerYear: 2, // brochure: every 6 months
    roMembraneLifespanYears: 2 // brochure: 2-year lifespan
    // NOTE: the S1 retail/installation price is intentionally absent — pricing is quote-based.
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.classList.add("reduce-motion");

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Header: mobile nav + scrolled state ---------- */
  var header = $("[data-header]");
  var toggle = $("[data-nav-toggle]");
  var nav = $("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
  }

  /* ---------- Sticky CTA (mobile) ---------- */
  var sticky = $("[data-sticky-cta]");
  var formInView = false;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (sticky) sticky.classList.toggle("is-visible", y > 480 && !formInView);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // Hide the sticky bar while a quote form or the footer is on screen — it would only duplicate them.
  if (sticky && "IntersectionObserver" in window) {
    var hideTargets = $$("[data-quote-form], .site-footer");
    var visibleSet = new Set();
    var hideObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? visibleSet.add(en.target) : visibleSet.delete(en.target); });
      formInView = visibleSet.size > 0;
      onScroll();
    });
    hideTargets.forEach(function (t) { hideObs.observe(t); });
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = $$(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); revObs.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { revObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Number helpers ---------- */
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }

  function countTo(el, target) {
    var from = parseFloat(el.getAttribute("data-current") || "0");
    el.setAttribute("data-current", String(target));
    if (el._raf) cancelAnimationFrame(el._raf);
    if (reduceMotion || from === target) { el.textContent = fmt(target); return; }
    var start = null, dur = 650;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (target - from) * eased);
      if (p < 1) el._raf = requestAnimationFrame(step);
    }
    el._raf = requestAnimationFrame(step);
  }

  /* ---------- Savings calculator ---------- */
  function runningCost(years) {
    if (CONFIG.pctElementCostMVR == null || CONFIG.roMembraneCostMVR == null) return null;
    // Estimate: PCT element replaced on its 6-month interval, membrane replaced each full lifespan.
    var pct = CONFIG.pctElementCostMVR * CONFIG.pctReplacementsPerYear * years;
    var ro = CONFIG.roMembraneCostMVR * Math.floor(years / CONFIG.roMembraneLifespanYears);
    return pct + ro;
  }

  $$("[data-calc]").forEach(function (calc) {
    var input = $("[data-calc-input]", calc);
    var outs = $$("[data-calc-out]", calc);
    var hasRunning = runningCost(1) !== null;
    var timer;

    function update() {
      var monthly = Math.max(0, parseFloat(input.value) || 0);
      var yearly = monthly * 12;

      outs.forEach(function (el) {
        var years = parseFloat(el.getAttribute("data-calc-out"));
        var gross = yearly * years;
        var rc = runningCost(years);
        countTo(el, rc === null ? gross : Math.max(0, gross - rc));
      });

      // Full savings page extras
      var yearlyEl = $("[data-calc-yearly]", calc.parentNode) || $("[data-calc-yearly]");
      if (yearlyEl) countTo(yearlyEl, yearly);
      var monthlyEl = $("[data-calc-monthly]");
      if (monthlyEl) countTo(monthlyEl, monthly);

      var before = $("[data-bar-before]");
      var after = $("[data-bar-after]");
      var afterVal = $("[data-calc-after]");
      if (before) before.style.width = yearly > 0 ? "100%" : "0%";
      if (after && hasRunning) {
        var rc1 = runningCost(1);
        after.style.width = yearly > 0 ? Math.min(100, (rc1 / yearly) * 100) + "%" : "0%";
        if (afterVal) afterVal.textContent = "MVR " + fmt(rc1) + " / yr (estimate)";
      }
    }

    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(update, 120);
    });
    $$("[data-calc-preset]", calc).forEach(function (btn) {
      btn.addEventListener("click", function () {
        input.value = btn.getAttribute("data-calc-preset");
        update();
      });
    });

    // Reflect config state in the running-cost labels
    $$("[data-running-state]").forEach(function (el) {
      el.hidden = el.getAttribute("data-running-state") !== (hasRunning ? "set" : "unset");
    });
    if (!hasRunning) {
      var afterBar = $("[data-bar-after]");
      if (afterBar) afterBar.classList.add("bar-fill--tbc");
    }

    // Count up when the calculator first scrolls into view, if a value is prefilled
    if (input.value && "IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { update(); seen.disconnect(); }
      }, { threshold: 0.3 });
      seen.observe(calc);
    } else {
      update();
    }
  });

  /* ---------- How It Works: PCT step-through ---------- */
  var steps = $$("[data-step]");
  var markers = $$("[data-marker]");
  function activate(n) {
    steps.forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-step") === n); });
    markers.forEach(function (m) { m.classList.toggle("is-active", m.getAttribute("data-marker") === n); });
  }
  if (steps.length) {
    activate("1");
    if ("IntersectionObserver" in window) {
      var stepObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) activate(en.target.getAttribute("data-step")); });
      }, { rootMargin: "-45% 0px -45% 0px" });
      steps.forEach(function (s) { stepObs.observe(s); });
    }
    markers.forEach(function (m) {
      m.addEventListener("click", function () {
        var target = $('[data-step="' + m.getAttribute("data-marker") + '"]');
        if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      });
    });
  }

  /* ---------- Product gallery ---------- */
  var mainImg = $("[data-gallery-main]");
  $$("[data-gallery-thumb]").forEach(function (thumb, _, all) {
    thumb.addEventListener("click", function () {
      if (!mainImg) return;
      all.forEach(function (t) { t.setAttribute("aria-pressed", String(t === thumb)); });
      mainImg.style.opacity = "0";
      setTimeout(function () {
        mainImg.src = thumb.getAttribute("data-src");
        mainImg.alt = thumb.getAttribute("data-alt");
        mainImg.style.opacity = "1";
      }, reduceMotion ? 0 : 180);
    });
  });

  /* ---------- Quote / contact form ----------
   * To connect a backend or form service (Formspree, Basin, Getform, a Vercel
   * serverless function, etc.), set the form's data-endpoint attribute to the
   * POST URL. Fields are sent as FormData with standard names:
   *   name, phone, email, island, message
   * With no endpoint set, submitting opens the visitor's email app with a
   * pre-filled message to info@retaw.mv so no lead is lost in the meantime.
   */
  $$("[data-quote-form]").forEach(function (form) {
    var status = $("[data-form-status]", form);
    var submitBtn = $('button[type="submit"]', form);

    function setError(field, msg) {
      var wrap = field.closest(".field");
      var err = wrap && $(".field-error", wrap);
      if (wrap) wrap.classList.toggle("has-error", !!msg);
      if (err) err.textContent = msg || "";
      field.setAttribute("aria-invalid", msg ? "true" : "false");
    }

    function validate() {
      var ok = true, first = null;
      var checks = {
        name: function (v) { return v.trim().length >= 2 ? "" : "Please enter your name."; },
        phone: function (v) { return v.replace(/[^\d]/g, "").length >= 7 ? "" : "Please enter a phone number we can reach you on."; },
        email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Please enter a valid email address."; },
        island: function (v) { return v.trim().length >= 2 ? "" : "Please tell us your island or area."; }
      };
      Object.keys(checks).forEach(function (name) {
        var field = form.elements[name];
        if (!field) return;
        var msg = checks[name](field.value);
        setError(field, msg);
        if (msg) { ok = false; if (!first) first = field; }
      });
      if (first) first.focus();
      return ok;
    }

    $$("input, textarea", form).forEach(function (f) {
      f.addEventListener("input", function () { if (f.getAttribute("aria-invalid") === "true") setError(f, ""); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.textContent = ""; status.className = "form-status";
      if (form.elements.company && form.elements.company.value) return; // honeypot
      if (!validate()) return;

      var data = new FormData(form);
      data.delete("company");
      var endpoint = form.getAttribute("data-endpoint");

      if (!endpoint) {
        var body = [
          "Name: " + data.get("name"),
          "Phone: " + data.get("phone"),
          "Email: " + data.get("email"),
          "Island / Area: " + data.get("island"),
          "",
          (data.get("message") || "")
        ].join("\n");
        window.location.href = "mailto:info@retaw.mv?subject=" +
          encodeURIComponent("Free quote request: S1 RO Water Purifier") +
          "&body=" + encodeURIComponent(body);
        status.classList.add("is-success");
        status.textContent = "Your email app should open with your details filled in. Just press send. Prefer to talk? Call 9973829 or 4004664.";
        return;
      }

      submitBtn.disabled = true;
      var label = submitBtn.innerHTML;
      submitBtn.textContent = "Sending…";
      fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed");
          form.reset();
          status.classList.add("is-success");
          status.textContent = "Thanks, your quote request has been sent. The RETAW team will be in touch soon.";
        })
        .catch(function () {
          status.classList.add("is-error");
          status.textContent = "Sorry, something went wrong sending your request. Please call 9973829 or email info@retaw.mv.";
        })
        .then(function () { submitBtn.disabled = false; submitBtn.innerHTML = label; });
    });
  });

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
