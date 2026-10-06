# Lord Sai — SIP Landing Page Funnel

A standalone three-phase SIP landing page in **plain HTML, CSS and JavaScript**.
No framework, no build step, no package install. Open `index.html` and it runs.

---

## 1. Quick start

1. Unzip the folder.
2. Open `js/config.js` and fill in **at minimum** `enquiryEndpoint` *or* `whatsappNumber`
   (see §3 — until you do, the form will not accept leads and says so plainly).
3. Upload the whole folder to your web host, or open `index.html` directly.

To preview locally with a server (needed only if your browser blocks `file://` fetches):

```bash
cd lord-sai-sip
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

## 2. Files

```
lord-sai-sip/
├── index.html                      the whole page (all 15 sections)
├── css/
│   └── styles.css                  all styling, brand tokens at the top
├── js/
│   ├── config.js                   ← THE ONLY FILE YOU NEED TO EDIT
│   ├── i18n.js                     en / hi / mr dictionary (303 keys each)
│   └── main.js                     calculator, language switch, FAQ, form
├── assets/
│   ├── lord-sai-secondary.jpg      original supplied file, unmodified
│   ├── lord-sai-secondary-480.jpg  resized for the trust section
│   ├── lord-sai-secondary-220.jpg  resized for header / footer
│   ├── nj-wealth.jpg               original supplied file, unmodified
│   ├── nj-wealth-540.jpg           resized for the trust section
│   └── nj-wealth-300.jpg           resized for header / footer
├── tests/
│   ├── calculator.test.js          SIP maths, run: node tests/calculator.test.js
│   ├── integration.test.js         full DOM test (needs jsdom)
│   └── reference.py                independent Python check of the maths
└── README.md
```

---

## 3. Connecting the enquiry form  ⚠️ required before going live

The form is **deliberately not wired to anything** out of the box, and it never
pretends otherwise. Open `js/config.js` and set one of:

**Option A — your own backend (recommended)**

```js
enquiryEndpoint: "/api/enquiry",
```

It must accept `POST` with `Content-Type: application/json` and return **HTTP 2xx on
success**. The body sent is:

```json
{
  "name": "...", "countryCode": "+91", "mobile": "9876543210",
  "email": "...", "goal": "retirement", "goalLabel": "Retirement Planning",
  "investmentRange": "5000-10000", "rangeLabel": "₹5,000 – ₹10,000",
  "contactMethod": "whatsapp", "contactMethodLabel": "WhatsApp",
  "contactTime": "evening", "contactTimeLabel": "Evening (4 pm – 8 pm)",
  "consent": true, "language": "en",
  "pageUrl": "https://...", "submittedAt": "2026-10-02T10:30:00.000Z"
}
```

The success message appears **only** on a genuine 2xx. On any other response, or a
network failure, the visitor sees an error and **their typed values stay in the form**.

**Option B — WhatsApp handover**

```js
whatsappNumber: "919876543210",   // country code + number, digits only
```

The submit button then reads “Send My Enquiry on WhatsApp”, opens WhatsApp with the
details written out, and tells the visitor they still need to press send. It never
claims the enquiry was submitted to a server.

**If neither is set**, the form validates normally and then tells the visitor that
nothing was sent or stored. That is intentional — it is not a bug.

> **Server-side validation is still your job.** The page validates in the browser,
> which is a convenience, not a security control. Validate again on the server.
> Never put an API key in `config.js` — that file is public.

### Other optional config

`contactPhone`, `contactEmail`, `contactAddress`, `privacyPolicyUrl`, `termsUrl`.
Anything left empty is **hidden rather than faked** — the footer will not show a
phone number you have not supplied, and will not link to a policy page that does not exist.

`growth` sets the SIP growth illustration under the hero (assumed return, yearly
step-up, and the amount/duration shown first) — keep `rate` and `stepUp` equal to the
printed chart. `distributor` sets the name, ARN and mobile shown beneath it; an empty
field is not rendered.

---

## 4. Brand colours — black & gold, matched to the SIP poster

The page uses the dark black-and-gold look of the Lord Sai SIP poster: a near-black
background with warm wood and foliage glows, uppercase metallic-gold headlines, gold
hairline dividers, gold-outlined panels and gold pill buttons. The gold family comes
from the Lord Sai badge. Tokens live at the top of `css/styles.css`.

| Token | Value | Use |
|---|---|---|
| `--gold` | `#E3A93C` | accents, borders, chart "growth" colour |
| `--gold-light` | `#F6D27A` | gold text on the dark page (12:1) |
| `--gold-deep` | `#B97F1F` | shadow end of the metallic ramp |
| `--gold-text` | gradient | headline fill (each line gets its own sheen) |
| `--gold-fill` | gradient | buttons, active chips, the headline calculator figure |
| `--on-gold` | `#1B1307` | text on gold fills (11:1) |
| `--ink` | `#0A0907` | page background (the badge's own black, warmed) |
| `--text` | `#F4EFE6` | main text (17:1) |
| `--text-2` | `#D2CABB` | lead paragraphs (12:1) |
| `--muted` | `#A69E90` | secondary text (7:1) |
| `--neutral-bar` | `#6E675C` | chart "your contributions" colour |
| `--nj-red` | `#ED1C26` | risk-disclosure accents only |

Headlines use **Poppins** (bold, uppercase); body text uses **Inter**. Hindi and Marathi
use Noto Sans Devanagari for both.

The dark bands use a brush-stroke gold button, a faint gold growth chart, and (in the
final band) a faint mountain silhouette. These are decorative CSS backgrounds and masks,
not images, so there is nothing extra to upload.

### Logo handling

Both logos are the **original supplied files**, copied in untouched and only resized
proportionally. Neither was recoloured, cropped, redrawn or traced.

The Lord Sai badge is gold on black and sits on a dark rounded plate (`.logo-plate`)
with a thin gold hairline and glow — a backing panel, not an edit to the artwork. The NJ
logo has its own white background, so on the dark page it sits on a small white tile.

---

## 5. Language switching

- Codes: `en` (default), `hi`, `mr`. English always wins if no valid preference exists.
- Every string lives once in `js/i18n.js`; the page is authored once and labelled with
  `data-i18n` / `data-i18n-attr`. The page is **not** duplicated three times.
- Switching updates everything instantly — nav, headings, cards, calculator labels and
  disclaimers, all form labels, placeholders, validation messages and submission states,
  all 12 FAQs, the footer, and `aria-label`s.
- **Switching never resets the calculator or clears the form.** This is covered by tests.
- Choice is remembered in `localStorage` (`persistLanguage: false` turns that off).
  Hindi and Marathi render in Noto Sans Devanagari for headings and body alike.

To edit copy, change the string in `js/i18n.js` — in all three languages. A key present
in English but missing elsewhere is reported in the browser console on load.

---

## 6. The calculator

Ordinary annuity, contributions at the **end** of each month, compounded monthly:

```
FV = P × [ (1 + i)ⁿ − 1 ] ÷ i        i = annual rate ÷ 12,  n = years × 12
```

The timing is stated on the page and the formula is shown in a “Formula used” panel.
To switch to start-of-month, set `contributionTiming: "begin"` in `config.js` — the
label, the formula shown and the maths all change together, so the two can never drift
apart. The same function drives the compounding comparison, so the two sections cannot
contradict each other.

Defaults are ₹5,000 / 10 years / 12% — the same assumed return as the printed SIP chart.
They are set by the `value` attributes on the calculator inputs in `index.html`; every
input remains the visitor's to change.

### The SIP growth illustration (under the hero)

This section reproduces the printed “SIP Wealth Creation Illustration” chart
(12% p.a., 10% yearly step-up) and uses **the chart's own method**, so the page and the
poster show identical figures:

- the assumed rate is an *effective* annual rate — monthly rate `i = (1 + r)^(1/12) − 1`
- each instalment is invested at the **start** of the month
- with step-up, the monthly amount rises by the step-up % every 12 months

That is a different convention from the calculator above, and it gives slightly lower
figures at the same rate. The section's assumption line says so in all three languages.
Every figure is calculated, not typed in — two cells in the printed chart's
“SIP annual step-up” column (₹10,000 × 10 yrs and ₹15,000 × 20 yrs) repeat the invested
amount by mistake; the page shows the correct gains.

---

## 7. Tests

```bash
node tests/calculator.test.js     # no dependencies
python3 tests/reference.py        # independent cross-check of the maths
```

`reference.py` also checks all 30 rows of the printed step-up chart against an
independent Decimal implementation of the illustration's method.

`tests/integration.test.js` loads the real page and scripts in a DOM and exercises
language switching, the calculator, the FAQ and every form path. It needs jsdom:

```bash
npm install jsdom && node tests/integration.test.js
```

---

## 8. Compliance notes — please keep these

The copy was written to avoid the things that get financial pages into trouble.
If you edit it, keep these intact:

- The SEBI-standard risk line appears in the trust block and the footer, in all three languages.
- Every figure is labelled illustrative or hypothetical. Nothing is shown as past performance.
- Nothing guarantees returns, protects capital, or promises a goal will be met.
- NJ is described as a financial products distributors network — **never** as a regulator,
  a government body, or a guarantor. There is an explicit line saying neither logo is a
  regulator's mark or a guarantee.
- No testimonials, client counts, years of experience, awards or registration numbers
  appear anywhere, because none were verifiable from the supplied materials. Add them
  only if you can substantiate them.
- The consent checkbox is **not** pre-ticked. Please keep it that way.
- Tax benefits are described as depending on current rules and individual circumstances.

The privacy wording references “the applicable privacy notice”. Once you publish a real
privacy policy, set `privacyPolicyUrl` so the links appear and the wording is backed by
an actual document.

---

## 9. Browser support

Current Chrome, Edge, Firefox and Safari, mobile and desktop. Uses `fetch`,
CSS custom properties, `:has()` (progressive — the radio highlight is cosmetic) and
`backdrop-filter` (cosmetic). No polyfills needed. If `localStorage` is blocked, the
page still works and simply defaults to English.
