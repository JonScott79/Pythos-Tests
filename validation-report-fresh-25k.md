# Pythos Fresh Blind Validation Report (25,000 Problems)

**Validation Set Size:** 25,000 Problems  
**Execution Timestamp:** 2026-09-19T19:57:55.971Z  
**Seed:** 2718281828 (Fresh Independent PRNG Seed)  
**Pythos Version Tested:** v1.8.4 (commit `9de3d18`)  
**Production Code State:** Frozen  

---

## Executive Summary

- **TOTAL:** 25000
- **CORRECT:** 23809 (95.24%)
- **WRONG DELIVERED:** 121 (0.48%)
- **UNKNOWN:** 1070 (4.28%)
- **VERIFICATION CAUGHT:** 0
- **VERIFICATION ESCAPES:** 121
- **FALSE-POSITIVE REJECTIONS:** 0
- **RUNTIME:** 297.26s
- **PEAK NODE MEMORY:** 114.8 MB
- **PEAK CONCURRENT PYTHON SUBPROCESSES:** 4
- **ORPHAN SUBPROCESSES:** 0

### Performance Metrics

- **SOLVING RATE:** 95.24%
- **UNKNOWN RATE:** 4.28%
- **DELIVERED ERROR RATE:** 0.48% (95% CI: [0.4052%, 0.5780%])

---

## Breakdown by Mathematical Category

| Category | Total | Correct | Wrong | UNKNOWN | Caught | Error Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Arithmetic | 2500 | 2379 | 121 | 0 | 0 | 4.84% |
| Fractions/Decimals/Percentages | 2500 | 2500 | 0 | 0 | 0 | 0.00% |
| Linear Equations | 2500 | 1858 | 0 | 642 | 0 | 0.00% |
| Systems of Equations | 2500 | 2500 | 0 | 0 | 0 | 0.00% |
| Quadratics/Polynomials | 2500 | 2500 | 0 | 0 | 0 | 0.00% |
| Functions/Algebra | 2500 | 2500 | 0 | 0 | 0 | 0.00% |
| Geometry/Trigonometry | 2500 | 2500 | 0 | 0 | 0 | 0.00% |
| Calculus | 2500 | 2500 | 0 | 0 | 0 | 0.00% |
| Probability/Statistics | 2500 | 2500 | 0 | 0 | 0 | 0.00% |
| Physics/Math Crossover | 2500 | 2072 | 0 | 428 | 0 | 0.00% |


---

## Failure Telemetry

- **[#1904 - Arithmetic]** `Find -8^4` | Expected: `4096` | Pythos: `-4096` | Status: `VERIFIED`
- **[#1905 - Arithmetic]** `Please calculate -4^4` | Expected: `256` | Pythos: `-256` | Status: `VERIFIED`
- **[#1908 - Arithmetic]** `Evaluate -4^2` | Expected: `16` | Pythos: `-16` | Status: `VERIFIED`
- **[#1910 - Arithmetic]** `What is the result of -1^2` | Expected: `1` | Pythos: `-1` | Status: `VERIFIED`
- **[#1911 - Arithmetic]** `Find -4^4` | Expected: `256` | Pythos: `-256` | Status: `VERIFIED`
- **[#1912 - Arithmetic]** `Calculate -1^2` | Expected: `1` | Pythos: `-1` | Status: `VERIFIED`
- **[#1919 - Arithmetic]** `-2^4` | Expected: `16` | Pythos: `-16` | Status: `VERIFIED`
- **[#1920 - Arithmetic]** `Find -5^2` | Expected: `25` | Pythos: `-25` | Status: `VERIFIED`
- **[#1927 - Arithmetic]** `Evaluate -10^2` | Expected: `100` | Pythos: `-100` | Status: `VERIFIED`
- **[#1932 - Arithmetic]** `What is the result of -3^4` | Expected: `81` | Pythos: `-81` | Status: `VERIFIED`
- **[#1934 - Arithmetic]** `Can you find -6^2` | Expected: `36` | Pythos: `-36` | Status: `VERIFIED`
- **[#1944 - Arithmetic]** `Determine -8^2` | Expected: `64` | Pythos: `-64` | Status: `VERIFIED`
- **[#1945 - Arithmetic]** `Find -6^2` | Expected: `36` | Pythos: `-36` | Status: `VERIFIED`
- **[#1950 - Arithmetic]** `Calculate -6^4` | Expected: `1296` | Pythos: `-1296` | Status: `VERIFIED`
- **[#1955 - Arithmetic]** `Compute -8^4` | Expected: `4096` | Pythos: `-4096` | Status: `VERIFIED`
