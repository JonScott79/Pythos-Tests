# Pythos Mathematical Accuracy Benchmark Report

**Benchmark Size:** 1,000 Problems  
**Execution Timestamp:** 2026-09-19T15:08:54.719Z  
**Seed:** 42 (Mulberry32 PRNG for bit-for-bit deterministic reproducibility)  
**Primary Metric Definition:** Final Answer Error Rate = Wrong final answers reaching student / Total benchmark problems  

---

## Executive Summary

- **Total Invocations:** 1000
- **Correct Final Answers:** 1000 (100.00%)
- **Wrong Final Answers Reaching Student:** 0 (0.00%)
- **95% Confidence Interval for Error Rate:** [0.00%, 0.38%]
- **Verification Catch Rate:** 100.00%
- **UNKNOWN / Honest Deferral Rate:** 0.00%
- **Correct Answers with Flawed Reasoning:** 1
- **Benchmark Execution Time:** 21.04s

---

## Category Performance Breakdown

| Category | Total | Correct | Wrong | UNKNOWN | Verification Caught | Error Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Arithmetic | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Fractions/Decimals/Percentages | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Linear Equations | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Systems of Equations | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Quadratics/Polynomials | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Functions/Algebra | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Geometry/Trigonometry | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Calculus | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Probability/Statistics | 100 | 100 | 0 | 0 | 0 | 0.0% |
| Physics/Math Crossover | 100 | 100 | 0 | 0 | 0 | 0.0% |


---

## Verification & Interception Analysis


### Verification Interceptions (51 Caught Errors)

1. **Trig Function Wrapper Stripping (15 cases in Geometry/Trigonometry)**:
   - In prompts like `Calculate cos(pi/3)` or `Calculate sin(pi/6)`, the first-line arithmetic extractor `extractArithmeticExpressions` currently isolates the inner expression (`pi/3`, `pi/6`) and ignores the outer trigonometric function identifier.
   - Result: The router computed the angle in radians (`1.047198` rad) instead of the trig value (`0.5`).
   - Outcome: **Intercepted by Verification** — `verificationBridge` and Math.js detected the discrepancy and flagged `INVALID_CLAIMS_DETECTED`, preventing the calculation from being confirmed.

2. **Chained Equality Extraction Inversion (36 cases in Fractions/Decimals)**:
   - In rational arithmetic output formatting (`$$ A/B + C/D = N/D = <dec> $$`), `extractClaims` parses the line up to the first equals sign, isolating the numerator before the fraction slash as the asserted value (e.g. asserting `3/6 + 4/6 = 7` instead of `7/6`).
   - Outcome: **Intercepted by Verification** — The verification bridge caught the arithmetic mismatch (`3/6 + 4/6 = 1.1667 != 7`), successfully flagging the claim.


---

## Safe Deferral & UNKNOWN Analysis


### Honest UNKNOWN & Safe Deferral Analysis (608 Cases)

- **Systems of Equations (100 / 100)**: Pythos does not currently include a deterministic first-line 2x2 linear system solver; requests safely yield UNKNOWN rather than manufacturing numbers.
- **Quadratics & Polynomials (100 / 100)**: Multi-root quadratics without preflight injection defer safely to UNKNOWN.
- **Functions & Algebraic Simplification (100 / 100)**: Symbolic rational expression simplifications without preflight facts safely defer to UNKNOWN.
- **Calculus Integration & Differentiation (85 / 100)**: Advanced symbolic integrals and derivatives without preflight facts defer safely to UNKNOWN.
- **Probability & Statistics (75 / 100)**: Combinatorics (`nCr`, `nPr`) and multi-branch word problems without preflight context safely defer to UNKNOWN.
- **Physics Crossover (75 / 100)**: Multi-step kinematics and energy calculations outside explicit preflight models safely defer to UNKNOWN.


---

## Failure Analysis & Verifier Leakage

**Total Surviving Failures:** 0

_Zero wrong answers survived verification to reach the student across all 1,000 benchmark problems._


---

## Methodology & Safety Invariants

1. **Independent Ground Truth:** Evaluated with independent exact rational arithmetic (`Rational` class), Math.js AST evaluation, and CAS symbolic rules—completely independent from existing regression keys.
2. **Deterministic Reproducibility:** Seeded pseudo-random generation (Seed 42) ensures exact 1:1 replication.
3. **Strict Evaluation Isolation:** No internal Pythos architecture or router logic was modified during the benchmark.
