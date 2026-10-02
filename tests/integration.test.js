/* Integration test: loads index.html with its real CSS/JS in jsdom and
   exercises language switching, the calculator, the FAQ, and every
   enquiry-form submission path. Run: node tests/integration.test.js  */

const path = require("path");
const { JSDOM, VirtualConsole } = require(
  "/tmp/claude-0/-home-claude/8876d85a-7b90-5b54-bab7-ef4cce25fef5/scratchpad/node_modules/jsdom"
);

const ROOT = path.resolve(__dirname, "..");
let pass = 0, fail = 0, consoleErrors = [];

function check(label, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (extra !== undefined ? "   got: " + JSON.stringify(extra) : "")); }
}

async function boot(configPatch) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => consoleErrors.push("jsdomError: " + e.message));
  vc.on("error", (...a) => consoleErrors.push("console.error: " + a.join(" ")));

  const dom = await JSDOM.fromFile(path.join(ROOT, "index.html"), {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
      win.scrollTo = () => {};
      win.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
      if (configPatch) {
        // Apply the patch the moment config.js finishes defining LS_CONFIG
        let real;
        Object.defineProperty(win, "LS_CONFIG", {
          configurable: true,
          get() { return real; },
          set(v) { real = Object.assign(v, configPatch); }
        });
      }
    }
  });
  await new Promise(r => {
    if (dom.window.document.readyState === "complete") return r();
    dom.window.addEventListener("load", r);
  });
  await new Promise(r => setTimeout(r, 120));
  return dom;
}

(async function run() {

  /* ---------------------------------------------------------------- */
  console.log("\n[1] Default load — English, calculator, config-driven content");
  let dom = await boot();
  let w = dom.window, d = w.document, $ = s => d.querySelector(s);

  check("html lang is en", d.documentElement.lang === "en", d.documentElement.lang);
  check("h1 rendered in English", /Working Hard Every Month/.test($("h1").textContent));
  check("total invested = ₹6,00,000", $("#outInvested").textContent === "₹6,00,000", $("#outInvested").textContent);
  check("illustrative value = ₹9,14,730 (end-of-month)", $("#outValue").textContent === "₹9,14,730", $("#outValue").textContent);
  check("gains = ₹3,14,730", $("#outGains").textContent === "₹3,14,730", $("#outGains").textContent);
  check("scale cue uses lakh", /lakh/.test($("#outValueWords").textContent), $("#outValueWords").textContent);
  check("donut dasharray set", /^[\d.]+ [\d.]+$/.test($("#donutGain").getAttribute("stroke-dasharray")), $("#donutGain").getAttribute("stroke-dasharray"));
  check("timing stated as end-of-month", /end of the month/.test($("#calcTiming").textContent));
  check("FAQ answer 1 populated", $("#fa1 p").textContent.length > 120, $("#fa1 p").textContent.length);
  check("compounding basis interpolated", /₹5,000/.test($("#compBasis").textContent) && !/\{/.test($("#compBasis").textContent), $("#compBasis").textContent.slice(0,70));
  check("comparison durations 10y vs 5y", $("#cmpLong .cmp-years").textContent === "10 years" && $("#cmpShort .cmp-years").textContent === "5 years",
        $("#cmpLong .cmp-years").textContent + " / " + $("#cmpShort .cmp-years").textContent);
  check("copyright year interpolated", $("#copyright").textContent.includes(String(new Date().getFullYear())) && !/\{/.test($("#copyright").textContent), $("#copyright").textContent);
  check("unconfigured contact → honest 'not published' line", !$("#fcNone").hidden);
  check("unconfigured policy links stay hidden", $("#footPolicy").hidden && $("#trustPolicyLinks").hidden);
  check("no stray {placeholders} anywhere", !/\{(year|brand|amount|rate|years)\}/.test(d.body.textContent));

  /* ---------------------------------------------------------------- */
  console.log("\n[2] Calculator recalculates on input");
  $("#calcAmountNum").value = "20000";
  $("#calcAmountNum").dispatchEvent(new w.Event("input", { bubbles: true }));
  $("#calcYearsNum").value = "20";
  $("#calcYearsNum").dispatchEvent(new w.Event("input", { bubbles: true }));
  $("#calcRateNum").value = "12";
  $("#calcRateNum").dispatchEvent(new w.Event("input", { bubbles: true }));
  check("invested = ₹48,00,000 at 20k × 20y", $("#outInvested").textContent === "₹48,00,000", $("#outInvested").textContent);
  check("value = ₹1,97,85,107 at 12%", $("#outValue").textContent === "₹1,97,85,107", $("#outValue").textContent);
  check("scale cue switches to crore", /crore/.test($("#outValueWords").textContent), $("#outValueWords").textContent);
  check("slider mirrors the number box", $("#calcAmount").value === "20000", $("#calcAmount").value);

  console.log("\n[3] Boundary inputs are clamped");
  $("#calcAmountNum").value = "999999";
  $("#calcAmountNum").dispatchEvent(new w.Event("input", { bubbles: true }));
  $("#calcAmountNum").dispatchEvent(new w.Event("blur", { bubbles: true }));
  check("amount clamped to max 50000", $("#calcAmountNum").value == 50000, $("#calcAmountNum").value);
  $("#calcRateNum").value = "0";
  $("#calcRateNum").dispatchEvent(new w.Event("input", { bubbles: true }));
  check("0% → value equals contributions", $("#outValue").textContent === $("#outInvested").textContent,
        $("#outValue").textContent + " vs " + $("#outInvested").textContent);
  check("0% note revealed", !$("#calcZeroNote").hidden);
  $("#calcYearsNum").value = "1";
  $("#calcYearsNum").dispatchEvent(new w.Event("input", { bubbles: true }));
  check("year unit singular at 1", $("#calcYearsUnit").textContent === "year", $("#calcYearsUnit").textContent);

  /* ---------------------------------------------------------------- */
  console.log("\n[4] Language switching (hi / mr) preserves user input");
  $("#fName").value = "Test Person";
  $("#calcAmountNum").value = "7500";
  $("#calcAmountNum").dispatchEvent(new w.Event("input", { bubbles: true }));

  d.querySelector('.lang-btn[data-lang="hi"]').click();
  check("html lang → hi", d.documentElement.lang === "hi", d.documentElement.lang);
  check("h1 in Devanagari", /[ऀ-ॿ]/.test($("h1").textContent));
  check("FAQ answers translated", /[ऀ-ॿ]/.test($("#fa1 p").textContent));
  check("form labels translated", /[ऀ-ॿ]/.test(d.querySelector('label[for="fName"]').textContent));
  check("calculator disclaimer translated", /[ऀ-ॿ]/.test(d.querySelector(".disclaimer").textContent));
  check("name field NOT cleared by switch", $("#fName").value === "Test Person", $("#fName").value);
  check("calculator input NOT reset by switch", $("#calcAmountNum").value == 7500, $("#calcAmountNum").value);
  check("hi still shows Indian grouping", /₹/.test($("#outValue").textContent), $("#outValue").textContent);
  check("hi aria-label translated", /[ऀ-ॿ]/.test($("#navToggle").getAttribute("aria-label")), $("#navToggle").getAttribute("aria-label"));
  check("hi lang button marked pressed", d.querySelector('.lang-btn[data-lang="hi"]').getAttribute("aria-pressed") === "true");

  d.querySelector('.lang-btn[data-lang="mr"]').click();
  check("html lang → mr", d.documentElement.lang === "mr", d.documentElement.lang);
  check("mr h1 differs from hi h1", /[ऀ-ॿ]/.test($("h1").textContent));
  check("mr risk disclosure present", /बाजार जोखमीच्या अधीन/.test(d.querySelector(".foot-risk p").textContent));
  d.querySelector('.lang-btn[data-lang="en"]').click();
  check("back to en", d.documentElement.lang === "en" && /Working Hard/.test($("h1").textContent));

  /* ---------------------------------------------------------------- */
  console.log("\n[5] FAQ accordion");
  const q1 = d.querySelectorAll(".faq-q")[0], q2 = d.querySelectorAll(".faq-q")[1];
  check("all answers start collapsed", [...d.querySelectorAll(".faq-a")].every(p => p.hidden));
  q1.click();
  check("clicking opens item 1", q1.getAttribute("aria-expanded") === "true" && !$("#fa1").hidden);
  q2.click();
  check("opening item 2 closes item 1", q2.getAttribute("aria-expanded") === "true" && $("#fa1").hidden);
  q2.click();
  check("clicking again collapses", q2.getAttribute("aria-expanded") === "false" && $("#fa2").hidden);
  check("12 FAQ items present", d.querySelectorAll(".faq-item").length === 12, d.querySelectorAll(".faq-item").length);

  /* ---------------------------------------------------------------- */
  console.log("\n[6] Form validation");
  const form = $("#enquiryForm"), status = $("#formStatus");
  const submit = () => form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));

  $("#fName").value = ""; submit();
  check("empty form blocked", !$("#eName").hidden && !$("#eGoal").hidden && !$("#eConsent").hidden);
  check("status shows 'correct the highlighted fields'", /highlighted/.test(status.textContent), status.textContent);
  check("invalid field marked aria-invalid", $("#fName").getAttribute("aria-invalid") === "true");

  $("#fName").value = "Asha Kulkarni";
  $("#fMobile").value = "12345";
  submit();
  check("short Indian mobile rejected", !$("#eMobile").hidden);
  $("#fMobile").value = "5999999999"; submit();
  check("Indian mobile not starting 6-9 rejected", !$("#eMobile").hidden);
  $("#fMobile").value = "9876543210"; submit();
  check("valid Indian mobile accepted", $("#eMobile").hidden);

  $("#fEmail").value = "not-an-email"; submit();
  check("malformed email rejected", !$("#eEmail").hidden);
  $("#fEmail").value = ""; submit();
  check("blank email allowed (optional)", $("#eEmail").hidden);

  d.querySelector('input[name="contactMethod"][value="email"]').checked = true;
  d.querySelector('input[name="contactMethod"][value="phone"]').checked = false;
  submit();
  check("email contact method without an email is caught", !$("#eEmail").hidden);
  d.querySelector('input[name="contactMethod"][value="phone"]').checked = true;
  d.querySelector('input[name="contactMethod"][value="email"]').checked = false;

  $("#fGoal").value = "retirement"; submit();
  check("consent still required", !$("#eConsent").hidden);
  check("no success shown while invalid", !/successfully/.test(status.textContent), status.textContent);

  $("#fCode").value = "+44"; $("#fMobile").value = "7700900123"; submit();
  check("non-Indian code accepts its own format", $("#eMobile").hidden);
  $("#fCode").value = "+91"; $("#fMobile").value = "9876543210";

  /* ---------------------------------------------------------------- */
  console.log("\n[7] Submission paths are honest");
  $("#fConsent").checked = true;
  submit();
  check("no endpoint + no whatsapp → says nothing was sent", /not connected|were not sent/.test(status.textContent), status.textContent);
  check("…and does NOT claim success", !/successfully/i.test(status.textContent));
  check("…and keeps the entered values", $("#fName").value === "Asha Kulkarni" && $("#fMobile").value === "9876543210");

  /* WhatsApp fallback configured */
  dom.window.close();
  dom = await boot({ whatsappNumber: "919876543210" });
  w = dom.window; d = w.document; $ = s => d.querySelector(s);
  let opened = null;
  w.open = (url) => { opened = url; return { focus(){} }; };
  check("submit button switches to WhatsApp wording", /WhatsApp/.test($("#submitBtn .btn-label").textContent), $("#submitBtn .btn-label").textContent);
  check("WhatsApp hint shown", !$("#waHint").hidden);
  $("#fName").value = "Asha Kulkarni"; $("#fMobile").value = "9876543210";
  $("#fGoal").value = "retirement"; $("#fConsent").checked = true;
  $("#enquiryForm").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  check("opens a wa.me link", !!opened && opened.startsWith("https://wa.me/919876543210?text="), opened && opened.slice(0, 48));
  check("prefilled text carries the name", decodeURIComponent(opened || "").includes("Asha Kulkarni"));
  check("prefilled text carries the goal", decodeURIComponent(opened || "").includes("Retirement Planning"));
  check("status says WhatsApp opened, not 'submitted'", /WhatsApp has been opened/.test($("#formStatus").textContent) && !/successfully/.test($("#formStatus").textContent), $("#formStatus").textContent);

  /* Real endpoint: failure must not read as success; success only on 2xx */
  dom.window.close();
  dom = await boot({ enquiryEndpoint: "https://api.example.test/enquiry" });
  w = dom.window; d = w.document; $ = s => d.querySelector(s);
  const fill = () => { $("#fName").value="Asha Kulkarni"; $("#fMobile").value="9876543210"; $("#fGoal").value="tax"; $("#fConsent").checked=true; };
  let captured = null;
  w.fetch = (url, opts) => { captured = { url, opts }; return Promise.resolve({ ok:false, status:500 }); };
  fill(); $("#enquiryForm").dispatchEvent(new w.Event("submit", { bubbles:true, cancelable:true }));
  await new Promise(r => setTimeout(r, 60));
  check("POSTs to the configured endpoint", captured && captured.url === "https://api.example.test/enquiry" && captured.opts.method === "POST", captured && captured.url);
  check("payload is JSON with the expected fields", (() => {
    const b = JSON.parse(captured.opts.body);
    return b.name === "Asha Kulkarni" && b.mobile === "9876543210" && b.goal === "tax" && b.consent === true && b.language === "en" && !!b.submittedAt;
  })());
  check("HTTP 500 → error message, not success", /could not be submitted/.test($("#formStatus").textContent) && !/successfully/.test($("#formStatus").textContent), $("#formStatus").textContent);
  check("values preserved after failure", $("#fName").value === "Asha Kulkarni");

  w.fetch = () => Promise.reject(new Error("offline"));
  $("#enquiryForm").dispatchEvent(new w.Event("submit", { bubbles:true, cancelable:true }));
  await new Promise(r => setTimeout(r, 60));
  check("network failure → connection message, not success", /could not reach the server/.test($("#formStatus").textContent), $("#formStatus").textContent);

  w.fetch = () => Promise.resolve({ ok:true, status:200 });
  fill(); $("#enquiryForm").dispatchEvent(new w.Event("submit", { bubbles:true, cancelable:true }));
  await new Promise(r => setTimeout(r, 60));
  check("HTTP 200 → success message shown", /submitted successfully/.test($("#formStatus").textContent), $("#formStatus").textContent);
  check("form cleared after a genuine success", $("#fName").value === "");

  console.log("\n[8] Console cleanliness");
  const real = consoleErrors.filter(e => !/Could not parse CSS|Not implemented|fonts\.googleapis|css/i.test(e));
  check("no page errors raised", real.length === 0, real.slice(0, 4));

  console.log("\n  " + pass + " passed, " + fail + " failed\n");
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(1); });
