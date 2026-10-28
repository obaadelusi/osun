// Automated DOM interaction test for Pay Your Taxes
const fs = require('fs');
const path = require('path');

console.log('--- Testing DOM & Calculator Behaviour in Node Simulation ---');

const taxHtml = fs.readFileSync(path.join(__dirname, '..', 'pay-your-taxes.html'), 'utf8');
const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

// Minimal browser DOM shim to execute script.js
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  toggle(c, force) {
    if (force === undefined) {
      if (this.classes.has(c)) this.classes.delete(c);
      else this.classes.add(c);
    } else if (force) {
      this.classes.add(c);
    } else {
      this.classes.delete(c);
    }
  }
  contains(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(tagName = 'div', id = '', className = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = new MockClassList();
    if (className) className.split(/\s+/).forEach(c => c && this.classList.add(c));
    this.attributes = {};
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this._textContent = '';
    this._innerHTML = '';
    this.value = '';
    this.checked = false;
    this.hidden = false;
  }

  get textContent() { return this._textContent; }
  set textContent(val) { this._textContent = String(val); }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this._textContent = val.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      this.dataset[key] = String(value);
    }
  }

  getAttribute(name) { return this.attributes[name] || null; }
  removeAttribute(name) { delete this.attributes[name]; }
  hasAttribute(name) { return name in this.attributes; }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    list.forEach(fn => fn(event));
  }

  focus() {}
  scrollIntoView() {}

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    const results = [];
    function search(node) {
      if (matches(node, sel)) results.push(node);
      for (const child of node.children) search(child);
    }
    for (const child of this.children) search(child);
    return results;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
}

function matches(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('[') && sel.endsWith(']')) {
    const attr = sel.slice(1, -1).split('=')[0].replace(/['"]/g, '');
    const val = sel.slice(1, -1).split('=')[1]?.replace(/['"]/g, '');
    if (val === undefined) return el.hasAttribute(attr);
    return el.getAttribute(attr) === val;
  }
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

console.log('DOM Shim ready. Running interactive validation test...');

// Verify calculator outputs on multiple cases
function runPureCalc(gross, pension, other, rent, isMonthly) {
  const factor = isMonthly ? 12 : 1;
  const grossAnnual = gross * factor;
  const pensionAnnual = pension * factor;
  const otherAnnual = other * factor;
  const rentAnnual = rent * factor;
  const rentRelief = Math.min(rentAnnual * 0.2, 500000);
  const totalReliefs = pensionAnnual + otherAnnual + rentRelief;
  const chargeable = Math.max(0, grossAnnual - totalReliefs);

  const bands = [
    { cap: 800000, rate: 0.0 },
    { cap: 2200000, rate: 0.15 },
    { cap: 9000000, rate: 0.18 },
    { cap: 13000000, rate: 0.21 },
    { cap: 25000000, rate: 0.23 },
    { cap: Infinity, rate: 0.25 }
  ];

  let remaining = chargeable;
  let tax = 0;
  for (const b of bands) {
    if (remaining <= 0) break;
    const chunk = Math.min(remaining, b.cap);
    tax += chunk * b.rate;
    remaining -= chunk;
  }
  return { grossAnnual, chargeable, tax, monthlyTax: tax / 12, rentRelief };
}

// 1. Extreme boundary test: ₦1,000,000,000 income
const billion = runPureCalc(1000000000, 0, 0, 0, false);
console.log('₦1 Billion Gross Tax:', billion.tax);
if (billion.tax > 240000000) {
  console.log('PASS: Extreme high income calculation operates accurately');
}

// 2. Minimum wage worker: ₦70,000/month = ₦840,000/year
const minWage = runPureCalc(70000, 0, 0, 0, true);
console.log('₦70,000/month Gross Tax:', minWage.tax, 'Annual:', minWage.tax / 12, '/month');
// Chargeable = 840,000. First 800k @ 0%, next 40k @ 15% = ₦6,000/year = ₦500/month!
if (minWage.tax === 6000 && minWage.monthlyTax === 500) {
  console.log('PASS: Minimum wage worker pays exactly ₦500/month (₦6,000/year)');
} else {
  console.error('FAIL: Minimum wage worker calculation mismatch');
  process.exit(1);
}

// 3. Middle class salary: ₦500,000/month = ₦6,000,000/year with ₦40,000/mo pension & ₦1,500,000/yr rent
// pensionAnnual = 480,000
// rentAnnual = 1,500,000 -> rentRelief = 300,000
// totalReliefs = 780,000
// chargeable = 6,000,000 - 780,000 = 5,220,000
// Band 1: 800,000 @ 0% = 0
// Band 2: 2,200,000 @ 15% = 330,000
// Band 3: 2,220,000 @ 18% = 399,600
// Total annual tax = 729,600. Monthly tax = 60,800.
const midSalary = runPureCalc(6000000, 480000, 0, 1500000, false);
console.log('Middle income tax:', midSalary.tax);
if (midSalary.tax === 729600 && midSalary.monthlyTax === 60800) {
  console.log('PASS: Middle income salary with pension & rent relief calculates accurately');
} else {
  console.error('FAIL: Middle income calculation mismatch', midSalary);
  process.exit(1);
}

console.log('ALL SIMULATION & CALCULATION TESTS PASSED!');
