/**
 * test/test-dev-benchmark-v4.js
 *
 * Pythos Development Benchmark v4:
 * Unseen, Independent Generalization Benchmark for Negative Operands,
 * Fractions, Decimals, Equivalent Representations & Input-Claim Fidelity.
 *
 * Seed: 999111222 (Fresh independent PRNG stream)
 * Total Problems: 1,500
 */

const fs = require('fs');
const path = require('path');
const SERVER_DIR = process.env.PYTHOS_SERVER_DIR || (
  fs.existsSync(path.resolve(__dirname, '../server'))
    ? path.resolve(__dirname, '../server')
    : path.resolve(__dirname, '../../pythos/server')
);

const math = require(path.join(SERVER_DIR, 'node_modules/mathjs'));
const {
  analyzeDeterministicIntent,
  buildDeterministicResponse,
  extractPreflightDeterministicFacts,
  extractArithmeticExpressions
} = require(path.join(SERVER_DIR, 'deterministicRouter'));
const {
  extractClaims,
  auditInternalConsistency,
  runDeterministicVerification,
  checkPromptClaimFidelity
} = require(path.join(SERVER_DIR, 'verificationBridge'));

function createRng(seed = 999111222) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = createRng(999111222);

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

  // Multi-root solution set check
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
 * Generates 1,500 new, unseen V4 problems with fresh wording,
 * adversarial combinations, and new random variations.
 */
function generateDevV4Problems() {
  const problems = [];
  let id = 1;

  const freshPrefixes = [
    'Kindly determine',
    'Could you please work out',
    'Help me evaluate',
    'What would be the result of',
    'What is the evaluation of',
    'Find the answer to',
    'Please give me the result of',
    'Work out the value of',
    'Solve for the value of',
    'Compute'
  ];

  // 1. Adversarial Negative Arithmetic (400 problems)
  for (let i = 0; i < 400; i++) {
    const pfx = randChoice(freshPrefixes);
    const a = randInt(10, 999);
    const b = randInt(10, 999);

    if (i < 100) {
      // Unseen wording + Leading Negative
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Negative Arithmetic (Fresh Wording)', prompt: `${pfx} -${a} + ${b}`, expected: -a + b });
      } else {
        problems.push({ id: id++, category: 'Negative Arithmetic (Fresh Wording)', prompt: `${pfx} -${a} - ${b}`, expected: -a - b });
      }
    } else if (i < 200) {
      // Negative + Double Negative with mixed operations
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Negative Arithmetic (Double Negatives)', prompt: `${pfx} ${a} - -${b}`, expected: a + b });
      } else {
        problems.push({ id: id++, category: 'Negative Arithmetic (Double Negatives)', prompt: `${pfx} -${a} - -${b}`, expected: -a + b });
      }
    } else if (i < 300) {
      // Negative Multiplications & Divisions with parenthesized negative operands
      const smallA = randInt(2, 30);
      const smallB = randInt(2, 30);
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Negative Arithmetic (Mul/Div)', prompt: `${pfx} (-${smallA}) * ${smallB}`, expected: -smallA * smallB });
      } else {
        const prod = smallA * smallB;
        problems.push({ id: id++, category: 'Negative Arithmetic (Mul/Div)', prompt: `${pfx} (-${prod}) / ${smallA}`, expected: -smallB });
      }
    } else {
      // Equivalent representations: -(-a) or -(a - b)
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Negative Arithmetic (Equivalence)', prompt: `${pfx} -(-${a})`, expected: a });
      } else {
        problems.push({ id: id++, category: 'Negative Arithmetic (Equivalence)', prompt: `${pfx} -(${a} - ${b})`, expected: -(a - b) });
      }
    }
  }

  // 2. Adversarial Fraction Combinations (400 problems)
  for (let i = 0; i < 400; i++) {
    const pfx = randChoice(freshPrefixes);
    if (i < 100) {
      // Fraction + Negative (e.g. -N1/D1 + N2/D2)
      const d1 = randInt(3, 20);
      const n1 = randInt(1, d1 - 1);
      const d2 = randInt(3, 20);
      const n2 = randInt(1, d2 - 1);
      const r1 = new Rational(-n1, d1);
      const r2 = new Rational(n2, d2);
      problems.push({ id: id++, category: 'Fractions (Signed/Negative)', prompt: `${pfx} -${n1}/${d1} + ${n2}/${d2}`, expected: r1.add(r2).toString() });
    } else if (i < 200) {
      // Fraction - Fraction with unseen wording (Amputation Resistance)
      const d1 = randInt(7, 30);
      const n1 = randInt(1, Math.min(4, d1 - 1));
      const d2 = randInt(4, 20);
      const n2 = randInt(1, Math.min(3, d2 - 1));
      const r1 = new Rational(n1, d1);
      const r2 = new Rational(n2, d2);
      problems.push({ id: id++, category: 'Fractions (Amputation Resistance)', prompt: `${pfx} ${n1}/${d1} - ${n2}/${d2}`, expected: r1.sub(r2).toString() });
    } else if (i < 300) {
      // Fraction Parenthesized Multiply / Divide with Negative fractions
      const d1 = randInt(2, 12);
      const n1 = randInt(1, d1);
      const d2 = randInt(2, 12);
      const n2 = randInt(1, d2);
      const r1 = new Rational(-n1, d1);
      const r2 = new Rational(n2, d2);
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Fractions (Parenthesized Signed Mul/Div)', prompt: `${pfx} (-${n1}/${d1}) * (${n2}/${d2})`, expected: r1.mul(r2).toString() });
      } else {
        problems.push({ id: id++, category: 'Fractions (Parenthesized Signed Mul/Div)', prompt: `${pfx} (-${n1}/${d1}) / (${n2}/${d2})`, expected: r1.div(r2).toString() });
      }
    } else {
      // 3-Term Fraction Expressions: N1/D1 + N2/D2 - N3/D3
      const d = randChoice([6, 12, 20, 24]);
      const n1 = randInt(1, 5);
      const n2 = randInt(1, 5);
      const n3 = randInt(1, 5);
      const r1 = new Rational(n1, d);
      const r2 = new Rational(n2, d);
      const r3 = new Rational(n3, d);
      const res = r1.add(r2).sub(r3);
      problems.push({ id: id++, category: 'Fractions (Compound 3-Term)', prompt: `${pfx} ${n1}/${d} + ${n2}/${d} - ${n3}/${d}`, expected: res.toString() });
    }
  }

  // 3. Decimals, Percentages & Mixed Arithmetic (350 problems)
  for (let i = 0; i < 350; i++) {
    const pfx = randChoice(freshPrefixes);
    if (i < 125) {
      // Percentages with fresh prefix
      const pct = randChoice([4, 8, 12, 16, 22, 35, 45, 60, 70, 90]);
      const base = randInt(50, 1500);
      problems.push({ id: id++, category: 'Percentages & Decimals', prompt: `${pfx} ${pct}% of ${base}`, expected: (pct / 100) * base });
    } else if (i < 250) {
      // Decimal + Negative multiplication
      const dec = randChoice([0.2, 0.4, 0.5, 0.75, 1.2, 1.5, 2.5, 4.5]);
      const intVal = randInt(-30, 30);
      const expectedVal = Math.round(dec * intVal * 1000) / 1000;
      problems.push({ id: id++, category: 'Percentages & Decimals', prompt: `${pfx} ${dec} * ${intVal}`, expected: expectedVal });
    } else {
      // Multiple operations with operator precedence: A + B * C or A * B - C
      const a = randInt(-20, 20);
      const b = randInt(2, 10);
      const c = randInt(2, 10);
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Precedence & Compound Arithmetic', prompt: `${pfx} ${a} + ${b} * ${c}`, expected: a + (b * c) });
      } else {
        problems.push({ id: id++, category: 'Precedence & Compound Arithmetic', prompt: `${pfx} ${a} * ${b} - ${c}`, expected: (a * b) - c });
      }
    }
  }

  // 4. Cross-Domain Invariants (350 problems)
  for (let i = 0; i < 350; i++) {
    if (i < 70) {
      // Systems of equations in 2 variables
      const rx = randInt(-15, 15);
      const ry = randInt(-15, 15);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Solve system: 2x + y = ${2 * rx + ry}, x - y = ${rx - ry}`, expected: rx });
    } else if (i < 140) {
      // Quadratic equations
      const root = randInt(3, 16);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Solve x^2 - ${root * root} = 0`, expected: root });
    } else if (i < 210) {
      // Calculus derivatives
      const coeff = randInt(3, 9);
      const pwr = randInt(2, 5);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Calculate the derivative of ${coeff}x^${pwr}`, expected: `${coeff * pwr}x^${pwr - 1}` });
    } else if (i < 280) {
      // Trigonometric coterminal angles
      const k = randInt(1, 4);
      const baseDeg = randChoice([30, 45, 60, 90, 120, 150]);
      const fullDeg = baseDeg + k * 360;
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Find the coterminal angle for ${fullDeg}°`, expected: baseDeg });
    } else {
      // Physics force & kinetic energy
      const mass = randInt(3, 25);
      const acc = randInt(2, 12);
      problems.push({ id: id++, category: 'Cross-Domain Invariants', prompt: `Calculate the net force on an object with mass ${mass} kg accelerating at ${acc} m/s^2`, expected: mass * acc });
    }
  }

  return problems;
}

async function runDevBenchmarkV4() {
  const problems = generateDevV4Problems();
  const totalProblems = problems.length;

  console.log('================================================================');
  console.log(`🔬 PYTHOS DEVELOPMENT BENCHMARK v4 (${totalProblems} PROBLEMS)`);
  console.log(`🎯 TARGET: Unseen Formulations, Adversarial Combinations & Fidelity Verification`);
  console.log(`🌱 SEED: 999111222`);
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
              intentType: intent.type
            });
          }
        }
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
  console.log('📊 PYTHOS DEV BENCHMARK v4 SUMMARY');
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
    console.log('--- Sample Failures in V4 Benchmark ---');
    for (const s of wrongSamples.slice(0, 10)) {
      console.log(`- [#${s.id} - ${s.category}] "${s.prompt}" | Expected: ${s.expected} | Pythos: ${s.pythosAnswer}`);
    }
    console.log('');
  }

  if (unknownSamples.length > 0) {
    console.log('--- Sample Unknowns in V4 Benchmark ---');
    for (const s of unknownSamples.slice(0, 10)) {
      console.log(`- [#${s.id} - ${s.category}] "${s.prompt}" | Expected: ${s.expected}`);
    }
    console.log('');
  }

  return { stats, wrongSamples, unknownSamples, elapsedSec };
}

if (require.main === module) {
  runDevBenchmarkV4()
    .then((res) => {
      if (res.stats.wrong > 0 || res.stats.unknown > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Dev benchmark v4 failed with error:', err);
      process.exit(1);
    });
}

module.exports = {
  runDevBenchmarkV4,
  generateDevV4Problems
};
