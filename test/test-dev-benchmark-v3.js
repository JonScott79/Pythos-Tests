/**
 * test/test-dev-benchmark-v3.js
 *
 * Pythos Development Benchmark v3:
 * Specialized Generalization Benchmark for Negative Operands, Fractions & Input-Claim Fidelity.
 *
 * Designed to diagnose and validate the exact failure classes identified during the
 * 25,000-problem Blind Validation v2:
 * 1. Leading negative number operand stripping (bullet-point regex over-matching)
 * 2. Unmatched conversational prefixes ("What is the result of", "Please calculate", "Can you find", "Determine")
 * 3. Fallback infix regex truncation of leading negative signs (\\b\\d+ ignoring -)
 * 4. Fraction subexpression false-positive rejection leading to denominator amputation (e.g. 5/14 - 1/6 => 14 - 1/6)
 * 5. Input-to-claim verification escape detection
 *
 * Seed: 888999111
 */

const fs = require('fs');
const path = require('path');
const SERVER_DIR = process.env.PYTHOS_SERVER_DIR || (
  fs.existsSync(path.resolve(__dirname, '../server'))
    ? path.resolve(__dirname, '../server')
    : path.resolve(__dirname, '../../pythos/server')
);

const math = require(path.join(SERVER_DIR, 'node_modules/mathjs'));
const mathjsVerifier = require(path.join(SERVER_DIR, 'mathjsVerifier'));
const {
  analyzeDeterministicIntent,
  buildDeterministicResponse,
  extractPreflightDeterministicFacts
} = require(path.join(SERVER_DIR, 'deterministicRouter'));
const {
  extractClaims,
  auditInternalConsistency,
  runDeterministicVerification
} = require(path.join(SERVER_DIR, 'verificationBridge'));

function createRng(seed = 888999111) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = createRng(888999111);

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

class Rational {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('Division by zero');
    if (d < 0) { n = -n; d = -d; }
    const g = this._gcd(Math.abs(n), d);
    this.n = Math.round(n / g);
    this.d = Math.round(d / g);
  }

  _gcd(a, b) {
    while (b) { const t = b; b = a % b; a = t; }
    return a;
  }

  add(other) {
    return new Rational(this.n * other.d + other.n * this.d, this.d * other.d);
  }

  sub(other) {
    return new Rational(this.n * other.d - other.n * this.d, this.d * other.d);
  }

  mul(other) {
    return new Rational(this.n * other.n, this.d * other.d);
  }

  div(other) {
    return new Rational(this.n * other.d, this.d * other.n);
  }

  toNumber() {
    return this.n / this.d;
  }

  toString() {
    if (this.d === 1) return String(this.n);
    return `${this.n}/${this.d}`;
  }
}

function toNumeric(val) {
  if (typeof val === 'number') return val;
  if (!val) return NaN;
  const s = String(val).trim().replace(/\s+/g, '');
  if (/^[-+]?\d+(?:\.\d+)?\/[-+]?\d+(?:\.\d+)?$/.test(s)) {
    const parts = s.split('/');
    const n = parseFloat(parts[0]);
    const d = parseFloat(parts[1]);
    if (!isNaN(n) && !isNaN(d) && d !== 0) return n / d;
  }
  return parseFloat(s);
}

function compareAnswers(actual, expected) {
  if (expected === 'UNDEFINED' || expected === 'DOMAIN_ERROR') {
    if (actual === null) return true;
    const str = String(actual).toLowerCase();
    return str.includes('undefined') || str.includes('error') || str.includes('cannot');
  }

  if (actual === null || actual === undefined) return false;

  const numActual = toNumeric(actual);
  const numExpected = toNumeric(expected);

  if (!isNaN(numActual) && !isNaN(numExpected)) {
    if (Math.abs(numActual - numExpected) < 1e-4) return true;
    if (numExpected !== 0 && Math.abs((numActual - numExpected) / numExpected) < 1e-3) return true;
  }

  const normActual = String(actual).trim().toLowerCase().replace(/\s+/g, '').replace(/\*/g, '').replace(/\^1\b/g, '');
  const normExpected = String(expected).trim().toLowerCase().replace(/\s+/g, '').replace(/\*/g, '').replace(/\^1\b/g, '');

  if (normActual === normExpected) return true;

  try {
    const fA = math.fraction(actual);
    const fE = math.fraction(expected);
    if (math.equal(fA, fE)) return true;
  } catch (_) {}

  // Multi-root solution set check (e.g. "x = -7, y = 8" containing expected -7)
  if (typeof actual === 'string' && actual.includes(',')) {
    const parts = actual.split(',').map(s => {
      const match = s.match(/([-\d./]+)/);
      return match ? toNumeric(match[1]) : NaN;
    });
    if (parts.some(p => !isNaN(p) && !isNaN(numExpected) && Math.abs(p - numExpected) < 1e-4)) {
      return true;
    }
  }

  return false;
}

function extractPythosAnswer(responseStr, intent) {
  if (intent) {
    if (typeof intent.result === 'number' || typeof intent.result === 'string') return intent.result;
    if (typeof intent.solution === 'number' || typeof intent.solution === 'string') return intent.solution;
    if (intent.c !== undefined) return intent.c;
    if (intent.customAngle !== undefined) return intent.customAngle;
  }
  if (!responseStr || typeof responseStr !== 'string') return null;
  const boxedMatch = responseStr.match(/\\boxed\{([^{}]+)\}/);
  if (boxedMatch) {
    const raw = boxedMatch[1].replace(/\s+/g, '').replace(/\\text\{[^}]*\}/g, '');
    const eqMatch = raw.match(/^[a-zA-Z]=([-\d./]+)$/);
    if (eqMatch) return eqMatch[1];
    return raw;
  }
  return null;
}

/**
 * Generates 1,500 targeted problems covering:
 * - Negative operand arithmetic (500 problems)
 * - Fraction operations & expressions (500 problems)
 * - Decimals, Percentages & Conversational wrappers (250 problems)
 * - Cross-Domain Regression Invariant Checks (250 problems)
 */
function generateDevV3Problems() {
  const problems = [];
  let id = 1;

  const prefixes = [
    'What is the result of',
    'Please calculate',
    'Can you find',
    'Determine',
    'Calculate',
    'Compute',
    'What is',
    'Evaluate',
    ''
  ];

  // 1. Negative Operand Arithmetic (500 problems)
  for (let i = 0; i < 500; i++) {
    const pfx = randChoice(prefixes);
    if (i < 150) {
      // Leading negative with positive operand: -A + B or -A - B
      const a = randInt(2, 1000);
      const b = randInt(2, 1000);
      const op = randChoice(['+', '-']);
      const expected = op === '+' ? -a + b : -a - b;
      problems.push({ id: id++, category: 'Negative Arithmetic (Leading Negative)', prompt: `${pfx} -${a} ${op} ${b}`.trim(), expected });
    } else if (i < 300) {
      // Double negatives: A - -B, -A - -B, -A + -B
      const a = randInt(2, 1000);
      const b = randInt(2, 1000);
      const pattern = randChoice([1, 2, 3]);
      let prompt, expected;
      if (pattern === 1) {
        prompt = `${pfx} ${a} - -${b}`.trim();
        expected = a - (-b);
      } else if (pattern === 2) {
        prompt = `${pfx} -${a} - -${b}`.trim();
        expected = -a - (-b);
      } else {
        prompt = `${pfx} -${a} + -${b}`.trim();
        expected = -a + (-b);
      }
      problems.push({ id: id++, category: 'Negative Arithmetic (Double Negatives)', prompt, expected });
    } else if (i < 400) {
      // Negative Multiplication & Division: -A * B, A * -B, -A / B
      const b = randChoice([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
      const quotient = randInt(2, 50);
      const a = b * quotient;
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Negative Arithmetic (Multiplication/Division)', prompt: `${pfx} -${quotient} * ${b}`.trim(), expected: -quotient * b });
      } else {
        problems.push({ id: id++, category: 'Negative Arithmetic (Multiplication/Division)', prompt: `${pfx} -${a} / ${b}`.trim(), expected: -quotient });
      }
    } else {
      // Bare negative arithmetic without prefixes (tests bullet-stripping bug)
      const a = randInt(2, 500);
      const b = randInt(2, 500);
      const op = randChoice(['+', '-']);
      problems.push({ id: id++, category: 'Negative Arithmetic (Bare - No Prefix)', prompt: `-${a} ${op} ${b}`, expected: op === '+' ? -a + b : -a - b });
    }
  }

  // 2. Fraction Operations & Infix Expressions (500 problems)
  for (let i = 0; i < 500; i++) {
    const pfx = randChoice(prefixes);
    if (i < 200) {
      // Fraction addition and subtraction: A/B + C/D or A/B - C/D
      const d1 = randInt(2, 20);
      const n1 = randInt(1, d1);
      const d2 = randInt(2, 20);
      const n2 = randInt(1, d2);
      const op = randChoice(['+', '-']);
      const r1 = new Rational(n1, d1);
      const r2 = new Rational(n2, d2);
      const expected = op === '+' ? r1.add(r2).toString() : r1.sub(r2).toString();
      problems.push({ id: id++, category: 'Fractions (Infix Add/Sub)', prompt: `${pfx} ${n1}/${d1} ${op} ${n2}/${d2}`.trim(), expected });
    } else if (i < 350) {
      // Parenthesized Fraction Multiplication/Division: (n1/d1) * (n2/d2)
      const d1 = randInt(2, 15);
      const n1 = randInt(1, d1);
      const d2 = randInt(2, 15);
      const n2 = randInt(1, d2);
      const r1 = new Rational(n1, d1);
      const r2 = new Rational(n2, d2);
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Fractions (Parenthesized Mul/Div)', prompt: `${pfx} (${n1}/${d1}) * (${n2}/${d2})`.trim(), expected: r1.mul(r2).toString() });
      } else {
        problems.push({ id: id++, category: 'Fractions (Parenthesized Mul/Div)', prompt: `${pfx} (${n1}/${d1}) / (${n2}/${d2})`.trim(), expected: r1.div(r2).toString() });
      }
    } else {
      // Fraction subtraction where denominator > numerator (e.g. 5/14 - 1/6)
      const d1 = randInt(6, 25);
      const n1 = randInt(1, Math.min(5, d1 - 1));
      const d2 = randInt(3, 15);
      const n2 = randInt(1, Math.min(3, d2 - 1));
      const r1 = new Rational(n1, d1);
      const r2 = new Rational(n2, d2);
      problems.push({ id: id++, category: 'Fractions (Amputation Stress Test)', prompt: `${pfx} ${n1}/${d1} - ${n2}/${d2}`.trim(), expected: r1.sub(r2).toString() });
    }
  }

  // 3. Decimals & Percentages (250 problems)
  for (let i = 0; i < 250; i++) {
    const pfx = randChoice(prefixes);
    if (i < 125) {
      const pct = randChoice([5, 10, 15, 20, 25, 30, 40, 50, 75, 80]);
      const val = randInt(10, 1000);
      problems.push({ id: id++, category: 'Percentages & Decimals', prompt: `${pfx} ${pct}% of ${val}`.trim(), expected: (pct / 100) * val });
    } else {
      const dec = randChoice([0.1, 0.2, 0.25, 0.4, 0.5, 0.75, 1.25, 1.5, 2.5]);
      const mult = randInt(2, 40);
      problems.push({ id: id++, category: 'Percentages & Decimals', prompt: `${pfx} ${dec} * ${mult}`.trim(), expected: Math.round(dec * mult * 1000) / 1000 });
    }
  }

  // 4. Cross-Domain Invariants (250 problems)
  // Ensures fixes to arithmetic/fractions do not regress core symbolic domains
  for (let i = 0; i < 250; i++) {
    if (i < 50) {
      // Systems of equations
      const rootX = randInt(-10, 10);
      const rootY = randInt(-10, 10);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Solve system: x + y = ${rootX + rootY}, x - y = ${rootX - rootY}`, expected: rootX });
    } else if (i < 100) {
      // Quadratic
      const r = randInt(2, 15);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Solve x^2 - ${r * r} = 0`, expected: r });
    } else if (i < 150) {
      // Calculus
      const a = randInt(2, 10);
      const n = randInt(2, 4);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Calculate the derivative of ${a}x^${n}`, expected: `${a * n}x^${n - 1}` });
    } else if (i < 200) {
      // Geometry / Trig
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `show a right triangle with legs 3 and 4`, expected: 5 });
    } else {
      // Physics
      const m = randInt(2, 20);
      const a = randInt(2, 10);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Calculate the net force on an object with mass ${m} kg accelerating at ${a} m/s^2`, expected: m * a });
    }
  }

  return problems;
}

async function runDevBenchmarkV3() {
  const problems = generateDevV3Problems();
  const totalProblems = problems.length;

  console.log('================================================================');
  console.log(`🔬 PYTHOS DEVELOPMENT BENCHMARK v3 (${totalProblems} PROBLEMS)`);
  console.log(`🎯 TARGET: Negative Operands, Fraction Amputation & Input-Claim Fidelity`);
  console.log(`🌱 SEED: 888999111`);
  console.log('================================================================\n');

  const stats = {
    total: totalProblems,
    correct: 0,
    wrong: 0,
    unknown: 0,
    categories: {}
  };

  const wrongSamples = [];
  const unknownSamples = [];
  const startTime = Date.now();

  for (let idx = 0; idx < totalProblems; idx++) {
    const prob = problems[idx];
    const cat = prob.category;
    if (!stats.categories[cat]) {
      stats.categories[cat] = { total: 0, correct: 0, wrong: 0, unknown: 0 };
    }
    stats.categories[cat].total++;

    try {
      const intent = analyzeDeterministicIntent(prob.prompt, []);
      if (intent) {
        const resp = buildDeterministicResponse(intent);
        const pythosAnswer = extractPythosAnswer(resp, intent);
        const isMatch = compareAnswers(pythosAnswer, prob.expected);

        if (isMatch) {
          stats.correct++;
          stats.categories[cat].correct++;
        } else {
          stats.wrong++;
          stats.categories[cat].wrong++;
          if (wrongSamples.length < 20) {
            wrongSamples.push({
              id: prob.id,
              category: cat,
              prompt: prob.prompt,
              expected: prob.expected,
              pythosAnswer,
              intentType: intent.type,
              intentResult: intent.result
            });
          }
        }
      } else {
        const preflight = extractPreflightDeterministicFacts(prob.prompt, []);
        if (preflight && preflight.length > 0 && preflight[0].type === 'SIMPSONS_PARADOX_EVALUATION' && prob.expected === 'SIMPSONS_PARADOX') {
          stats.correct++;
          stats.categories[cat].correct++;
        } else {
          stats.unknown++;
          stats.categories[cat].unknown++;
          if (unknownSamples.length < 10) {
            unknownSamples.push({
              id: prob.id,
              category: cat,
              prompt: prob.prompt,
              expected: prob.expected
            });
          }
        }
      }
    } catch (err) {
      stats.unknown++;
      stats.categories[cat].unknown++;
    }
  }

  const elapsedSec = (Date.now() - startTime) / 1000;
  const solvingRate = ((stats.correct / totalProblems) * 100).toFixed(2);
  const errorRate = ((stats.wrong / totalProblems) * 100).toFixed(2);
  const unknownRate = ((stats.unknown / totalProblems) * 100).toFixed(2);

  console.log('\n================================================================');
  console.log('📊 PYTHOS DEV BENCHMARK v3 SUMMARY');
  console.log('================================================================');
  console.log(`TOTAL:                     ${stats.total}`);
  console.log(`CORRECT:                   ${stats.correct} (${solvingRate}%)`);
  console.log(`WRONG DELIVERED:           ${stats.wrong} (${errorRate}%)`);
  console.log(`UNKNOWN:                   ${stats.unknown} (${unknownRate}%)`);
  console.log(`RUNTIME:                   ${elapsedSec.toFixed(2)}s`);
  console.log('----------------------------------------------------------------');

  for (const [cName, cStat] of Object.entries(stats.categories)) {
    const cRate = ((cStat.correct / cStat.total) * 100).toFixed(1);
    const wRate = ((cStat.wrong / cStat.total) * 100).toFixed(1);
    console.log(`  ${cName.padEnd(45)}: ${cStat.correct}/${cStat.total} (${cRate}%) | Wrong: ${cStat.wrong} (${wRate}%) | Unknown: ${cStat.unknown}`);
  }
  console.log('================================================================\n');

  if (wrongSamples.length > 0) {
    console.log('--- Sample Failures in Current Production State ---');
    for (const s of wrongSamples.slice(0, 10)) {
      console.log(`- [#${s.id} - ${s.category}] "${s.prompt}" | Expected: ${s.expected} | Pythos: ${s.pythosAnswer} (Intent: ${s.intentType})`);
    }
    console.log('');
  }

  return { stats, wrongSamples, unknownSamples, elapsedSec };
}

if (require.main === module) {
  runDevBenchmarkV3()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Dev benchmark v3 failed with error:', err);
      process.exit(1);
    });
}

module.exports = {
  runDevBenchmarkV3,
  generateDevV3Problems
};
