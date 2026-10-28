// Automated verification for Plan Your Visit feature
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

console.log('--- Testing Plan Your Visit Implementation ---');

// 1. Check plan-your-visit.html existence
const planHtmlPath = path.join(__dirname, '..', 'plan-your-visit.html');
assert(fs.existsSync(planHtmlPath), 'plan-your-visit.html exists');

const planHtml = fs.readFileSync(planHtmlPath, 'utf8');

// 2. Check DOM Elements in plan-your-visit.html
assert(planHtml.includes('id="plan-your-visit"'), 'plan-your-visit root container exists');
assert(planHtml.includes('data-i18n="plan.meta.title"'), 'Page head title uses plan.meta.title');
assert(planHtml.includes('<h1 class="page-title" data-i18n="plan.title">Plan Your Visit</h1>'), 'Page H1 title is clean "Plan Your Visit"');
assert(!planHtml.includes('id="plan-tabs"'), 'Pill tabs container #plan-tabs successfully removed');
assert(planHtml.includes('id="plan-site-select"'), 'Dropdown #plan-site-select exists as main destination selector');
assert(planHtml.includes('id="site-hero-img"'), 'Hero image #site-hero-img exists');
assert(planHtml.includes('id="site-badge"'), 'Badge element #site-badge exists');
assert(planHtml.includes('id="site-name"'), 'Site name element #site-name exists');
assert(planHtml.includes('id="site-hours"'), 'Site hours element #site-hours exists');
assert(planHtml.includes('id="site-admission"'), 'Site admission element #site-admission exists');
assert(planHtml.includes('id="site-guides"'), 'Site guides element #site-guides exists');
assert(planHtml.includes('id="site-access"'), 'Site accessibility element #site-access exists');
assert(planHtml.includes('id="site-rules"'), 'Site rules element #site-rules exists');
assert(planHtml.includes('id="site-facilities"'), 'Site facilities element #site-facilities exists');
assert(planHtml.includes('id="site-directions"'), 'Site directions element #site-directions exists');
assert(planHtml.includes('id="visit-planner-form"'), 'Planner form #visit-planner-form exists');
assert(planHtml.includes('id="itinerary-summary"'), 'Summary container #itinerary-summary exists');
assert(planHtml.includes('id="feedback"'), 'Feedback widget #feedback exists');
assert(planHtml.includes('form-field-context__icon'), 'Location icon SVG .form-field-context__icon exists in planner-site-name');
assert(planHtml.includes('id="planner-site-text"'), '#planner-site-text element exists');

// 3. Check Tourist Sites in plan-your-visit.html dropdown and switchers
const expectedSites = [
  'osun-sacred-grove',
  'olumirin-waterfall',
  'oke-maria',
  'oduduwa-shrine',
  'moremi-statue',
  'civic-centre'
];

expectedSites.forEach(siteId => {
  assert(!planHtml.includes(`data-site="${siteId}"`), `Pill tab for ${siteId} is removed`);
  assert(planHtml.includes(`value="${siteId}"`), `Select option for ${siteId} exists`);
  assert(planHtml.includes(`data-switch-site="${siteId}"`), `Other-site switcher for ${siteId} exists`);
});

// 4. Check script.js syntax and data model
const scriptJsPath = path.join(__dirname, '..', 'script.js');
assert(fs.existsSync(scriptJsPath), 'script.js exists');

const scriptJs = fs.readFileSync(scriptJsPath, 'utf8');
assert(scriptJs.includes('TOURIST_SITES'), 'TOURIST_SITES database defined in script.js');
assert(scriptJs.includes('initPlanYourVisit'), 'initPlanYourVisit controller defined in script.js');
assert(!scriptJs.includes('tabsContainer'), 'tabsContainer reference removed from script.js');

expectedSites.forEach(siteId => {
  assert(scriptJs.includes(`'${siteId}': {`), `TOURIST_SITES has entry for ${siteId}`);
});

// Check null-guards in script.js
assert(scriptJs.includes('if (!root) return null;'), 'Carousel has null guard');
assert(scriptJs.includes('if (alertEl) {'), 'Alert element has null guard');
assert(scriptJs.includes('if (feedback) {'), 'Feedback element has null guard');
assert(scriptJs.includes('if (form && input && list)'), 'Search suggestions have null guard');

// 5. Test tourist.html deep-links
const touristHtmlPath = path.join(__dirname, '..', 'tourist.html');
const touristHtml = fs.readFileSync(touristHtmlPath, 'utf8');

expectedSites.forEach(siteId => {
  assert(touristHtml.includes(`plan-your-visit.html?site=${siteId}`), `tourist.html links to plan-your-visit.html?site=${siteId}`);
});

// 6. Test index.html deep-links
const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

assert(indexHtml.includes('plan-your-visit.html?site=osun-sacred-grove'), 'index.html hero links to plan-your-visit.html?site=osun-sacred-grove');
assert(indexHtml.includes('plan-your-visit.html'), 'index.html mega menu links to plan-your-visit.html');

// 7. Test styles.css rules
const stylesCssPath = path.join(__dirname, '..', 'styles.css');
const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

assert(!stylesCss.includes('.plan-tabs {'), 'styles.css .plan-tabs rule removed');
assert(stylesCss.includes('.plan-dropdown'), 'styles.css contains .plan-dropdown');
assert(stylesCss.includes('.showcase-card'), 'styles.css contains .showcase-card');
assert(stylesCss.includes('.details-grid'), 'styles.css contains .details-grid');
assert(stylesCss.includes('.planner-section'), 'styles.css contains .planner-section');
assert(stylesCss.includes('.summary-box'), 'styles.css contains .summary-box');
assert(stylesCss.includes('.form-field-context__icon'), 'styles.css contains .form-field-context__icon');
assert(stylesCss.includes('.official-topbar'), 'styles.css contains .official-topbar');
assert(stylesCss.includes('.official-topbar__flag'), 'styles.css contains .official-topbar__flag');
assert(stylesCss.includes('@media print'), 'styles.css contains @media print rules for itinerary');

// 8. Test Official Top Bar on every page
const pages = [
  { name: 'index.html', html: indexHtml },
  { name: 'tourist.html', html: touristHtml },
  { name: 'plan-your-visit.html', html: planHtml }
];

pages.forEach(p => {
  assert(p.html.includes('class="official-topbar"'), `${p.name} contains .official-topbar container`);
  assert(p.html.includes('class="official-topbar__flag"'), `${p.name} contains .official-topbar__flag SVG`);
  assert(p.html.includes('official website of the Osun State') && p.html.includes('Government.'), `${p.name} contains official banner text`);
});

assert(scriptJs.includes("'topbar.official'"), 'script.js contains topbar.official translation key');

console.log('\n--- Test Results ---');
console.log(`Passed: ${passes.length}`);
console.log(`Failed: ${errors.length}`);

if (errors.length > 0) {
  errors.forEach(err => console.error(err));
  process.exit(1);
} else {
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}
