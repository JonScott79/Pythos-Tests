/**
 * test/test-dev-benchmark-v2.js
 *
 * Pythos Development Benchmark v2 (2,000 Problems).
 * Used during the active TEST → ANALYZE → FIX cycle to generalize natural-language
 * routing and mathematical parsing across all 10 core domains.
 *
 * Seed: 777888999
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
  extractPreflightDeterministicFacts
} = require(path.join(SERVER_DIR, 'deterministicRouter'));
const {
  extractClaims,
  auditInternalConsistency,
  runDeterministicVerification
} = require(path.join(SERVER_DIR, 'verificationBridge'));

function createRng(seed = 777888999) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = createRng(777888999);

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

  // Multi-root solution set check (e.g. "5, 6" containing 6)
  if (typeof actual === 'string' && actual.includes(',')) {
    const parts = actual.split(',').map(s => toNumeric(s.trim()));
    if (parts.some(p => !isNaN(p) && !isNaN(numExpected) && Math.abs(p - numExpected) < 1e-4)) {
      return true;
    }
  }

  return false;
}

function extractPythosAnswer(responseStr, intent) {
  if (intent) {
    if (typeof intent.result === 'number' || typeof intent.result === 'string') {
      return intent.result;
    }
    if (typeof intent.solution === 'number' || typeof intent.solution === 'string') {
      return intent.solution;
    }
    if (intent.customAngle !== undefined) {
      return intent.customAngle;
    }
    if (intent.c !== undefined) {
      return intent.c;
    }
  }

  if (!responseStr || typeof responseStr !== 'string') return null;

  const boxedMatch = responseStr.match(/\\boxed\{([^{}]+)\}/);
  if (boxedMatch) {
    const raw = boxedMatch[1].replace(/\s+/g, '').replace(/\\text\{[^}]*\}/g, '');
    const eqMatch = raw.match(/^[a-zA-Z]=([-\d./]+)$/);
    if (eqMatch) return eqMatch[1];
    return raw;
  }

  const dispEqMatch = responseStr.match(/\$\$\s*[\s\S]*?=\s*([-\d./]+)\s*\$\$/);
  if (dispEqMatch) {
    return dispEqMatch[1].trim();
  }

  const inlineMatch = responseStr.match(/(?:x|y|z|result|answer)\s*=\s*([-\d./]+)/i);
  if (inlineMatch) {
    return inlineMatch[1].trim();
  }

  return null;
}

function generateDevProblems() {
  const problems = [];
  let id = 1;
  const prefixes = ['Calculate', 'Compute', 'What is', 'Evaluate', 'Find'];

  // 1. Arithmetic (200)
  for (let i = 0; i < 200; i++) {
    const pfx = randChoice(prefixes);
    if (i < 50) {
      const a = randInt(-500, 500);
      const b = randInt(-500, 500);
      const op = randChoice(['+', '-', '*']);
      problems.push({ id: id++, category: 'Arithmetic', prompt: `${pfx} ${a} ${op} ${b}`, expected: op === '+' ? a + b : (op === '-' ? a - b : a * b) });
    } else if (i < 100) {
      const a = randInt(2, 40);
      const b = randInt(2, 25);
      const c = randInt(1, 80);
      problems.push({ id: id++, category: 'Arithmetic', prompt: `${pfx} ${a} * ${b} + ${c}`, expected: a * b + c });
    } else if (i < 150) {
      const b = randChoice([-10, -5, -4, -2, 2, 4, 5, 8, 10]);
      const res = randInt(-50, 50);
      problems.push({ id: id++, category: 'Arithmetic', prompt: `${pfx} ${res * b} / ${b}`, expected: res });
    } else if (i < 190) {
      const a = randInt(-15, 15);
      const b = randInt(-30, 30);
      const c = randInt(-30, 30);
      problems.push({ id: id++, category: 'Arithmetic', prompt: `${pfx} ${a} * (${b} + ${c})`, expected: a * (b + c) });
    } else {
      const a = randInt(1, 50);
      problems.push({ id: id++, category: 'Arithmetic', prompt: `${pfx} ${a} / 0`, expected: 'UNDEFINED' });
    }
  }

  // 2. Fractions/Decimals/Percentages (200)
  for (let i = 0; i < 200; i++) {
    const pfx = randChoice(prefixes);
    if (i < 60) {
      const d1 = randInt(2, 16);
      const n1 = randInt(1, d1 - 1);
      const d2 = randInt(2, 16);
      const n2 = randInt(1, d2 - 1);
      const op = randChoice(['+', '-']);
      const r1 = new Rational(n1, d1);
      const r2 = new Rational(n2, d2);
      problems.push({ id: id++, category: 'Fractions/Decimals/Percentages', prompt: `${pfx} ${n1}/${d1} ${op} ${n2}/${d2}`, expected: op === '+' ? r1.add(r2).toString() : r1.sub(r2).toString() });
    } else if (i < 120) {
      const d1 = randInt(2, 12);
      const n1 = randInt(1, d1);
      const d2 = randInt(2, 12);
      const n2 = randInt(1, d2);
      const r1 = new Rational(n1, d1);
      const r2 = new Rational(n2, d2);
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Fractions/Decimals/Percentages', prompt: `${pfx} (${n1}/${d1}) * (${n2}/${d2})`, expected: r1.mul(r2).toString() });
      } else {
        problems.push({ id: id++, category: 'Fractions/Decimals/Percentages', prompt: `${pfx} (${n1}/${d1}) / (${n2}/${d2})`, expected: r1.div(r2).toString() });
      }
    } else if (i < 160) {
      const pct = randChoice([5, 10, 15, 20, 25, 30, 40, 50, 75]);
      const val = randInt(20, 600);
      problems.push({ id: id++, category: 'Fractions/Decimals/Percentages', prompt: `${pfx} ${pct}% of ${val}`, expected: (pct / 100) * val });
    } else {
      const dec = randChoice([0.25, 0.5, 0.75, 1.25, 1.5, 2.5]);
      const mult = randInt(2, 30);
      problems.push({ id: id++, category: 'Fractions/Decimals/Percentages', prompt: `${pfx} ${dec} * ${mult}`, expected: dec * mult });
    }
  }

  // 3. Linear Equations (200)
  for (let i = 0; i < 200; i++) {
    if (i < 80) {
      const a = randInt(2, 15);
      const root = randInt(-20, 30);
      const b = randInt(1, 40);
      problems.push({ id: id++, category: 'Linear Equations', prompt: `Solve ${a}x + ${b} = ${a * root + b}`, expected: root });
    } else if (i < 140) {
      const a = randInt(2, 15);
      const root = randInt(-20, 30);
      const b = randInt(1, 40);
      problems.push({ id: id++, category: 'Linear Equations', prompt: `Solve ${a}x - ${b} = ${a * root - b}`, expected: root });
    } else if (i < 180) {
      const a = randInt(2, 10);
      const root = randInt(-15, 20);
      const b = randInt(5, 30);
      problems.push({ id: id++, category: 'Linear Equations', prompt: `Solve -${a}x + ${b} = ${-a * root + b}`, expected: root });
    } else {
      const root = randInt(-50, 50);
      const b = randInt(1, 50);
      problems.push({ id: id++, category: 'Linear Equations', prompt: `Solve x + ${b} = ${root + b}`, expected: root });
    }
  }

  // 4. Systems of Equations (200)
  for (let i = 0; i < 200; i++) {
    let a1, b1, a2, b2, D;
    do {
      a1 = randInt(-8, 8);
      b1 = randInt(-8, 8);
      a2 = randInt(-8, 8);
      b2 = randInt(-8, 8);
      D = a1 * b2 - a2 * b1;
    } while (D === 0 || a1 === 0 || a2 === 0 || b1 === 0 || b2 === 0);

    const x = randInt(-15, 15);
    const y = randInt(-15, 15);
    const c1 = a1 * x + b1 * y;
    const c2 = a2 * x + b2 * y;
    const sA1 = a1 === 1 ? 'x' : (a1 === -1 ? '-x' : `${a1}x`);
    const sB1 = b1 > 0 ? `+ ${b1 === 1 ? '' : b1}y` : `- ${Math.abs(b1) === 1 ? '' : Math.abs(b1)}y`;
    const sA2 = a2 === 1 ? 'x' : (a2 === -1 ? '-x' : `${a2}x`);
    const sB2 = b2 > 0 ? `+ ${b2 === 1 ? '' : b2}y` : `- ${Math.abs(b2) === 1 ? '' : Math.abs(b2)}y`;

    problems.push({ id: id++, category: 'Systems of Equations', prompt: `Solve the system: ${sA1} ${sB1} = ${c1} and ${sA2} ${sB2} = ${c2}`, expected: `x = ${x}, y = ${y}` });
  }

  // 5. Quadratics / Polynomials (200)
  for (let i = 0; i < 200; i++) {
    if (i < 80) {
      // General monic quadratic
      const r1 = randInt(-12, 12);
      const r2 = randInt(-12, 12);
      const b = -(r1 + r2);
      const c = r1 * r2;
      const bStr = b === 0 ? '' : (b > 0 ? `+ ${b === 1 ? '' : b}x ` : `- ${Math.abs(b) === 1 ? '' : Math.abs(b)}x `);
      const cStr = c === 0 ? '' : (c > 0 ? `+ ${c}` : `- ${Math.abs(c)}`);
      const roots = Array.from(new Set([r1, r2])).sort((a, b) => a - b);
      problems.push({ id: id++, category: 'Quadratics/Polynomials', prompt: `Solve x^2 ${bStr}${cStr} = 0`, expected: roots.join(', ') });
    } else if (i < 120) {
      // Degenerate quadratics: x^2 = 0, x^2 + bx = 0
      if (i % 2 === 0) {
        problems.push({ id: id++, category: 'Quadratics/Polynomials', prompt: `Solve x^2 = 0`, expected: `0` });
      } else {
        const b = randChoice([-8, -6, -4, 4, 6, 8]);
        const roots = b > 0 ? `-${b}, 0` : `0, ${-b}`;
        problems.push({ id: id++, category: 'Quadratics/Polynomials', prompt: `Solve x^2 ${b > 0 ? '+ ' + b : '- ' + Math.abs(b)}x = 0`, expected: roots });
      }
    } else if (i < 160) {
      const a = randInt(1, 25);
      problems.push({ id: id++, category: 'Quadratics/Polynomials', prompt: `Solve x^2 - ${a * a} = 0`, expected: `${-a}, ${a}` });
    } else if (i < 185) {
      const B = randInt(1, 5);
      const r = randInt(B + 1, B + 8);
      const A = Math.pow(r - B, 2) - r;
      problems.push({ id: id++, category: 'Quadratics/Polynomials', prompt: `Solve sqrt(x + ${A}) = x - ${B}`, expected: r });
    } else {
      problems.push({ id: id++, category: 'Quadratics/Polynomials', prompt: `Solve x^3 - 6x^2 + 11x - 6 = 0`, expected: `1, 2, 3` });
    }
  }

  // 6. Functions / Algebra (200)
  for (let i = 0; i < 200; i++) {
    if (i < 80) {
      // Alternate function evaluation phrasing: "Evaluate f(k) for f(x) = ax^2 + bx + c"
      const a = randInt(1, 4);
      const b = randInt(-5, 5);
      const c = randInt(-10, 10);
      const k = randInt(-8, 8);
      const exprStr = `${a === 1 ? '' : a}x^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}`;
      problems.push({ id: id++, category: 'Functions/Algebra', prompt: `Evaluate f(${k}) for f(x) = ${exprStr}`, expected: a * k * k + b * k + c });
    } else if (i < 130) {
      const a = randInt(1, 20);
      problems.push({ id: id++, category: 'Functions/Algebra', prompt: `Simplify (x^2 - ${a * a}) / (x - ${a})`, expected: `x + ${a}` });
    } else if (i < 170) {
      const p1 = randInt(2, 8);
      const p2 = randInt(2, 8);
      problems.push({ id: id++, category: 'Functions/Algebra', prompt: `Simplify (x^${p1} * x^${p2})`, expected: `x^${p1 + p2}` });
    } else {
      const a = randInt(1, 8);
      problems.push({ id: id++, category: 'Functions/Algebra', prompt: `table of values for x^2 - ${a}`, expected: `TABLE_VALUES` });
    }
  }

  // 7. Geometry / Trigonometry (200)
  const triples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 40, 41]];
  const trigValues = [
    { p: 'Calculate sin(0)', e: 0 },
    { p: 'Calculate cos(0)', e: 1 },
    { p: 'Calculate sin(pi/6)', e: 0.5 },
    { p: 'Calculate cos(pi/3)', e: 0.5 },
    { p: 'Calculate tan(pi/4)', e: 1 },
    { p: 'Calculate sin(pi/2)', e: 1 },
    { p: 'Calculate cos(pi)', e: -1 }
  ];

  for (let i = 0; i < 200; i++) {
    if (i < 50) {
      const t = randChoice(triples);
      problems.push({ id: id++, category: 'Geometry/Trigonometry', prompt: `show a right triangle with legs ${t[0]} and ${t[1]}`, expected: t[2] });
    } else if (i < 100) {
      const tv = randChoice(trigValues);
      problems.push({ id: id++, category: 'Geometry/Trigonometry', prompt: tv.p, expected: tv.e });
    } else if (i < 150) {
      const baseDeg = randChoice([30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 315, 330]);
      const mult = randInt(-4, 4);
      problems.push({ id: id++, category: 'Geometry/Trigonometry', prompt: `What is the coterminal angle for ${baseDeg + mult * 360} degrees?`, expected: baseDeg });
    } else {
      const b = randInt(4, 40);
      const h = randInt(3, 30);
      problems.push({ id: id++, category: 'Geometry/Trigonometry', prompt: `Calculate the area of a triangle with base ${b} and height ${h}`, expected: 0.5 * b * h });
    }
  }

  // 8. Calculus (200)
  for (let i = 0; i < 200; i++) {
    if (i < 80) {
      const a = randInt(1, 12);
      const n = randInt(2, 6);
      problems.push({ id: id++, category: 'Calculus', prompt: `Calculate the derivative of ${a}x^${n}`, expected: `${a * n}x^${n - 1}` });
    } else if (i < 140) {
      const a = randChoice([2, 4, 6, 8, 10]);
      const b = randInt(1, 12);
      problems.push({ id: id++, category: 'Calculus', prompt: `Evaluate the integral of ${a}x from 0 to ${b}`, expected: 0.5 * a * b * b });
    } else if (i < 170) {
      const m = randInt(2, 8);
      const b = randInt(1, 15);
      const xVal = randInt(-8, 8);
      problems.push({ id: id++, category: 'Calculus', prompt: `Evaluate the limit of ${m}x + ${b} as x approaches ${xVal}`, expected: m * xVal + b });
    } else {
      const a = randInt(1, 15);
      problems.push({ id: id++, category: 'Calculus', prompt: `Evaluate the limit of (x^2 - ${a * a}) / (x - ${a}) as x approaches ${a}`, expected: 2 * a });
    }
  }

  // 9. Probability / Statistics (200)
  function fact(num) {
    let r = 1;
    for (let j = 2; j <= num; j++) r *= j;
    return r;
  }

  for (let i = 0; i < 200; i++) {
    if (i < 80) {
      const n = randInt(4, 10);
      const r = randInt(1, n - 1);
      problems.push({ id: id++, category: 'Probability/Statistics', prompt: `Calculate combinations: choose ${r} items from a set of ${n}`, expected: Math.round(fact(n) / (fact(r) * fact(n - r))) });
    } else if (i < 140) {
      const n = randInt(3, 8);
      const r = randInt(1, Math.min(n, 4));
      problems.push({ id: id++, category: 'Probability/Statistics', prompt: `Calculate permutations: arrange ${r} items from a set of ${n}`, expected: Math.round(fact(n) / fact(n - r)) });
    } else if (i < 170) {
      const n = randChoice([20, 23, 30, 40]);
      let pNot = 1.0;
      for (let j = 0; j < n; j++) pNot *= (365 - j) / 365;
      problems.push({ id: id++, category: 'Probability/Statistics', prompt: `What is the probability of a shared birthday among ${n} people?`, expected: Math.round((1.0 - pNot) * 1000) / 1000 });
    } else {
      problems.push({ id: id++, category: 'Probability/Statistics', prompt: `Explain Simpson's paradox with hospital treatment success rates`, expected: `SIMPSONS_PARADOX` });
    }
  }

  // 10. Physics / Math Crossover (200)
  for (let i = 0; i < 200; i++) {
    if (i < 70) {
      const a = randInt(2, 15);
      const t = randInt(1, 20);
      problems.push({ id: id++, category: 'Physics/Math Crossover', prompt: `Calculate final velocity for an object accelerating at ${a} m/s^2 for ${t} seconds from rest`, expected: a * t });
    } else if (i < 140) {
      const m = randInt(2, 40);
      const a = randInt(2, 20);
      problems.push({ id: id++, category: 'Physics/Math Crossover', prompt: `Calculate the net force on an object with mass ${m} kg accelerating at ${a} m/s^2`, expected: m * a });
    } else {
      const m = randChoice([2, 4, 6, 8, 10, 12]);
      const v = randInt(2, 20);
      problems.push({ id: id++, category: 'Physics/Math Crossover', prompt: `Calculate the kinetic energy of a ${m} kg object moving at ${v} m/s`, expected: 0.5 * m * v * v });
    }
  }

  return problems;
}

async function runDevBenchmark() {
  const problems = generateDevProblems();
  const totalProblems = problems.length;

  console.log('================================================================');
  console.log(`🔧 PYTHOS DEV BENCHMARK v2 (${totalProblems} PROBLEMS)`);
  console.log('================================================================\n');

  const stats = {
    total: totalProblems,
    correct: 0,
    wrong: 0,
    unknown: 0,
    categories: {}
  };

  const unknownSamples = [];
  const wrongSamples = [];

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
        const ans = extractPythosAnswer(resp, intent);
        const isMatch = compareAnswers(ans, prob.expected);
        if (isMatch) {
          stats.correct++;
          stats.categories[cat].correct++;
        } else {
          stats.wrong++;
          stats.categories[cat].wrong++;
          if (wrongSamples.length < 5) wrongSamples.push({ id: prob.id, prompt: prob.prompt, expected: prob.expected, ans });
        }
      } else {
        const preflight = extractPreflightDeterministicFacts(prob.prompt, []);
        if (preflight && preflight.length > 0 && preflight[0].type === 'SIMPSONS_PARADOX_EVALUATION' && prob.expected === 'SIMPSONS_PARADOX') {
          stats.correct++;
          stats.categories[cat].correct++;
        } else {
          stats.unknown++;
          stats.categories[cat].unknown++;
          if (unknownSamples.length < 5) unknownSamples.push({ id: prob.id, prompt: prob.prompt, expected: prob.expected });
        }
      }
    } catch (e) {
      stats.unknown++;
      stats.categories[cat].unknown++;
    }
  }

  console.log('--- Dev v2 Summary ---');
  console.log(`TOTAL:   ${stats.total}`);
  console.log(`CORRECT: ${stats.correct} (${((stats.correct/stats.total)*100).toFixed(2)}%)`);
  console.log(`WRONG:   ${stats.wrong}`);
  console.log(`UNKNOWN: ${stats.unknown}`);
  console.log('----------------------');
  for (const [c, s] of Object.entries(stats.categories)) {
    console.log(`  ${c}: ${s.correct}/${s.total} (${((s.correct/s.total)*100).toFixed(1)}%) | Unknown: ${s.unknown} | Wrong: ${s.wrong}`);
  }

  return { stats, unknownSamples, wrongSamples };
}

if (require.main === module) {
  runDevBenchmark().then(() => process.exit(0));
}

module.exports = { runDevBenchmark, generateDevProblems };
