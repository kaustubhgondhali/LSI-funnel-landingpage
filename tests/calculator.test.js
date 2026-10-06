/* Calculator test harness — run with:  node tests/calculator.test.js
   Verifies the SIP future-value function against values computed independently. */

function sipFutureValue(monthly, years, annualRatePct, timing) {
  var n = Math.round(years * 12);
  var i = (annualRatePct / 100) / 12;
  if (n <= 0) return 0;
  if (i === 0) return monthly * n;
  var fv = monthly * ((Math.pow(1 + i, n) - 1) / i);
  if (timing === "begin") fv *= (1 + i);
  return fv;
}

/* Expected values computed independently (see tests/reference.py) */
var cases = [
  // monthly, years, rate, timing, expectedFV (from tests/reference.py), label
  [500, 1, 0, "end", 6000, "minimum amount, 1 yr, 0% → equals contributions"],
  [50000, 30, 15, "end", 346163981, "maximum of every input"],
  [5000, 10, 8, "end", 914730, "default assumptions"],
  [5000, 10, 8, "begin", 920828, "default assumptions, annuity due"],
  [500, 30, 15, "end", 3461640, "min amount, max duration and rate"],
  [50000, 1, 0, "end", 600000, "max amount, 0% → equals contributions"],
  [10000, 15, 12, "end", 4995802, "representative mid-range"],
  [2500, 5, 7.5, "end", 181318, "half-step rate"]
];

var pass = 0, fail = 0;
cases.forEach(function (c) {
  var got = Math.round(sipFutureValue(c[0], c[1], c[2], c[3]));
  var want = c[4];
  // allow 1 rupee of rounding drift against the reference implementation
  var ok = Math.abs(got - want) <= 1;
  console.log((ok ? "  PASS  " : "  FAIL  ") +
    "₹" + c[0] + "/mo, " + c[1] + "y, " + c[2] + "%, " + c[3] +
    "  → " + got + (ok ? "" : "   expected " + want) + "   (" + c[5] + ")");
  ok ? pass++ : fail++;
});

/* Invariants that must hold for every input in range */
var invariantFails = 0;
for (var a = 500; a <= 50000; a += 2450) {
  for (var y = 1; y <= 30; y += 3) {
    for (var r = 0; r <= 15; r += 1.5) {
      var fv = sipFutureValue(a, y, r, "end");
      var invested = a * y * 12;
      if (fv < invested - 0.01) { invariantFails++; console.log("  FAIL  value below contributions:", a, y, r); }
      if (r === 0 && Math.abs(fv - invested) > 0.01) { invariantFails++; console.log("  FAIL  0% not equal to contributions:", a, y); }
      if (!isFinite(fv)) { invariantFails++; console.log("  FAIL  non-finite:", a, y, r); }
      if (sipFutureValue(a, y, r, "begin") < fv - 0.01) { invariantFails++; console.log("  FAIL  annuity-due below ordinary:", a, y, r); }
    }
  }
}
console.log("\n  Invariant sweep over the full input range: " +
            (invariantFails === 0 ? "PASS" : invariantFails + " failures"));

/* Step-up illustration — same function as js/main.js (stepUpSip) */
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

/* Rows of the printed chart at 12% p.a. / 10% step-up (all 30 are checked in
   tests/reference.py): monthly, years, flat value, step-up invested, step-up value */
var poster = [
  [2000, 5, 162207, 146522, 193836],
  [2000, 30, 6161946, 3947857, 15971553],
  [5000, 15, 2379657, 1906349, 4137359],
  [10000, 10, 2240359, 1912491, 3268898],
  [10000, 20, 9198574, 6873000, 18631383],
  [15000, 20, 13797860, 10309500, 27947075],
  [20000, 25, 34044131, 23603294, 78710036],
  [20000, 30, 61619464, 39478565, 159715526]
];
console.log("");
poster.forEach(function (c) {
  var flat = stepUpSip(c[0], c[1], 12, 0), up = stepUpSip(c[0], c[1], 12, 10);
  var got = [Math.round(flat.value), Math.round(up.invested), Math.round(up.value)];
  var ok = got.every(function (g, idx) { return Math.abs(g - c[2 + idx]) <= 1; });
  console.log((ok ? "  PASS  " : "  FAIL  ") + "step-up ₹" + c[0] + "/mo, " + c[1] + "y  → " +
              got.join(" / ") + (ok ? "" : "   expected " + c.slice(2).join(" / ")));
  ok ? pass++ : fail++;
});

console.log("\n  " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 && invariantFails === 0 ? 0 : 1);
