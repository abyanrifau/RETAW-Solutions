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
     * PRICING — supplied by RETAW. Keep in sync with the prices written in the HTML
     * (index.html product card + calculator note, savings.html, product.html, how-it-works.html).
     *   - S1 RO Water Purifier: MVR 5,660 (installation is free)
     *   - Filter change: MVR 600, every 6 months (brochure interval). Filter changes are
     *     required — without them the S1 can't clean water properly.
     */
    machinePriceMVR: 5660,
    filterChangeCostMVR: 600,
    filterChangesPerYear: 2,
    /*
     * HOUSEHOLD ESTIMATE — supplied by RETAW, used by the "household size" buttons.
     * ~90 L drinking water per person per month ÷ 1.5 L bottles = 60 bottles × ~MVR 7 = MVR 420 per person.
     * If these change, also update the "How we estimate" text in index.html and savings.html.
     */
    litresPerPersonMonth: 90,
    bottleLitres: 1.5,
    bottlePriceMVR: 7
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
    var setNav = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    var navOpen = function () { return toggle.getAttribute("aria-expanded") === "true"; };
    toggle.addEventListener("click", function () { setNav(!navOpen()); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
    // Close on Escape (returning focus to the toggle), on a tap outside the header, and when the layout switches to desktop
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navOpen()) { setNav(false); toggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (navOpen() && !e.target.closest("[data-header]")) setNav(false);
    });
    var desktopMq = window.matchMedia("(min-width: 960px)");
    var onMq = function () { if (desktopMq.matches) setNav(false); };
    if (desktopMq.addEventListener) desktopMq.addEventListener("change", onMq); else desktopMq.addListener(onMq);
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

  // Hide the sticky bar while the order form or the footer is on screen — it would only duplicate them.
  if (sticky && "IntersectionObserver" in window) {
    var hideTargets = $$("[data-order-form], .site-footer");
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
  // Runs with reduced motion too: CSS turns the entrance into a plain fade there
  if ("IntersectionObserver" in window) {
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
  var filterCostPerYear = CONFIG.filterChangeCostMVR * CONFIG.filterChangesPerYear;
  var perPersonMonthly = (CONFIG.litresPerPersonMonth / CONFIG.bottleLitres) * CONFIG.bottlePriceMVR; // MVR 420

  // Net savings over N years: bottled-water spend avoided, minus the S1 itself and its filter changes.
  function netSavings(monthly, years) {
    return monthly * 12 * years - CONFIG.machinePriceMVR - filterCostPerYear * years;
  }

  // Running total spent on the S1 after t months: the purifier, plus each filter change as it falls due.
  var filterInterval = 12 / CONFIG.filterChangesPerYear; // months between filter changes (6)
  function s1CostAt(t) {
    return CONFIG.machinePriceMVR + CONFIG.filterChangeCostMVR * Math.floor(t / filterInterval + 1e-9);
  }

  // Months until bottled-water spend catches up with the S1's running total (fractional), or null if it never does.
  function paybackMonths(monthly) {
    if (monthly <= 0) return null;
    for (var k = 0; k < 120; k++) {
      var t = (CONFIG.machinePriceMVR + CONFIG.filterChangeCostMVR * k) / monthly;
      if (t < (k + 1) * filterInterval) return t;
    }
    return null;
  }

  /* ---------- Savings page: cumulative cost chart ----------
   * Two running totals over 5 years (bottled water vs the S1), the gap between them shaded
   * as savings, and a marker where the S1 pays for itself. Driven by the calculator input.
   * Colours validated with the dataviz palette checker: S1 #0479AE / bottled #C2410C.
   */
  var chart = (function () {
    var root = $("[data-cost-chart]");
    if (!root) return null;
    var plot = $("[data-chart-plot]", root);
    var tip = $("[data-chart-tooltip]", root);
    var summary = $("[data-chart-summary]", root);
    var tbody = $("[data-chart-table]", root);
    var NS = "http://www.w3.org/2000/svg";
    var MONTHS = 60, BOTTLED = "#C2410C", S1 = "#0479AE", SAVE = "#7DB928";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("tabindex", "0");
    plot.insertBefore(svg, tip);

    var shown = 0, raf = null, reveal = reduceMotion ? 1 : 0, revealed = reduceMotion, hoverM = null, geo = null;

    function el(name, attrs, parent) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }
    // Clean tick step (1 / 2 / 2.5 / 5 × 10ⁿ) so the axis top sits just above the data
    function niceStep(r) {
      var p = Math.pow(10, Math.floor(Math.log10(r))), n = r / p;
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    }
    function compact(v) {
      if (v === 0) return "0";
      var k = v / 1000;
      return (k % 1 ? k.toFixed(1) : k) + "k";
    }

    function draw() {
      var W = Math.max(200, plot.clientWidth), narrow = W < 560, H = narrow ? 260 : 320; // never wider than its card on small phones
      var m = { top: 18, right: narrow ? 14 : 150, bottom: 30, left: narrow ? 44 : 56 };
      var iw = W - m.left - m.right, ih = H - m.top - m.bottom;
      var monthly = shown, bEnd = monthly * MONTHS, sEnd = s1CostAt(MONTHS);
      var step = niceStep(Math.max(bEnd, sEnd) / 5), yMax = Math.ceil(Math.max(bEnd, sEnd) / step) * step;
      var x = function (t) { return m.left + (t / MONTHS) * iw; };
      var y = function (v) { return m.top + ih - (v / yMax) * ih; };
      geo = { W: W, m: m, iw: iw, x: x };

      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // Recessive hairline grid + axis labels
      var grid = el("g", { "class": "chart-grid" }, svg), axis = el("g", { "class": "chart-axis" }, svg);
      for (var v = 0; v <= yMax + 1e-6; v += step) {
        el("line", { x1: m.left, x2: m.left + iw, y1: y(v), y2: y(v) }, grid);
        el("text", { x: m.left - 8, y: y(v) + 4, "text-anchor": "end" }, axis).textContent = compact(v);
      }
      for (var yr = 0; yr <= 5; yr++) {
        // Narrow charts: centre every label on its tick so neighbours never collide (the margins absorb the overhang)
        el("text", { x: x(yr * 12), y: H - 8, "text-anchor": narrow || (yr > 0 && yr < 5) ? "middle" : yr === 0 ? "start" : "end" }, axis)
          .textContent = yr === 0 ? (narrow ? "Now" : "Today") : (narrow ? "Yr " : "Year ") + yr;
      }

      // Sample points up to the reveal edge, with an extra point just before each filter-change step
      var edge = MONTHS * reveal, ts = [];
      for (var t = 0; t <= edge; t += 0.5) ts.push(t);
      for (var k = 1; k * filterInterval <= edge; k++) ts.push(k * filterInterval - 0.001);
      if (ts[ts.length - 1] < edge) ts.push(edge);
      ts.sort(function (a, b) { return a - b; });
      var bottled = function (t) { return monthly * t; };
      var pts = function (fn) { return ts.map(function (t) { return x(t).toFixed(1) + "," + y(fn(t)).toFixed(1); }); };

      if (monthly > 0) {
        // Savings wash: the gap where bottled-water spend is above the S1's running total
        var upper = pts(function (t) { return Math.max(bottled(t), s1CostAt(t)); });
        el("polygon", { points: upper.concat(pts(s1CostAt).reverse()).join(" "), fill: SAVE, "fill-opacity": 0.16 }, svg);
      }
      var lineAttrs = { fill: "none", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" };
      el("polyline", Object.assign({ points: pts(s1CostAt).join(" "), stroke: S1 }, lineAttrs), svg);
      if (monthly > 0) el("polyline", Object.assign({ points: pts(bottled).join(" "), stroke: BOTTLED }, lineAttrs), svg);

      // Break-even marker
      var pb = paybackMonths(monthly);
      if (pb !== null && pb <= MONTHS && pb <= edge) {
        var px = x(pb), py = y(bottled(pb));
        el("circle", { cx: px, cy: py, r: 5, fill: S1, stroke: "#fff", "stroke-width": 2 }, svg);
        var label = el("text", { "class": "chart-label", x: px + 10, y: Math.max(m.top + 12, py - 12) }, svg);
        label.textContent = "Pays for itself: month " + Math.ceil(pb);
        if (px + 10 + label.getComputedTextLength() > m.left + iw) {
          label.setAttribute("x", px - 10);
          label.setAttribute("text-anchor", "end");
        }
      }

      // Direct end labels (wide screens, once fully drawn, only when they don't collide)
      if (!narrow && reveal >= 1) {
        var ends = [{ v: sEnd, name: "With the S1", c: S1 }];
        if (monthly > 0) ends.push({ v: bEnd, name: "Bottled water", c: BOTTLED });
        var ys = ends.map(function (e) { return y(e.v); });
        if (ends.length < 2 || Math.abs(ys[0] - ys[1]) >= 32) {
          ends.forEach(function (e, i) {
            el("circle", { cx: x(MONTHS), cy: ys[i], r: 4, fill: e.c, stroke: "#fff", "stroke-width": 2 }, svg);
            el("text", { "class": "chart-label", x: x(MONTHS) + 12, y: ys[i] - 1 }, svg).textContent = "MVR " + fmt(e.v);
            el("text", { "class": "chart-sublabel", x: x(MONTHS) + 12, y: ys[i] + 13 }, svg).textContent = e.name;
          });
        }
      }

      // Crosshair
      if (hoverM !== null) {
        var hx = x(hoverM);
        el("line", { x1: hx, x2: hx, y1: m.top, y2: m.top + ih, stroke: "#9AA7AD", "stroke-width": 1 }, svg);
        var marks = [[s1CostAt(hoverM), S1]];
        if (monthly > 0) marks.push([bottled(hoverM), BOTTLED]);
        marks.forEach(function (d) { el("circle", { cx: hx, cy: y(d[0]), r: 4, fill: d[1], stroke: "#fff", "stroke-width": 2 }, svg); });
      }
    }

    function tipRow(name, value, color) {
      var row = document.createElement("div"); row.className = "tt-row";
      var label = document.createElement("span"); label.className = "tt-name";
      var key = document.createElement("span"); key.className = "tt-key"; key.style.background = color;
      label.appendChild(key); label.appendChild(document.createTextNode(name));
      var val = document.createElement("strong"); val.textContent = "MVR " + fmt(value);
      row.appendChild(label); row.appendChild(val);
      tip.appendChild(row);
    }
    function showTip() {
      if (hoverM === null || !geo) { tip.hidden = true; return; }
      var monthly = shown, b = monthly * hoverM, s = s1CostAt(hoverM);
      tip.textContent = "";
      var head = document.createElement("div"); head.className = "tt-head";
      head.textContent = hoverM === 0 ? "Today" : "After " + hoverM + (hoverM === 1 ? " month" : " months");
      tip.appendChild(head);
      if (monthly > 0) tipRow("Bottled water", b, BOTTLED);
      tipRow("With the S1", s, S1);
      if (monthly > 0) {
        var foot = document.createElement("div"); foot.className = "tt-foot";
        foot.textContent = b >= s ? "You've saved MVR " + fmt(b - s)
          : paybackMonths(monthly) !== null ? "MVR " + fmt(s - b) + " until it pays for itself"
          : "MVR " + fmt(s - b) + " more than bottled water so far";
        tip.appendChild(foot);
      }
      tip.hidden = false;
      var scale = plot.clientWidth / geo.W, px = geo.x(hoverM) * scale, tw = tip.offsetWidth;
      tip.style.left = (px + 14 + tw > plot.clientWidth ? Math.max(0, px - 14 - tw) : px + 14) + "px";
      tip.style.top = geo.m.top * scale + "px";
    }
    function setHover(month) {
      hoverM = month === null ? null : Math.max(0, Math.min(MONTHS, month));
      draw();
      showTip();
    }

    // Pointer tracking is throttled to one redraw per frame; taps on touch screens show the readout too
    var pendingX = null, hoverRaf = null;
    function monthAt(clientX) {
      var rect = svg.getBoundingClientRect(), px = (clientX - rect.left) * (geo.W / rect.width);
      return Math.round(((px - geo.m.left) / geo.iw) * MONTHS);
    }
    function trackPointer(e) {
      if (!geo) return;
      pendingX = e.clientX;
      if (hoverRaf) return;
      hoverRaf = requestAnimationFrame(function () {
        hoverRaf = null;
        if (pendingX !== null) setHover(monthAt(pendingX));
      });
    }
    function clearHover() { pendingX = null; setHover(null); }
    svg.addEventListener("pointermove", trackPointer);
    svg.addEventListener("pointerdown", trackPointer);
    svg.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") clearHover(); });
    svg.addEventListener("pointercancel", clearHover); // a touch that turns into a scroll
    document.addEventListener("pointerdown", function (e) { if (hoverM !== null && !svg.contains(e.target)) clearHover(); });
    svg.addEventListener("focus", function () {
      var pb = paybackMonths(shown);
      setHover(pb !== null && pb <= MONTHS ? Math.ceil(pb) : 12);
    });
    svg.addEventListener("blur", function () { setHover(null); });
    svg.addEventListener("keydown", function (e) {
      if (hoverM === null) return;
      var next = { ArrowLeft: hoverM - 1, ArrowRight: hoverM + 1, Home: 0, End: MONTHS }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      setHover(next);
    });

    function describe(monthly) {
      if (monthly <= 0) return "Enter your spend or pick a household size above to see when the S1 pays for itself.";
      var pb = paybackMonths(monthly), diff = monthly * MONTHS - s1CostAt(MONTHS);
      if (pb === null) return "At MVR " + fmt(monthly) + " a month, bottled water costs less than the S1's filter changes, so the S1 won't pay for itself.";
      if (pb > MONTHS) return "At MVR " + fmt(monthly) + " a month, the S1 pays for itself after about " + (pb / 12).toFixed(1) + " years, beyond this 5-year view.";
      return "The S1 pays for itself in month " + Math.ceil(pb) + ". By year 5 you'd have spent MVR " + fmt(diff) + " less than on bottled water.";
    }
    function fillTable(monthly) {
      tbody.textContent = "";
      for (var yr = 1; yr <= 5; yr++) {
        var b = monthly * yr * 12, s = s1CostAt(yr * 12), d = b - s;
        var tr = document.createElement("tr");
        [yr + (yr === 1 ? " year" : " years"), "MVR " + fmt(b), "MVR " + fmt(s), (d < 0 ? "−MVR " : "MVR ") + fmt(Math.abs(d))]
          .forEach(function (text, i) {
            var cell = document.createElement(i === 0 ? "th" : "td");
            if (i === 0) cell.setAttribute("scope", "row");
            cell.textContent = text;
            tr.appendChild(cell);
          });
        tbody.appendChild(tr);
      }
    }

    function animateTo(v) {
      if (raf) cancelAnimationFrame(raf);
      if (reduceMotion || !revealed) { shown = v; draw(); showTip(); return; }
      var from = shown, start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / 650, 1);
        shown = from + (v - from) * (1 - Math.pow(1 - p, 3));
        draw(); showTip();
        raf = p < 1 ? requestAnimationFrame(frame) : null;
      }
      raf = requestAnimationFrame(frame);
    }

    // Draw the lines in from the left the first time the chart scrolls into view
    if (!revealed && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var start = null;
        (function grow(ts) {
          if (start === null) start = ts;
          reveal = Math.min((ts - start) / 1100, 1);
          reveal = 1 - Math.pow(1 - reveal, 3);
          draw();
          if (reveal < 1) requestAnimationFrame(grow); else revealed = true;
        })(performance.now());
      }, { threshold: 0.35 });
      io.observe(root);
    } else {
      reveal = 1; revealed = true;
    }

    if ("ResizeObserver" in window) {
      var lastW = 0;
      new ResizeObserver(function () {
        if (plot.clientWidth !== lastW) { lastW = plot.clientWidth; draw(); showTip(); }
      }).observe(plot);
    }

    return {
      update: function (monthly) {
        var text = describe(monthly);
        summary.textContent = text;
        svg.setAttribute("aria-label", "Line chart of total spent over 5 years. " + text);
        fillTable(monthly);
        animateTo(monthly);
      }
    };
  })();

  $$("[data-calc]").forEach(function (calc) {
    var input = $("[data-calc-input]", calc);
    var outs = $$("[data-calc-out]", calc);
    var timer;

    function update() {
      var monthly = Math.max(0, parseFloat(input.value) || 0);
      var yearly = monthly * 12;

      outs.forEach(function (el) {
        var years = parseFloat(el.getAttribute("data-calc-out"));
        var net = monthly > 0 ? netSavings(monthly, years) : 0;
        countTo(el, net);
        var box = el.closest(".calc-result");
        if (box) box.classList.toggle("is-negative", net < 0);
      });

      // Full savings page extras
      var yearlyEl = $("[data-calc-yearly]");
      if (yearlyEl) countTo(yearlyEl, yearly);

      var before = $("[data-bar-before]");
      var after = $("[data-bar-after]");
      var scale = Math.max(yearly, filterCostPerYear);
      if (before) before.style.width = yearly > 0 ? (yearly / scale) * 100 + "%" : "0%";
      if (after) after.style.width = yearly > 0 ? (filterCostPerYear / scale) * 100 + "%" : "0%";

      // Same month-by-month model as the chart, so the two always agree
      var payback = $("[data-calc-payback]");
      if (payback) {
        var pbm = paybackMonths(monthly);
        if (monthly <= 0) payback.textContent = "Enter your spend";
        else if (pbm === null) payback.textContent = "Not at this spend";
        else {
          var months = Math.ceil(pbm);
          payback.textContent = months < 24 ? months + " months" : (months / 12).toFixed(1) + " years";
        }
      }

      if (chart) chart.update(monthly);
    }

    input.addEventListener("input", function () {
      setBasis(null); // typed a real figure, so it's no longer a household estimate
      clearTimeout(timer);
      timer = setTimeout(update, 120);
    });

    // Household size buttons: people × MVR 420 per person per month
    var chips = $$("[data-calc-people]", calc);
    var basis = $("[data-calc-basis]", calc);
    function setBasis(people) {
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-calc-people") === String(people))); });
      if (!basis) return;
      basis.hidden = !people;
      if (people) {
        basis.textContent = people + (people === 1 ? " person" : " people") + " × MVR " + fmt(perPersonMonthly) +
          " = MVR " + fmt(people * perPersonMonthly) + " a month (estimate)";
      }
    }
    chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var people = parseInt(btn.getAttribute("data-calc-people"), 10);
        input.value = Math.round(people * perPersonMonthly);
        setBasis(people);
        update();
      });
    });

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

  /* ---------- Trust badges: staggered icon pop-in ---------- */
  var trustLists = $$(".trust");
  if ("IntersectionObserver" in window) {
    var trustObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-popped"); trustObs.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    trustLists.forEach(function (t) { trustObs.observe(t); });
  } else {
    trustLists.forEach(function (t) { t.classList.add("is-popped"); });
  }

  /* ---------- Pause looping decorations while off screen (saves CPU and battery on phones) ---------- */
  if ("IntersectionObserver" in window) {
    var loopObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-paused", !en.isIntersecting); });
    });
    $$(".wave, .flow").forEach(function (el) { loopObs.observe(el); });
  }

  /* ---------- Smooth scrolling for same-page anchor links ---------- */
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("a[href*='#']");
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.origin !== location.origin || link.pathname !== location.pathname || !link.hash) return;
    var dest = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!dest) return;
    e.preventDefault();
    dest.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    if (history.pushState) history.pushState(null, "", link.hash);
    if (!dest.hasAttribute("tabindex")) dest.setAttribute("tabindex", "-1");
    dest.focus({ preventScroll: true });
  });

  /* ---------- How It Works: water flowing through the PCT layers ----------
   * A droplet travels a path joining the four layers. It reaches layer N exactly as step N
   * becomes active (the step's top crosses 55% of the viewport, the same line the step
   * observer below uses), easing in and out of each layer while the visitor reads.
   * Reduced motion: no trace; the step highlight and markers carry the sequence.
   */
  (function () {
    var flowSvg = $("[data-pct-flow]"), head = $("[data-pct-flow-head]"), stepEls = $$("[data-step]");
    if (!flowSvg || !head || stepEls.length !== 4 || reduceMotion) return;
    var fill = $(".pct-flow-fill", flowSvg), track = $(".pct-flow-track", flowSvg), figure = flowSvg.parentNode;
    var VB_W = 448, LINE = 0.55;
    var LEGS = ["M368 140 C368 260 324 268 324 388", "M324 388 C324 508 270 523 270 643", "M270 643 C270 800 350 818 350 975"];

    // Path length at each layer node, measured from the individual legs
    var nodes = [0];
    LEGS.forEach(function (d) {
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      flowSvg.appendChild(p);
      nodes.push(nodes[nodes.length - 1] + p.getTotalLength());
      flowSvg.removeChild(p);
    });
    var fullLen = fill.getTotalLength(), legScale = fullLen / nodes[3];
    var scale = 1, current = 0, target = 0, raf = null, inView = false;

    function easeInOut(f) { return f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2; }
    function targetFromScroll() {
      var line = window.innerHeight * LINE;
      var tops = stepEls.map(function (s) { return s.getBoundingClientRect().top; });
      if (tops[0] > line) return 0;
      for (var i = 0; i < 3; i++) {
        if (tops[i + 1] > line) {
          var f = easeInOut((line - tops[i]) / (tops[i + 1] - tops[i]));
          return (nodes[i] + (nodes[i + 1] - nodes[i]) * f) * legScale;
        }
      }
      return fullLen;
    }
    function render() {
      fill.setAttribute("stroke-dashoffset", (fullLen - current).toFixed(2));
      var pt = fill.getPointAtLength(Math.max(0, Math.min(fullLen, current)));
      head.style.transform = "translate(" + (pt.x * scale).toFixed(2) + "px," + (pt.y * scale).toFixed(2) + "px)";
    }
    function tick() {
      current += (target - current) * 0.16;
      if (Math.abs(target - current) < 0.4) current = target;
      render();
      raf = current !== target ? requestAnimationFrame(tick) : null;
    }
    function onScroll() {
      if (!inView) return;
      target = targetFromScroll();
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function resize() {
      scale = figure.clientWidth / VB_W || 1;
      // Keep strokes a constant on-screen size whatever the figure's width
      track.setAttribute("stroke-width", (2 / scale).toFixed(2));
      track.setAttribute("stroke-dasharray", (2 / scale).toFixed(2) + " " + (7 / scale).toFixed(2));
      fill.setAttribute("stroke-width", (3.5 / scale).toFixed(2));
      fill.setAttribute("stroke-dasharray", fullLen.toFixed(2));
      render();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { resize(); onScroll(); });
    resize();
    current = target = targetFromScroll();
    render();
    flowSvg.classList.add("is-ready");

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        head.classList.toggle("is-on", inView);
        onScroll();
      }).observe(figure);
    } else {
      inView = true;
      head.classList.add("is-on");
    }
  })();

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

  /* ---------- Order / contact form ----------
   * To connect a backend or form service (Formspree, Basin, Getform, a Vercel
   * serverless function, etc.), set the form's data-endpoint attribute to the
   * POST URL. Fields are sent as FormData with standard names:
   *   name, phone, email, island, message
   * With no endpoint set, submitting opens the visitor's email app with a
   * pre-filled message to info@retaw.mv so no lead is lost in the meantime.
   */
  $$("[data-order-form]").forEach(function (form) {
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
          encodeURIComponent("Order request: S1 RO Water Purifier") +
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
          status.textContent = "Thanks, your order request has been sent. The RETAW team will be in touch to confirm it.";
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
