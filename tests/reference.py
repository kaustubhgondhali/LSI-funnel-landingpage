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
