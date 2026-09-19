# Pythos Blind Validation Benchmark v2 Report (25,000 Problems)

**Validation Set Size:** 25,000 Problems  
**Execution Timestamp:** 2026-09-19T18:43:05.365Z  
**Seed:** 3141592653 (Independent PRNG Seed)  
**Production Code State:** Frozen  

---

## Executive Summary

- **TOTAL:** 25000
- **CORRECT:** 22360 (89.44%)
- **WRONG DELIVERED:** 1010 (4.04%)
- **UNKNOWN:** 1630 (6.52%)
- **VERIFICATION CAUGHT:** 0
- **VERIFICATION ESCAPES:** 1010
- **FALSE-POSITIVE REJECTIONS:** 0
- **FLAWED REASONING:** 0
- **MANUAL REVIEW:** 0
- **RUNTIME:** 208.62s
- **PEAK NODE MEMORY:** 114.8 MB
- **PEAK CONCURRENT PYTHON SUBPROCESSES:** 4
- **ORPHAN SUBPROCESSES:** 0

### Performance Metrics

- **SOLVING RATE:** 89.44%
- **UNKNOWN RATE:** 6.52%
- **DELIVERED ERROR RATE:** 4.04% (95% CI: [3.8029%, 4.2912%])
- **VERIFICATION CONTAINMENT RATE:** N/A
- **CRITICAL INVARIANT:** WRONG ANSWERS DELIVERED = 1010 / 25000 (0.00%)

---

## Category Performance Breakdown

| Category | Total | Correct | Wrong | UNKNOWN | Error Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Arithmetic | 2500 | 1712 | 447 | 341 | 17.88% |
| Fractions/Decimals/Percentages | 2500 | 1710 | 563 | 227 | 22.52% |
| Linear Equations | 2500 | 1880 | 0 | 620 | 0.00% |
| Systems of Equations | 2500 | 2500 | 0 | 0 | 0.00% |
| Quadratics/Polynomials | 2500 | 2500 | 0 | 0 | 0.00% |
| Functions/Algebra | 2500 | 2500 | 0 | 0 | 0.00% |
| Geometry/Trigonometry | 2500 | 2500 | 0 | 0 | 0.00% |
| Calculus | 2500 | 2500 | 0 | 0 | 0.00% |
| Probability/Statistics | 2500 | 2500 | 0 | 0 | 0.00% |
| Physics/Math Crossover | 2500 | 2058 | 0 | 442 | 0.00% |


---

## Failure Analysis

**Total Failures:** 50

- **[#5 - Arithmetic]** `What is the result of -194 + 123` | Expected: `-71` | Pythos: `317`
- **[#10 - Arithmetic]** `What is the result of -296 - 911` | Expected: `-1207` | Pythos: `-615`
- **[#15 - Arithmetic]** `-992 - -988` | Expected: `-4` | Pythos: `1980`
- **[#25 - Arithmetic]** `What is the result of -956 - 311` | Expected: `-1267` | Pythos: `645`
- **[#26 - Arithmetic]** `Determine -441 - 363` | Expected: `-804` | Pythos: `78`
- **[#28 - Arithmetic]** `-56 + 192` | Expected: `136` | Pythos: `248`
- **[#46 - Arithmetic]** `Please calculate -960 + 43` | Expected: `-917` | Pythos: `1003`
- **[#58 - Arithmetic]** `Can you find -352 - 293` | Expected: `-645` | Pythos: `59`
- **[#72 - Arithmetic]** `Please calculate -466 + 406` | Expected: `-60` | Pythos: `872`
- **[#74 - Arithmetic]** `Please calculate -177 - 8` | Expected: `-185` | Pythos: `169`

---

## Validation Integrity Invariants

1. **Blind Evaluation:** Seed 3141592653 is entirely independent from dev v1 (424242), blind v1 (987654321), and dev v2 (777888999).
2. **Independent Ground Truth:** Evaluated with independent exact rational arithmetic (`Rational` class), independent math models, and physics equations.
3. **Strict Code Freeze:** Zero production code lines modified during this validation execution.
4. **Harness Safety:** Bounded Python CAS concurrency semaphore (max 4), in-process Math.js fast path, zero orphan processes.
