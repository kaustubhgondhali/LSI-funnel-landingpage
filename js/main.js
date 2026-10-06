/* =============================================================================
   Lord Sai — SIP Landing Page Funnel
   main.js — i18n switching, SIP calculator, FAQ accordion, navigation,
             scroll-spy, and enquiry submission.

   No framework, no build step, no external dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var CFG  = window.LS_CONFIG || {};
  var DICT = window.LS_I18N   || {};
  var LANGS = ["en", "hi", "mr"];
  var LS_KEY = "lordsai.sip.lang";

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ===========================================================================
     1. I18N
     ======================================================================== */
  var currentLang = "en";

  function t(key, vars) {
    var pack = DICT[currentLang] || DICT.en || {};
    var str  = pack[key];
    if (str === undefined) str = (DICT.en && DICT.en[key]) !== undefined ? DICT.en[key] : key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.split("{" + k + "}").join(vars[k]);
      });
    }
    return str;
  }

  function applyLanguage(lang) {
    if (LANGS.indexOf(lang) === -1) lang = "en";
    currentLang = lang;

    document.documentElement.setAttribute("lang", t("html.lang"));

    /* Text content */
    $$("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    /* Attributes — "attr:key;attr2:key2" */
    $$("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var bits = pair.split(":");
        if (bits.length !== 2) return;
        el.setAttribute(bits[0].trim(), t(bits[1].trim()));
      });
    });

    /* <title> needs its own handling in some browsers */
    document.title = t("meta.title");

    /* Toggle state on every language switcher on the page */
    $$(".lang-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });

    /* Menu toggle label depends on open state */
    syncNavToggleLabel();

    /* Re-render anything whose text is generated, not static.
       Calculator inputs and form values are untouched — only labels change. */
    renderCalculator();
    renderReturns();
    renderCopyright();
    renderContact();

    if (CFG.persistLanguage) {
      try { localStorage.setItem(LS_KEY, lang); } catch (e) { /* storage unavailable */ }
    }
  }

  function initLanguage() {
    var lang = CFG.defaultLanguage && LANGS.indexOf(CFG.defaultLanguage) > -1 ? CFG.defaultLanguage : "en";
    if (CFG.persistLanguage) {
      try {
        var saved = localStorage.getItem(LS_KEY);
        if (saved && LANGS.indexOf(saved) > -1) lang = saved;
      } catch (e) { /* storage unavailable — English stays the default */ }
    }
    $$(".lang-btn").forEach(function (b) {
      b.addEventListener("click", function () { applyLanguage(b.getAttribute("data-lang")); });
    });
    applyLanguage(lang);
  }

  /* ===========================================================================
     2. NUMBER FORMATTING  (Indian digit grouping throughout)
     ======================================================================== */
  var inrFmt;
  try {
    inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  } catch (e) {
    inrFmt = { format: function (n) { return String(Math.round(n)); } };
  }

  function money(n) { return "₹" + inrFmt.format(Math.round(n)); }

  /* "approx. 9.21 lakh" — a readable scale cue under each figure */
  function words(n) {
    n = Math.round(n);
    if (n < 100000) return "";
    var val, unit;
    if (n >= 10000000) { val = n / 10000000; unit = t("calc.unit.crore"); }
    else               { val = n / 100000;   unit = t("calc.unit.lakh");  }
    var shown = val >= 100 ? val.toFixed(0) : val.toFixed(2);
    return t("calc.approx") + " " + shown + " " + unit;
  }

  /* ===========================================================================
     3. SIP CALCULATOR
     ---------------------------------------------------------------------------
     Ordinary annuity (contribution at END of month), which is what
     CFG.calculator.contributionTiming === "end" selects:

         FV = P × [ (1 + i)^n − 1 ] / i

     Annuity due (contribution at START of month) multiplies that by (1 + i).
     i = annual rate ÷ 12, n = years × 12.
     When i = 0 the formula is undefined, so FV = P × n is used instead.
     One timing is used for every figure on the page — the calculator and the
     compounding comparison both call this same function.
     ======================================================================== */
  function sipFutureValue(monthly, years, annualRatePct, timing) {
    var n = Math.round(years * 12);
    var i = (annualRatePct / 100) / 12;
    if (n <= 0) return 0;
    if (i === 0) return monthly * n;
    var fv = monthly * ((Math.pow(1 + i, n) - 1) / i);
    if (timing === "begin") fv *= (1 + i);
    return fv;
  }

  var calc = {
    amount: $("#calcAmount"), amountNum: $("#calcAmountNum"),
    years:  $("#calcYears"),  yearsNum:  $("#calcYearsNum"),
    rate:   $("#calcRate"),   rateNum:   $("#calcRateNum")
  };

  function clampTo(input, raw) {
    var min  = parseFloat(input.min);
    var max  = parseFloat(input.max);
    var step = parseFloat(input.step) || 1;
    var v = parseFloat(raw);
    if (isNaN(v)) v = parseFloat(input.value) || min;
    v = Math.min(max, Math.max(min, v));
    /* Snap to the step so the slider and the number box never disagree */
    v = Math.round((v - min) / step) * step + min;
    return Math.min(max, Math.max(min, parseFloat(v.toFixed(2))));
  }

  function readCalc() {
    return {
      amount: clampTo(calc.amount, calc.amountNum.value),
      years:  clampTo(calc.years,  calc.yearsNum.value),
      rate:   clampTo(calc.rate,   calc.rateNum.value)
    };
  }

  function renderCalculator() {
    if (!calc.amount) return;
    var cfg    = CFG.calculator || {};
    var timing = cfg.contributionTiming === "begin" ? "begin" : "end";
    var v      = readCalc();

    /* Keep slider and number box in lockstep */
    calc.amount.value = v.amount; calc.amountNum.value = v.amount;
    calc.years.value  = v.years;  calc.yearsNum.value  = v.years;
    calc.rate.value   = v.rate;   calc.rateNum.value   = v.rate;

    var invested = v.amount * Math.round(v.years * 12);
    var future   = sipFutureValue(v.amount, v.years, v.rate, timing);
    var gains    = Math.max(0, future - invested);

    $("#outInvested").textContent = money(invested);
    $("#outValue").textContent    = money(future);
    $("#outGains").textContent    = money(gains);
    $("#outInvestedWords").textContent = words(invested);
    $("#outValueWords").textContent    = words(future);
    $("#outGainsWords").textContent    = words(gains);

    /* Donut: share of the illustrative value that is growth */
    var donut = $("#donutGain");
    if (donut) {
      var r = 62, circ = 2 * Math.PI * r;
      var share = future > 0 ? Math.min(1, gains / future) : 0;
      donut.setAttribute("stroke-dasharray", (circ * share).toFixed(2) + " " + circ.toFixed(2));
    }

    /* Year unit: singular / plural */
    var unitEl = $("#calcYearsUnit");
    if (unitEl) unitEl.textContent = v.years === 1 ? t("calc.years.unit1") : t("calc.years.unit");

    /* Contribution timing is stated, never silently mixed */
    $("#calcTiming").textContent  = t(timing === "begin" ? "calc.timing.begin" : "calc.timing.end");
    $("#formulaBody").textContent = t(timing === "begin" ? "calc.formulaBodyBegin" : "calc.formulaBody");
    $("#calcZeroNote").hidden     = v.rate !== 0;

    renderCompounding(v, timing);
  }

  /* Compounding comparison — same monthly amount and rate, two durations.
     Driven by the calculator so the two sections can never contradict. */
  function renderCompounding(v, timing) {
    var longYears  = Math.max(v.years, 2);
    var shortYears = Math.max(1, Math.round(longYears / 2));
    if (shortYears === longYears) shortYears = Math.max(1, longYears - 1);

    var rows = [
      { el: $("#cmpLong"),  yrs: longYears  },
      { el: $("#cmpShort"), yrs: shortYears }
    ];

    var maxValue = 0;
    rows.forEach(function (row) {
      row.invested = v.amount * row.yrs * 12;
      row.value    = sipFutureValue(v.amount, row.yrs, v.rate, timing);
      row.gains    = Math.max(0, row.value - row.invested);
      if (row.value > maxValue) maxValue = row.value;
    });

    rows.forEach(function (row) {
      if (!row.el) return;
      var scale = maxValue > 0 ? row.value / maxValue : 0;
      var invShare  = row.value > 0 ? row.invested / row.value : 1;
      $(".cmp-years", row.el).textContent = t("comp.years", { years: row.yrs });
      $(".cmp-inv",   row.el).textContent = money(row.invested);
      $(".cmp-val",   row.el).textContent = money(row.value);
      $(".cmp-seg--inv",  row.el).style.width = (scale * invShare * 100).toFixed(2) + "%";
      $(".cmp-seg--gain", row.el).style.width = (scale * (1 - invShare) * 100).toFixed(2) + "%";
    });

    var basis = $("#compBasis");
    if (basis) basis.textContent = t("comp.basis", { amount: money(v.amount), rate: v.rate });
  }

  function bindCalculator() {
    if (!calc.amount) return;
    [["amount", "amountNum"], ["years", "yearsNum"], ["rate", "rateNum"]].forEach(function (pair) {
      var slider = calc[pair[0]], num = calc[pair[1]];
      slider.addEventListener("input", function () { num.value = slider.value; renderCalculator(); });
      num.addEventListener("input",  function () {
        /* Let people type freely; only mirror once the value parses */
        var n = parseFloat(num.value);
        if (!isNaN(n)) { slider.value = clampTo(slider, n); renderCalculator(); }
      });
      num.addEventListener("blur", renderCalculator);
      /* Arrow keys on the number box behave like the slider */
      num.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); num.blur(); }
      });
    });
    renderCalculator();
  }

  /* ===========================================================================
     3b. SIP GROWTH ILLUSTRATION  (the printed 12% / 10% step-up chart)
     ---------------------------------------------------------------------------
     Reproduces the printed chart's method exactly, so the page and the poster
     always show the same figures:
       • the assumed annual rate is an EFFECTIVE annual rate,
             monthly rate i = (1 + r)^(1/12) − 1
       • each instalment is invested at the START of the month
       • with step-up, the monthly amount rises by stepUpPct every 12 months
     This is a different convention from the calculator (nominal rate ÷ 12,
     end of month), which the section's assumption line states plainly.
     ======================================================================== */
  function stepUpSip(monthly, years, annualRatePct, stepUpPct) {
    var i = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
    var grow = 1 + (stepUpPct || 0) / 100;
    var value = 0, invested = 0, m = monthly;
    for (var y = 0; y < years; y++) {
      for (var k = 0; k < 12; k++) { value = (value + m) * (1 + i); invested += m; }
      m *= grow;
    }
    return { invested: invested, value: value };
  }

  var rt = { ready: false, amount: 0, years: 0, seenTiles: false, seenPanel: false };
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function growthAssumptions() {
    var g = CFG.growth || {};
    return {
      rate: typeof g.rate   === "number" ? g.rate   : 12,
      step: typeof g.stepUp === "number" ? g.stepUp : 10
    };
  }

  /* Compact "₹1.60 crore" formatter. The unit is fixed by the final figure,
     so a count-up does not jump between lakh and crore on the way. */
  function compactFor(target) {
    var crore = target >= 10000000;
    var div = crore ? 10000000 : 100000, unit = t(crore ? "calc.unit.crore" : "calc.unit.lakh");
    return function (n) { return "₹" + (n / div).toFixed(2) + " " + unit; };
  }

  /* Count a figure up from its previous value. Until its block has scrolled
     into view it holds at zero, so the count-up is what the visitor sees. */
  function countTo(el, to, fmt, seen) {
    if (!el) return;
    to = Math.round(to);
    if (el._raf) window.cancelAnimationFrame(el._raf);
    clearTimeout(el._settle);
    if (!seen) { el.setAttribute("data-val", "0"); el.textContent = fmt(0); return; }
    var from = parseFloat(el.getAttribute("data-val"));
    el.setAttribute("data-val", String(to));
    if (reduceMotion || isNaN(from) || from === to || !window.requestAnimationFrame) {
      el.textContent = fmt(to);
      return;
    }
    var start = Date.now(), dur = 900;
    function frame() {
      var p = Math.min(1, (Date.now() - start) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * eased);
      if (p < 1) el._raf = window.requestAnimationFrame(frame);
    }
    el._raf = window.requestAnimationFrame(frame);
    /* Frames can be throttled (background tab), so the final figure never depends on them */
    el._settle = setTimeout(function () {
      window.cancelAnimationFrame(el._raf);
      el.textContent = fmt(to);
    }, dur + 100);
  }

  /* Fill a translated sentence, showing the value for `token` in bold */
  function fillBold(el, template, token, value) {
    if (!el) return;
    el.textContent = "";
    template.split(token).forEach(function (part, idx) {
      if (idx > 0) { var b = document.createElement("b"); b.textContent = value; el.appendChild(b); }
      if (part) el.appendChild(document.createTextNode(part));
    });
  }

  function rtYearsList() {
    return $$("#rtYears .rt-chip").map(function (c) { return +c.getAttribute("data-years"); });
  }

  function renderRtRow(row, res, max) {
    if (!row) return;
    var inv = Math.round(res.invested), val = Math.round(res.value), gain = val - inv;
    $(".rt-val", row).textContent  = money(val);
    $(".rt-inv", row).textContent  = money(inv);
    $(".rt-gain", row).textContent = money(gain);
    $(".cmp-seg--inv", row).style.width  = rt.seenPanel ? (inv  / max * 100).toFixed(2) + "%" : "0%";
    $(".cmp-seg--gain", row).style.width = rt.seenPanel ? (gain / max * 100).toFixed(2) + "%" : "0%";
  }

  function rtCell(tr, text, res, cls) {
    var td = document.createElement("td");
    td.textContent = text;
    if (cls) td.className = cls;
    if (res) {
      var sm = document.createElement("small");
      sm.textContent = t("returns.gainSub", { amount: money(Math.round(res.value) - Math.round(res.invested)) });
      td.appendChild(sm);
    }
    tr.appendChild(td);
  }

  function renderReturns() {
    if (!rt.ready) return;
    var g = growthAssumptions(), a = rt.amount, y = rt.years;
    var vars = { rate: g.rate, step: g.step };
    var flat = stepUpSip(a, y, g.rate, 0), up = stepUpSip(a, y, g.rate, g.step);

    $("#rtLead").textContent = t("returns.lead", vars);

    /* Highlight tiles */
    $$(".rt-tile").forEach(function (tile) {
      var ta = +tile.getAttribute("data-amount"), ty = +tile.getAttribute("data-years");
      var value = stepUpSip(ta, ty, g.rate, g.step).value;
      $(".rt-tile-per", tile).textContent = t("returns.tile.per", { amount: money(ta) });
      $(".rt-tile-sub", tile).textContent = t("returns.tile.sub", { years: ty, step: g.step });
      countTo($(".rt-tile-val", tile), value, compactFor(value), rt.seenTiles);
      tile.setAttribute("aria-pressed", String(ta === a && ty === y));
    });

    /* Amount and duration buttons */
    $$("#rtAmounts .rt-chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(+c.getAttribute("data-amount") === a));
    });
    $$("#rtYears .rt-chip").forEach(function (c) {
      var cy = +c.getAttribute("data-years");
      c.textContent = t("returns.years.chip", { years: cy });
      c.setAttribute("aria-pressed", String(cy === y));
    });

    /* Headline figure and the step-up advantage */
    $("#rtHeroLabel").textContent = t("returns.hero.label", vars);
    countTo($("#rtHeroVal"), up.value, money, rt.seenPanel);
    $("#rtHeroWords").textContent = rt.seenPanel ? words(up.value) : " ";
    fillBold($("#rtExtra"), t("returns.extra"), "{amount}",
             "+" + money(Math.round(up.value) - Math.round(flat.value)));

    /* Regular vs step-up bars, both scaled to the larger value */
    $("#rtFor").textContent       = t("returns.for", { amount: money(a), years: y });
    $("#rtFlatLabel").textContent = t("returns.flat.label");
    $("#rtStepLabel").textContent = t("returns.step.label", vars);
    renderRtRow($("#rtFlat"), flat, up.value);
    renderRtRow($("#rtStep"), up,   up.value);

    /* Every duration for the chosen amount — the printed chart's block for it */
    $("#rtTableTitle").textContent = t("returns.table.title", { amount: money(a) });
    $("#rtThFlat").textContent     = t("returns.flat.short");
    $("#rtThStep").textContent     = t("returns.step.short", vars);
    var body = $("#rtBody");
    body.textContent = "";
    rtYearsList().forEach(function (yy) {
      var f = stepUpSip(a, yy, g.rate, 0), s = stepUpSip(a, yy, g.rate, g.step);
      var tr = document.createElement("tr");
      tr.setAttribute("data-years", yy);
      if (yy === y) tr.className = "is-selected";
      rtCell(tr, t("comp.years", { years: yy }));
      rtCell(tr, money(f.invested));
      rtCell(tr, money(f.value), f);
      rtCell(tr, money(s.invested));
      rtCell(tr, money(s.value), s, "rt-td-step");
      body.appendChild(tr);
    });

    $("#rtAssume").textContent     = t("returns.assume", vars);
    $("#rtDisclaimer").textContent = t("returns.disclaimer", vars);

    /* Distributor strip — config-driven, hidden when not configured */
    var d = CFG.distributor || {}, dist = $("#rtDist");
    if (dist) {
      dist.hidden = !d.name;
      $("#rtDistName").textContent  = d.name || "";
      $("#rtDistBrand").textContent = CFG.brandName || "";
      var arn = $("#rtDistArn"), ph = $("#rtDistPhone");
      arn.textContent = d.arn || "";
      arn.hidden = !d.arn;
      ph.hidden = !d.phone;
      if (d.phone) {
        ph.href = "tel:" + String(d.phone).replace(/\s/g, "");
        ph.textContent = t("returns.dist.mob") + " " + d.phone;
      }
    }
  }

  function bindReturns() {
    var section = $("#returns");
    if (!section) return;

    var g = CFG.growth || {};
    var amounts = $$("#rtAmounts .rt-chip").map(function (c) { return +c.getAttribute("data-amount"); });
    var years   = rtYearsList();
    rt.amount = amounts.indexOf(g.amount) > -1 ? g.amount : amounts[Math.floor(amounts.length / 2)];
    rt.years  = years.indexOf(g.years)    > -1 ? g.years  : years[Math.floor(years.length / 2)];

    function select(a, y) {
      if (a) rt.amount = a;
      if (y) rt.years = y;
      renderReturns();
    }

    $$("#rtAmounts .rt-chip").forEach(function (c) {
      c.addEventListener("click", function () { select(+c.getAttribute("data-amount"), 0); });
    });
    $$("#rtYears .rt-chip").forEach(function (c) {
      c.addEventListener("click", function () { select(0, +c.getAttribute("data-years")); });
    });
    $$(".rt-tile").forEach(function (tile) {
      tile.addEventListener("click", function () {
        select(+tile.getAttribute("data-amount"), +tile.getAttribute("data-years"));
      });
    });
    $("#rtBody").addEventListener("click", function (e) {
      var tr = e.target.closest && e.target.closest("tr[data-years]");
      if (tr) select(0, +tr.getAttribute("data-years"));
    });

    /* Count-ups start when each block scrolls into view */
    if (reduceMotion || !("IntersectionObserver" in window)) {
      rt.seenTiles = rt.seenPanel = true;
    } else {
      [[".rt-tiles", "seenTiles"], [".rt", "seenPanel"]].forEach(function (pair) {
        var target = $(pair[0], section);
        if (!target) { rt[pair[1]] = true; return; }
        var io = new IntersectionObserver(function (entries) {
          if (!entries.some(function (en) { return en.isIntersecting; })) return;
          io.disconnect();
          rt[pair[1]] = true;
          renderReturns();
        }, { threshold: 0.3 });
        io.observe(target);
      });
    }

    rt.ready = true;
    renderReturns();
  }

  /* ===========================================================================
     4. NAVIGATION, SCROLL-SPY, PHASE RAIL
     ======================================================================== */
  var nav = $("#primaryNav"), navToggle = $("#navToggle"), header = $("#siteHeader");

  function syncNavToggleLabel() {
    if (!navToggle) return;
    var open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-label", t(open ? "a11y.closeMenu" : "a11y.openMenu"));
  }

  function setNav(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    syncNavToggleLabel();
  }

  function bindNav() {
    if (!navToggle) return;
    navToggle.addEventListener("click", function () {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });
    $$("#primaryNav a").forEach(function (a) {
      a.addEventListener("click", function () { setNav(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setNav(false);
    });
  }

  function bindScroll() {
    var railFill = $("#phaseRailFill");
    var chips    = $$(".phase-chip");
    var toTop    = $("#toTop");
    var sections = $$("section[data-phase]");
    var navLinks = $$(".primary-nav > a");
    var ticking  = false;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;

      if (header) header.classList.toggle("is-stuck", y > 8);
      if (toTop)  toTop.classList.toggle("is-visible", y > 700);

      /* Overall read-progress fill behind the phase chips */
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (railFill) railFill.style.width = (docH > 0 ? Math.min(100, (y / docH) * 100) : 0) + "%";

      /* Which phase and which nav link is current */
      var probe = y + window.innerHeight * 0.35;
      var phase = "1", currentId = null;
      sections.forEach(function (s) {
        if (s.offsetTop <= probe) { phase = s.getAttribute("data-phase"); currentId = s.id; }
      });
      chips.forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-phase") === phase);
      });
      navLinks.forEach(function (a) {
        a.classList.toggle("is-current", currentId && a.getAttribute("href") === "#" + currentId);
      });
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ===========================================================================
     5. FAQ ACCORDION  (keyboard-friendly, one open at a time)
     ======================================================================== */
  function bindFaq() {
    var buttons = $$(".faq-q");
    buttons.forEach(function (btn, idx) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        buttons.forEach(function (b) {
          b.setAttribute("aria-expanded", "false");
          var p = document.getElementById(b.getAttribute("aria-controls"));
          if (p) p.hidden = true;
        });
        if (!open) {
          btn.setAttribute("aria-expanded", "true");
          var panel = document.getElementById(btn.getAttribute("aria-controls"));
          if (panel) panel.hidden = false;
        }
      });
      btn.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown") next = buttons[(idx + 1) % buttons.length];
        else if (e.key === "ArrowUp") next = buttons[(idx - 1 + buttons.length) % buttons.length];
        else if (e.key === "Home") next = buttons[0];
        else if (e.key === "End")  next = buttons[buttons.length - 1];
        if (next) { e.preventDefault(); next.focus(); }
      });
    });
  }

  /* ===========================================================================
     6. CONFIG-DRIVEN CONTENT  (hidden when not configured — never invented)
     ======================================================================== */
  function renderCopyright() {
    var el = $("#copyright");
    if (el) el.textContent = t("footer.copyright", {
      year: new Date().getFullYear(),
      brand: CFG.brandName || "Lord Sai"
    });
  }

  function renderContact() {
    var any = false;

    function setLink(wrapId, linkId, href, label) {
      var wrap = document.getElementById(wrapId), link = document.getElementById(linkId);
      if (!wrap || !link) return;
      if (label) { link.href = href; link.textContent = label; wrap.hidden = false; any = true; }
      else { wrap.hidden = true; }
    }

    setLink("fcPhone", "fcPhoneLink", "tel:" + String(CFG.contactPhone || "").replace(/\s/g, ""), CFG.contactPhone);
    setLink("fcEmail", "fcEmailLink", "mailto:" + (CFG.contactEmail || ""), CFG.contactEmail);

    var addrWrap = $("#fcAddress"), addrText = $("#fcAddressText");
    if (addrWrap && addrText) {
      if (CFG.contactAddress) { addrText.textContent = CFG.contactAddress; addrWrap.hidden = false; any = true; }
      else { addrWrap.hidden = true; }
    }
    var none = $("#fcNone");
    if (none) none.hidden = any;

    /* Policy links appear only when a real URL is configured */
    var hasPrivacy = !!CFG.privacyPolicyUrl, hasTerms = !!CFG.termsUrl;
    [["trustPrivacy", CFG.privacyPolicyUrl, hasPrivacy], ["formPrivacy", CFG.privacyPolicyUrl, hasPrivacy],
     ["footPrivacy", CFG.privacyPolicyUrl, hasPrivacy], ["trustTerms", CFG.termsUrl, hasTerms],
     ["formTerms", CFG.termsUrl, hasTerms], ["footTerms", CFG.termsUrl, hasTerms]
    ].forEach(function (row) {
      var el = document.getElementById(row[0]);
      if (!el) return;
      if (row[2]) { el.href = row[1]; el.hidden = false; } else { el.hidden = true; }
    });
    ["trustPolicyLinks", "formPolicyLinks", "footPolicy"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = !(hasPrivacy || hasTerms);
    });
  }

  /* ===========================================================================
     7. ENQUIRY FORM
     ---------------------------------------------------------------------------
     Honesty rules enforced here:
       • Success is shown ONLY after a 2xx response from a configured endpoint.
       • With no endpoint, the visitor is told plainly that nothing was sent.
       • The WhatsApp path says WhatsApp was opened — it never claims a submit.
       • On any failure the entered values stay in the form.
     ======================================================================== */
  var form = $("#enquiryForm"), submitBtn = $("#submitBtn"), statusBox = $("#formStatus");
  var busy = false;

  function hasEndpoint()  { return typeof CFG.enquiryEndpoint === "string" && CFG.enquiryEndpoint.trim() !== ""; }
  function hasWhatsApp()  { return typeof CFG.whatsappNumber  === "string" && /^\d{8,15}$/.test(String(CFG.whatsappNumber).trim()); }

  function showStatus(kind, msg) {
    if (!statusBox) return;
    statusBox.hidden = false;
    statusBox.className = "form-status is-" + kind;
    statusBox.textContent = msg;
  }
  function clearStatus() { if (statusBox) { statusBox.hidden = true; statusBox.textContent = ""; } }

  function setFieldError(input, errId, msgKey) {
    var err = document.getElementById(errId);
    if (input) input.setAttribute("aria-invalid", "true");
    if (err) { if (msgKey) err.textContent = t(msgKey); err.hidden = false; }
  }
  function clearFieldError(input, errId) {
    var err = document.getElementById(errId);
    if (input) input.removeAttribute("aria-invalid");
    if (err) err.hidden = true;
  }

  function validate() {
    var ok = true, firstBad = null;
    var name    = $("#fName"), mobile = $("#fMobile"), email = $("#fEmail");
    var goal    = $("#fGoal"), consent = $("#fConsent");
    var method  = $("input[name='contactMethod']:checked");
    var code    = $("#fCode");

    [[name, "eName"], [mobile, "eMobile"], [email, "eEmail"], [goal, "eGoal"], [consent, "eConsent"]]
      .forEach(function (p) { clearFieldError(p[0], p[1]); });
    clearFieldError(null, "eMethod");

    if (!name.value.trim() || name.value.trim().length < 2) {
      setFieldError(name, "eName", "form.name.err"); ok = false; firstBad = firstBad || name;
    }

    /* +91 expects 10 digits starting 6–9; other codes accept 6–14 digits */
    var digits = mobile.value.replace(/\D/g, "");
    var mobileOk = code.value === "+91" ? /^[6-9]\d{9}$/.test(digits) : /^\d{6,14}$/.test(digits);
    if (!mobileOk) { setFieldError(mobile, "eMobile", "form.mobile.err"); ok = false; firstBad = firstBad || mobile; }

    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      setFieldError(email, "eEmail", "form.email.err"); ok = false; firstBad = firstBad || email;
    }

    if (!goal.value) { setFieldError(goal, "eGoal", "form.goal.err"); ok = false; firstBad = firstBad || goal; }

    if (!method) {
      setFieldError(null, "eMethod", "form.method.err"); ok = false;
    } else if (method.value === "email" && !email.value.trim()) {
      /* Asking to be reached by email without giving one */
      setFieldError(email, "eEmail", "form.method.emailneedsemail"); ok = false; firstBad = firstBad || email;
    }

    if (!consent.checked) {
      setFieldError(consent, "eConsent", "form.consent.err"); ok = false; firstBad = firstBad || consent;
    }

    if (firstBad) { try { firstBad.focus({ preventScroll: false }); } catch (e) { firstBad.focus(); } }
    return ok;
  }

  function collect() {
    var method = $("input[name='contactMethod']:checked");
    var goalSel = $("#fGoal"), rangeSel = $("#fRange"), timeSel = $("#fTime");
    return {
      name:            $("#fName").value.trim(),
      countryCode:     $("#fCode").value,
      mobile:          $("#fMobile").value.replace(/\D/g, ""),
      email:           $("#fEmail").value.trim(),
      goal:            goalSel.value,
      goalLabel:       goalSel.options[goalSel.selectedIndex].text,
      investmentRange: rangeSel.value,
      rangeLabel:      rangeSel.value ? rangeSel.options[rangeSel.selectedIndex].text : "",
      contactMethod:   method ? method.value : "",
      contactMethodLabel: method ? method.parentElement.querySelector("span").textContent : "",
      contactTime:     timeSel.value,
      contactTimeLabel: timeSel.value ? timeSel.options[timeSel.selectedIndex].text : "",
      consent:         $("#fConsent").checked,
      language:        currentLang,
      pageUrl:         window.location.href,
      submittedAt:     new Date().toISOString()
    };
  }

  function whatsappText(d) {
    var lines = [
      "SIP Consultation Enquiry",
      "",
      t("form.name.label")   + ": " + d.name,
      t("form.mobile.label") + ": " + d.countryCode + " " + d.mobile
    ];
    if (d.email)            lines.push(t("form.email.label")  + ": " + d.email);
    lines.push(t("form.goal.label") + ": " + d.goalLabel);
    if (d.rangeLabel)       lines.push(t("form.range.label")  + ": " + d.rangeLabel);
    lines.push(t("form.method.label") + ": " + d.contactMethodLabel);
    if (d.contactTimeLabel) lines.push(t("form.time.label")   + ": " + d.contactTimeLabel);
    return lines.join("\n");
  }

  function setBusy(on) {
    busy = on;
    if (!submitBtn) return;
    submitBtn.classList.toggle("is-busy", on);
    submitBtn.disabled = on;
  }

  function bindForm() {
    if (!form) return;

    /* The button says what will actually happen */
    var labelEl = $(".btn-label", submitBtn);
    var waHint  = $("#waHint");
    if (!hasEndpoint() && hasWhatsApp()) {
      if (labelEl) {
        labelEl.setAttribute("data-i18n", "form.wa.submit");
        labelEl.textContent = t("form.wa.submit");   /* language pass already ran */
      }
      if (waHint) waHint.hidden = false;
    }

    /* Clear a field's error as soon as the visitor edits it */
    [["fName", "eName"], ["fMobile", "eMobile"], ["fEmail", "eEmail"], ["fGoal", "eGoal"], ["fConsent", "eConsent"]]
      .forEach(function (p) {
        var el = document.getElementById(p[0]);
        if (!el) return;
        var evt = (el.type === "checkbox" || el.tagName === "SELECT") ? "change" : "input";
        el.addEventListener(evt, function () { clearFieldError(el, p[1]); });
      });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;                       /* blocks accidental double submit */
      clearStatus();

      if (!validate()) { showStatus("error", t("form.state.errorsFound")); return; }

      var data = collect();

      /* --- Path A: a real backend is configured ---------------------------- */
      if (hasEndpoint()) {
        setBusy(true);
        showStatus("pending", t("form.state.sending"));

        var headers = { "Content-Type": "application/json" };
        if (CFG.enquiryHeaders && typeof CFG.enquiryHeaders === "object") {
          Object.keys(CFG.enquiryHeaders).forEach(function (k) { headers[k] = CFG.enquiryHeaders[k]; });
        }

        fetch(CFG.enquiryEndpoint, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data)
        }).then(function (res) {
          setBusy(false);
          if (res.ok) {
            /* Only here — a genuine 2xx — is success ever shown. */
            showStatus("success", t("form.state.success"));
            form.reset();
            $$("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
          } else {
            /* Values deliberately left in place so nothing is retyped. */
            showStatus("error", t("form.state.error"));
          }
        }).catch(function () {
          setBusy(false);
          showStatus("error", t("form.state.network"));
        });
        return;
      }

      /* --- Path B: no backend, but WhatsApp is configured ------------------ */
      if (hasWhatsApp()) {
        var url = "https://wa.me/" + String(CFG.whatsappNumber).trim() +
                  "?text=" + encodeURIComponent(whatsappText(data));
        var win = window.open(url, "_blank", "noopener");
        if (win) showStatus("info", t("form.wa.opened"));
        else     showStatus("error", t("form.wa.blocked"));
        return;
      }

      /* --- Path C: nothing is configured — say so plainly ------------------ */
      showStatus("info", t("form.state.notconfigured"));
      if (window.console && console.warn) {
        console.warn("[Lord Sai SIP] No enquiry destination configured. " +
                     "Set LS_CONFIG.enquiryEndpoint (and/or LS_CONFIG.whatsappNumber) in js/config.js. " +
                     "Nothing was sent or stored.");
      }
    });
  }

  /* ===========================================================================
     8. BOOT
     ======================================================================== */
  function init() {
    initLanguage();
    bindCalculator();
    bindReturns();
    bindNav();
    bindScroll();
    bindFaq();
    bindForm();
    renderCopyright();
    renderContact();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* Exposed for the test harness in tests/calculator.test.js */
  window.LS_SIP = { futureValue: sipFutureValue, stepUpValue: stepUpSip };
})();
