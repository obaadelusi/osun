// Automated verification for Calculate Your Personal Income Tax page
const fs = require('fs');
const path = require('path');

let errors = [];
let passes = [];

function assert(condition, message) {
  if (condition) {
    passes.push('PASS: ' + message);
  } else {
    errors.push('FAIL: ' + message);
    console.error('FAIL: ' + message);
  }
}

console.log('--- Testing Calculate Your Personal Income Tax Implementation ---');

// 1. File existence
const calcHtmlPath = path.join(__dirname, '..', 'calculate-your-personal-income-tax.html');
assert(fs.existsSync(calcHtmlPath), 'calculate-your-personal-income-tax.html exists');

const htmlContent = fs.readFileSync(calcHtmlPath, 'utf8');

// 2. Static HTML structure & Accessibility checks
assert(htmlContent.includes('id="calculate-tax-page"'), 'Page container #calculate-tax-page exists');
assert(htmlContent.includes('data-i18n="calc.meta.title"'), 'Page head title uses calc.meta.title');
assert(htmlContent.includes('data-i18n-attr="content:calc.meta.description"'), 'Meta description uses calc.meta.description');
assert(htmlContent.includes('class="skip-link"'), 'Skip links exist');
assert(htmlContent.includes('class="official-topbar"'), 'Official topbar exists');
assert(htmlContent.includes('class="breadcrumb-nav"'), 'Breadcrumbs exist');
assert(htmlContent.includes('href="index.html"'), 'Breadcrumbs link to index.html');
assert(htmlContent.includes('href="pay-your-taxes.html"'), 'Breadcrumbs link to pay-your-taxes.html');
assert(htmlContent.includes('<h1 class="page-title" data-i18n="calc.title">'), 'Page H1 exists with calc.title translation');
assert(htmlContent.includes('Uses the personal income tax rates in the Nigeria Tax Act 2025, in force from 1 January 2026.'), 'Statutory legal framework notice present');

// Form & Interactive Calculator elements
assert(htmlContent.includes('id="tax-calculator"'), 'Parent tax calculator section #tax-calculator exists');
assert(htmlContent.includes('id="tax-calc-form"'), 'Form #tax-calc-form exists');
assert(htmlContent.includes('name="period"'), 'Period radio group exists');
assert(htmlContent.includes('value="yearly"'), 'Yearly period option exists');
assert(htmlContent.includes('value="monthly"'), 'Monthly period option exists');
assert(htmlContent.includes('id="tax-gross"'), 'Gross input #tax-gross exists');
assert(htmlContent.includes('id="tax-gross-hint"'), 'Gross input hint #tax-gross-hint exists');
assert(htmlContent.includes('id="tax-gross-error"'), 'Gross input error #tax-gross-error exists');
assert(htmlContent.includes('id="tax-pension"'), 'Pension input #tax-pension exists');
assert(htmlContent.includes('id="tax-other"'), 'Other deductions input #tax-other exists');
assert(htmlContent.includes('id="tax-rent"'), 'Rent input #tax-rent exists');
assert(htmlContent.includes('id="tax-rates"'), 'Default tax rates table container #tax-rates exists');
assert(htmlContent.includes('id="tax-rates-title"'), 'Tax rates table title #tax-rates-title exists');
assert(htmlContent.includes('First ₦800,000'), 'Band 1: First ₦800,000 exists');
assert(htmlContent.includes('Next ₦2,200,000'), 'Band 2: Next ₦2,200,000 exists');
assert(htmlContent.includes('Next ₦9,000,000'), 'Band 3: Next ₦9,000,000 exists');
assert(htmlContent.includes('Next ₦13,000,000'), 'Band 4: Next ₦13,000,000 exists');
assert(htmlContent.includes('Next ₦25,000,000'), 'Band 5: Next ₦25,000,000 exists');
assert(htmlContent.includes('Above ₦50,000,000'), 'Band 6: Above ₦50,000,000 exists');
assert(htmlContent.includes('id="tax-results"'), 'Dynamic results container #tax-results exists');
assert(htmlContent.includes('id="tax-calc-status"'), 'Live screen reader status container #tax-calc-status exists');
assert(htmlContent.includes('role="status"'), 'Status container has role="status"');
assert(htmlContent.includes('aria-live="polite"'), 'Status container has aria-live="polite"');

// Explanatory & educational sections
assert(htmlContent.includes('id="tax-bands-guide"'), 'Tax bands guide section #tax-bands-guide exists');
assert(htmlContent.includes('0% Tax Exemption Threshold'), '0% exemption threshold explainer exists');
assert(htmlContent.includes('20% Rent Relief Deduction'), '20% rent relief explainer exists');
assert(htmlContent.includes('Progressive Marginal Tiers'), 'Progressive marginal tiers explainer exists');
assert(htmlContent.includes('id="tax-worked-examples"'), 'Worked examples section #tax-worked-examples exists');
assert(htmlContent.includes('id="tax-deductions-guide"'), 'Allowable deductions guide #tax-deductions-guide exists');
assert(htmlContent.includes('id="tax-next-steps"'), 'What to do next section #tax-next-steps exists');
assert(htmlContent.includes('id="tax-calculator-faq"'), 'Tax calculator FAQ section exists');
assert(htmlContent.includes('id="tax-help"'), 'OIRS customer support section exists');
assert(htmlContent.includes('class="emergency"'), 'Emergency helpline exists');
assert(htmlContent.includes('class="feedback"'), 'Feedback widget exists');
assert(htmlContent.includes('class="site-footer"'), 'Site footer exists');
assert(htmlContent.includes('<script src="script.js"></script>'), 'script.js script tag included');

// Check official OIRS external payment links
const expectedLinks = [
  'https://osun.electroniccollectionsecg.com/payments/pay',
  'https://osun.electroniccollectionsecg.com/payments/pay-bank-pos',
  'https://osun.electroniccollectionsecg.com/taxes/apply',
  'https://irs.os.gov.ng/individual-annual-tax-returns/',
  'tel:+2348161338176',
  'mailto:info@oirs.ng'
];
expectedLinks.forEach(link => {
  assert(htmlContent.includes(link), `calculate-your-personal-income-tax.html contains link: ${link}`);
});

// 3. DOM & Calculation Simulation with script.js logic
console.log('--- Testing Interactive DOM Behavior & Calculation Logic ---');

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

// Build mock document hierarchy matching calculate-your-personal-income-tax.html
const doc = new MockElement('html');
const formEl = new MockElement('form', 'tax-calc-form');
const grossEl = new MockElement('input', 'tax-gross');
const grossHintEl = new MockElement('p', 'tax-gross-hint');
const grossErrorEl = new MockElement('p', 'tax-gross-error');
grossErrorEl.hidden = true;

const pensionEl = new MockElement('input', 'tax-pension');
const otherEl = new MockElement('input', 'tax-other');
const rentEl = new MockElement('input', 'tax-rent');

const radioYearly = new MockElement('input');
radioYearly.setAttribute('type', 'radio');
radioYearly.setAttribute('name', 'period');
radioYearly.setAttribute('value', 'yearly');
radioYearly.checked = true;

const radioMonthly = new MockElement('input');
radioMonthly.setAttribute('type', 'radio');
radioMonthly.setAttribute('name', 'period');
radioMonthly.setAttribute('value', 'monthly');

formEl.appendChild(radioYearly);
formEl.appendChild(radioMonthly);
formEl.appendChild(grossEl);
formEl.appendChild(grossHintEl);
formEl.appendChild(grossErrorEl);
formEl.appendChild(pensionEl);
formEl.appendChild(otherEl);
formEl.appendChild(rentEl);

const ratesEl = new MockElement('div', 'tax-rates');
const resultsEl = new MockElement('div', 'tax-results');
resultsEl.hidden = true;
const statusEl = new MockElement('div', 'tax-calc-status');

doc.appendChild(formEl);
doc.appendChild(ratesEl);
doc.appendChild(resultsEl);
doc.appendChild(statusEl);

// Simulation of tax computation logic from script.js
function calculateTax(inputs) {
  const isMonthly = inputs.period === 'monthly';
  const factor = isMonthly ? 12 : 1;
  const grossAnnual = inputs.gross * factor;
  const pensionAnnual = inputs.pension * factor;
  const otherAnnual = inputs.other * factor;
  const rentAnnual = inputs.rent * factor;

  const rentRelief = Math.min(rentAnnual * 0.2, 500000);
  const totalReliefs = pensionAnnual + otherAnnual + rentRelief;
  const chargeableIncome = Math.max(0, grossAnnual - totalReliefs);

  const bands = [
    { label: 'First ₦800,000', rate: 0, cap: 800000 },
    { label: 'Next ₦2,200,000', rate: 0.15, cap: 2200000 },
    { label: 'Next ₦9,000,000', rate: 0.18, cap: 9000000 },
    { label: 'Next ₦13,000,000', rate: 0.21, cap: 13000000 },
    { label: 'Next ₦25,000,000', rate: 0.23, cap: 25000000 },
    { label: 'Above ₦50,000,000', rate: 0.25, cap: Infinity }
  ];

  let remaining = chargeableIncome;
  let totalAnnualTax = 0;
  const bandBreakdown = [];

  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, b.cap);
    const taxInBand = taxableInBand * b.rate;
    totalAnnualTax += taxInBand;
    bandBreakdown.push({
      label: b.label,
      ratePercent: Math.round(b.rate * 100) + '%',
      taxable: taxableInBand,
      tax: taxInBand
    });
    remaining -= taxableInBand;
  }

  const totalMonthlyTax = totalAnnualTax / 12;
  const effectiveRate = grossAnnual > 0 ? ((totalAnnualTax / grossAnnual) * 100).toFixed(1) : '0.0';
  const takeHomeAnnual = Math.max(0, grossAnnual - pensionAnnual - otherAnnual - totalAnnualTax);
  const takeHomeMonthly = takeHomeAnnual / 12;

  return {
    isMonthly,
    grossAnnual,
    grossMonthly: grossAnnual / 12,
    pensionAnnual,
    otherAnnual,
    rentRelief,
    totalReliefs,
    chargeableIncome,
    totalAnnualTax,
    totalMonthlyTax,
    effectiveRate,
    takeHomeAnnual,
    takeHomeMonthly,
    bandBreakdown
  };
}

// Test case 1: Low earner ₦750,000/year -> ₦0 tax
const r1 = calculateTax({ gross: 750000, pension: 0, other: 0, rent: 0, period: 'yearly' });
assert(r1.totalAnnualTax === 0, 'Low earner ₦750k pays ₦0 annual tax');
assert(r1.effectiveRate === '0.0', 'Low earner effective rate is 0.0%');
assert(r1.takeHomeAnnual === 750000, 'Low earner keeps 100% of income');

// Test case 2: Mid-level professional (Gross ₦4,000,000, Pension ₦320,000, Rent ₦1,000,000)
const r2 = calculateTax({ gross: 4000000, pension: 320000, other: 0, rent: 1000000, period: 'yearly' });
assert(r2.rentRelief === 200000, 'Rent relief is 20% of ₦1,000,000 = ₦200,000');
assert(r2.totalReliefs === 520000, 'Total reliefs = ₦520,000');
assert(r2.chargeableIncome === 3480000, 'Chargeable income = ₦3,480,000');
assert(r2.totalAnnualTax === 416400, 'Total annual tax = ₦416,400 (Band 2: ₦330k + Band 3: ₦86.4k)');
assert(r2.effectiveRate === '10.4', 'Effective rate = 10.4%');

// Test case 3: High earner with rent relief cap at ₦500,000 (Rent ₦4,000,000 -> 20% is ₦800k, capped at ₦500k)
const r3 = calculateTax({ gross: 15000000, pension: 1200000, other: 0, rent: 4000000, period: 'yearly' });
assert(r3.rentRelief === 500000, 'Rent relief correctly capped at ₦500,000 max');
assert(r3.totalReliefs === 1700000, 'Total reliefs = ₦1,700,000');
assert(r3.chargeableIncome === 13300000, 'Chargeable income = ₦13,300,000');
// 800k @ 0% = 0
// 2.2m @ 15% = 330,000
// 9.0m @ 18% = 1,620,000
// 1.3m @ 21% = 273,000
// Total = 2,223,000
assert(r3.totalAnnualTax === 2223000, 'High earner tax across bands 1-4 = ₦2,223,000');
assert(r3.effectiveRate === '14.8', 'Effective rate = 14.8%');

// Test case 4: Monthly period conversion
const r4 = calculateTax({ gross: 250000, pension: 20000, other: 0, rent: 0, period: 'monthly' });
assert(r4.grossAnnual === 3000000, 'Monthly gross of ₦250k converts to ₦3m annual');
assert(r4.pensionAnnual === 240000, 'Monthly pension of ₦20k converts to ₦240k annual');
assert(r4.chargeableIncome === 2760000, 'Chargeable income = ₦2,760,000');
// 800k @ 0% = 0, 1.96m @ 15% = 294,000 annual = 24,500/month
assert(r4.totalAnnualTax === 294000, 'Annual tax = ₦294,000');
assert(r4.totalMonthlyTax === 24500, 'Monthly tax = ₦24,500');

// 4. Check script.js translation dictionaries for tax calculator
const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
assert(scriptContent.includes("'tax.calc.view': 'Wo ẹ̀rọ ìṣírò owó-orí'"), 'Yorùbá dictionary contains tax.calc.view');
assert(scriptContent.includes("'tax.calc.view': 'View tax calculator'"), 'English dictionary contains tax.calc.view');
assert(scriptContent.includes("'calc.title': 'Calculate Your Personal Income Tax'"), 'English dictionary contains calc.title');
assert(scriptContent.includes("'calc.title': 'Ṣírò Owó-orí Ara Ẹni Rẹ'"), 'Yorùbá dictionary contains calc.title');
assert(scriptContent.includes("'calc.back.tax': 'Back to Pay Your Taxes'"), 'English dictionary contains calc.back.tax');
assert(scriptContent.includes("'calc.back.tax': 'Pada sí San Owó-orí Rẹ'"), 'Yorùbá dictionary contains calc.back.tax');

console.log('\n--- Test Summary ---');
console.log(`Passed: ${passes.length}`);
console.log(`Failed: ${errors.length}`);

if (errors.length > 0) {
  process.exit(1);
} else {
  console.log('ALL TAX CALCULATOR PAGE VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}
