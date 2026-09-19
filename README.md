# Pythos-Tests

Benchmark, validation, and forensic test infrastructure for the [Pythos](https://github.com/JonScott79/Pythos) mathematical reasoning and verification engine.

---

## 1. Purpose

`Pythos-Tests` separates large-scale statistical validation, adversarial stress batteries, and forensic error diagnostics from the core production Pythos application repository. This repository preserves historical ground-truth benchmark runs, frozen validation evidence, and test generation harnesses.

---

## 2. Frozen Historical Evidence Policy

The Blind Validation v2 dataset and output files represent permanent forensic evidence and **MUST NOT** be modified, regenerated, or re-scored.

### Frozen Blind Validation v2 Results
- **Problems**: 25,000 unique instances
- **Random Seed**: `3141592653`
- **Correct**: 22,360 (89.44%)
- **Wrong Delivered**: 1,010 (4.04%)
- **Unknown (Refused / Fallthrough)**: 1,630 (6.52%)
- **Verification Catches**: 0
- **Verification Escapes**: 1,010

### Preserved Artifacts
- `validation-report-v2.md`: Detailed category breakdown and representative failure taxonomy.
- `validation-results-v2.json`: Machine-readable category summary and metrics.
- `validation-progress-v2.json`: Checkpoint and telemetry progress log.
- `validation-report.md` & `validation-results.json`: Baseline historical validation run (v1).
- `benchmark-report.md` & `benchmark-results.json`: Mathematical accuracy benchmark data.

---

## 3. Repository Structure & Major Test Suites

```
.
├── README.md
├── benchmark-report.md
├── benchmark-results.json
├── validation-progress-v2.json
├── validation-report-v2.md
├── validation-report.md
├── validation-results-v2.json
├── validation-results.json
└── test/
    ├── test-dev-benchmark-v3.js              # 1,500-problem Negative Operand & Fraction Benchmark
    ├── test-dev-benchmark-v4.js              # 1,500-problem Unseen Adversarial & Fidelity Benchmark
    ├── test-dev-benchmark-v2.js              # 2,000-problem Development Benchmark v2
    ├── test-blind-validation-v2.js           # 25,000-problem Frozen Blind Validation Harness
    ├── test-blind-validation-benchmark.js    # Blind Validation v1 Harness
    └── test-mathematical-accuracy-benchmark.js # Full accuracy benchmark battery
```

---

## 4. Running the Suites

The test scripts require Node.js ($\ge 20$) and access to the Pythos math engine. When running from a sibling directory checkout (`../pythos`), ensure dependencies are installed.

### Development Benchmark v3 (1,500 problems)
Targets negative operands, fraction amputation, and basic input-claim fidelity:
```bash
node test/test-dev-benchmark-v3.js
```

### Development Benchmark v4 (1,500 problems)
Fresh, unseen adversarial combinations, conversational wrappers, and AST fidelity:
```bash
node test/test-dev-benchmark-v4.js
```

### Development Benchmark v2 (2,000 problems)
Broad multi-domain mathematical benchmark covering arithmetic, algebra, trigonometry, calculus, and physics:
```bash
node test/test-dev-benchmark-v2.js
```

### Mathematical Accuracy Benchmark (1,000 problems)
Standard cross-domain regression benchmark:
```bash
node test/test-mathematical-accuracy-benchmark.js
```

> **Note on Blind Validation v2:**
> `test/test-blind-validation-v2.js` is the frozen test harness that produced `validation-report-v2.md`. To preserve historical integrity, do not rerun this harness against production code without a dedicated, distinct evaluation seed.
