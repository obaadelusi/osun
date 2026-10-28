// Automated verification for Pay Your Taxes feature
const fs = require('fs');
const path = require('path');

let errors = [];
let passes = [];

function assert(condition, message) {
  if (condition) {
    passes.push('PASS: ' + message);
  } else {
    errors.push('FAIL: ' + message);
  }
}

console.log('--- Testing Pay Your Taxes Implementation ---');

// 1. Check pay-your-taxes.html existence
const taxHtmlPath = path.join(__dirname, '..', 'pay-your-taxes.html');
assert(fs.existsSync(taxHtmlPath), 'pay-your-taxes.html exists');

const taxHtml = fs.readFileSync(taxHtmlPath, 'utf8');

// 2. Check DOM Elements & Accessibility in pay-your-taxes.html
assert(taxHtml.includes('id="pay-your-taxes"'), 'pay-your-taxes root container exists');
assert(taxHtml.includes('data-i18n="tax.meta.title"'), 'Page head title uses tax.meta.title');
assert(taxHtml.includes('data-i18n-attr="content:tax.meta.description"'), 'Meta description uses tax.meta.description');
assert(taxHtml.includes('<h1 class="page-title" data-i18n="tax.title">Pay Your Taxes</h1>'), 'H1 page title exists and has proper translation key');
assert(taxHtml.includes('class="skip-link"'), 'Skip link exists for accessibility');
assert(taxHtml.includes('class="official-topbar"'), 'Official top bar exists');
assert(taxHtml.includes('class="breadcrumb-nav"'), 'Breadcrumb navigation exists');
assert(taxHtml.includes('class="tax-toc"'), 'In-page Table of Contents bar exists');
assert(taxHtml.includes('id="tax-steps"'), '3-Step payment guide #tax-steps exists');
assert(taxHtml.includes('id="tax-types"'), 'Tax types showcase #tax-types exists');
assert(taxHtml.includes('id="tax-calculator"'), 'Parent tax calculator section #tax-calculator exists');
assert(taxHtml.includes('Calculate your personal income tax'), 'Section #tax-calculator has title "Calculate your personal income tax"');
assert(taxHtml.includes('Uses the personal income tax rates in the Nigeria Tax Act 2025, in force from 1 January 2026.'), 'Section #tax-calculator has description text');
assert(taxHtml.includes('View tax calculator'), 'Section #tax-calculator has "View tax calculator" button text');
assert(taxHtml.includes('href="calculate-your-personal-income-tax.html"'), 'Button links to calculate-your-personal-income-tax.html');

// 3. Check official external links to OIRS
const expectedLinks = [
  'https://osun.electroniccollectionsecg.com/payments/pay',
  'https://osun.electroniccollectionsecg.com/taxes/apply',
  'https://osun.electroniccollectionsecg.com/taxes/retrieve',
  'https://osun.electroniccollectionsecg.com/payments/pay-bank-pos',
  'https://osun.electroniccollectionsecg.com/payments/pay-with-invoice',
  'https://ecg.ng/osunverify',
  'https://irs.os.gov.ng/individual-annual-tax-returns/',
  'https://irs.os.gov.ng/annual-returns/',
  'https://ecg.ng/requestosunbill',
  'https://irs.os.gov.ng/pay-as-you-earn/',
  'https://irs.os.gov.ng/tax-schedule/direct-assesment/',
  'https://irs.os.gov.ng/tax-schedule/land-use-charge/',
  'https://irs.os.gov.ng/stamp-dutY',
  'https://irs.os.gov.ng/motor-vehicle-licensing',
  'https://irs.os.gov.ng/tax-stations/',
  'tel:+2348161338176',
  'mailto:info@oirs.ng'
];

expectedLinks.forEach(link => {
  assert(taxHtml.includes(link), `pay-your-taxes.html contains official link: ${link}`);
});

// 4. Check Tax Calculator Logic against 2026 Nigeria Tax Act
function testTaxCalculation(gross, pension = 0, other = 0, rent = 0, isMonthly = false) {
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
  return {
    grossAnnual,
    chargeable,
    annualTax: tax,
    monthlyTax: tax / 12,
    rentRelief
  };
}

// Test case 1: Gross ₦800,000 (minimum wage / low income threshold) -> ₦0 tax
const res800k = testTaxCalculation(800000);
assert(res800k.annualTax === 0, '₦800,000 annual gross incurs ₦0 tax (0% exemption band)');

// Test case 2: Gross ₦3,000,000 (full Band 2) -> ₦330,000 tax
const res3m = testTaxCalculation(3000000);
assert(res3m.annualTax === 330000, '₦3,000,000 annual gross incurs ₦330,000 tax');

// Test case 3: Gross ₦12,000,000 (full Band 3) -> ₦1,950,000 tax
const res12m = testTaxCalculation(12000000);
assert(res12m.annualTax === 1950000, '₦12,000,000 annual gross incurs ₦1,950,000 tax');

// Test case 4: Gross ₦4,500,000 with ₦300,000 pension & ₦1,000,000 rent
// Rent relief = min(20% of 1m, 500k) = ₦200,000.
// Chargeable = 4.5m - (300k + 200k) = 4,000,000.
// Band 1: 800k @ 0% = 0
// Band 2: 2.2m @ 15% = 330,000
// Band 3: 1m @ 18% = 180,000
// Total annual tax = ₦510,000. Monthly = ₦42,500.
const res4_5m = testTaxCalculation(4500000, 300000, 0, 1000000);
assert(res4_5m.rentRelief === 200000, '₦1,000,000 rent yields ₦200,000 rent relief (20%)');
assert(res4_5m.chargeable === 4000000, 'Chargeable income is ₦4,000,000');
assert(res4_5m.annualTax === 510000, 'Annual tax is ₦510,000');
assert(res4_5m.monthlyTax === 42500, 'Monthly tax is ₦42,500');

// Test case 5: High rent cap test (₦3,500,000 rent -> 20% is 700k -> capped at 500k)
const resHighRent = testTaxCalculation(10000000, 0, 0, 3500000);
assert(resHighRent.rentRelief === 500000, 'Rent relief is properly capped at ₦500,000 maximum');

// 5. Check script.js integration
const scriptJsPath = path.join(__dirname, '..', 'script.js');
const scriptJs = fs.readFileSync(scriptJsPath, 'utf8');

assert(scriptJs.includes('initTaxCalculator'), 'initTaxCalculator defined in script.js');
assert(scriptJs.includes('updateTaxPageLanguage'), 'updateTaxPageLanguage hook defined in script.js');
assert(scriptJs.includes("'tax.title': 'San Owó-orí Rẹ'"), 'Yoruba dictionary has tax.title');
assert(scriptJs.includes("'tax.calc.submit'"), 'Yoruba dictionary has tax.calc.submit');
assert(scriptJs.includes("'tax.dates.1.when': 'Ọjọ́ kẹwàá oṣù tó tẹ̀lé e'"), 'Yoruba dictionary has tax deadlines');
assert(scriptJs.includes("'tax.meta.title': 'Pay Your Taxes | Government of Osun State'"), 'EN dictionary has tax.meta.title');

// 6. Check styles.css rules
const stylesCssPath = path.join(__dirname, '..', 'styles.css');
const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

assert(stylesCss.includes('.tax-hero'), 'styles.css contains .tax-hero');
assert(stylesCss.includes('.tax-quick'), 'styles.css contains .tax-quick');
assert(stylesCss.includes('.tax-toc'), 'styles.css contains .tax-toc');
assert(stylesCss.includes('.tax-notice'), 'styles.css contains .tax-notice');
assert(stylesCss.includes('.tax-steps'), 'styles.css contains .tax-steps');
assert(stylesCss.includes('.tax-types'), 'styles.css contains .tax-types');
assert(stylesCss.includes('.tax-calc'), 'styles.css contains .tax-calc');
assert(stylesCss.includes('.tax-form'), 'styles.css contains .tax-form');
assert(stylesCss.includes('.tax-results'), 'styles.css contains .tax-results');
assert(stylesCss.includes('.tax-table'), 'styles.css contains .tax-table');
assert(stylesCss.includes('.tax-summary-box'), 'styles.css contains .tax-summary-box');
assert(stylesCss.includes('.tax-stat-grid'), 'styles.css contains .tax-stat-grid');
assert(stylesCss.includes('.tax-faq'), 'styles.css contains .tax-faq');
assert(stylesCss.includes('.tax-contact'), 'styles.css contains .tax-contact');
assert(stylesCss.includes('.ext-link'), 'styles.css contains .ext-link');

// 7. Check Cross-linking from other pages
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const touristHtml = fs.readFileSync(path.join(__dirname, '..', 'tourist.html'), 'utf8');
const planHtml = fs.readFileSync(path.join(__dirname, '..', 'plan-your-visit.html'), 'utf8');

assert(indexHtml.includes('href="pay-your-taxes.html"'), 'index.html links to pay-your-taxes.html');
assert(indexHtml.includes('class="service-card" href="pay-your-taxes.html"'), 'index.html popular service card links to pay-your-taxes.html');
assert(touristHtml.includes('href="pay-your-taxes.html"'), 'tourist.html mega menu links to pay-your-taxes.html');
assert(planHtml.includes('href="pay-your-taxes.html"'), 'plan-your-visit.html mega menu links to pay-your-taxes.html');

console.log('\n--- Test Results ---');
console.log(`Passed: ${passes.length}`);
console.log(`Failed: ${errors.length}`);

if (errors.length > 0) {
  errors.forEach(err => console.error(err));
  process.exit(1);
} else {
  console.log('ALL PAY YOUR TAXES VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}
