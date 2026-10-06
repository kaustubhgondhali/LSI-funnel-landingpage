/* =============================================================================
   Lord Sai — SIP Landing Page Funnel
   config.js — the ONLY file you need to edit to go live.
   -----------------------------------------------------------------------------
   Nothing below is faked. If a value is left empty, the page hides the related
   element (or, for the enquiry form, tells the visitor it cannot submit yet)
   rather than pretending something works.
   ========================================================================== */

window.LS_CONFIG = {

  /* ---------------------------------------------------------------------------
     1. ENQUIRY DESTINATION  — REQUIRED before the form can accept leads
     ---------------------------------------------------------------------------
     Put the URL of YOUR existing enquiry endpoint here. It must accept a
     POST with a JSON body and return HTTP 2xx on success.

     Examples:
       "/api/enquiry"                                  (your own backend)
       "https://your-domain.com/wp-json/contact/v1/send"
       "https://formspree.io/f/xxxxxxx"                (third-party form service)

     The page POSTs this JSON shape:
       { name, countryCode, mobile, email, goal, investmentRange,
         contactMethod, contactTime, consent, language, pageUrl, submittedAt }

     SECURITY: never put an API key or secret in this file — it is public.
     If your endpoint needs a secret, keep it on the server side.

     Leave as "" while the backend is not ready. The form will then validate
     normally but show an honest "cannot be submitted yet" message on submit
     (and offer the WhatsApp fallback below, if configured).
  --------------------------------------------------------------------------- */
  enquiryEndpoint: "",

  /* Extra non-secret headers for the POST, if your endpoint needs them. */
  enquiryHeaders: {},

  /* ---------------------------------------------------------------------------
     2. WHATSAPP FALLBACK  (optional but recommended)
     ---------------------------------------------------------------------------
     Country code + number, digits only, no "+" and no spaces.
     Example for India: "919876543210"

     When `enquiryEndpoint` is empty, the form opens WhatsApp with the
     visitor's details pre-filled so the enquiry genuinely reaches you.
     The button text says exactly that — it does not claim the form was
     "submitted" to a server.
  --------------------------------------------------------------------------- */
  whatsappNumber: "",

  /* ---------------------------------------------------------------------------
     3. PUBLIC CONTACT DETAILS  (optional)
     Any field left empty is simply not rendered. Do not invent values.
  --------------------------------------------------------------------------- */
  contactPhone: "",          // e.g. "+91 98765 43210"
  contactEmail: "",          // e.g. "info@lordsai.in"
  contactAddress: "",        // e.g. "Ulwe, Navi Mumbai, Maharashtra"

  /* ---------------------------------------------------------------------------
     4. LEGAL / POLICY LINKS  (optional)
     Point these at your EXISTING published pages. Empty links are hidden —
     the page will not link to a policy that does not exist.
  --------------------------------------------------------------------------- */
  privacyPolicyUrl: "",      // e.g. "/privacy-policy.html"
  termsUrl: "",              // e.g. "/terms.html"

  /* ---------------------------------------------------------------------------
     5. BRAND / LEGAL FOOTER LINE
     Shown as the copyright line. Year is appended automatically.
  --------------------------------------------------------------------------- */
  brandName: "Lord Sai Investment & Share Market Academy",

  /* ---------------------------------------------------------------------------
     6. CALCULATOR DEFAULTS
     The default rate matches the 12% p.a. used on the printed SIP chart.
     It is an illustration, not a projection — visitors can change it.
     (The live defaults are the value="" attributes on the inputs in index.html;
     keep these in step with them.)
  --------------------------------------------------------------------------- */
  calculator: {
    amount:      { min: 500,  max: 50000, step: 500, value: 5000 },
    years:       { min: 1,    max: 30,    step: 1,   value: 10   },
    rate:        { min: 0,    max: 15,    step: 0.5, value: 12   },
    // "end"  = contribution invested at the END of each month (ordinary annuity)
    // "begin"= contribution invested at the START of each month (annuity due)
    contributionTiming: "end"
  },

  /* ---------------------------------------------------------------------------
     7. SIP GROWTH ILLUSTRATION  (the section under the hero)
     ---------------------------------------------------------------------------
     Mirrors the printed Lord Sai "SIP Wealth Creation Illustration" chart.
     Keep `rate` and `stepUp` equal to the printed chart so the page and the
     poster always show the same figures. `amount` and `years` pick the
     combination shown first and must match one of the buttons on the page
     (₹2,000 / 5,000 / 10,000 / 15,000 / 20,000 and 5–30 years).
  --------------------------------------------------------------------------- */
  growth: {
    rate:   12,      // assumed annual return, % p.a. — an illustration, not a forecast
    stepUp: 10,      // yearly increase of the monthly SIP, %
    amount: 10000,
    years:  20
  },

  /* ---------------------------------------------------------------------------
     8. DISTRIBUTOR DETAILS  (shown under the growth illustration)
     Any field left empty is simply not rendered.
  --------------------------------------------------------------------------- */
  distributor: {
    name:  "Vaibhav S. Pawar",
    arn:   "ARN-280789",
    phone: "+91 99202 54354"
  },

  /* ---------------------------------------------------------------------------
     9. LANGUAGE
  --------------------------------------------------------------------------- */
  defaultLanguage: "en",     // must be one of: en, hi, mr
  persistLanguage: true      // remembers choice in localStorage only
};
