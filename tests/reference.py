"""Independent reference for the SIP future-value figures used in
tests/calculator.test.js. Written from the annuity formula directly,
with Decimal arithmetic, so it is not a copy of the JS implementation."""
from decimal import Decimal, getcontext
getcontext().prec = 40

def fv(monthly, years, rate_pct, timing="end"):
    P = Decimal(str(monthly)); n = int(round(years*12))
    i = Decimal(str(rate_pct))/Decimal(100)/Decimal(12)
    if i == 0:
        return P*n
    out = P*(((Decimal(1)+i)**n - Decimal(1))/i)
    if timing == "begin":
        out *= (Decimal(1)+i)
    return out

cases = [(500,1,0,"end"),(50000,30,15,"end"),(5000,10,8,"end"),(5000,10,8,"begin"),
         (500,30,15,"end"),(50000,1,0,"end"),(10000,15,12,"end"),(2500,5,7.5,"end")]
for c in cases:
    print(f"{c[0]:>6} /mo  {c[1]:>2}y  {c[2]:>4}%  {c[3]:<5} -> {round(fv(*c)):>12,}")

# --- Step-up illustration (the printed 12% / 10% step-up chart) -------------
# Method of the printed chart: the annual rate is an EFFECTIVE annual rate,
# instalments are invested at the start of each month, and with step-up the
# monthly amount rises every 12 months.
def stepup(monthly, years, rate_pct, step_pct):
    i = (Decimal(1) + Decimal(str(rate_pct))/100) ** (Decimal(1)/Decimal(12)) - 1
    grow = Decimal(1) + Decimal(str(step_pct))/100
    m = Decimal(str(monthly)); value = invested = Decimal(0)
    for _ in range(years):
        for _ in range(12):
            value = (value + m) * (1 + i); invested += m
        m *= grow
    return invested, value

# Every row of the printed chart: monthly, years, flat value, step-up invested, step-up value
poster = [
    (2000, 5, 162207, 146522, 193836), (2000, 10, 448072, 382498, 653780),
    (2000, 15, 951863, 762540, 1654944), (2000, 20, 1839715, 1374600, 3726277),
    (2000, 25, 3404413, 2360329, 7871004), (2000, 30, 6161946, 3947857, 15971553),
    (5000, 5, 405518, 366306, 484590), (5000, 10, 1120179, 956245, 1634449),
    (5000, 15, 2379657, 1906349, 4137359), (5000, 20, 4599287, 3436500, 9315692),
    (5000, 25, 8511033, 5900824, 19677509), (5000, 30, 15404866, 9869641, 39928881),
    (10000, 5, 811036, 732612, 969179), (10000, 10, 2240359, 1912491, 3268898),
    (10000, 15, 4759314, 3812698, 8274718), (10000, 20, 9198574, 6873000, 18631383),
    (10000, 25, 17022066, 11801647, 39355018), (10000, 30, 30809732, 19739283, 79857763),
    (15000, 5, 1216554, 1098918, 1453769), (15000, 10, 3360538, 2868736, 4903348),
    (15000, 15, 7138971, 5719047, 12412077), (15000, 20, 13797860, 10309500, 27947075),
    (15000, 25, 25533099, 17702471, 59032527), (15000, 30, 46214598, 29608924, 119786644),
    (20000, 5, 1622072, 1465224, 1938359), (20000, 10, 4480718, 3824982, 6537797),
    (20000, 15, 9518628, 7625396, 16549436), (20000, 20, 18397147, 13746000, 37262767),
    (20000, 25, 34044131, 23603294, 78710036), (20000, 30, 61619464, 39478565, 159715526),
]
print("\nStep-up illustration vs the printed chart (12% p.a., 10% step-up):")
bad = 0
for P, Y, flat_v, step_inv, step_v in poster:
    _, fv = stepup(P, Y, 12, 0)
    si, sv = stepup(P, Y, 12, 10)
    got = (round(fv), round(si), round(sv))
    ok = all(abs(g - w) <= 1 for g, w in zip(got, (flat_v, step_inv, step_v)))
    bad += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {P:>6}/mo {Y:>2}y  flat {got[0]:>12,}  step-up invested {got[1]:>12,}  value {got[2]:>12,}")
print(f"{len(poster) - bad} of {len(poster)} rows match the printed chart")
