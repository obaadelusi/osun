import { createI18n } from '../i18n/index.js';

const ASSETS = new URL('../assets/images/', import.meta.url).href;

/* =========================================================
   Government of Osun State — site behaviour (shared by every page)
   - Mega menu, mobile menu, hero carousel, search suggestions,
     alert dismissal, feedback widget, printer-friendly button,
     plan-your-visit page and tax calculator
   - English / Yorùbá switching lives in ../i18n/
   ========================================================= */
/* ---------------------------------------------------------
   i18n (see ../i18n/)
   --------------------------------------------------------- */
const i18n = await createI18n({
  onChange() {
    if (carousel) carousel.refreshLabels();
    if (typeof updatePlanPageLanguage === 'function') updatePlanPageLanguage();
    if (typeof updateTaxPageLanguage === 'function') updateTaxPageLanguage();
    if (typeof updateBirthPageLanguage === 'function') updateBirthPageLanguage();
    if (typeof updateLawsPageLanguage === 'function') updateLawsPageLanguage();
    if (typeof updateJobsPageLanguage === 'function') updateJobsPageLanguage();
    if (typeof updateLgaPageLanguage === 'function') updateLgaPageLanguage();
  },
});

/* ---------------------------------------------------------
   Alert banner
   --------------------------------------------------------- */
const alertEl = document.getElementById('site-alert');
const ALERT_KEY = 'osun-alert-dismissed';
if (alertEl) {
  try {
    if (sessionStorage.getItem(ALERT_KEY)) alertEl.hidden = true;
  } catch (e) {
    /* ignore */
  }
  const alertClose = alertEl.querySelector('.alert__close');
  if (alertClose) {
    alertClose.addEventListener('click', () => {
      alertEl.hidden = true;
      try {
        sessionStorage.setItem(ALERT_KEY, '1');
      } catch (e) {
        /* ignore */
      }
      const main = document.getElementById('main');
      if (main) main.focus();
    });
  }
}

/* ---------------------------------------------------------
   Printer friendly
   --------------------------------------------------------- */
const printBtn = document.getElementById('print-btn');
if (printBtn) printBtn.addEventListener('click', () => window.print());

/* ---------------------------------------------------------
   Navigation: mobile toggle + mega menus (disclosure pattern)
   --------------------------------------------------------- */
const nav = document.getElementById('primary-nav');
const menuToggle = document.querySelector('.menu-toggle');
const triggers = Array.from(nav.querySelectorAll('.primary-nav__trigger'));

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  if (!open) closeAllMenus();
});

function setMenu(trigger, open) {
  trigger.setAttribute('aria-expanded', String(open));
  document.getElementById(trigger.getAttribute('aria-controls')).hidden = !open;
}

function closeAllMenus(except) {
  triggers.forEach((tr) => {
    if (tr !== except) setMenu(tr, false);
  });
}

triggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    closeAllMenus(trigger);
    setMenu(trigger, open);
  });
});

// Close on Escape (return focus to the trigger), outside click, or focus leaving the nav.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const openTrigger = triggers.find((tr) => tr.getAttribute('aria-expanded') === 'true');
  if (openTrigger) {
    setMenu(openTrigger, false);
    openTrigger.focus();
  }
});
document.addEventListener('click', (e) => {
  if (!nav.contains(e.target)) closeAllMenus();
});
nav.addEventListener('focusout', (e) => {
  if (e.relatedTarget && !nav.contains(e.relatedTarget)) closeAllMenus();
});

/* ---------------------------------------------------------
   Hero carousel
   --------------------------------------------------------- */
const carousel = (function () {
  const root = document.querySelector('.hero');
  if (!root) return null;
  const slides = Array.from(root.querySelectorAll('.hero__slide'));
  const dots = Array.from(root.querySelectorAll('.hero__dot'));
  const pauseBtn = root.querySelector('[data-hero-pause]');
  const pauseLabel = root.querySelector('[data-hero-pause-label]');
  const INTERVAL = 7000;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let index = 0;
  let timer = null;
  let userPaused = reducedMotion; // never auto-rotate for reduced-motion users
  let hoverPaused = false;

  function go(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      const active = n === index;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((d, n) => {
      if (n === index) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }

  function schedule() {
    clearInterval(timer);
    timer = null;
    if (!userPaused && !hoverPaused) timer = setInterval(() => go(index + 1), INTERVAL);
  }

  function refreshLabels() {
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseLabel.textContent = userPaused ? i18n.t('hero.play') : i18n.t('hero.pause');
    dots.forEach((d, n) => d.setAttribute('aria-label', i18n.t('hero.slide') + ' ' + (n + 1)));
  }

  root.querySelector('[data-hero-prev]').addEventListener('click', () => {
    go(index - 1);
    schedule();
  });
  root.querySelector('[data-hero-next]').addEventListener('click', () => {
    go(index + 1);
    schedule();
  });
  dots.forEach((d, n) =>
    d.addEventListener('click', () => {
      go(n);
      schedule();
    })
  );

  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    refreshLabels();
    schedule();
  });

  // Pause while the user is hovering or interacting (WCAG 2.2.2).
  root.addEventListener('mouseenter', () => {
    hoverPaused = true;
    schedule();
  });
  root.addEventListener('mouseleave', () => {
    hoverPaused = false;
    schedule();
  });
  root.addEventListener('focusin', () => {
    hoverPaused = true;
    schedule();
  });
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget)) {
      hoverPaused = false;
      schedule();
    }
  });

  go(0);
  schedule();
  return { refreshLabels };
})();

/* ---------------------------------------------------------
   Search suggestions (client-side, over the links on this page)
   --------------------------------------------------------- */
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const list = document.getElementById('search-suggestions');
let activeIdx = -1;

// Strip tone marks / under-dots so "osogbo" matches "Òṣogbo".
const normalise = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function searchableLinks() {
  const seen = new Set();
  return Array.from(document.querySelectorAll('.mega a, .link-box a, .service-card, .news-list a, .panel a'))
    .map((a) => ({
      a,
      text: (a.querySelector('.service-card__title') || a).textContent.trim(),
    }))
    .filter(({ text }) => text && !seen.has(text) && seen.add(text));
}

function closeSuggestions() {
  list.hidden = true;
  list.innerHTML = '';
  activeIdx = -1;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}

function renderSuggestions(showEmpty) {
  const q = normalise(input.value.trim());
  if (q.length < 2) {
    closeSuggestions();
    return;
  }

  const matches = searchableLinks()
    .filter(({ text }) => normalise(text).includes(q))
    .slice(0, 8);
  list.innerHTML = '';
  activeIdx = -1;

  if (!matches.length) {
    if (!showEmpty) {
      closeSuggestions();
      return;
    }
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = i18n.t('search.empty');
    list.appendChild(li);
  }

  matches.forEach(({ a, text }, n) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'presentation');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.id = 'suggestion-' + n;
    link.setAttribute('role', 'option');
    link.textContent = text;
    li.appendChild(link);
    list.appendChild(li);
  });

  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function highlight(n) {
  const options = list.querySelectorAll('[role="option"]');
  if (!options.length) return;
  activeIdx = (n + options.length) % options.length;
  options.forEach((o, i) => o.setAttribute('aria-selected', String(i === activeIdx)));
  input.setAttribute('aria-activedescendant', options[activeIdx].id);
  options[activeIdx].scrollIntoView({ block: 'nearest' });
}

if (form && input && list) {
  input.addEventListener('input', () => renderSuggestions(false));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (list.hidden) renderSuggestions(true);
      highlight(activeIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight(activeIdx - 1);
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const selected = list.querySelector('[aria-selected="true"]');
    if (selected) {
      window.location.href = selected.href;
      closeSuggestions();
      return;
    }
    renderSuggestions(true);
  });
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target)) closeSuggestions();
  });
}

/* ---------------------------------------------------------
   Feedback widget
   --------------------------------------------------------- */
const feedback = document.getElementById('feedback');
if (feedback) {
  feedback.querySelectorAll('[data-feedback]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ask = feedback.querySelector('.feedback__ask');
      const thanks = feedback.querySelector('.feedback__thanks');
      if (ask) ask.hidden = true;
      if (thanks) thanks.hidden = false;
    });
  });
}

/* ---------------------------------------------------------
   Tourist Centres Database & Plan Your Visit Controller
   --------------------------------------------------------- */
const TOURIST_SITES = {
  'osun-sacred-grove': {
    id: 'osun-sacred-grove',
    name: {
      en: 'Osun-Osogbo Sacred Grove',
      yo: 'Igbó Mímọ́ Ọ̀ṣun-Òṣogbo',
    },
    badge: {
      en: 'UNESCO World Heritage Site',
      yo: 'Ibi Àjogúnbá Àgbáyé UNESCO',
    },
    tagline: {
      en: 'Ancient spiritual sanctuary along the winding banks of the sacred Osun river.',
      yo: 'Ibùdó àṣà àti ẹ̀sìn àtijọ́ lẹ́bàá odò Ọ̀ṣun mímọ́.',
    },
    location: {
      en: 'Osogbo LGA, Osogbo',
      yo: 'Ìjọba Ìbílẹ̀ Òṣogbo, Òṣogbo',
    },
    image: ASSETS + 'osun-sacred-grove.jpg',
    imageAlt: {
      en: 'Sculptures and sanctuary inside the Osun-Osogbo Sacred Grove',
      yo: 'Àwọn ère àti ojúbọ nínú Igbó Mímọ́ Ọ̀ṣun-Òṣogbo',
    },
    overview: {
      en: 'The Osun-Osogbo Sacred Grove is one of the last remaining remnants of primary high forest in southern Nigeria. Designated a UNESCO World Heritage Site in 2005, the sacred landscape is dedicated to Osun, the Yoruba goddess of fertility and waters. The forest is adorned with spectacular monumental shrines, sanctuaries, and sculptures created by Susanne Wenger and the New Sacred Art movement, harmoniously blending spiritual devotion with natural ecology.',
      yo: 'Igbó Mímọ́ Ọ̀ṣun-Òṣogbo jẹ́ ọ̀kan lára àwọn igbó àtijọ́ tó ṣẹ́kù ní gúúsù Nàìjíríà. UNESCO kéde rẹ̀ gẹ́gẹ́ bí Ibi Àjogúnbá Àgbáyé ní ọdún 2005, ó jẹ́ ibi ìbọwọ̀ fún Ọ̀ṣun, òrìṣà ọmọ àti omi. Igbó náà kún fún àwọn ojúbọ àti ère ńlá tí Susanne Wenger àti àwọn oníṣẹ́-ọnà ìbílẹ̀ gbé kalẹ̀.',
    },
    hours: {
      en: 'Monday to Sunday: 8:00 AM – 6:00 PM (Annual festival peak takes place every August)',
      yo: 'Ọjọ́ Ajé sí Ọjọ́ Àìkú: 8:00 Àárọ̀ – 6:00 Ìrọ̀lẹ́ (Ọdún Ọ̀ṣun máa ń wáyé ní oṣù Kẹjọ)',
    },
    admission: {
      localAdult: 500,
      localStudent: 200,
      foreigner: 2000,
      cameraFee: 1000,
      en: 'Adults: ₦500 | Students & Children: ₦200 | International Visitors: ₦2,000 | Camera Permit: ₦1,000',
      yo: 'Àgbà: ₦500 | Akẹ́kọ̀ọ́: ₦200 | Àlejò Ilẹ̀ Òkèèrè: ₦2,000 | Ìyọ̀ǹda Kámẹ́rà: ₦1,000',
    },
    guides: {
      en: 'Official NCMM accredited tour guides stationed at the entrance pavilion. Available in English, Yorùbá, and French.',
      yo: 'Àwọn atọ́nà ìrìn-àjò tí NCMM fọwọ́ sí wà ní ẹnu-ọ̀nà àbáwọlé ní èdè Gẹ̀ẹ́sì, Yorùbá, àti Faranse.',
    },
    accessibility: {
      en: 'Shaded unpaved natural forest trails. Gentle to moderate walking difficulty. Comfortable flat shoes recommended. Select inner shrines have restricted entry.',
      yo: 'Ojú-ọ̀nà igbó tí kò ní kọnkéré. Ẹṣẹ̀ rírìn níwọ̀nwọ́n. Bata pẹrẹsẹ ṣe pàtàkì.',
    },
    rules: {
      en: 'Strict environmental preservation: no littering, swimming, or fishing in the sacred river. Shoes must be removed when entering designated sanctums.',
      yo: 'Kò gbọdọ̀ sí ìdọ̀tí tàbí pẹja nínú odò mímọ́. Bọ́ bàtà ní àwọn ojúbọ pàtó.',
    },
    facilities: {
      en: 'Visitor reception centre, traditional arts and crafts market, restrooms, parking area at entrance.',
      yo: 'Gbọ̀ngàn ìtẹ́wọ́gbà àlejò, ọjà iṣẹ́-ọnà ìbílẹ̀, balùwẹ̀, àti ibùdó ọkọ̀.',
    },
    directions: {
      en: '10 minutes drive south of Osogbo city centre along Heritage Site Road. Direct signposts from Olaiya Junction.',
      yo: 'Ìṣẹ́jú 10 sí àárín ìlú Òṣogbo lẹ́bàá Heritage Site Road. Àwọn àmì wà láti Olaiya.',
    },
  },
  'olumirin-waterfall': {
    id: 'olumirin-waterfall',
    name: {
      en: 'Olumirin Waterfall, Erin-Ijesha',
      yo: 'Omi-ìṣàn Olúmìrìn, Ẹrin-Ìjẹ̀ṣà',
    },
    badge: {
      en: 'Natural Wonder & Ecotourism',
      yo: 'Àgbàyanu Àdánidá & Ìbẹ̀wò Ẹkọ́',
    },
    tagline: {
      en: 'Magnificent seven-tier cascading waterfall nestled among the lush green mountains of Ijeshaland.',
      yo: 'Omi-ìṣàn onípele méje tí ń dà sílẹ̀ láàárín àwọn òkè tútù ti Ilẹ̀ Ìjẹ̀ṣà.',
    },
    location: {
      en: 'Erin-Ijesha, Oriade LGA',
      yo: 'Ẹrin-Ìjẹ̀ṣà, Ìjọba Ìbílẹ̀ Oriade',
    },
    image: ASSETS + 'olumirin-waterfall.jpg',
    imageAlt: {
      en: 'Cascading natural water and rocky terrain of Olumirin Waterfall at Erin-Ijesha',
      yo: 'Omi-ìṣàn àdánidá àti àwọn àpáta Olúmìrìn ní Ẹrin-Ìjẹ̀ṣà',
    },
    overview: {
      en: 'Discovered in 1140 AD, Olumirin (meaning "another deity") is one of West Africa’s most famous ecotourism attractions. The waterfall features seven distinct tiers, each offering unique vantage points, cool mountain mist, and therapeutic natural spring waters. Reaching the seventh tier reveals the historic Abake settlement on the high plateau.',
      yo: 'A rí i ní ọdún 1140. Olúmìrìn (ìtumọ̀ rẹ̀: "ọlọ́run mìíràn") jẹ́ ọ̀kan lára àwọn ibi ìwòran àdánidá tó lókìkí jùlọ ní Ìwọ̀-oòrùn Áfíríkà. Ó ní ipele méje ọ̀tọ̀ọ̀tọ̀ pẹ̀lú afẹ́fẹ́ tútù àti omi tí ń sàn láti orí òkè.',
    },
    hours: {
      en: 'Monday to Sunday: 8:00 AM – 5:30 PM (Peak water flow May through October)',
      yo: 'Ọjọ́ Ajé sí Ọjọ́ Àìkú: 8:00 Àárọ̀ – 5:30 Ìrọ̀lẹ́ (Omi máa ń pọ̀ jù láti oṣù Karùn-ún sí Kẹwàá)',
    },
    admission: {
      localAdult: 1000,
      localStudent: 500,
      foreigner: 3000,
      cameraFee: 2000,
      en: 'Adults: ₦1,000 | Students & Children: ₦500 | International Visitors: ₦3,000 | Video / Drone: ₦2,000',
      yo: 'Àgbà: ₦1,000 | Akẹ́kọ̀ọ́: ₦500 | Àlejò Ilẹ̀ Òkèèrè: ₦3,000 | Fídíò / Dírónì: ₦2,000',
    },
    guides: {
      en: 'Local youth eco-guides available at the ticketing gate. Mandatory guide recommendation for hiking above level 3.',
      yo: 'Àwọn atọ́nà wà ní ẹnu-ọ̀nà ìwọlé. A dámọ̀ràn atọ́nà fún àwọn tí yóò gun kọjá ipele kẹta.',
    },
    accessibility: {
      en: 'Moderate to strenuous mountain hike. Level 1 and 2 feature stone steps; levels 3 through 7 require rugged rocky climbing. Non-slip grip footwear recommended.',
      yo: 'Gígùn òkè tó gba okun. Ipele 1 àti 2 ní àtẹ̀gùn; ipele 3 sí 7 gba rírìn lórí àpáta. Bata tí kò ní yọ́ ṣe pàtàkì.',
    },
    rules: {
      en: 'Do not dive or swim near heavy plunge pools. Carry reusable water bottles and take all trash back to the base disposal points.',
      yo: 'Ẹ má ṣe lúwẹ̀ẹ́ níbi tí omi ti le gan-an. Ẹ gbé àwọn ìdọ̀tí padà wá sí ìsàlẹ̀.',
    },
    facilities: {
      en: 'Base pavilion with seating, fresh palm wine and refreshment vendors, changing stalls, parking area at resort entrance.',
      yo: 'Àgọ́ ìsinmi ní ìsàlẹ̀, àwọn olùtajà ẹ̀mú àti oúnjẹ, yàrá ìpàrọ̀ aṣọ, àti ibùdó ọkọ̀.',
    },
    directions: {
      en: '2 km off the Ilesha–Akure Expressway at Erin-Ijesha. Approximately 45 minutes drive from Osogbo and 20 minutes from Ilesha.',
      yo: 'Kìlómítà 2 kúrò ní ojú-ọ̀nà Ilesha–Akure Expressway ní Ẹrin-Ìjẹ̀ṣà. Ìṣẹ́jú 45 láti Òṣogbo.',
    },
  },
  'oke-maria': {
    id: 'oke-maria',
    name: {
      en: 'Oke Maria Pilgrimage Centre',
      yo: 'Ibùdó Ìbẹ̀wò Òkè Màríà',
    },
    badge: {
      en: 'Spiritual Sanctuary & Scenic Mountain',
      yo: 'Ibùdó Ẹ̀mí & Òkè Ẹlẹ́wà',
    },
    tagline: {
      en: 'Tranquil hillside Marian pilgrimage sanctuary overlooking panoramic valleys and granite ridges.',
      yo: 'Ibùdó àdúrà àti ìsinmi lórí òkè pẹ̀lú ìwòran àwọn pẹ̀tẹ́lẹ̀ àti àpáta títóbi.',
    },
    location: {
      en: 'Otan Ayegbaju, Boluwaduro LGA',
      yo: 'Ọ̀tan Ayégbajú, Ìjọba Ìbílẹ̀ Boluwaduro',
    },
    image: ASSETS + 'oke-maria.jpg',
    imageAlt: {
      en: 'Scenic hillside prayer grotto and mountain landscape at Oke Maria, Otan Ayegbaju',
      yo: 'Ojúbọ àdúrà lórí òkè àti àyíká Òkè Màríà ní Ọ̀tan Ayégbajú',
    },
    overview: {
      en: 'Oke Maria is an internationally recognized Catholic Marian pilgrimage shrine situated atop the serene hills of Otan Ayegbaju. Established in the mid-20th century, thousands of pilgrims gathered here annually every February for prayer, meditation, and spiritual retreat. The summit provides breathtaking 360-degree vistas across northern Osun State.',
      yo: 'Òkè Màríà jẹ́ ibùdó àdúrà tí àwọn Kátólíìkì dá sílẹ̀ lórí àwọn òkè dídákẹ́ ti Ọ̀tan Ayégbajú. Ẹgbẹẹgbẹ̀rún ènìyàn ló máa ń péjọ síbí ní oṣù Kejì fún àdúrà àti ìsinmi ẹ̀mí.',
    },
    hours: {
      en: 'Open daily: 6:00 AM – 6:30 PM (Main annual pilgrimage takes place in February)',
      yo: 'Ó ṣí sílẹ̀ lójoojúmọ́: 6:00 Àárọ̀ – 6:30 Ìrọ̀lẹ́ (Ayẹyẹ àdúrà ọdọọdún máa ń wáyé ní oṣù Kejì)',
    },
    admission: {
      localAdult: 0,
      localStudent: 0,
      foreigner: 0,
      cameraFee: 0,
      en: 'Free admission for all pilgrims and visitors. Voluntary donations accepted for groundskeeping.',
      yo: 'Ọ̀fẹ́ ni ìwọlé fún gbogbo ènìyàn. Ẹ̀bùn àtinúwá fún títọ́jú ibùdó náà jẹ́ ohun ìtẹ́wọ́gbà.',
    },
    guides: {
      en: 'Shrine pastoral guides and groundskeepers available to orient visitors to the stations of the cross and meditation routes.',
      yo: 'Àwọn atọ́nà ilé-àdúrà wà láti ṣe ìtọ́sọ́nà fún àwọn olùbẹ̀wò lórí àwọn ojú-ọ̀nà àdúrà.',
    },
    accessibility: {
      en: 'Paved and stepped stone hillside trails. Accessible climb with resting benches along the gradient.',
      yo: 'Ojú-ọ̀nà àtẹ̀gùn tí a fi òkúta kọ́. Àwọn ibùjókòó wà ní ọ̀nà fún ìsinmi.',
    },
    rules: {
      en: 'Maintain solemnity and respect for worshipers in prayer zones. Loud noise and alcohol prohibited.',
      yo: 'Ẹ bọ̀wọ̀ fún àwọn tó ń gbàdúrà nípa dídákẹ́ jẹ́ẹ́. Ariwo àti ọtí mímu kò gba àyè.',
    },
    facilities: {
      en: 'Open-air chapel, grotto of Our Lady, stations of the cross alcoves, restrooms, mountain parking.',
      yo: 'Ilé-àdúrà gbangba, ojúbọ Màríà, àwọn yàrá àdúrà, balùwẹ̀, àti ibùdó ọkọ̀.',
    },
    directions: {
      en: 'Located 35 km northeast of Osogbo via the Osogbo–Ikirun–Ila Orangun highway.',
      yo: 'Ó wà ní nǹkan bí kìlómítà 35 sí àríwá-ìlà-oòrùn Òṣogbo gba ojú-ọ̀nà Ikirun.',
    },
  },
  'oduduwa-shrine': {
    id: 'oduduwa-shrine',
    name: {
      en: 'Oduduwa Shrine and Grove',
      yo: 'Ojúbọ àti Igbó Ọ̀dùduwà',
    },
    badge: {
      en: 'Ancestral Cradle of Yoruba Civilization',
      yo: 'Orírun Ìran Yorùbá',
    },
    tagline: {
      en: 'Sacred grounds commemorating Oduduwa, the revered progenitor of the Yoruba civilization.',
      yo: 'Ilẹ̀ mímọ́ tí a fi bọlá fún Ọ̀dùduwà, baba ńlá àti orírun ìran Yorùbá.',
    },
    location: {
      en: 'Ile-Ife, Ife Central LGA',
      yo: 'Ilé-Ifẹ̀, Ìjọba Ìbílẹ̀ Ife Central',
    },
    image: ASSETS + 'oduduwa-shrine-groove.jpg',
    imageAlt: {
      en: 'Ancient monumental entrance and courtyard at Oduduwa Shrine and Grove in Ile-Ife',
      yo: 'Ẹnu-ọ̀nà àti àgbàlá Ojúbọ Ọ̀dùduwà ní Ilé-Ifẹ̀',
    },
    overview: {
      en: 'Ile-Ife is recognized historically and spiritually as the cradle of the Yoruba people. The Oduduwa Shrine and Grove marks the consecrated site where Oduduwa established the divine kingdom. The sacred grove contains historic relics, ancient carved monoliths, and consecrated altars cared for by traditional royal priests.',
      yo: 'Ilé-Ifẹ̀ ni gbogbo ayé mọ̀ sí orírun ìran Yorùbá. Ojúbọ Ọ̀dùduwà jẹ́ ibi mímọ́ tí Ọ̀dùduwà fúnra rẹ̀ ti fìdí ìjọba múlẹ̀. Ó kún fún àwọn ohun àtijọ́ àti ojúbọ tí àwọn olóyè ọba ń tọ́jú.',
    },
    hours: {
      en: 'Monday to Saturday: 9:00 AM – 5:00 PM (Sundays by appointment for guided cultural delegations)',
      yo: 'Ọjọ́ Ajé sí Ọjọ́ Àbámẹ́ta: 9:00 Àárọ̀ – 5:00 Ìrọ̀lẹ́ (Ọjọ́ Àìkú gba àdéhùn ṣáájú)',
    },
    admission: {
      localAdult: 500,
      localStudent: 200,
      foreigner: 2000,
      cameraFee: 1000,
      en: 'Adults: ₦500 | Students: ₦200 | International Tourists: ₦2,000 | Research Photography: ₦1,000',
      yo: 'Àgbà: ₦500 | Akẹ́kọ̀ọ́: ₦200 | Àlejò Ilẹ̀ Òkèèrè: ₦2,000 | Fọ́tò Ìwádìí: ₦1,000',
    },
    guides: {
      en: 'Resident oral historians and traditional palace curators provide lectures on Yoruba cosmology and antiquity.',
      yo: 'Àwọn akọ̀tàn àtẹnudẹ́nu ń ṣàlàyé ní kíkún nípa ìtàn ìran Yorùbá àti oyè jíjẹ.',
    },
    accessibility: {
      en: 'Paved traditional courtyards and level paths. Easy walking difficulty. Bare feet required inside inner sanctums.',
      yo: 'Àgbàlá pẹ̀tẹ́lẹ̀ tí kò ní ìṣòro rírìn. Ó gba pé kí ènìyàn bọ́ bàtà ní àwọn yàrá inú.',
    },
    rules: {
      en: 'Always ask permission before photographing ceremonial altars. Show reverence for sacred relics.',
      yo: 'Béèrè lọ́wọ́ àwọn atọ́nà kí o tó ya fọ́tò ojúbọ. Tẹ̀lé ìlànà àṣà tó wà níbẹ̀.',
    },
    facilities: {
      en: 'Traditional audience hall, exhibition rooms with royal artefacts, resting courtyard; walking distance to Enuwa Palace and Ife Museum.',
      yo: 'Gbọ̀ngàn ìpàdé ìbílẹ̀, yàrá àwọn ohun ìṣẹ̀ǹbáyé, ó sì súnmọ́ Àfin Ọọ̀ni àti Ilé-ìṣẹ̀ǹbáyé.',
    },
    directions: {
      en: 'Historic core of Ile-Ife, 5 minutes from Enuwa Square and the Ooni’s Palace. 45 minutes south of Osogbo.',
      yo: 'Àárín gbùngbùn Ilé-Ifẹ̀, ìṣẹ́jú 5 sí Pápá Enuwa àti Àfin Ọọ̀ni. Ìṣẹ́jú 45 láti Òṣogbo.',
    },
  },
  'moremi-statue': {
    id: 'moremi-statue',
    name: {
      en: 'Moremi Statue of Liberty',
      yo: 'Ère Moremi Ajasoro',
    },
    badge: {
      en: 'Historic Heroine Monument',
      yo: 'Àmì Ìṣẹ́gun Akọni Obìnrin',
    },
    tagline: {
      en: 'Nigeria’s tallest monument, celebrating legendary Yoruba heroine Queen Moremi Ajasoro.',
      yo: 'Ère tó ga jùlọ ní Nàìjíríà, tí a fi ń bọlá fún Moremi Ajasoro, akọni obìnrin Yorùbá.',
    },
    location: {
      en: 'Enuwa Square, Ile-Ife, Ife Central LGA',
      yo: 'Pápá Enuwa, Ilé-Ifẹ̀, Ìjọba Ìbílẹ̀ Ife Central',
    },
    image: ASSETS + 'moremi-statue.jpg',
    imageAlt: {
      en: 'The 42-foot monumental Moremi Statue of Liberty in Ile-Ife',
      yo: 'Ère Moremi Ajasoro tí gíga rẹ̀ jẹ́ ẹsẹ̀ bàtà 42 ní Ilé-Ifẹ̀',
    },
    overview: {
      en: 'Standing at an imposing 42 feet high on the historic site of Queen Moremi’s residence, the Moremi Statue of Liberty is the tallest statue in Nigeria and the fourth tallest in Africa. Unveiled in 2016 by the Ooni of Ife, the statue immortalizes Queen Moremi Ajasoro who sacrificed her son to deliver ancient Ife from invaders in the 12th century.',
      yo: 'Pẹ̀lú gíga ẹsẹ̀ bàtà 42 ní ojúlé ayaba Moremi, ère Moremi jẹ́ ère tó ga jùlọ ní Nàìjíríà àti ẹ̀kẹrin ní Áfíríkà. Ó ń bọlá fún Moremi Ajasoro tó gba Ilé-Ifẹ̀ là.',
    },
    hours: {
      en: 'Open daily: 8:00 AM – 6:30 PM (Evening floodlights showcase the monument beautifully)',
      yo: 'Ó ṣí sílẹ̀ lójoojúmọ́: 8:00 Àárọ̀ – 6:30 Ìrọ̀lẹ́ (Iná alẹ́ máa ń tan ìmọ́lẹ̀ sí i)',
    },
    admission: {
      localAdult: 300,
      localStudent: 100,
      foreigner: 1000,
      cameraFee: 500,
      en: 'Square viewing is free. Inner monument photo garden: Adults ₦300 | Students ₦100 | Foreign Tourists ₦1,000',
      yo: 'Wíwo ère láti pápá jẹ́ ọ̀fẹ́. Ìwọlé sí àgbàlá fọ́tò: Àgbà ₦300 | Akẹ́kọ̀ọ́ ₦100 | Àlejò Òkèèrè ₦1,000',
    },
    guides: {
      en: 'Trained tourism docents recount the story of Moremi, the Edi festival, and the sculpture history.',
      yo: 'Àwọn atọ́nà ń sọ ìtàn ìgbésí-ayé Moremi, ọdún Ẹdù, àti bí a ṣe gbé ère náà kalẹ̀.',
    },
    accessibility: {
      en: 'Completely step-free, paved public plaza. Fully accessible for wheelchairs, strollers, and visitors of all ages.',
      yo: 'Pápá pẹ̀tẹ́lẹ̀ tí kò ní àtẹ̀gùn. Ó rọrùn fún kẹ̀kẹ́ arọ àti gbogbo ènìyàn.',
    },
    rules: {
      en: 'Public photography and group photos encouraged. Do not climb the statue pedestal or touch security barriers.',
      yo: 'Yíya fọ́tò jẹ́ ohun tí a gbà láyè. Ẹ má ṣe gun orí ìpìlẹ̀ ère náà.',
    },
    facilities: {
      en: 'Plaza photo spots, historical narrative plaques, artisan craft stalls, nearby cafes, secure parking.',
      yo: 'Ibi yíya fọ́tò, àwọn àkọsílẹ̀ ìtàn, ṣọ́ọ̀bù iṣẹ́-ọnà, àti ibùdó ọkọ̀.',
    },
    directions: {
      en: 'Enuwa Square directly opposite the Palace of the Ooni of Ife. Direct taxis available from Mayfair Junction, Ile-Ife.',
      yo: 'Ó wà ní Pápá Enuwa ní iwájú Àfin Ọọ̀ni ti Ifẹ̀ gan-an. Taksí wà láti Mayfair Junction.',
    },
  },
  'civic-centre': {
    id: 'civic-centre',
    name: {
      en: 'Osogbo Civic Centre',
      yo: 'Gbọ̀ngàn Àṣà Òṣogbo',
    },
    badge: {
      en: 'Arts & Cultural Exhibition Centre',
      yo: 'Ibùdó Iṣẹ́-ọnà & Àṣà',
    },
    tagline: {
      en: 'Premier multi-purpose cultural facility hosting state art exhibitions, civic festivals, and theatrical performances.',
      yo: 'Gbọ̀ngàn àṣà olókìkí fún àfihàn iṣẹ́-ọnà, àwọn àpèjọ ìpínlẹ̀, àti eré orí-ìtè.',
    },
    location: {
      en: 'City Centre, Osogbo LGA',
      yo: 'Àárín Ìlú, Ìjọba Ìbílẹ̀ Òṣogbo',
    },
    image: ASSETS + 'civic-centre.jpg',
    imageAlt: {
      en: 'Modern architectural facade of the Osogbo Civic Centre',
      yo: 'Ojú iwájú ilé ayé-òde-òní ti Gbọ̀ngàn Àṣà Òṣogbo',
    },
    overview: {
      en: 'The Osogbo Civic Centre represents Osogbo’s rich status as the cultural capital of Osun State. Combining contemporary architectural design with traditional Yoruba motifs, the complex hosts art exhibitions, cultural conferences, film premieres, literary readings, and government civic galas throughout the year.',
      yo: 'Gbọ̀ngàn Àṣà Òṣogbo ń ṣe afihàn ipò Òṣogbo gẹ́gẹ́ bí olú-ìlú àṣà Ìpínlẹ̀ Ọ̀ṣun. Ó ń gbàlejò àwọn àfihàn iṣẹ́-ọnà, àpèjọ àṣà, àti àwọn ayẹyẹ ìjọba jálẹ̀ ọdún.',
    },
    hours: {
      en: 'Monday to Friday: 8:00 AM – 5:00 PM (Saturdays and evenings for scheduled stage events and expos)',
      yo: 'Ọjọ́ Ajé sí Ọjọ́ Ẹtì: 8:00 Àárọ̀ – 5:00 Ìrọ̀lẹ́ (Àbámẹ́ta àti alẹ́ fún àwọn ètò pàtàkì)',
    },
    admission: {
      localAdult: 200,
      localStudent: 100,
      foreigner: 500,
      cameraFee: 500,
      en: 'General gallery walkthrough: ₦200 | Students: ₦100 | Special theatrical tickets vary by event.',
      yo: 'Wíwo àwọn iṣẹ́-ọnà: ₦200 | Akẹ́kọ̀ọ́: ₦100 | Àwọn eré orí-ìtè pàtó ní iye tiwọn.',
    },
    guides: {
      en: 'Centre event officers and gallery curators available to give guided tours of permanent artistic collections.',
      yo: 'Àwọn aṣojú gbọ̀ngàn àti olùtọ́jú iṣẹ́-ọnà wà láti ṣe àlàyé lórí àwọn àwòrán àti ìtàn ìpínlẹ̀.',
    },
    accessibility: {
      en: 'Modern accessibility infrastructure with ground-level step-free ramps, wide corridors, and accessible auditorium seating.',
      yo: 'Ilé ayé-òde-òní pẹ̀lú ọ̀nà rírọrùn fún kẹ̀kẹ́ arọ, ọ̀nà gbígbòòrò, àti àyè ìjókòó pàtó.',
    },
    rules: {
      en: 'Photography permitted in public galleries without flash; food and drinks not allowed inside auditorium seating.',
      yo: 'Fọ́tò láìsí iná filáṣì jẹ́ ohun ìtẹ́wọ́gbà; a kò gba oúnjẹ àti ohun mímu láyè nínú gbọ̀ngàn.',
    },
    facilities: {
      en: 'Air-conditioned main auditorium, art gallery exhibition hall, VIP lounges, conference rooms, multi-vehicle secure car park.',
      yo: 'Gbọ̀ngàn títóbi tó ní afẹ́fẹ́ tútù, yàrá àfihàn iṣẹ́-ọnà, gbọ̀ngàn ìpàdé, balùwẹ̀, àti ibùdó ọkọ̀ ńlá.',
    },
    directions: {
      en: 'Centrally situated in Osogbo metropolis, close to major transport nodes and commercial hospitality centres.',
      yo: 'Ó wà ní àárín gbùngbùn ìlú Òṣogbo, ó sì súnmọ́ àwọn ilé-ìtura àti ibùdó ọkọ̀ pàtàkì.',
    },
  },
};

let updatePlanPageLanguage = null;

(function initPlanYourVisit() {
  const planRoot = document.getElementById('plan-your-visit');
  if (!planRoot) return;

  const selectDropdown = planRoot.querySelector('#plan-site-select');
  const heroImg = planRoot.querySelector('#site-hero-img');
  const badgeEl = planRoot.querySelector('#site-badge');
  const nameEl = planRoot.querySelector('#site-name');
  const taglineEl = planRoot.querySelector('#site-tagline');
  const locationEl = planRoot.querySelector('#site-location');
  const overviewEl = planRoot.querySelector('#site-overview');
  const hoursEl = planRoot.querySelector('#site-hours');
  const admissionEl = planRoot.querySelector('#site-admission');
  const guidesEl = planRoot.querySelector('#site-guides');
  const accessEl = planRoot.querySelector('#site-access');
  const rulesEl = planRoot.querySelector('#site-rules');
  const facilitiesEl = planRoot.querySelector('#site-facilities');
  const directionsEl = planRoot.querySelector('#site-directions');
  const statusLiveEl = planRoot.querySelector('#plan-status-live');

  // Planner Form Elements
  const form = planRoot.querySelector('#visit-planner-form');
  const formSiteNameEl = planRoot.querySelector('#planner-site-name');
  const dateInput = planRoot.querySelector('#visit-date');
  const timeSelect = planRoot.querySelector('#visit-time');
  const partySelect = planRoot.querySelector('#visit-party');
  const guideCheckbox = planRoot.querySelector('#req-guide');
  const cameraCheckbox = planRoot.querySelector('#req-camera');
  const accessCheckbox = planRoot.querySelector('#req-access');
  const summaryCard = document.getElementById('itinerary-summary');
  const itineraryModal = document.getElementById('itinerary-modal');

  if (itineraryModal) {
    itineraryModal.querySelector('[data-close-itinerary]').addEventListener('click', () => itineraryModal.close());
    // Close when clicking the backdrop (outside the dialog box)
    itineraryModal.addEventListener('click', (e) => {
      if (e.target === itineraryModal) itineraryModal.close();
    });
  }

  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    dateInput.value = nextWeek;
  }

  // Determine initial site from URL parameter (?site= or ?centre= or ?id=)
  const params = new URLSearchParams(window.location.search);
  let requestedSite = params.get('site') || params.get('centre') || params.get('id');
  if (!requestedSite || !TOURIST_SITES[requestedSite]) {
    requestedSite = 'osun-sacred-grove';
  }
  let currentSiteId = requestedSite;

  function renderSite(siteId, updateUrl) {
    if (!TOURIST_SITES[siteId]) siteId = 'osun-sacred-grove';
    currentSiteId = siteId;
    const data = TOURIST_SITES[siteId];
    const lang = i18n.lang === 'yo' ? 'yo' : 'en';

    // Update dropdown
    if (selectDropdown && selectDropdown.value !== siteId) {
      selectDropdown.value = siteId;
    }

    // Update showcase elements
    if (heroImg) {
      heroImg.src = data.image;
      heroImg.alt = data.imageAlt[lang] || data.imageAlt.en;
    }
    if (badgeEl) badgeEl.textContent = data.badge[lang] || data.badge.en;
    if (nameEl) nameEl.textContent = data.name[lang] || data.name.en;
    if (taglineEl) taglineEl.textContent = data.tagline[lang] || data.tagline.en;
    if (locationEl) locationEl.textContent = data.location[lang] || data.location.en;
    if (overviewEl) overviewEl.textContent = data.overview[lang] || data.overview.en;
    if (hoursEl) hoursEl.textContent = data.hours[lang] || data.hours.en;
    if (admissionEl) admissionEl.textContent = data.admission[lang] || data.admission.en;
    if (guidesEl) guidesEl.textContent = data.guides[lang] || data.guides.en;
    if (accessEl) accessEl.textContent = data.accessibility[lang] || data.accessibility.en;
    if (rulesEl) rulesEl.textContent = data.rules[lang] || data.rules.en;
    if (facilitiesEl) facilitiesEl.textContent = data.facilities[lang] || data.facilities.en;
    if (directionsEl) directionsEl.textContent = data.directions[lang] || data.directions.en;

    // Update form context
    if (formSiteNameEl) {
      const textSpan = formSiteNameEl.querySelector('#planner-site-text');
      if (textSpan) {
        textSpan.textContent = data.name[lang] || data.name.en;
      } else {
        formSiteNameEl.textContent = data.name[lang] || data.name.en;
      }
    }

    // Live screen reader announcement
    if (statusLiveEl) {
      const announceText = lang === 'yo' ? `Ibùdó tí o yàn: ${data.name.yo}` : `Selected tourist centre: ${data.name.en}`;
      statusLiveEl.textContent = announceText;
    }

    // Update "Other tourist centres" active styling
    planRoot.querySelectorAll('[data-switch-site]').forEach((btn) => {
      const isSelf = btn.dataset.switchSite === siteId;
      btn.classList.toggle('is-current', isSelf);
      if (isSelf) {
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.removeAttribute('aria-disabled');
      }
    });

    // Synchronize URL query parameter without full reload
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('site', siteId);
      window.history.replaceState({ site: siteId }, '', url);
    }
  }

  updatePlanPageLanguage = () => renderSite(currentSiteId, false);

  // Bind select dropdown change
  if (selectDropdown) {
    selectDropdown.addEventListener('change', () => {
      renderSite(selectDropdown.value, true);
    });
  }

  // Bind other centre quick switcher cards
  planRoot.addEventListener('click', (e) => {
    const switcher = e.target.closest('[data-switch-site]');
    if (!switcher) return;
    e.preventDefault();
    const targetSite = switcher.dataset.switchSite;
    if (targetSite && TOURIST_SITES[targetSite]) {
      renderSite(targetSite, true);
      const anchor = planRoot.querySelector('#centre-showcase');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    const stateSite = (e.state && e.state.site) || new URLSearchParams(window.location.search).get('site');
    if (stateSite && TOURIST_SITES[stateSite]) {
      renderSite(stateSite, false);
    }
  });

  // Handle Visit Planner Form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const site = TOURIST_SITES[currentSiteId];
      const lang = i18n.lang === 'yo' ? 'yo' : 'en';
      const dateVal = dateInput.value;
      const timeVal = timeSelect.options[timeSelect.selectedIndex].text;
      const partyVal = partySelect.options[partySelect.selectedIndex].text;
      const partyType = partySelect.value;
      const guideReq = guideCheckbox && guideCheckbox.checked;
      const cameraReq = cameraCheckbox && cameraCheckbox.checked;
      const accessReq = accessCheckbox && accessCheckbox.checked;

      let multiplier = 1;
      if (partyType === 'family') multiplier = 4;
      else if (partyType === 'group') multiplier = 15;
      else if (partyType === 'tour') multiplier = 30;

      const baseFee = site.admission.localAdult * multiplier;
      const guideFee = guideReq ? 3000 : 0;
      const cameraFee = cameraReq ? site.admission.cameraFee : 0;
      const totalEstimate = baseFee + guideFee + cameraFee;

      const refNumber = 'OS-' + Math.floor(100000 + Math.random() * 900000);

      if (summaryCard) {
        summaryCard.innerHTML = `
          <div class="summary-box">
            <div class="summary-box__header">
              <div>
                <span class="summary-ref">${lang === 'yo' ? 'Nọ́mbà Ìtọ́kasí' : 'Reference'}: <strong>${refNumber}</strong></span>
                <h3 class="summary-title" id="itinerary-modal-title">${lang === 'yo' ? 'Ìkọ̀wé Ìbẹ̀wò Ọ̀ṣun' : 'Osun Visit Itinerary Summary'}</h3>
              </div>
              <button type="button" class="btn btn--outline btn--sm print-itinerary-btn" onclick="window.print()">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                ${lang === 'yo' ? 'Tẹ̀ Ẹ̀dà Yìí' : 'Print / Save Itinerary'}
              </button>
            </div>

            <div class="summary-grid">
              <div>
                <strong>${lang === 'yo' ? 'Ibùdó Ìwòran' : 'Destination'}:</strong>
                <p>${site.name[lang] || site.name.en} (${site.location[lang] || site.location.en})</p>
              </div>
              <div>
                <strong>${lang === 'yo' ? 'Ọjọ́ & Àkókò' : 'Date & Arrival Time'}:</strong>
                <p>${dateVal || 'Upcoming'} — ${timeVal}</p>
              </div>
              <div>
                <strong>${lang === 'yo' ? 'Àkójọ Ìrìn-àjò' : 'Visiting Party'}:</strong>
                <p>${partyVal}</p>
              </div>
              <div>
                <strong>${lang === 'yo' ? 'Àwọn Ìbéèrè Pàtàkì' : 'Requested Services'}:</strong>
                <p>${[guideReq ? (lang === 'yo' ? 'Atọ́nà Ìrìn-àjò' : 'Accredited Guide') : null, cameraReq ? (lang === 'yo' ? 'Ìyọ̀ǹda Kámẹ́rà' : 'Photo Permit') : null, accessReq ? (lang === 'yo' ? 'Ìrànwọ́ Ìrọ̀rùn' : 'Special Accessibility') : null].filter(Boolean).join(', ') || (lang === 'yo' ? 'Kò sí afikun' : 'Standard Self-guided')}</p>
              </div>
            </div>

            <div class="summary-estimate">
              <span>${lang === 'yo' ? 'Ìṣírò Owó Ìwọlé & Iṣẹ́' : 'Estimated Entry & Services'}:</span>
              <strong>₦${totalEstimate.toLocaleString()}</strong>
              <small>(${lang === 'yo' ? 'A máa ń san owó ní ẹnu-ọ̀nà tàbí orí ayélujára' : 'Payable at visitor centre / entrance desk'})</small>
            </div>

            <div class="summary-checklist">
              <h4>${lang === 'yo' ? 'Ohun tí o yẹ kí o mú wá & Ìmọ̀ràn' : 'What to Bring & Visitor Checklist'}</h4>
              <ul>
                <li>${lang === 'yo' ? 'Ìdánimọ̀ tó ní fọ́tò (fún àwọn akẹ́kọ̀ọ́ tàbí ará ìlú)' : 'Valid photo ID / Student identity card (for discounted entry)'}</li>
                <li>${lang === 'yo' ? 'Bata tó rọgbọ́ fún rírìn dáadáa' : 'Comfortable walking / hiking shoes suited for terrain'}</li>
                <li>${lang === 'yo' ? 'Omi mímu àti aṣọ tó yẹ fún ojú-ọjọ́' : 'Water bottle, sun protection, and weather-appropriate clothing'}</li>
                <li>${lang === 'yo' ? 'Ẹ bọ̀wọ̀ fún àwọn ìlànà àti àṣà ibùdó náà' : 'Respect site safety regulations and heritage sanctum etiquette'}</li>
              </ul>
            </div>
          </div>
        `;
        if (itineraryModal) {
          itineraryModal.querySelector('[data-close-itinerary]').setAttribute('aria-label', lang === 'yo' ? 'Pa á dé' : 'Close');
          if (!itineraryModal.open) itineraryModal.showModal();
        }
      }
    });
  }

  renderSite(requestedSite, false);
})();

/* ---------------------------------------------------------
   Pay Your Taxes Controller & Tax Calculator Engine
   --------------------------------------------------------- */
let updateTaxPageLanguage = null;

(function initTaxCalculator() {
  const form = document.getElementById('tax-calc-form');
  if (!form) return;

  const grossInput = form.querySelector('#tax-gross');
  const pensionInput = form.querySelector('#tax-pension');
  const otherInput = form.querySelector('#tax-other');
  const rentInput = form.querySelector('#tax-rent');
  const periodRadios = form.querySelectorAll('input[name="period"]');
  const ratesPanel = document.getElementById('tax-rates');
  const resultsPanel = document.getElementById('tax-results');
  const statusLiveEl = document.getElementById('tax-calc-status');
  const grossErrorEl = form.querySelector('#tax-gross-error');

  // Number parsing and formatting helper
  function parseFormattedNumber(val) {
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '').trim();
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  function formatNaira(num) {
    return '₦' + Math.round(num).toLocaleString('en-US');
  }

  // Input comma formatting on blur
  [grossInput, pensionInput, otherInput, rentInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input === grossInput && grossErrorEl) {
        grossErrorEl.hidden = true;
        grossErrorEl.textContent = '';
        grossInput.removeAttribute('aria-invalid');
      }
    });
    input.addEventListener('blur', () => {
      const val = parseFormattedNumber(input.value);
      if (val > 0) {
        input.value = Math.round(val).toLocaleString('en-US');
      } else if (input.value.trim() !== '') {
        input.value = '';
      }
    });
  });

  let lastCalcInput = null;

  function calculateTax(inputs) {
    const isMonthly = inputs.period === 'monthly';
    const factor = isMonthly ? 12 : 1;

    const grossAnnual = inputs.gross * factor;
    const pensionAnnual = inputs.pension * factor;
    const otherAnnual = inputs.other * factor;
    const rentAnnual = inputs.rent * factor;

    // 2026 Nigeria Tax Act: Rent Relief = 20% of annual rent paid, max ₦500,000
    const rentRelief = Math.min(rentAnnual * 0.2, 500000);

    const totalReliefs = pensionAnnual + otherAnnual + rentRelief;
    const chargeableIncome = Math.max(0, grossAnnual - totalReliefs);

    // 2026 Progressive Bands
    // Band 1: First ₦800,000 @ 0%
    // Band 2: Next ₦2,200,000 @ 15% (₦800,001 - ₦3,000,000)
    // Band 3: Next ₦9,000,000 @ 18% (₦3,000,001 - ₦12,000,000)
    // Band 4: Next ₦13,000,000 @ 21% (₦12,000,001 - ₦25,000,000)
    // Band 5: Next ₦25,000,000 @ 23% (₦25,000,001 - ₦50,000,000)
    // Band 6: Above ₦50,000,000 @ 25%
    const bands = [
      { label: { en: 'First ₦800,000', yo: '₦800,000 àkọ́kọ́' }, rate: 0, cap: 800000 },
      { label: { en: 'Next ₦2,200,000', yo: '₦2,200,000 tó kàn' }, rate: 0.15, cap: 2200000 },
      { label: { en: 'Next ₦9,000,000', yo: '₦9,000,000 tó kàn' }, rate: 0.18, cap: 9000000 },
      { label: { en: 'Next ₦13,000,000', yo: '₦13,000,000 tó kàn' }, rate: 0.21, cap: 13000000 },
      { label: { en: 'Next ₦25,000,000', yo: '₦25,000,000 tó kàn' }, rate: 0.23, cap: 25000000 },
      { label: { en: 'Above ₦50,000,000', yo: 'Lókè ₦50,000,000' }, rate: 0.25, cap: Infinity },
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
        tax: taxInBand,
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
      bandBreakdown,
    };
  }

  function renderResults(result) {
    if (!result || !resultsPanel) return;
    const lang = i18n.lang === 'yo' ? 'yo' : 'en';

    const periodLabel = result.isMonthly
      ? (lang === 'yo' ? 'lóṣooṣù' : 'per month')
      : (lang === 'yo' ? 'lọ́dún' : 'per year');
    const primaryTax = result.isMonthly ? result.totalMonthlyTax : result.totalAnnualTax;
    const secondaryTax = result.isMonthly ? result.totalAnnualTax : result.totalMonthlyTax;
    const secondaryLabel = result.isMonthly
      ? (lang === 'yo' ? 'Àpapọ̀ lọ́dún: ' : 'Annual equivalent: ')
      : (lang === 'yo' ? 'Lóṣooṣù: ' : 'Monthly equivalent: ');

    let breakdownRows = '';
    result.bandBreakdown.forEach((b) => {
      breakdownRows += `
        <li class="tax-band-item">
          <span><strong>${b.label[lang] || b.label.en}</strong> (${b.ratePercent})</span>
          <span class="tax-band-item__tax">${formatNaira(b.tax)}</span>
        </li>
      `;
    });

    if (result.bandBreakdown.length === 0 || result.totalAnnualTax === 0) {
      breakdownRows = `
        <li class="tax-band-item">
          <span>${lang === 'yo' ? 'Kò sí owó-orí (0% lábẹ́ ₦800,000)' : 'Tax exempt (0% rate below ₦800,000)'}</span>
          <span class="tax-band-item__tax">₦0</span>
        </li>
      `;
    }

    resultsPanel.innerHTML = `
      <h3 class="tax-results__title">${lang === 'yo' ? 'Àbájáde Ìṣírò Owó-orí Rẹ' : 'Your Tax Calculation Summary'}</h3>

      <div class="tax-summary-box">
        <div class="tax-summary-box__label">${lang === 'yo' ? 'Ìṣírò Owó-orí Tó Ń Bọ̀ Wá' : 'Estimated Personal Income Tax'}</div>
        <div class="tax-summary-box__amount">${formatNaira(primaryTax)} <span style="font-size:1rem; font-weight:600; color:inherit;">${periodLabel}</span></div>
        <p class="tax-summary-box__sub">${secondaryLabel} <strong>${formatNaira(secondaryTax)}</strong> &bull; ${lang === 'yo' ? 'Ìwọ̀n tó jẹ́' : 'Effective rate'}: <strong>${result.effectiveRate}%</strong></p>
      </div>

      <dl class="tax-stat-grid">
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Àpapọ̀ Owó Wíwọlé' : 'Gross Income'}</dt>
          <dd>${formatNaira(result.isMonthly ? result.grossMonthly : result.grossAnnual)}</dd>
        </div>
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Àwọn Ìyọkúrò & Ìrànwọ́' : 'Total Reliefs & Deductions'}</dt>
          <dd>${formatNaira(result.isMonthly ? result.totalReliefs / 12 : result.totalReliefs)}</dd>
        </div>
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Owó Tó Kàn Owó-orí' : 'Chargeable Income'}</dt>
          <dd>${formatNaira(result.isMonthly ? result.chargeableIncome / 12 : result.chargeableIncome)}</dd>
        </div>
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Owó Tó Kù Sí Ọwọ́' : 'Estimated Take-Home'}</dt>
          <dd>${formatNaira(result.isMonthly ? result.takeHomeMonthly : result.takeHomeAnnual)}</dd>
        </div>
      </dl>

      <h4 style="font-size:0.95rem; font-weight:700; margin:0 0 0.5rem; color:var(--ink);">${lang === 'yo' ? 'Ìpín Lẹ́sẹẹsẹ Nípasẹ̀ Ìwọ̀n 2026' : 'Band-by-Band Breakdown (2026 Rates)'}</h4>
      <ul class="tax-band-list">
        ${breakdownRows}
      </ul>

      <div class="tax-cta-box">
        <p>${lang === 'yo' ? 'Ṣé o ti ṣetán láti sanwó? Pèsè IPN rẹ lẹ́sẹ̀kẹsẹ̀ lórí ojú-òpó aláṣẹ OsunIRS.' : 'Ready to pay? Generate your payment invoice (IPN) on the official OsunIRS portal.'}</p>
        <a class="btn btn--primary ext-link" href="https://osun.electroniccollectionsecg.com/payments/pay-bank-pos">
          ${lang === 'yo' ? 'Pèsè IPN báyìí' : 'Generate IPN on OsunIRS Portal'}
        </a>
      </div>
    `;

    if (ratesPanel) ratesPanel.hidden = true;
    resultsPanel.hidden = false;

    if (statusLiveEl) {
      statusLiveEl.textContent = lang === 'yo'
        ? `A ti ṣírò owó-orí rẹ: ${formatNaira(primaryTax)} ${periodLabel}.`
        : `Tax calculation complete: ${formatNaira(primaryTax)} ${periodLabel}.`;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const gross = parseFormattedNumber(grossInput.value);
    if (gross <= 0) {
      if (grossErrorEl) {
        grossErrorEl.textContent = i18n.lang === 'yo'
          ? 'Jọ̀wọ́ tẹ owó tí ń wọlé fún ọ (tó ju oókan lọ).'
          : 'Please enter a valid gross income greater than 0.';
        grossErrorEl.hidden = false;
      }
      grossInput.setAttribute('aria-invalid', 'true');
      grossInput.focus();
      return;
    }

    const period = form.querySelector('input[name="period"]:checked')?.value || 'yearly';
    const pension = parseFormattedNumber(pensionInput?.value);
    const other = parseFormattedNumber(otherInput?.value);
    const rent = parseFormattedNumber(rentInput?.value);

    lastCalcInput = { gross, pension, other, rent, period };
    const res = calculateTax(lastCalcInput);
    renderResults(res);
  });

  form.addEventListener('reset', () => {
    lastCalcInput = null;
    if (grossErrorEl) {
      grossErrorEl.hidden = true;
      grossErrorEl.textContent = '';
    }
    grossInput.removeAttribute('aria-invalid');
    if (resultsPanel) {
      resultsPanel.hidden = true;
      resultsPanel.innerHTML = '';
    }
    if (ratesPanel) ratesPanel.hidden = false;
    if (statusLiveEl) statusLiveEl.textContent = '';
  });

  periodRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (lastCalcInput) {
        lastCalcInput.period = radio.value;
        const res = calculateTax(lastCalcInput);
        renderResults(res);
      }
    });
  });

  updateTaxPageLanguage = () => {
    if (lastCalcInput) {
      const res = calculateTax(lastCalcInput);
      renderResults(res);
    }
  };
})();

/* ---------------------------------------------------------
   Register a Birth Controller & Osun LGA Registration Directory
   --------------------------------------------------------- */
const OSUN_LGAS = [
  {
    id: 'osogbo',
    name: { en: 'Osogbo LGA', yo: 'Ìjọba Ìbílẹ̀ Òṣogbo' },
    hq: { en: 'Oja Oba, Osogbo', yo: 'Ọjà Ọba, Òṣogbo' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Osogbo Local Government Secretariat, Oja Oba & NPC State Office, Old Secretariat, Gbongan Road',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Òṣogbo (Ọjà Ọba) & Olú-ọ́fíìsì NPC ní Old Secretariat, Òṣogbo',
    },
    health: {
      en: 'UNIOSUN Teaching Hospital, State Specialist Hospital Asubiaro & Primary Health Centres across Osogbo',
      yo: 'Ilé-ìwòsàn UNIOSUN, Ilé-ìwòsàn Asubiaro & Àwọn Ibùdó Ìlera Alákọ̀ọ́bẹ̀rẹ̀ (PHC) ní Òṣogbo',
    },
  },
  {
    id: 'olorunda',
    name: { en: 'Olorunda LGA', yo: 'Ìjọba Ìbílẹ̀ Olórùndá' },
    hq: { en: 'Igbona, Osogbo', yo: 'Ìgbóná, Òṣogbo' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Olorunda Local Government Secretariat, Igbona, Osogbo',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Olórùndá, Ìgbóná, Òṣogbo',
    },
    health: {
      en: 'Primary Health Centre Enikanoyun, Testing Ground PHC & accredited maternity centres in Olorunda',
      yo: 'Ibùdó Ìlera Alákọ̀ọ́bẹ̀rẹ̀ (PHC) Ìgbóná, Testing Ground PHC & àwọn ilé-ìgbẹ̀bí tí a fọwọ́ sí',
    },
  },
  {
    id: 'ife-central',
    name: { en: 'Ife Central LGA', yo: 'Ìjọba Ìbílẹ̀ Ife Central' },
    hq: { en: 'Ile-Ife', yo: 'Ilé-Ifẹ̀' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Ife Central Local Government Secretariat, Ajebamidele, Ile-Ife',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ife Central, Ilé-Ifẹ̀',
    },
    health: {
      en: 'Obafemi Awolowo University Teaching Hospitals Complex (OAUTHC), Enuwa PHC & Seventh-Day Adventist Hospital',
      yo: 'Ilé-ìwòsàn OAUTHC Ilé-Ifẹ̀, Ibùdó Ìlera Enuwa & Ilé-ìwòsàn Seventh-Day Adventist',
    },
  },
  {
    id: 'ife-east',
    name: { en: 'Ife East LGA', yo: 'Ìjọba Ìbílẹ̀ Ife East' },
    hq: { en: 'Oke-Ogbo, Ile-Ife', yo: 'Òkè-Ògbó, Ilé-Ifẹ̀' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Ife East Local Government Secretariat, Oke-Ogbo, Ile-Ife',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ife East, Òkè-Ògbó, Ilé-Ifẹ̀',
    },
    health: {
      en: 'State Hospital Oke-Ogbo & Ward Primary Health Centres across Ife East',
      yo: 'Ilé-ìwòsàn Ìpínlẹ̀ Òkè-Ògbó & Àwọn Ibùdó Ìlera (PHC) ní Ife East',
    },
  },
  {
    id: 'ife-east-area',
    name: { en: 'Ife East Area Office', yo: 'Ọ́fíìsì Agbègbè Ife East (Mọdákẹ́kẹ́)' },
    hq: { en: 'Modakeke', yo: 'Mọdákẹ́kẹ́' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Ife East Area Office Secretariat, Modakeke',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Agbègbè Mọdákẹ́kẹ́',
    },
    health: {
      en: 'State Hospital Modakeke & accredited Primary Health Centres in Modakeke',
      yo: 'Ilé-ìwòsàn Ìpínlẹ̀ Mọdákẹ́kẹ́ & Àwọn Ibùdó Ìlera (PHC) ní Mọdákẹ́kẹ́',
    },
  },
  {
    id: 'ife-north',
    name: { en: 'Ife North LGA', yo: 'Ìjọba Ìbílẹ̀ Ife North' },
    hq: { en: 'Ipetumodu', yo: 'Ìpẹtumọdù' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Ife North Local Government Secretariat, Ipetumodu',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ife North, Ìpẹtumọdù',
    },
    health: {
      en: 'Comprehensive Health Centre Ipetumodu, Edunabon PHC & Moro PHC',
      yo: 'Ibùdó Ìlera Ìpẹtumọdù, Ẹdúnàbọ̀n PHC & Mọrọ PHC',
    },
  },
  {
    id: 'ife-south',
    name: { en: 'Ife South LGA', yo: 'Ìjọba Ìbílẹ̀ Ife South' },
    hq: { en: 'Ifetedo', yo: 'Ifẹ̀tẹ́dó' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Ife South Local Government Secretariat, Ifetedo',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ife South, Ifẹ̀tẹ́dó',
    },
    health: {
      en: 'General Hospital Ifetedo & Primary Health Centres in Garage Olode and Olode wards',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Ifẹ̀tẹ́dó & Àwọn Ibùdó Ìlera (PHC) ní Ife South',
    },
  },
  {
    id: 'ilesa-east',
    name: { en: 'Ilesa East LGA', yo: 'Ìjọba Ìbílẹ̀ Iléṣà East' },
    hq: { en: 'Iyemogun, Ilesa', yo: 'Ìyemògún, Iléṣà' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Ilesa East Local Government Secretariat, Iyemogun, Ilesa',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Iléṣà East, Ìyemògún, Iléṣà',
    },
    health: {
      en: 'Wesley Guild Hospital (OAUTHC Unit) Ilesa & Ward Primary Health Centres',
      yo: 'Ilé-ìwòsàn Wesley Guild (OAUTHC) Iléṣà & Àwọn Ibùdó Ìlera (PHC)',
    },
  },
  {
    id: 'ilesa-west',
    name: { en: 'Ilesa West LGA', yo: 'Ìjọba Ìbílẹ̀ Iléṣà West' },
    hq: { en: 'Ereja Square, Ilesa', yo: 'Pápá Ẹrẹ́jà, Iléṣà' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Ilesa West Local Government Secretariat, Ereja Square, Ilesa',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Iléṣà West, Pápá Ẹrẹ́jà, Iléṣà',
    },
    health: {
      en: 'State General Hospital Ilesa, Adeti PHC & Ilesa West Ward Health Centres',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Iléṣà, Adétì PHC & Àwọn Ibùdó Ìlera Iléṣà West',
    },
  },
  {
    id: 'ede-north',
    name: { en: 'Ede North LGA', yo: 'Ìjọba Ìbílẹ̀ Ẹdẹ North' },
    hq: { en: 'Oja Timi, Ede', yo: 'Ọjà Tìmì, Ẹdẹ' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Ede North Local Government Secretariat, Oja Timi, Ede',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ẹdẹ North, Ọjà Tìmì, Ẹdẹ',
    },
    health: {
      en: 'State Hospital Ede, Oja Timi PHC & Sabo Primary Health Centre',
      yo: 'Ilé-ìwòsàn Ìpínlẹ̀ Ẹdẹ, Ọjà Tìmì PHC & Sabo PHC',
    },
  },
  {
    id: 'ede-south',
    name: { en: 'Ede South LGA', yo: 'Ìjọba Ìbílẹ̀ Ẹdẹ South' },
    hq: { en: 'Ede', yo: 'Ẹdẹ' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Ede South Local Government Secretariat, Oke Iresi, Ede',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ẹdẹ South, Òkè Ìrẹsì, Ẹdẹ',
    },
    health: {
      en: 'Alajue PHC, Loogun PHC & Ede South Ward Health Centres',
      yo: 'Ibùdó Ìlera Alájùẹ́, Lóògùn PHC & Àwọn Ibùdó Ìlera Ẹdẹ South',
    },
  },
  {
    id: 'iwo',
    name: { en: 'Iwo LGA', yo: 'Ìjọba Ìbílẹ̀ Ìwó' },
    hq: { en: 'Iwo', yo: 'Ìwó' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Iwo Local Government Secretariat, Iwo',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ìwó, Ìwó',
    },
    health: {
      en: 'State General Hospital Iwo & Ward Primary Health Centres across Iwo',
      yo: 'Ilé-ìwòsàn Ìpínlẹ̀ Ìwó & Àwọn Ibùdó Ìlera (PHC) ní Ìwó',
    },
  },
  {
    id: 'ejigbo',
    name: { en: 'Ejigbo LGA', yo: 'Ìjọba Ìbílẹ̀ Èjìgbò' },
    hq: { en: 'Ejigbo', yo: 'Èjìgbò' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Ejigbo Local Government Secretariat, Ejigbo',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Èjìgbò, Èjìgbò',
    },
    health: {
      en: 'General Hospital Ejigbo, Baptist Medical Centre & Ejigbo Ward PHCs',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Èjìgbò, Baptist Medical Centre & Àwọn Ibùdó Ìlera Èjìgbò',
    },
  },
  {
    id: 'ikire',
    name: { en: 'Irewole LGA', yo: 'Ìjọba Ìbílẹ̀ Ìrẹwọlé' },
    hq: { en: 'Ikire', yo: 'Ìkirè' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Irewole Local Government Secretariat, Ikire',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ìrẹwọlé, Ìkirè',
    },
    health: {
      en: 'State Hospital Ikire & Primary Health Centres across Ikire',
      yo: 'Ilé-ìwòsàn Ìpínlẹ̀ Ìkirè & Àwọn Ibùdó Ìlera (PHC) ní Ìkirè',
    },
  },
  {
    id: 'ikirun',
    name: { en: 'Ifelodun LGA', yo: 'Ìjọba Ìbílẹ̀ Ifẹ́lódùn' },
    hq: { en: 'Ikirun', yo: 'Ìkìrun' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Ifelodun Local Government Secretariat, Ikirun',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ifẹ́lódùn, Ìkìrun',
    },
    health: {
      en: 'State Hospital Ikirun, Obaagun PHC, Eko-Ende PHC & Ikirun Health Centres',
      yo: 'Ilé-ìwòsàn Ìpínlẹ̀ Ìkìrun, Ọbaágùn PHC & Eko-Ende PHC',
    },
  },
  {
    id: 'ila',
    name: { en: 'Ila LGA', yo: 'Ìjọba Ìbílẹ̀ Ìlá' },
    hq: { en: 'Ila Orangun', yo: 'Ìlá Ọ̀ràngún' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Ila Local Government Secretariat, Ila Orangun',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ìlá, Ìlá Ọ̀ràngún',
    },
    health: {
      en: 'State General Hospital Ila Orangun & Ward Primary Health Centres',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Ìlá Ọ̀ràngún & Àwọn Ibùdó Ìlera (PHC)',
    },
  },
  {
    id: 'iwo-ayedire',
    name: { en: 'Ayedire LGA', yo: 'Ìjọba Ìbílẹ̀ Ayédire' },
    hq: { en: 'Ile-Ogbo', yo: 'Ilé-Ògbó' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Ayedire Local Government Secretariat, Ile-Ogbo',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ayédire, Ilé-Ògbó',
    },
    health: {
      en: 'General Hospital Ile-Ogbo, Kuta PHC & Oluponna Primary Health Centre',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Ilé-Ògbó, Kuta PHC & Olúpọ̀nnà PHC',
    },
  },
  {
    id: 'ayedaade',
    name: { en: 'Ayedaade LGA', yo: 'Ìjọba Ìbílẹ̀ Ayédàádé' },
    hq: { en: 'Gbongan', yo: 'Gbọ̀ngán' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Ayedaade Local Government Secretariat, Gbongan',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ayédàádé, Gbọ̀ngán',
    },
    health: {
      en: 'Comprehensive Health Centre Gbongan, Ode-Omu PHC & Orile-Owu PHC',
      yo: 'Ibùdó Ìlera Gbọ̀ngán, Òde-Òmu PHC & Orílẹ̀-Òwu PHC',
    },
  },
  {
    id: 'atakunmosa-east',
    name: { en: 'Atakunmosa East LGA', yo: 'Ìjọba Ìbílẹ̀ Atákùnmọ́sà East' },
    hq: { en: 'Iperindo', yo: 'Ìpẹrindò' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Atakunmosa East Local Government Secretariat, Iperindo',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Atákùnmọ́sà East, Ìpẹrindò',
    },
    health: {
      en: 'General Hospital Iperindo, Eti-Oni PHC & Iwara Primary Health Centre',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Ìpẹrindò, Etí-Òní PHC & Ìwàrà PHC',
    },
  },
  {
    id: 'atakunmosa-west',
    name: { en: 'Atakunmosa West LGA', yo: 'Ìjọba Ìbílẹ̀ Atákùnmọ́sà West' },
    hq: { en: 'Osu', yo: 'Òṣú' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Atakunmosa West Local Government Secretariat, Osu',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Atákùnmọ́sà West, Òṣú',
    },
    health: {
      en: 'Comprehensive Health Centre Osu, Ifewara PHC & Ibodi PHC',
      yo: 'Ibùdó Ìlera Òṣú, Ifẹ̀wàrà PHC & Ìbòdì PHC',
    },
  },
  {
    id: 'boluwaduro',
    name: { en: 'Boluwaduro LGA', yo: 'Ìjọba Ìbílẹ̀ Bólúwadúró' },
    hq: { en: 'Otan Ayegbaju', yo: 'Ọ̀tan Ayégbajú' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Boluwaduro Local Government Secretariat, Otan Ayegbaju',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Bólúwadúró, Ọ̀tan Ayégbajú',
    },
    health: {
      en: 'General Hospital Otan Ayegbaju, Iresi PHC, Eripa PHC & Igbajo Health Centres',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Ọ̀tan Ayégbajú, Ìrẹsì PHC & Ìgbájọ PHC',
    },
  },
  {
    id: 'boripe',
    name: { en: 'Boripe LGA', yo: 'Ìjọba Ìbílẹ̀ Bórípé' },
    hq: { en: 'Iragbiji', yo: 'Ìrágbìjí' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Boripe Local Government Secretariat, Iragbiji',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Bórípé, Ìrágbìjí',
    },
    health: {
      en: 'Comprehensive Health Centre Iragbiji, Ada PHC, Aagba PHC & Ororuwo PHC',
      yo: 'Ibùdó Ìlera Ìrágbìjí, Àdà PHC, Àágba PHC & Òròrúwọ̀ PHC',
    },
  },
  {
    id: 'egbedore',
    name: { en: 'Egbedore LGA', yo: 'Ìjọba Ìbílẹ̀ Ẹgbẹ́dọrẹ' },
    hq: { en: 'Awo', yo: 'Àwó' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Egbedore Local Government Secretariat, Awo',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ẹgbẹ́dọrẹ, Àwó',
    },
    health: {
      en: 'Comprehensive Health Centre Awo, Okinni PHC, Ara PHC & Ido-Osun PHC',
      yo: 'Ibùdó Ìlera Àwó, Ọ̀kínní PHC, Ara PHC & Ìdó-Ọ̀ṣun PHC',
    },
  },
  {
    id: 'ifeday',
    name: { en: 'Ifedayo LGA', yo: 'Ìjọba Ìbílẹ̀ Ifẹ́dáyọ̀' },
    hq: { en: 'Oke-Ila Orangun', yo: 'Òkè-Ìlá Ọ̀ràngún' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Ifedayo Local Government Secretariat, Oke-Ila Orangun',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ifẹ́dáyọ̀, Òkè-Ìlá Ọ̀ràngún',
    },
    health: {
      en: 'General Hospital Oke-Ila Orangun & Ora-Igbomina Primary Health Centre',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Òkè-Ìlá Ọ̀ràngún & Ọ̀rà-Ìgbómìnà PHC',
    },
  },
  {
    id: 'irepodun',
    name: { en: 'Irepodun LGA', yo: 'Ìjọba Ìbílẹ̀ Ìrẹ́pọ̀dùn' },
    hq: { en: 'Ilobu', yo: 'Ìlóbùú' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Irepodun Local Government Secretariat, Ilobu',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ìrẹ́pọ̀dùn, Ìlóbùú',
    },
    health: {
      en: 'Comprehensive Health Centre Ilobu & Erin-Osun Primary Health Centres',
      yo: 'Ibùdó Ìlera Ìlóbùú & Àwọn Ibùdó Ìlera Ẹrìn-Ọ̀ṣun',
    },
  },
  {
    id: 'isokan',
    name: { en: 'Isokan LGA', yo: 'Ìjọba Ìbílẹ̀ Ìṣọ̀kan' },
    hq: { en: 'Apomu', yo: 'Àpòmù' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Isokan Local Government Secretariat, Apomu',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ìṣọ̀kan, Àpòmù',
    },
    health: {
      en: 'General Hospital Apomu & Ikoyi-Ile Primary Health Centre',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Àpòmù & Ìkòyí-Ilé PHC',
    },
  },
  {
    id: 'obokun',
    name: { en: 'Obokun LGA', yo: 'Ìjọba Ìbílẹ̀ Ọbọ́kùn' },
    hq: { en: 'Ibokun', yo: 'Ìbọ́kùn' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Obokun Local Government Secretariat, Ibokun',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ọbọ́kùn, Ìbọ́kùn',
    },
    health: {
      en: 'General Hospital Ibokun, Esa-Oke PHC, Imesi-Ile PHC & Ilare PHC',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Ìbọ́kùn, Ẹsà-Òkè PHC & Ìmẹ̀sí-Ilé PHC',
    },
  },
  {
    id: 'odo-otin',
    name: { en: 'Odo-Otin LGA', yo: 'Ìjọba Ìbílẹ̀ Odò-Ọ̀tìn' },
    hq: { en: 'Okuku', yo: 'Òkùkú' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Odo-Otin Local Government Secretariat, Okuku',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Odò-Ọ̀tìn, Òkùkú',
    },
    health: {
      en: 'General Hospital Okuku, Inisa PHC, Oyan PHC & Ekosin Health Centres',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Òkùkú, Ìníṣà PHC, Ọ̀yán PHC & Ẹ̀kọ́sìn PHC',
    },
  },
  {
    id: 'ola-oluwa',
    name: { en: 'Ola-Oluwa LGA', yo: 'Ìjọba Ìbílẹ̀ Ọlá-Olúwa' },
    hq: { en: 'Bode Osi', yo: 'Bódè Òsì' },
    district: 'west',
    office: {
      en: 'NPC Vital Registration Desk, Ola-Oluwa Local Government Secretariat, Bode Osi',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Ọlá-Olúwa, Bódè Òsì',
    },
    health: {
      en: 'Comprehensive Health Centre Bode Osi, Asa PHC & Telemu PHC',
      yo: 'Ibùdó Ìlera Bódè Òsì, Àṣà PHC & Tẹ́lẹ̀mù PHC',
    },
  },
  {
    id: 'oriade',
    name: { en: 'Oriade LGA', yo: 'Ìjọba Ìbílẹ̀ Oríadé' },
    hq: { en: 'Ijebu-Jesa', yo: 'Ìjẹ̀bú-Jẹ̀ṣà' },
    district: 'east',
    office: {
      en: 'NPC Vital Registration Desk, Oriade Local Government Secretariat, Ijebu-Jesa',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Oríadé, Ìjẹ̀bú-Jẹ̀ṣà',
    },
    health: {
      en: 'General Hospital Ijebu-Jesa, Erin-Ijesha PHC, Ikeji-Arakeji PHC & Ipetu-Ijesa PHC',
      yo: 'Ilé-ìwòsàn Gbogbogbòò Ìjẹ̀bú-Jẹ̀ṣà, Ẹrin-Ìjẹ̀ṣà PHC & Ìpétu-Ìjẹ̀ṣà PHC',
    },
  },
  {
    id: 'orolu',
    name: { en: 'Orolu LGA', yo: 'Ìjọba Ìbílẹ̀ Orólú' },
    hq: { en: 'Ifon-Osun', yo: 'Ifọ́n-Ọ̀ṣun' },
    district: 'central',
    office: {
      en: 'NPC Vital Registration Desk, Orolu Local Government Secretariat, Ifon-Osun',
      yo: 'Ọ́fíìsì NPC, Sẹkiteriati Ìjọba Ìbílẹ̀ Orólú, Ifọ́n-Ọ̀ṣun',
    },
    health: {
      en: 'Comprehensive Health Centre Ifon-Osun & Olufon Ward Primary Health Centres',
      yo: 'Ibùdó Ìlera Ifọ́n-Ọ̀ṣun & Àwọn Ibùdó Ìlera (PHC) ní Orólú',
    },
  },
];

let updateBirthPageLanguage = null;

(function initBirthRegistration() {
  const birthRoot = document.getElementById('register-a-birth');
  if (!birthRoot) return;

  const checkerForm = birthRoot.querySelector('#birth-checker-form');
  const ageSelect = birthRoot.querySelector('#birth-age-group');
  const placeSelect = birthRoot.querySelector('#birth-place');
  const informantSelect = birthRoot.querySelector('#birth-informant');
  const lgaSelect = birthRoot.querySelector('#birth-lga');
  const defaultPanel = birthRoot.querySelector('#birth-checker-default');
  const resultsPanel = birthRoot.querySelector('#birth-checker-results');
  const statusLiveEl = birthRoot.querySelector('#birth-checker-status');

  // LGA Directory Elements
  const districtFilter = birthRoot.querySelector('#birth-district-filter');
  const lgaSearchInput = birthRoot.querySelector('#birth-lga-search');
  const lgaListEl = birthRoot.querySelector('#birth-lga-list');
  const lgaCountEl = birthRoot.querySelector('#birth-lga-count');
  const lgaMoreWrapEl = birthRoot.querySelector('#birth-lga-more-wrap');
  const lgaMoreLink = birthRoot.querySelector('#birth-lga-more');
  const INITIAL_LGA_LIMIT = 9;

  let lastCheckerState = null;
  let showAllLgas = false;

  function getLgaById(id) {
    return OSUN_LGAS.find((item) => item.id === id) || OSUN_LGAS[0];
  }

  function buildChecklistData(state) {
    const lang = i18n.lang === 'yo' ? 'yo' : 'en';
    const lga = getLgaById(state.lga);

    let serviceName = '';
    let feeLabel = '';
    let feeNote = '';
    let processingWindow = '';
    const docs = [];

    if (state.ageGroup === 'newborn') {
      serviceName = lang === 'yo'
        ? 'Ìforúkọsílẹ̀ Ìbí Tuntun (0 – Ọjọ́ 60)'
        : 'Standard Newborn Registration (0 – 60 Days)';
      feeLabel = lang === 'yo' ? 'Ọ̀fẹ́ (₦0)' : 'Free (₦0)';
      feeNote = lang === 'yo'
        ? ' lábẹ́ òfin láàárín ọjọ́ 60 àkọ́kọ́'
        : 'Statutory free window within 60 days of birth';
      processingWindow = lang === 'yo'
        ? 'Ọjọ́ kan náà ní ibùdó NPC / PHC'
        : 'Same-day issuance at NPC / PHC desk';
    } else if (state.ageGroup === 'child') {
      serviceName = lang === 'yo'
        ? 'Ìforúkọsílẹ̀ Ọmọọwọ́ (Ọjọ́ 61 – Oṣù 12)'
        : 'Infant Birth Registration (61 Days – 12 Months)';
      feeLabel = lang === 'yo' ? 'Ọ̀fẹ́ (₦0)' : 'Free (₦0)';
      feeNote = lang === 'yo'
        ? 'Ọ̀fẹ́ ní ibùdó NPC àti PHC ní Ìpínlẹ̀ Ọ̀ṣun'
        : 'Free at NPC desks and Primary Health Centres in Osun State';
      processingWindow = lang === 'yo'
        ? 'Ọjọ́ 1 – 2 lẹ́yìn àyẹ̀wò Registrar'
        : '1 – 2 working days after Registrar verification';
    } else if (state.ageGroup === 'minor') {
      serviceName = lang === 'yo'
        ? 'Ìforúkọsílẹ̀ Ọmọdé tó Pẹ́ (Ọdún 1 – 17)'
        : 'Late Child / Minor Registration (1 – 17 Years)';
      feeLabel = lang === 'yo' ? 'Ọ̀fẹ́ ní NPC' : 'Free at NPC';
      feeNote = lang === 'yo'
        ? 'Ìforúkọsílẹ̀ jẹ́ ọ̀fẹ́ ní NPC (owó ìbúra ilé-ẹjọ́ lè wáyé)'
        : 'NPC registration is free (standard court registry fee applies if affidavit is needed)';
      processingWindow = lang === 'yo'
        ? 'Ọjọ́ 2 – 5 lẹ́yìn ìfìdí-ẹ̀rí múlẹ̀'
        : '2 – 5 working days after document verification';
    } else {
      serviceName = lang === 'yo'
        ? 'Ìwé-Ẹ̀rí Ìjẹ́rìí Ìbí Àgbàlagbà (Ọdún 18+)'
        : 'Adult Certificate of Birth Attestation (18+ Years)';
      feeLabel = lang === 'yo' ? 'Owó Aláṣẹ e-CRVS' : 'Official Portal Fee';
      feeNote = lang === 'yo'
        ? 'A ń san án lórí ojú-òpó NPC e-CRVS nípasẹ̀ Remita'
        : 'Payable online on the official NPC e-CRVS portal via Remita';
      processingWindow = lang === 'yo'
        ? 'Ọjọ́ 3 – 7 lórí ojú-òpó e-CRVS'
        : '3 – 7 working days on the e-CRVS portal';
    }

    // 1. Primary Proof of Birth / Age
    if (state.ageGroup === 'adult') {
      docs.push(
        lang === 'yo'
          ? 'Ìwé ìbúra ọjọ́-orí (Sworn Affidavit of Age Declaration) láti Ilé-ẹjọ́ Gíga tàbí Magistrate'
          : 'Sworn Affidavit of Age Declaration from a High Court or Magistrate Court'
      );
      docs.push(
        lang === 'yo'
          ? 'Nọ́mbà Ìdánimọ̀ Orílẹ̀-èdè (NIN) ti olùbéèrè (orúkọ àti ọjọ́-ìbí gbọdọ̀ bá ti NIN mu)'
          : "Applicant's 11-digit National Identification Number (NIN) matching exact names and date of birth"
      );
      docs.push(
        lang === 'yo'
          ? 'Àyẹ̀wò ojú (Facial Biometric Capture) lórí ojú-òpó NPC e-CRVS'
          : 'Live facial biometric verification on the NPC e-CRVS self-service portal'
      );
      docs.push(
        lang === 'yo'
          ? 'Ìwé-ẹ̀rí ilé-ìwé alákọ̀ọ́bẹ̀rẹ̀ tàbí ìwé ìrìbọmi (bí ó bá wà)'
          : 'Primary school leaving certificate or baptismal / hospital record (if available)'
      );
    } else {
      if (state.birthPlace === 'hospital') {
        docs.push(
          lang === 'yo'
            ? 'Ìwé Ìfitónilétí Ìbí (Medical Birth Notification Slip) láti ilé-ìwòsàn tí a ti bí ọmọ'
            : 'Official Hospital / Maternity Clinic Birth Notification Slip signed by the attending midwife or doctor'
        );
      } else if (state.birthPlace === 'phc') {
        docs.push(
          lang === 'yo'
            ? 'Ìwé Ìfitónilétí Ìbí láti Ibùdó Ìlera Alákọ̀ọ́bẹ̀rẹ̀ (PHC) àti káàdì abẹ́rẹ́ àjẹsára ọmọ'
            : 'Primary Health Centre (PHC) Delivery Record / Birth Notification Slip and Child Immunisation Card'
        );
      } else {
        docs.push(
          lang === 'yo'
            ? 'Ìwé ìjẹ́rìí láti ọwọ́ agbẹ̀bí ìbílẹ̀, Baálẹ̀ / Olórí àdúgbò, tàbí olórí ẹ̀sìn tó fìdí ọjọ́ ìbí múlẹ̀'
            : 'Signed birth confirmation from the traditional birth attendant, community leader (Baálẹ̀ / Ọba), or religious leader'
        );
        docs.push(
          lang === 'yo'
            ? 'Káàdì abẹ́rẹ́ àjẹsára ọmọ (Child Immunisation / Health Card) láti PHC tó súnmọ́ ọ'
            : 'Child Immunisation / Weighing Card issued at your nearest Primary Health Centre (PHC)'
        );
      }

      // 2. Informant / Parent NIN requirements
      if (state.informant === 'parents' || state.informant === 'self') {
        docs.push(
          lang === 'yo'
            ? 'Nọ́mbà Ìdánimọ̀ Orílẹ̀-èdè (NIN) ti ìyá àti/tàbí bàbá ọmọ'
            : "Valid 11-digit National Identification Number (NIN) of the child's mother and/or father"
        );
      } else {
        docs.push(
          lang === 'yo'
            ? 'Nọ́mbà NIN ti alágbàtọ́ / ẹbí tó wá forúkọsílẹ̀ àti ẹ̀rí ìbátan pẹ̀lú ọmọ náà'
            : "Valid 11-digit NIN of the legal guardian / informant and proof of relationship to the child"
        );
      }

      // 3. Additional requirements for late child registration (1–17 years)
      if (state.ageGroup === 'minor') {
        docs.push(
          lang === 'yo'
            ? 'Ìwé ìbúra ọjọ́-orí (Affidavit of Birth) láti ọwọ́ òbí ní ilé-ẹjọ́ (fún ọmọ tó ti kọjá ọdún kan)'
            : 'Sworn Affidavit of Birth by parent or legal guardian (required for late registration over 1 year)'
        );
        docs.push(
          lang === 'yo'
            ? 'Àkọsílẹ̀ ilé-ìwé tàbí káàdì ìlera ọmọdé'
            : 'School admission record or early childhood immunisation record'
        );
      }

      // 4. Demographic details
      docs.push(
        lang === 'yo'
          ? 'Orúkọ ọmọ ní kíkún, ọjọ́ ìbí, okùnrin/obìnrin, ìlú abínibí àti àdírẹ́sì ibùgbé ní Ìpínlẹ̀ Ọ̀ṣun'
          : "Child's full names, exact date of birth, sex, parents' state/LGA of origin, and residential address in Osun State"
      );
    }

    return {
      lang,
      serviceName,
      feeLabel,
      feeNote,
      processingWindow,
      lga,
      docs,
    };
  }

  function renderChecklist(state) {
    if (!resultsPanel) return;
    const data = buildChecklistData(state);
    const { lang, serviceName, feeLabel, feeNote, processingWindow, lga, docs } = data;

    const docItemsHtml = docs
      .map(
        (doc) => `
        <li class="birth-checklist__item">
          <svg class="birth-checklist__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span>${doc}</span>
        </li>
      `
      )
      .join('');

    resultsPanel.innerHTML = `
      <div class="birth-results-header">
        <h3 class="tax-results__title">${lang === 'yo' ? 'Àkójọ Ohun Tí O Nílò Fún Ìforúkọsílẹ̀' : 'Your Personalised Registration Checklist'}</h3>
        <button type="button" class="btn btn--outline btn--sm" data-print-checklist>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="display:inline-block; vertical-align:middle; margin-right:5px;"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
          ${lang === 'yo' ? 'Tẹ̀ Àkójọ Yìí' : 'Print checklist'}
        </button>
      </div>

      <div class="tax-summary-box">
        <div class="tax-summary-box__label">${lang === 'yo' ? 'Irú Ìforúkọsílẹ̀ Tí Ó Kàn Ọ́' : 'Recommended Registration Category'}</div>
        <div class="tax-summary-box__amount" style="font-size:1.35rem; margin-bottom:0.35rem;">${serviceName}</div>
        <p class="tax-summary-box__sub"><strong>${lang === 'yo' ? 'Owó Ìjọba:' : 'Statutory Fee:'}</strong> ${feeLabel} &bull; ${feeNote}</p>
      </div>

      <dl class="tax-stat-grid">
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Àkókò Ìgbéjáde' : 'Estimated Turnaround'}</dt>
          <dd style="font-size:0.95rem;">${processingWindow}</dd>
        </div>
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Ìjọba Ìbílẹ̀ Tí A Yàn' : 'Selected LGA'}</dt>
          <dd style="font-size:0.95rem;">${lga.name[lang] || lga.name.en} (${lga.hq[lang] || lga.hq.en})</dd>
        </div>
      </dl>

      <h4 class="birth-subheading">${lang === 'yo' ? 'Àwọn Ìwé Tí O Gbọdọ̀ Mú Wá' : 'Required Documents & Information'}</h4>
      <ul class="birth-checklist">
        ${docItemsHtml}
      </ul>

      <div class="birth-lga-callout">
        <strong>${lang === 'yo' ? 'Ibùdó Ìforúkọsílẹ̀ NPC Tí Ó Súnmọ́ Ọ:' : 'Nearest NPC Registration Centre:'}</strong>
        <p>${lga.office[lang] || lga.office.en}</p>
        <p class="birth-lga-callout__sub"><strong>${lang === 'yo' ? 'Àwọn Ilé-Ìwòsàn:' : 'Health Facilities:'}</strong> ${lga.health[lang] || lga.health.en}</p>
      </div>

      <div class="tax-cta-box">
        <p>${lang === 'yo' ? 'Bẹ̀rẹ̀ ìforúkọsílẹ̀ lórí ojú-òpó aláṣẹ NPC e-CRVS tàbí lọ sí ibùdó NPC tó wà lókè yìí.' : 'Start your pre-registration online on the official NPC e-CRVS portal or visit the registration desk above.'}</p>
        <a class="btn btn--primary ext-link" href="https://ecrvs.nationalpopulation.gov.ng/">
          ${lang === 'yo' ? 'Bẹ̀rẹ̀ lórí NPC e-CRVS' : 'Proceed to NPC e-CRVS Portal'}
        </a>
      </div>
    `;

    const printChecklistBtn = resultsPanel.querySelector('[data-print-checklist]');
    if (printChecklistBtn) {
      printChecklistBtn.addEventListener('click', () => window.print());
    }

    if (defaultPanel) defaultPanel.hidden = true;
    resultsPanel.hidden = false;

    if (statusLiveEl) {
      statusLiveEl.textContent = lang === 'yo'
        ? `A ti pèsè àkójọ ìforúkọsílẹ̀ fún ${serviceName} ní ${lga.name.yo}.`
        : `Generated checklist for ${serviceName} in ${lga.name.en}.`;
    }
  }

  function getCurrentStateFromForm() {
    return {
      ageGroup: ageSelect ? ageSelect.value : 'newborn',
      birthPlace: placeSelect ? placeSelect.value : 'hospital',
      informant: informantSelect ? informantSelect.value : 'parents',
      lga: lgaSelect ? lgaSelect.value : 'osogbo',
    };
  }

  if (ageSelect && informantSelect) {
    ageSelect.addEventListener('change', () => {
      if (ageSelect.value === 'adult') {
        informantSelect.value = 'self';
      } else if (informantSelect.value === 'self') {
        informantSelect.value = 'parents';
      }
      if (lastCheckerState) {
        lastCheckerState = getCurrentStateFromForm();
        renderChecklist(lastCheckerState);
      }
    });
  }

  [placeSelect, informantSelect, lgaSelect].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener('change', () => {
      if (lastCheckerState) {
        lastCheckerState = getCurrentStateFromForm();
        renderChecklist(lastCheckerState);
      }
    });
  });

  if (checkerForm) {
    checkerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      lastCheckerState = getCurrentStateFromForm();
      renderChecklist(lastCheckerState);
    });

    checkerForm.addEventListener('reset', () => {
      lastCheckerState = null;
      if (resultsPanel) {
        resultsPanel.hidden = true;
        resultsPanel.innerHTML = '';
      }
      if (defaultPanel) defaultPanel.hidden = false;
      if (statusLiveEl) statusLiveEl.textContent = '';
    });
  }

  // Category cards quick-select links ([data-select-age])
  birthRoot.querySelectorAll('[data-select-age]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetAge = link.dataset.selectAge;
      if (ageSelect && targetAge) {
        ageSelect.value = targetAge;
        if (targetAge === 'adult' && informantSelect) {
          informantSelect.value = 'self';
        } else if (informantSelect && informantSelect.value === 'self') {
          informantSelect.value = 'parents';
        }
        lastCheckerState = getCurrentStateFromForm();
        renderChecklist(lastCheckerState);
        const checkerEl = document.getElementById('birth-checker');
        if (checkerEl) checkerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Render LGA Directory Cards
  const districtLabels = {
    central: { en: 'Osun Central', yo: 'Ọ̀ṣun Central' },
    east: { en: 'Osun East (Ife / Ijesa)', yo: 'Ọ̀ṣun East (Ifẹ̀ / Ìjẹ̀ṣà)' },
    west: { en: 'Osun West', yo: 'Ọ̀ṣun West' },
  };

  function renderLgaDirectory() {
    if (!lgaListEl) return;
    const lang = i18n.lang === 'yo' ? 'yo' : 'en';
    const districtVal = districtFilter ? districtFilter.value : 'all';
    const query = lgaSearchInput ? normalise(lgaSearchInput.value.trim()) : '';

    const filtered = OSUN_LGAS.filter((item) => {
      if (districtVal !== 'all' && item.district !== districtVal) return false;
      if (!query) return true;
      const haystack = normalise(
        `${item.name.en} ${item.name.yo} ${item.hq.en} ${item.hq.yo} ${item.office.en} ${item.health.en}`
      );
      return haystack.includes(query);
    });

    const visible = showAllLgas ? filtered : filtered.slice(0, INITIAL_LGA_LIMIT);

    if (lgaCountEl) {
      lgaCountEl.textContent = lang === 'yo'
        ? `Àfihàn ibùdó ìforúkọsílẹ̀ ${visible.length} nínú ${filtered.length} ní Ìpínlẹ̀ Ọ̀ṣun`
        : `Showing ${visible.length} of ${filtered.length} Local Government registration centres in Osun State`;
    }

    if (lgaMoreWrapEl) {
      lgaMoreWrapEl.hidden = showAllLgas || filtered.length <= INITIAL_LGA_LIMIT;
    }

    if (filtered.length === 0) {
      lgaListEl.innerHTML = `
        <div class="birth-lga-empty">
          <p>${lang === 'yo' ? 'Kò sí Ìjọba Ìbílẹ̀ tàbí ìlú tó bá ohun tí o wá mu. Gbìyànjú orúkọ mìíràn.' : 'No Local Government Area or town matched your search. Try another term.'}</p>
        </div>
      `;
      return;
    }

    lgaListEl.innerHTML = visible
      .map((item) => {
        const distBadge = districtLabels[item.district][lang] || districtLabels[item.district].en;
        return `
          <article class="birth-lga-card">
            <div class="birth-lga-card__top">
              <span class="birth-lga-card__badge">${distBadge}</span>
              <h4 class="birth-lga-card__title">${item.name[lang] || item.name.en}</h4>
              <p class="birth-lga-card__hq">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span><strong>${lang === 'yo' ? 'Olú-ìlú:' : 'Headquarters:'}</strong> ${item.hq[lang] || item.hq.en}</span>
              </p>
            </div>
            <div class="birth-lga-card__body">
              <p><strong>${lang === 'yo' ? 'Ọ́fíìsì NPC:' : 'NPC Desk:'}</strong> ${item.office[lang] || item.office.en}</p>
              <p><strong>${lang === 'yo' ? 'Ibùdó Ìlera:' : 'Health Centres:'}</strong> ${item.health[lang] || item.health.en}</p>
            </div>
            <div class="birth-lga-card__footer">
              <button type="button" class="btn btn--outline btn--sm" data-pick-lga="${item.id}">
                ${lang === 'yo' ? 'Yan Ìjọba Ìbílẹ̀ yìí' : 'Select for checklist'}
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  if (districtFilter) {
    districtFilter.addEventListener('change', renderLgaDirectory);
  }
  if (lgaSearchInput) {
    lgaSearchInput.addEventListener('input', renderLgaDirectory);
  }
  if (lgaMoreLink) {
    lgaMoreLink.addEventListener('click', (e) => {
      e.preventDefault();
      showAllLgas = true;
      renderLgaDirectory();
    });
  }

  if (lgaListEl) {
    lgaListEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-lga]');
      if (!btn) return;
      const pickedId = btn.dataset.pickLga;
      if (lgaSelect && pickedId) {
        lgaSelect.value = pickedId;
        lastCheckerState = getCurrentStateFromForm();
        renderChecklist(lastCheckerState);
        const checkerEl = document.getElementById('birth-checker');
        if (checkerEl) checkerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  updateBirthPageLanguage = () => {
    renderLgaDirectory();
    if (lastCheckerState) {
      renderChecklist(lastCheckerState);
    }
  };

  renderLgaDirectory();
})();

/* ---------------------------------------------------------
   Laws and Official Gazettes Repository & Service Estimator
   --------------------------------------------------------- */
const OSUN_LAWS_DATA = [
  {
    id: 'acjl',
    category: 'law',
    sector: 'justice',
    year: '2020 (Revised)',
    citation: {
      en: 'Administration of Criminal Justice Law • Laws of Osun State',
      yo: 'Òfin Ìṣàkóso Ìdájọ́ Ọ̀daràn • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun',
    },
    title: {
      en: 'Osun State Administration of Criminal Justice Law (ACJL)',
      yo: 'Òfin Ìṣàkóso Ìdájọ́ Ọ̀daràn ti Ìpínlẹ̀ Ọ̀ṣun (ACJL)',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Justice & Osun State Judiciary',
      yo: 'Iléeṣẹ́ Ìdájọ́ & Ẹ̀ka Ìdájọ́ Ìpínlẹ̀ Ọ̀ṣun',
    },
    summary: {
      en: 'Modernises criminal justice administration across all courts in Osun State, ensuring speedy trials, electronic recording of confessional statements, protection of suspects’ constitutional rights, remand time limits, and non-custodial community sentencing.',
      yo: 'Ó ṣe àtúnṣe sí ètò ìdájọ́ ọ̀daràn ní gbogbo ilé-ẹjọ́ Ìpínlẹ̀ Ọ̀ṣun, ó mú kí ìgbẹ́jọ́ yára, ó dáàbò bo ẹ̀tọ́ àwọn afurasí, ó sì fi òpin sí títì ènìyàn mọ́lé láìsí ìgbẹ́jọ́.',
    },
    provisions: {
      en: [
        'Prohibits arrest in lieu of another person and mandates humane treatment of suspects.',
        'Requires video or audio-visual recording of confessional statements in serious offences.',
        'Establishes strict 14-day renewable judicial review limits on pre-trial remand orders.',
        'Introduces plea bargain guidelines, restitution for victims, and community service orders.',
      ],
      yo: [
        'Ó ka fífàṣẹọba mú ẹlòmíràn dípò ẹni tí a ń wá sí ohun tí òfin kọ̀.',
        'Ó pàṣẹ gbígba ọ̀rọ̀ ìjẹ́wọ́ sílẹ̀ lórí fídíò tàbí níwájú agbẹjọ́rò.',
        'Ó fi òpin ọjọ́ 14 sí àṣẹ títì afurasí mọ́lé kí a tó gbọ́ ẹjọ́.',
        'Ó gbé ìlànà ìtanràn, ìsanpadà fún ẹni tí a ṣẹ̀, àti iṣẹ́ àwùjọ kalẹ̀.',
      ],
    },
  },
  {
    id: 'revenue-law',
    category: 'law',
    sector: 'finance',
    year: 'Cap. O15 (Harmonised)',
    citation: {
      en: 'Cap. O15 • Laws of Osun State of Nigeria',
      yo: 'Cap. O15 • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun ti Nàìjíríà',
    },
    title: {
      en: 'Osun State Revenue Administration & Internal Revenue Service Law',
      yo: 'Òfin Ìṣàkóso Owó-wíwọlé àti Àjọ Owó-orí Ìpínlẹ̀ Ọ̀ṣun (OsunIRS)',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Osun Internal Revenue Service (OsunIRS) & Ministry of Finance',
      yo: 'Àjọ Owó-orí Ìpínlẹ̀ Ọ̀ṣun (OsunIRS) & Iléeṣẹ́ Ètò Ìnáwó',
    },
    summary: {
      en: 'Establishes the autonomous Osun Internal Revenue Service (OsunIRS), defines the powers of assessment, collection, and accounting for state taxes and harmonised MDA/LGA levies, and aligns state tax administration with the Nigeria Tax Act 2025.',
      yo: 'Ó dá Àjọ Owó-orí Ìpínlẹ̀ Ọ̀ṣun (OsunIRS) sílẹ̀, ó sì ṣàlàyé ìlànà ìṣírò àti gbígba owó-orí ìpínlẹ̀ àti owó-ìlú ní ìbámu pẹ̀lú Òfin Owó-orí Nàìjíríà 2025.',
    },
    provisions: {
      en: [
        'Mandates automated electronic revenue collection via Invoice Payment Numbers (IPN) and Payer IDs.',
        'Outlaws cash collection of taxes and unapproved roadblocks by revenue agents.',
        'Provides for the Tax Appeal Committee and issuance of electronic Tax Clearance Certificates (e-TCC).',
        'Consolidates business premises, haulage, and local government harmonised billing schedules.',
      ],
      yo: [
        'Ó pàṣẹ sísan owó-orí lórí ayélujára nípasẹ̀ nọ́mbà IPN àti Payer ID.',
        'Ó fòfindè gbígba owó-orí ní ọwọ́-sí-ọwọ́ tàbí dídènà ọ̀nà láti gba owó.',
        'Ó ṣètò Ìgbìmọ̀ Аpẹ́tùsọ́wọ́ Owó-orí àti fífúnni ní ìwé-ẹ̀rí e-TCC.',
        'Ó pa àwọn owó okòwò iléeṣẹ́ ìjọba àti Ìjọba Ìbílẹ̀ pọ̀ sínú ìwé kan ṣoṣo.',
      ],
    },
  },
  {
    id: 'appropriation-2026',
    category: 'gazette',
    sector: 'finance',
    year: '2026',
    citation: {
      en: 'Osun State Official Gazette Vol. 36, No. 1 (2026)',
      yo: 'Ìwé-Ìròyìn Ìjọba Ìpínlẹ̀ Ọ̀ṣun Apá 36, Nọ́mbà 1 (2026)',
    },
    title: {
      en: 'Osun State Appropriation Law 2026 (2026 Fiscal Budget Gazette)',
      yo: 'Òfin Ètò Ìnáwó Ìpínlẹ̀ Ọ̀ṣun 2026 (Ìwé-Ìròyìn Ìjọba 2026)',
    },
    status: {
      en: 'Gazetted',
      yo: 'A Ti Tẹ̀ Ẹ́ Jáde',
    },
    custodian: {
      en: 'Ministry of Economic Planning, Budget & Development / Govt. Press',
      yo: 'Iléeṣẹ́ Ètò Ọrọ̀-Ajé àti Ìnáwó / Ilé-Ìtẹ̀wé Ìjọba',
    },
    summary: {
      en: 'Official Gazette publishing the 2026 Appropriation Law assented to by the Executive Governor, authorising recurrent and capital expenditure out of the Consolidated Revenue Fund for infrastructure, health, education, agriculture, and workers’ welfare.',
      yo: 'Ìwé-ìròyìn ìjọba aláṣẹ tó kéde Òfin Ètò Ìnáwó ọdún 2026 tí Gómìnà fọwọ́ sí fún iṣẹ́ àkànṣe ojú-ọ̀nà, ètò ìlera, ẹ̀kọ́, iṣẹ́ àgbẹ̀, àti ìgbáyégbádùn àwọn oṣìṣẹ́.',
    },
    provisions: {
      en: [
        'Details sector-by-sector capital allocations across all Ministries, Departments, and Agencies (MDAs).',
        'Mandates quarterly budget performance publication in line with fiscal transparency standards.',
        'Requires strict compliance with the Osun State Public Procurement Law for all capital releases.',
      ],
      yo: [
        'Ó ṣàlàyé ìpín owó iṣẹ́ àkànṣe fún gbogbo iléeṣẹ́, ẹ̀ka, àti àjọ ìjọba (MDAs).',
        'Ó pàṣẹ títẹ ìròyìn bí a ṣe ná owó jáde ní ìdámẹ́rin-ìdámẹ́rin ọdún.',
        'Óייàn pé kí gbogbo ìnáwó bá Òfin Rírà Ìjọba mu.',
      ],
    },
  },
  {
    id: 'procurement-law',
    category: 'law',
    sector: 'finance',
    year: '2015 (Amended)',
    citation: {
      en: 'Public Procurement Law • Laws of Osun State',
      yo: 'Òfin Rírà àti Iṣẹ́ Àdéhùn Ìjọba • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun',
    },
    title: {
      en: 'Osun State Public Procurement Law',
      yo: 'Òfin Rírà àti Iṣẹ́ Àdéhùn Ìjọba ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Osun State Public Procurement Agency (OSPPA)',
      yo: 'Àjọ Tó Ń Bójútó Rírà àti Àdéhùn Ìjọba (OSPPA)',
    },
    summary: {
      en: 'Establishes the Public Procurement Agency and regulates public contracting, open competitive bidding, contractor registration, value-for-money audits, and e-procurement transparency across all state and local government entities.',
      yo: 'Ó dá Àjọ Rírà Ìjọba sílẹ̀, ó sì ṣètò ìlànà ìdíje gbangba fún iṣẹ́ àdéhùn, ìforúkọsílẹ̀ àwọn agbaṣẹ́ṣe, àti ìṣírò owó ìjọba ní gbogbo ẹ̀ka.',
    },
    provisions: {
      en: [
        'Establishes open competitive bidding as the default method for public procurement.',
        'Requires Certificate of “No Objection” prior to award of major state contracts.',
        'Provides administrative review mechanisms for bidders and debarment penalties for procurement fraud.',
      ],
      yo: [
        'Ó fi ìdíje gbangba ṣe ìlànà àkọ́kọ́ fún fífúnni ní iṣẹ́ àdéhùn ìjọba.',
        'Ó béèrè fún ìwé-ẹ̀rí ìfọwọ́sí kí a tó fún agbaṣẹ́ṣe ní iṣẹ́ ńlá.',
        'Ó ṣètò ìjìyà fún ẹnikẹ́ni tó bá hu ìwà ìbàjẹ́ nínú ètò rírà ìjọba.',
      ],
    },
  },
  {
    id: 'ohis-law',
    category: 'law',
    sector: 'social',
    year: '2018',
    citation: {
      en: 'Osun Health Insurance Law • Gazette Vol. 28',
      yo: 'Òfin Ìbánigbófò Ìlera Ọ̀ṣun • Ìwé-Ìròyìn Apá 28',
    },
    title: {
      en: 'Osun State Health Insurance Agency Law (OHIS Law)',
      yo: 'Òfin Àjọ Ètò Ìbánigbófò Ìlera Ìpínlẹ̀ Ọ̀ṣun (OHIS)',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Osun Health Insurance Agency (OHIA) & Ministry of Health',
      yo: 'Àjọ Ìbánigbófò Ìlera Ọ̀ṣun (OHIA) & Iléeṣẹ́ Ètò Ìlera',
    },
    summary: {
      en: 'Establishes the Osun Health Insurance Scheme (OHIS) to provide affordable, accessible healthcare coverage for formal and informal sector residents, civil servants, pensioners, and vulnerable citizens across accredited hospitals and PHCs.',
      yo: 'Ó dá Ètò Ìbánigbófò Ìlera Ọ̀ṣun (OHIS) sílẹ̀ láti pèsè ìtọ́jú ìlera tó rọrùn fún àwọn oṣìṣẹ́ ìjọba, oníṣòwò, àti àwọn aláìní ní ilé-ìwòsàn tí a fọwọ́ sí.',
    },
    provisions: {
      en: [
        'Establishes the Vulnerable Group Equity Fund financed from consolidated state revenue.',
        'Sets accreditation and quality assurance standards for public and private healthcare providers.',
        'Defines benefit packages covering maternal care, child immunisation, consultations, and surgeries.',
      ],
      yo: [
        'Ó dá Àpò Owó Ìrànwọ́ fún àwọn aláìní, aboyún, àti àgbàlagbà sílẹ̀.',
        'Ó gbé ìlànà ìfọwọ́sí kalẹ̀ fún àwọn ilé-ìwòsàn ìjọba àti ti aládàání.',
        'Ó ṣàlàyé àwọn ìtọ́jú ìlera, ìgbẹ̀bí, àti iṣẹ́-abẹ tí ètò náà bo.',
      ],
    },
  },
  {
    id: 'child-rights-law',
    category: 'law',
    sector: 'justice',
    year: 'Cap. C7',
    citation: {
      en: 'Cap. C7 • Laws of Osun State of Nigeria',
      yo: 'Cap. C7 • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun ti Nàìjíríà',
    },
    title: {
      en: "Osun State Child's Rights Law",
      yo: 'Òfin Ẹ̀tọ́ Ọmọdé ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Women, Children & Social Affairs / Ministry of Justice',
      yo: 'Iléeṣẹ́ Àlámọ̀rí Obìnrin àti Ọmọdé / Iléeṣẹ́ Ìdájọ́',
    },
    summary: {
      en: 'Guarantees the survival, development, protection, and welfare of every child in Osun State, mandating free and compulsory basic education, birth registration, protection from harmful practices, and establishing Family Courts.',
      yo: 'Ó dáàbò bo ẹ̀tọ́, ìlera, àti ọjọ́-iwájú gbogbo ọmọdé ní Ìpínlẹ̀ Ọ̀ṣun, ó pàṣẹ ẹ̀kọ́ alákọ̀ọ́bẹ̀rẹ̀ ọ̀fẹ́, ìforúkọsílẹ̀ ìbí, àti Ilé-ẹjọ́ Ẹbí.',
    },
    provisions: {
      en: [
        'Mandates compulsory birth registration and free basic education for every child.',
        'Prohibits exploitative child labour, street hawking during school hours, child marriage, and abuse.',
        'Establishes Family Courts at the High Court and Magisterial levels for child welfare proceedings.',
      ],
      yo: [
        'Ó pàṣẹ ìforúkọsílẹ̀ ìbí àti ẹ̀kọ́ alákọ̀ọ́bẹ̀rẹ̀ fún gbogbo ọmọdé.',
        'Ó fòfindè lílo ọmọdé fún iṣẹ́ agbára, kiri ọjà ní àkókò ilé-ìwé, àti ìgbéyàwó ọmọdé.',
        'Ó dá Ilé-ẹjọ́ Ẹbí sílẹ̀ láti gbọ́ àwọn ẹjọ́ tó jẹ mọ́ ààbò ọmọdé.',
      ],
    },
  },
  {
    id: 'vapp-law',
    category: 'law',
    sector: 'justice',
    year: '2021',
    citation: {
      en: 'VAPP Law • Osun State Official Gazette',
      yo: 'Òfin VAPP • Ìwé-Ìròyìn Ìjọba Ìpínlẹ̀ Ọ̀ṣun',
    },
    title: {
      en: 'Osun State Violence Against Persons (Prohibition) Law (VAPP Law)',
      yo: 'Òfin Ìdènà Ìwà-Ipá Sí Ènìyàn ti Ìpínlẹ̀ Ọ̀ṣun (VAPP)',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Justice & Sexual Assault Referral Centres',
      yo: 'Iléeṣẹ́ Ìdájọ́ & Àwọn Ibùdó Ààbò Olùfarapa',
    },
    summary: {
      en: 'Eliminates violence in private and public life across Osun State, prohibiting domestic violence, harmful widowhood practices, female genital mutilation, forceful ejection from home, and providing protection orders and compensation for survivors.',
      yo: 'Ó fòfindè gbogbo ìwà-ipá nínú ilé àti láwùjọ ní Ìpínlẹ̀ Ọ̀ṣun, títí kan ìántí obìnrin opó, ìkọlù, àti líle ọkọ tàbí aya jáde nílé, ó sì pèsè ààbò lábẹ́ òfin.',
    },
    provisions: {
      en: [
        'Empowers courts to issue immediate Protection Orders shielding victims from abusers.',
        'Criminalises emotional, verbal, economic, and physical abuse as well as harmful traditional practices.',
        'Provides for medical, psychological, and legal aid support for survivors of gender-based violence.',
      ],
      yo: [
        'Ó fún ilé-ẹjọ́ ní agbára láti pa àṣẹ ààbò lẹ́sẹ̀kẹsẹ̀ fún ẹni tí a ń fìyà jẹ.',
        'Ó fi ìjìyà líle lélẹ̀ fún ìkọlù, ìfìyàjẹ opó, àti àṣà tó lewu fún àgọ́ ara.',
        'Ó pèsè ìtọ́jú ìlera àti agbẹjọ́rò ọ̀fẹ́ fún àwọn olùfarapa.',
      ],
    },
  },
  {
    id: 'land-use-charge',
    category: 'law',
    sector: 'environment',
    year: '2016',
    citation: {
      en: 'Land Use Charge Law • Laws of Osun State',
      yo: 'Òfin Owó Ilẹ̀ àti Ilé • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun',
    },
    title: {
      en: 'Osun State Land Use Charge Law',
      yo: 'Òfin Owó Ilẹ̀ àti Ilé (Land Use Charge) ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Lands & Physical Planning / OsunIRS',
      yo: 'Iléeṣẹ́ Ilẹ̀ àti Ètò Ìlú / OsunIRS',
    },
    summary: {
      en: 'Consolidates ground rent, tenement rates, and neighbourhood improvement charges into a single annual property charge assessed transparently across residential, commercial, and industrial properties in Osun State.',
      yo: 'Ó pa gbogbo owó ilẹ̀ àti owó ilé pọ̀ sínú owó kan ṣoṣo tí a ń san lọ́dọọdún lórí ilé gbígbé àti ilé okòwò ní Ìpínlẹ̀ Ọ̀ṣun.',
    },
    provisions: {
      en: [
        'Exempts places of public worship, public libraries, palaces of recognised traditional rulers, and non-profit cemeteries.',
        'Grants early-payment discounts for property owners who settle bills within 30 days of Demand Notice.',
        'Establishes the Land Use Charge Assessment Appeal Tribunal for valuation disputes.',
      ],
      yo: [
        'Ó yọ àwọn ilé-ìjọsìn, ilé-ìkàwé gbogbogbòò, àti àfin àwọn ọba aládé kúrò nínú sísan owó náà.',
        'Ó fún àwọn tó bá sanwó láàárín ọjọ́ 30 ní àdínkù owó.',
        'Ó dá Ìgbìmọ̀ Аpẹ́tùsọ́wọ́ sílẹ̀ fún ẹnikẹ́ni tí kò bá fara mọ́ ìṣírò owó ilé rẹ̀.',
      ],
    },
  },
  {
    id: 'environmental-law',
    category: 'law',
    sector: 'environment',
    year: 'Cap. E4',
    citation: {
      en: 'Cap. E4 • Laws of Osun State of Nigeria',
      yo: 'Cap. E4 • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun ti Nàìjíríà',
    },
    title: {
      en: 'Osun State Environmental Protection and Waste Management Law',
      yo: 'Òfin Ààbò Àyíká àti Ìṣàkóso Ìdọ̀tí ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Environment & Sanitation / OWMA',
      yo: 'Iléeṣẹ́ Àyíká àti Ìmọ́tótó / Àjọ OWMA',
    },
    summary: {
      en: 'Provides the statutory mandate for flood prevention, waterway setback enforcement, solid waste disposal, industrial effluent regulation, and protection of rivers and ecological zones across Osun State.',
      yo: 'Ó gbé òfin kalẹ̀ fún dídènà omíyalé, jíjẹ́ kí ojú-àgbàrá mọ́, ìkójọpọ̀ ìdọ̀tí, àti dídáàbò bo àwọn odò àti igbó ní Ìpínlẹ̀ Ọ̀ṣun.',
    },
    provisions: {
      en: [
        'Prohibits dumping of refuse in drainage channels, rivers, and road medians.',
        'Mandates environmental impact compliance and effluent control for mining and industrial operators.',
        'Enforces statutory building setbacks along the Osun River and tributary floodplains.',
      ],
      yo: [
        'Ó fòfindè dídà ìdọ̀tí sínú ojú-àgbàrá, odò, àti ojú-ọ̀nà.',
        'Ó pàṣẹ ààbò àyíká fún àwọn ilé-iṣẹ́ àti àwọn tó ń wa ohun àlùmọ́nì inú ilẹ̀.',
        'Ó fi ààlà sí bí a ṣe lè kọ́lé súnmọ́ bèbè Odò Ọ̀ṣun láti dènà omíyalé.',
      ],
    },
  },
  {
    id: 'chiefs-law',
    category: 'law',
    sector: 'governance',
    year: 'Cap. 25',
    citation: {
      en: 'Cap. 25 • Laws of Osun State & Chieftaincy Gazettes',
      yo: 'Cap. 25 • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun & Ìwé-Ìròyìn Oyè Jíjẹ',
    },
    title: {
      en: 'Osun State Chiefs Law & Registered Chieftaincy Declarations',
      yo: 'Òfin Àwọn Ọba àti Olóyè (Chiefs Law) ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Local Government & Chieftaincy Affairs / Govt. Press',
      yo: 'Iléeṣẹ́ Ìjọba Ìbílẹ̀ àti Àlámọ̀rí Oyè Jíjẹ',
    },
    summary: {
      en: 'Governs the registration, amendment, and gazetting of Chieftaincy Declarations, selection of Ruling Houses and Kingmakers, approval of appointments of Recognised Chiefs and Traditional Rulers, and the Osun State Council of Obas.',
      yo: 'Ó ṣàkóso ìforúkọsílẹ̀ àti títẹ ìlànà oyè jíjẹ sínú Ìwé-Ìròyìn Ìjọba, yíyan ọba láti inú ìdílé ọba, àti Ìgbìmọ̀ Àwọn Ọba Aládé ní Ìpínlẹ̀ Ọ̀ṣun.',
    },
    provisions: {
      en: [
        'Requires every recognised Chieftaincy Declaration to be registered and published in the Official Gazette.',
        'Outlines the statutory role of Kingmakers (Afọbajẹ) and Local Government Chieftaincy Committees.',
        'Prohibits installation or wearing of beaded crowns without Executive Council approval and gazetting.',
      ],
      yo: [
        'Ó pàṣẹ pé kí gbogbo ìlànà ìjọba ọba wà ní àkọsílẹ̀ nínú Ìwé-Ìròyìn Ìjọba.',
        'Ó ṣàlàyé ojúṣe àwọn Afọbajẹ àti Ìgbìmọ̀ Oyè ní Ìjọba Ìbílẹ̀.',
        'Óייàn pé ìfọwọ́sí Ìgbìmọ̀ Aláṣẹ Ìpínlẹ̀ pọn dandan fún fífi ọba jẹ.',
      ],
    },
  },
  {
    id: 'lga-law',
    category: 'law',
    sector: 'governance',
    year: 'Cap. L11',
    citation: {
      en: 'Cap. L11 • Laws of Osun State of Nigeria',
      yo: 'Cap. L11 • Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun ti Nàìjíríà',
    },
    title: {
      en: 'Osun State Local Government Administration Law',
      yo: 'Òfin Ìṣàkóso Ìjọba Ìbílẹ̀ ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'House of Assembly & Ministry of Local Government',
      yo: 'Ilé Ìgbìmọ̀ Aṣòfin & Iléeṣẹ́ Ìjọba Ìbílẹ̀',
    },
    summary: {
      en: 'Provides the statutory framework for the structure, composition, legislative councils, bye-law making powers, audit accountability, and service delivery across the 30 Local Government Areas and Area Office in Osun State.',
      yo: 'Ó ṣètò ìṣàkóso, ìgbìmọ̀ aṣòfin ìbílẹ̀, agbára ṣíṣe òfin kékeré (bye-laws), àti iṣẹ́ ìdàgbàsókè ní gbogbo Ìjọba Ìbílẹ̀ 30 ní Ìpínlẹ̀ Ọ̀ṣun.',
    },
    provisions: {
      en: [
        'Empowers Local Government Legislative Councils to enact local bye-laws on markets, sanitation, and naming of streets.',
        'Requires publication of enacted Local Government Bye-Laws and audit reports.',
        'Defines the functions of the Local Government Service Commission and Auditor-General for Local Governments.',
      ],
      yo: [
        'Ó fún Ìgbìmọ̀ Aṣòfin Ìjọba Ìbílẹ̀ ní agbára láti ṣe òfin lórí ọjà, ìmọ́tótó, àti orúkọ òpópónà.',
        'Ó pàṣẹ kí a máa ṣàyẹ̀wò ìwé ìnáwó gbogbo Ìjọba Ìbílẹ̀ lọ́dọọdún.',
        'Ó ṣàlàyé ojúṣe Àjọ Oṣìṣẹ́ Ìjọba Ìbílẹ̀.',
      ],
    },
  },
  {
    id: 'startup-digital-law',
    category: 'law',
    sector: 'economy',
    year: '2025',
    citation: {
      en: 'Osun Startup & Digital Economy Law • Gazette Vol. 35',
      yo: 'Òfin Okòwò Imọ̀-Ẹ̀rọ Ọ̀ṣun • Ìwé-Ìròyìn Apá 35',
    },
    title: {
      en: 'Osun State Start-up and Digital Economy Innovation Law',
      yo: 'Òfin Ìdàgbàsókè Okòwò Tuntun àti Imọ̀-Ẹ̀rọ Ayélujára ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Innovation, Science, Technology & Digital Economy',
      yo: 'Iléeṣẹ́ Imọ̀-Ẹ̀rọ, Sáyẹ́ǹsì àti Okòwò Ayélujára',
    },
    summary: {
      en: 'Domesticates the Nigeria Startup Act in Osun State, establishing the Osun Innovation Council,Startup Seed Fund, broadband fibre right-of-way incentives, and digital skills incubation across tertiary institutions and youth hubs.',
      yo: 'Ó mú Òfin Okòwò Tuntun Nàìjíríà wọ Ìpínlẹ̀ Ọ̀ṣun, ó dá Àpò Owó Ìrànwọ́ fún àwọn ọ̀dọ́ onímọ̀-ẹ̀rọ sílẹ̀, ó sì mú ìlànà fífẹ okùn ayélujára (broadband) rọrùn.',
    },
    provisions: {
      en: [
        'Establishes the Osun State Startup Portal and Innovation Investment Fund for labelled tech startups.',
        'Simplifies broadband fibre-optic Right-of-Way (RoW) permits to accelerate statewide internet connectivity.',
        'Promotes digital public infrastructure and e-government service delivery across MDAs.',
      ],
      yo: [
        'Ó dá Ojú-òpó àti Àpò Ìrànwọ́ fún àwọn ilé-iṣẹ́ imọ̀-ẹ̀rọ tuntun sílẹ̀.',
        'Ó mú ìyọ̀ǹda fífẹ okùn ayélujára (Right-of-Way) rọrùn jákèjádò ìpínlẹ̀.',
        'Ó ṣètìlẹ́yìn fún iṣẹ́ ìjọba lórí ayélujára (e-governance).',
      ],
    },
  },
  {
    id: 'electricity-law',
    category: 'law',
    sector: 'economy',
    year: '2025',
    citation: {
      en: 'Osun State Electricity Market Law • Gazette Vol. 35',
      yo: 'Òfin Ọjà Iná Mọ̀nàmọ́ná Ọ̀ṣun • Ìwé-Ìròyìn Apá 35',
    },
    title: {
      en: 'Osun State Electricity Market and Energy Regulatory Law',
      yo: 'Òfin Ọjà Iná Mọ̀nàmọ́ná àti Àkóso Agbára ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Ministry of Energy & Osun State Electricity Regulatory Commission',
      yo: 'Iléeṣẹ́ Agbára & Àjọ Àkóso Iná Mọ̀nàmọ́ná Ìpínlẹ̀ Ọ̀ṣun',
    },
    summary: {
      en: 'Enacted pursuant to constitutional electricity devolution, establishing an intrastate electricity market, licensing independent power generation, solar mini-grids, and distribution networks to power industries and rural communities.',
      yo: 'Ó dá ọjà iná mọ̀nàmọ́ná ti Ìpínlẹ̀ Ọ̀ṣun sílẹ̀ láti fún àwọn ilé-iṣẹ́ ní ìwé-àṣẹ láti pèsè àti láti pín iná mọ̀nàmọ́ná àti iná oòrùn (solar) fún àwọn ìlú àti ilé-iṣẹ́.',
    },
    provisions: {
      en: [
        'Authorises state-level licensing for captive generation, renewable mini-grids, and intrastate distribution.',
        'Protects electricity consumers through fair tariff regulation and metering standards.',
        'Establishes the Osun State Rural Electrification and Renewable Energy Fund.',
      ],
      yo: [
        'Ó fún ìpínlẹ̀ ní agbára láti funni ní ìwé-àṣẹ ìpèsè àti ìpínkiri iná mọ̀nàmọ́ná.',
        'Ó dáàbò bo àwọn oníbàárà nípa ìlànà mítà iná àti owó iná tó tọ́.',
        'Ó ṣètìlẹ́yìn fún pípèsè iná mọ̀nàmọ́ná dé àwọn ìletò àti ìgbèríko.',
      ],
    },
  },
  {
    id: 'high-court-rules',
    category: 'regulation',
    sector: 'justice',
    year: 'O.S.L.N. Gazette',
    citation: {
      en: 'Osun State Legal Notice (O.S.L.N.) • High Court Rules',
      yo: 'Ìkéde Òfin Ìpínlẹ̀ Ọ̀ṣun (O.S.L.N.) • Ìlànà Ilé-Ẹjọ́ Gíga',
    },
    title: {
      en: 'High Court of Osun State (Civil Procedure) Rules & Practice Directions',
      yo: 'Ìlànà Ìgbẹ́jọ́ Aládàání ti Ilé-Ẹjọ́ Gíga Ìpínlẹ̀ Ọ̀ṣun',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Chief Judge of Osun State & High Court Registry, Osogbo',
      yo: 'Adájọ́ Àgbà Ìpínlẹ̀ Ọ̀ṣun & Ilé-Ẹjọ́ Gíga, Òṣogbo',
    },
    summary: {
      en: 'Subsidiary legislation and Practice Directions issued by the Chief Judge regulating civil litigation, front-loading of court processes, Pre-Trial Conferences, Multi-Door Courthouse mediation referrals, and probate administration.',
      yo: 'Àwọn ìlànà tí Adájọ́ Àgbà Ìpínlẹ̀ Ọ̀ṣun gbé kalẹ̀ fún ìgbẹ́jọ́ aládàání, lílo ètò ìlàjà (Multi-Door Courthouse), àti ìṣàkóso ogún olóògbé (Probate).',
    },
    provisions: {
      en: [
        'Mandates front-loading of witness statements on oath and documentary exhibits at filing.',
        'Encourages Alternative Dispute Resolution (ADR) through the Osun Multi-Door Courthouse.',
        'Sets timelines for summary judgment, commercial fast-track cases, and electronic service of hearing notices.',
      ],
      yo: [
        'Ó pàṣẹ fífi gbogbo ẹ̀rí àti ìwé ẹlẹ́rìí sílẹ̀ nígbà tí a bá ń pe ẹjọ́.',
        'Ó gbani nímọ̀ràn láti yanju àríyànjiyàn nípasẹ̀ Ibùdó Ìlàjà (Multi-Door Courthouse).',
        'Ó mú kí fífúnni ní ìwé àṣẹ ilé-ẹjọ́ àti ìgbẹ́jọ́ okòwò yára.',
      ],
    },
  },
  {
    id: 'eo-ease-business',
    category: 'regulation',
    sector: 'economy',
    year: '2024 / 2026',
    citation: {
      en: 'Executive Order • Office of the Governor of Osun State',
      yo: 'Àṣẹ Aláṣẹ Gómìnà • Ọ́fíìsì Gómìnà Ìpínlẹ̀ Ọ̀ṣun',
    },
    title: {
      en: 'Executive Order on Ease of Doing Business & Transparency in Service Delivery',
      yo: 'Àṣẹ Aláṣẹ Gómìnà lórí Ìrọ̀rùn Okòwò àti Iṣẹ́ Ìjọba',
    },
    status: {
      en: 'In Force',
      yo: 'Ó Wà Ní Ìlò',
    },
    custodian: {
      en: 'Office of the Governor & Ministry of Commerce and Industry',
      yo: 'Ọ́fíìsì Gómìnà & Iléeṣẹ́ Okòwò àti Ilé-Iṣẹ́',
    },
    summary: {
      en: 'Directs all Ministries, Departments, and Agencies in Osun State to publish clear fee schedules, processing timelines, and requirements for permits, Certificates of Occupancy, and business approvals.',
      yo: 'Ó pa á láṣẹ fún gbogbo iléeṣẹ́ àti àjọ ìjọba ní Ìpínlẹ̀ Ọ̀ṣun láti fi iye owó ìjọba, àkókò ìgbéjáde ìwé-àṣẹ, àti ìlànà C of O hàn ní kedere.',
    },
    provisions: {
      en: [
        'Mandates every regulatory MDA to publish its Service Level Agreement (SLA) and official fee schedule online.',
        'Establishes a rapid Certificate of Occupancy (C of O) and building permit processing workflow.',
        'Designates a One-Stop Investment Desk for domestic and international investors.',
      ],
      yo: [
        'Ó pàṣẹ kí gbogbo àjọ ìjọba fi iye owó àti àkókò ìgbéjáde ìwé-àṣẹ sínú ojú-òpó ayélujára.',
        'Ó mú kí gbígba Ìwé-ẹ̀rí Ìní Ilẹ̀ (C of O) àti ìwé-àṣẹ ìkọ́lé yára.',
        'Ó ṣètò ọ́fíìsì kan ṣoṣo fún ìrànlọ́wọ́ àwọn olùdókòwò.',
      ],
    },
  },
  {
    id: 'rural-roads-bill',
    category: 'bill',
    sector: 'environment',
    year: '2026 Session',
    citation: {
      en: 'House Bill (HB) • 8th Osun State House of Assembly',
      yo: 'Àbá Òfin (HB) • Ilé Ìgbìmọ̀ Aṣòfin Ẹlẹ́ẹ̀kẹjọ ti Ìpínlẹ̀ Ọ̀ṣun',
    },
    title: {
      en: 'Osun State Rural Access, Agricultural Marketing & Road Maintenance Bill, 2026',
      yo: 'Àbá Òfin Ọ̀nà Ìgbèríko àti Ọjà Àgbẹ̀ ti Ìpínlẹ̀ Ọ̀ṣun, 2026',
    },
    status: {
      en: 'Committee Stage / Public Hearing',
      yo: 'Ní Ìpele Ìgbìmọ̀ / Ìgbọ́rọ̀ Gbangba',
    },
    custodian: {
      en: 'Clerk, Osun State House of Assembly, Abere',
      yo: 'Akọ̀wé Àgbà, Ilé Ìgbìmọ̀ Aṣòfin Ìpínlẹ̀ Ọ̀ṣun, Abere',
    },
    summary: {
      en: 'Proposed legislation establishing a dedicated statutory framework for the construction, rehabilitation, and year-round maintenance of farm-to-market rural feeder roads across all three senatorial districts.',
      yo: 'Àbá òfin tó wà níwájú Ilé Ìgbìmọ̀ Aṣòfin láti ṣètò ìkọ́ṣe àti àbójútó àwọn ọ̀nà oko sí ọjà ní gbogbo ẹkùn sẹ́nétọ̀ mẹ́tẹ̀ẹ̀ta Ìpínlẹ̀ Ọ̀ṣun.',
    },
    provisions: {
      en: [
        'Establishes the Rural Access and Agricultural Mobility Maintenance Fund.',
        'Integrates community-based road maintenance associations across the 30 LGAs.',
        'Open for public hearing memoranda from farmers’ cooperatives, engineers, and local councils.',
      ],
      yo: [
        'Ó dá Àpò Àbójútó Ọ̀nà Ìgbèríko àti Ọjà Àgbẹ̀ sílẹ̀.',
        'Ó fi àyè gba àwọn ẹgbẹ́ àgbẹ̀ àti olùgbé láti fi ìwé ìmọ̀ràn (memorandum) sílẹ̀.',
        'Ó ṣètò àbójútó ọ̀nà ní gbogbo Ìjọba Ìbílẹ̀ 30.',
      ],
    },
  },
];

let updateLawsPageLanguage = null;

(function initLawsAndGazettes() {
  const lawsRoot = document.getElementById('laws-and-gazettes');
  if (!lawsRoot) return;

  const categoryFilter = lawsRoot.querySelector('#laws-category-filter');
  const sectorFilter = lawsRoot.querySelector('#laws-sector-filter');
  const searchInput = lawsRoot.querySelector('#laws-search-input');
  const resetFiltersBtn = lawsRoot.querySelector('#laws-reset-filters');
  const countEl = lawsRoot.querySelector('#laws-count');
  const listEl = lawsRoot.querySelector('#laws-list');
  const moreWrapEl = lawsRoot.querySelector('#laws-more-wrap');
  const moreLink = lawsRoot.querySelector('#laws-more');

  // Detail Modal Elements
  const detailModal = document.getElementById('law-detail-modal');
  const modalBadge = document.getElementById('law-modal-badge');
  const modalTitle = document.getElementById('law-modal-title');
  const modalBody = document.getElementById('law-modal-body');
  const modalCtcBtn = document.getElementById('law-modal-ctc-btn');
  const modalPrintBtn = document.getElementById('law-modal-print-btn');

  // Gazette & CTC Service Estimator Elements
  const serviceForm = lawsRoot.querySelector('#laws-service-form');
  const serviceTypeSelect = lawsRoot.querySelector('#laws-service-type');
  const applicantSelect = lawsRoot.querySelector('#laws-applicant-type');
  const targetDocSelect = lawsRoot.querySelector('#laws-target-doc');
  const copiesSelect = lawsRoot.querySelector('#laws-copies');
  const defaultPanel = lawsRoot.querySelector('#laws-service-default');
  const resultsPanel = lawsRoot.querySelector('#laws-service-results');
  const serviceStatusEl = lawsRoot.querySelector('#laws-service-status');

  const INITIAL_LAWS_LIMIT = 8;
  let showAllLaws = false;
  let activeModalLawId = null;
  let lastServiceState = null;

  const categoryBadges = {
    law: { en: 'Principal State Law', yo: 'Òfin Ìpínlẹ̀ Pàtàkì' },
    gazette: { en: 'Official Gazette', yo: 'Ìwé-Ìròyìn Ìjọba' },
    regulation: { en: 'Order / Regulation', yo: 'Àṣẹ / Ìlànà Òfin' },
    bill: { en: 'House Bill / Bye-Law', yo: 'Àbá Òfin / Òfin Ìbílẹ̀' },
  };

  const sectorLabels = {
    finance: { en: 'Tax, Budget & Procurement', yo: 'Owó-orí, Ìnáwó & Rírà' },
    justice: { en: 'Justice & Rights', yo: 'Ìdájọ́ & Ẹ̀tọ́ Ènìyàn' },
    governance: { en: 'Governance & Chieftaincy', yo: 'Ìṣàkóso & Oyè Jíjẹ' },
    social: { en: 'Health & Social Welfare', yo: 'Ìlera & Àwùjọ' },
    environment: { en: 'Land, Roads & Environment', yo: 'Ilẹ̀, Ọ̀nà & Àyíká' },
    economy: { en: 'Economy, Tech & Energy', yo: 'Ọrọ̀-Ajé, Imọ̀-Ẹ̀rọ & Agbára' },
  };

  function getLawById(id) {
    return OSUN_LAWS_DATA.find((item) => item.id === id) || OSUN_LAWS_DATA[0];
  }

  function renderLawsRepository() {
    if (!listEl) return;
    const lang = i18n.lang === 'yo' ? 'yo' : 'en';
    const catVal = categoryFilter ? categoryFilter.value : 'all';
    const secVal = sectorFilter ? sectorFilter.value : 'all';
    const query = searchInput ? normalise(searchInput.value.trim()) : '';

    const hasActiveFilter = catVal !== 'all' || secVal !== 'all' || query.length > 0;
    if (resetFiltersBtn) {
      resetFiltersBtn.hidden = !hasActiveFilter;
    }

    const filtered = OSUN_LAWS_DATA.filter((item) => {
      if (catVal !== 'all' && item.category !== catVal) return false;
      if (secVal !== 'all' && item.sector !== secVal) return false;
      if (!query) return true;
      const haystack = normalise(
        `${item.title.en} ${item.title.yo} ${item.citation.en} ${item.citation.yo} ${item.summary.en} ${item.summary.yo} ${item.custodian.en} ${item.year}`
      );
      return haystack.includes(query);
    });

    const visible = showAllLaws || hasActiveFilter ? filtered : filtered.slice(0, INITIAL_LAWS_LIMIT);

    if (countEl) {
      countEl.textContent =
        lang === 'yo'
          ? `Àfihàn àkọsílẹ̀ òfin àti ìwé-ìròyìn ìjọba ${visible.length} nínú ${filtered.length}`
          : `Showing ${visible.length} of ${filtered.length} legal instruments and official gazettes`;
    }

    if (moreWrapEl) {
      moreWrapEl.hidden = showAllLaws || hasActiveFilter || filtered.length <= INITIAL_LAWS_LIMIT;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="birth-lga-empty">
          <p>${
            lang === 'yo'
              ? 'Kò sí òfin tàbí ìwé-ìròyìn ìjọba tó bá ohun tí o wá mu. Gbìyànjú ọ̀rọ̀ mìíràn tàbí pa àṣàyàn rẹ́.'
              : 'No State Law, Official Gazette, or Bill matched your filter. Try another search term or clear the filters.'
          }</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = visible
      .map((item) => {
        const catBadge = categoryBadges[item.category][lang] || categoryBadges[item.category].en;
        const secBadge = sectorLabels[item.sector][lang] || sectorLabels[item.sector].en;
        return `
          <article class="law-card law-card--${item.category}">
            <div>
              <div class="law-card__badges">
                <span class="law-badge law-badge--${item.category}">${catBadge}</span>
                <span class="law-badge law-badge--sector">${secBadge}</span>
              </div>
              <p class="law-card__citation">${item.citation[lang] || item.citation.en}</p>
              <h3 class="law-card__title">${item.title[lang] || item.title.en}</h3>
              <p class="law-card__summary">${item.summary[lang] || item.summary.en}</p>
            </div>
            <div>
              <dl class="law-card__meta">
                <div>
                  <dt>${lang === 'yo' ? 'Ipò Òfin' : 'Status / Year'}</dt>
                  <dd>${item.status[lang] || item.status.en} (${item.year})</dd>
                </div>
                <div>
                  <dt>${lang === 'yo' ? 'Àjọ Aláṣẹ' : 'Custodian'}</dt>
                  <dd>${item.custodian[lang] || item.custodian.en}</dd>
                </div>
              </dl>
              <div class="law-card__actions">
                <button type="button" class="btn btn--outline btn--sm" data-view-law="${item.id}">
                  ${lang === 'yo' ? 'Wo àkópọ̀ & ìtọ́kasí' : 'View summary & citation'}
                </button>
                <button type="button" class="btn btn--primary btn--sm" data-request-ctc="${item.id}">
                  ${lang === 'yo' ? 'Béèrè fún CTC' : 'Request CTC'}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function openLawModal(lawId) {
    const item = getLawById(lawId);
    if (!item || !detailModal) return;
    activeModalLawId = item.id;
    const lang = i18n.lang === 'yo' ? 'yo' : 'en';
    const catBadge = categoryBadges[item.category][lang] || categoryBadges[item.category].en;

    if (modalBadge) modalBadge.textContent = `${catBadge} • ${item.year}`;
    if (modalTitle) modalTitle.textContent = item.title[lang] || item.title.en;

    const provisions = item.provisions[lang] || item.provisions.en;
    const provisionsHtml = provisions.map((p) => `<li>${p}</li>`).join('');

    if (modalBody) {
      modalBody.innerHTML = `
        <div class="law-citation-box">
          <strong>${lang === 'yo' ? 'Ìtọ́kasí Aláṣẹ (Official Citation):' : 'Official Citation & Reference:'}</strong>
          <span>${item.citation[lang] || item.citation.en} (${item.status[lang] || item.status.en})</span>
        </div>
        <p>${item.summary[lang] || item.summary.en}</p>
        <h3 class="birth-subheading" style="margin-top:1rem;">${
          lang === 'yo' ? 'Àwọn Kókó Pàtàkì Nínú Òfin Yìí:' : 'Key Statutory Provisions & Highlights:'
        }</h3>
        <ul class="law-provisions-list">
          ${provisionsHtml}
        </ul>
        <div class="birth-lga-callout" style="margin-bottom:0;">
          <strong>${lang === 'yo' ? 'Àjọ Tó Ń Tọ́jú Ẹ̀dà Aláṣẹ:' : 'Statutory Custodian & Issuing Authority:'}</strong>
          <p>${item.custodian[lang] || item.custodian.en}</p>
        </div>
      `;
    }

    if (typeof detailModal.showModal === 'function') {
      detailModal.showModal();
    } else {
      detailModal.setAttribute('open', '');
    }
  }

  if (detailModal) {
    const closeBtn = detailModal.querySelector('[data-close-law-modal]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (typeof detailModal.close === 'function') detailModal.close();
        else detailModal.removeAttribute('open');
      });
    }
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) {
        if (typeof detailModal.close === 'function') detailModal.close();
        else detailModal.removeAttribute('open');
      }
    });
  }

  if (modalPrintBtn) {
    modalPrintBtn.addEventListener('click', () => window.print());
  }

  function selectLawForCtc(lawId) {
    if (serviceTypeSelect) serviceTypeSelect.value = 'ctc';
    if (targetDocSelect) {
      const hasOption = Array.from(targetDocSelect.options).some((opt) => opt.value === lawId);
      targetDocSelect.value = hasOption ? lawId : 'custom-gazette';
    }
    lastServiceState = getCurrentServiceState();
    renderServiceEstimate(lastServiceState);
    const serviceSection = document.getElementById('gazette-services');
    if (serviceSection) serviceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (modalCtcBtn) {
    modalCtcBtn.addEventListener('click', () => {
      if (detailModal) {
        if (typeof detailModal.close === 'function') detailModal.close();
        else detailModal.removeAttribute('open');
      }
      if (activeModalLawId) selectLawForCtc(activeModalLawId);
    });
  }

  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('[data-view-law]');
      if (viewBtn) {
        openLawModal(viewBtn.dataset.viewLaw);
        return;
      }
      const ctcBtn = e.target.closest('[data-request-ctc]');
      if (ctcBtn) {
        selectLawForCtc(ctcBtn.dataset.requestCtc);
      }
    });
  }

  if (categoryFilter) categoryFilter.addEventListener('change', renderLawsRepository);
  if (sectorFilter) sectorFilter.addEventListener('change', renderLawsRepository);
  if (searchInput) searchInput.addEventListener('input', renderLawsRepository);

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (categoryFilter) categoryFilter.value = 'all';
      if (sectorFilter) sectorFilter.value = 'all';
      if (searchInput) searchInput.value = '';
      renderLawsRepository();
    });
  }

  if (moreLink) {
    moreLink.addEventListener('click', (e) => {
      e.preventDefault();
      showAllLaws = true;
      renderLawsRepository();
    });
  }

  // Quick category filter links ([data-select-category])
  lawsRoot.querySelectorAll('[data-select-category]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetCat = link.dataset.selectCategory;
      if (categoryFilter && targetCat) {
        categoryFilter.value = targetCat;
        if (sectorFilter) sectorFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        renderLawsRepository();
        const explorerEl = document.getElementById('laws-explorer');
        if (explorerEl) explorerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Gazette & CTC Service Estimator Logic
  function getCurrentServiceState() {
    return {
      serviceType: serviceTypeSelect ? serviceTypeSelect.value : 'ctc',
      applicantType: applicantSelect ? applicantSelect.value : 'individual',
      targetDoc: targetDocSelect ? targetDocSelect.value : 'acjl',
      copies: copiesSelect ? Math.max(1, parseInt(copiesSelect.value, 10) || 1) : 1,
    };
  }

  function buildServiceEstimate(state) {
    const lang = i18n.lang === 'yo' ? 'yo' : 'en';
    const isMda = state.applicantType === 'mda';
    const lawItem = OSUN_LAWS_DATA.find((item) => item.id === state.targetDoc);
    const docLabel = lawItem
      ? lawItem.title[lang] || lawItem.title.en
      : lang === 'yo'
        ? 'Ìwé-Ìròyìn Ìjọba / Ìkéde Lábẹ́ Òfin Pàtó'
        : 'Specified Official Gazette Volume / Statutory Notice';

    let serviceHeading = '';
    let unitFee = 0;
    let revenueCode = '';
    let turnaround = '';
    let issuingOffice = '';
    const checklist = [];

    if (state.serviceType === 'ctc') {
      serviceHeading =
        lang === 'yo'
          ? 'Ẹ̀dà Òtítọ́ Tí A Fọwọ́ Sí (Certified True Copy — CTC)'
          : 'Certified True Copy (CTC) of State Law / Official Gazette';
      unitFee = isMda ? 0 : 5000;
      revenueCode = '4020081 (Ministry of Justice / Gazette Certification Fee)';
      turnaround =
        lang === 'yo'
          ? 'Ọjọ́ iṣẹ́ 2 – 3 lẹ́yìn ìfìdí-ẹ̀rí ìsanwó múlẹ̀'
          : '2 – 3 working days after payment verification';
      issuingOffice =
        lang === 'yo'
          ? 'Ẹ̀ka Àtúnṣe Òfin (Directorate of Law Review), Iléeṣẹ́ Ìdájọ́, Sẹkiteriati Ìpínlẹ̀, Abere, Òṣogbo'
          : 'Directorate of Law Review & Legislative Drafting, Ministry of Justice, State Secretariat, Abere, Osogbo';
      checklist.push(
        lang === 'yo'
          ? `Ìwé ìbéèrè fún Ẹ̀dà Òtítọ́ (CTC) tó tọ́ka sí: ${docLabel}`
          : `Written application letter requesting CTC and citing: ${docLabel}`
      );
      checklist.push(
        isMda
          ? lang === 'yo'
            ? 'Ìwé aláṣẹ láti ọwọ́ Akọ̀wé Àgbà (Permanent Secretary) tàbí Olórí Àjọ Ìjọba'
            : 'Official request on MDA letterhead signed by the Permanent Secretary or Head of Agency (Statutory fee waived)'
          : lang === 'yo'
            ? 'Ẹ̀dà ẹ̀rí ìsanwó OsunIRS (IPN Treasury Receipt) fún owó ìfọwọ́sí CTC'
            : 'Verified OsunIRS Treasury Payment Receipt (IPN) for CTC certification fee'
      );
      checklist.push(
        state.applicantType === 'lawyer'
          ? lang === 'yo'
            ? 'Ìdánimọ̀ Agbẹjọ́rò (NBA Stamp / Call to Bar ID) àti nọ́mbà ẹjọ́ (bí ó bá wà fún ilé-ẹjọ́)'
            : 'Legal Practitioner identification / NBA seal and suit reference number (if required for court proceedings)'
          : lang === 'yo'
            ? 'Káàdì ìdánimọ̀ olùbéèrè (NIN, Páàsípọ́ọ̀tì, tàbí Káàdì Ìdìbò)'
            : 'Valid government-issued identification (NIN slip, International Passport, or Voter’s Card)'
      );
    } else if (state.serviceType === 'notice-name') {
      serviceHeading =
        lang === 'yo'
          ? 'Ìkéde Àyípadà Orúkọ Nínú Ìwé-Ìròyìn Ìjọba (Official Gazette)'
          : 'Official Gazette Publication — Change of Name / Personal Notice';
      unitFee = 7500;
      revenueCode = '4020094 (Government Press Official Gazette Publication)';
      turnaround =
        lang === 'yo'
          ? 'Ọjọ́ iṣẹ́ 5 – 10 (Nínú ìtẹ̀jáde Ìwé-Ìròyìn Ìjọba tó kàn)'
          : '5 – 10 working days (Published in next Official Gazette issue)';
      issuingOffice =
        lang === 'yo'
          ? 'Ọ́fíìsì Alátẹ̀wé Ìjọba (Government Printer), Ilé-Ìtẹ̀wé Ìjọba Ìpínlẹ̀ Ọ̀ṣun, Old Secretariat, Òṣogbo'
          : 'Office of the Government Printer, Osun State Government Press, Old Secretariat, Osogbo';
      checklist.push(
        lang === 'yo'
          ? 'Ìwé Ìbúra Àyípadà Orúkọ (Sworn Affidavit of Change of Name) láti Ilé-Ẹjọ́ Gíga tàbí Magistrate'
          : 'Original Sworn Affidavit of Change of Name or Correction of Particulars from a High Court or Magistrate Court'
      );
      checklist.push(
        lang === 'yo'
          ? 'Ẹ̀dà ìkéde ìwé-ìròyìn ojoojúmọ́ (Newspaper Publication cutting) tó fi orúkọ àtijọ́ àti orúkọ tuntun hàn'
          : 'Copy of national newspaper publication showing the former name and newly adopted name'
      );
      checklist.push(
        lang === 'yo'
          ? 'Nọ́mbà Ìdánimọ̀ Orílẹ̀-èdè (NIN) àti fọ́tò páàsípọ́ọ̀tì méjì ti olùbéèrè'
          : 'Applicant’s 11-digit National Identification Number (NIN) slip and two recent passport photographs'
      );
      checklist.push(
        lang === 'yo'
          ? 'Ẹ̀dà ẹ̀rí ìsanwó OsunIRS (IPN Receipt) fún ìtẹ̀jáde Ìwé-Ìròyìn Ìjọba'
          : 'Verified OsunIRS Treasury Payment Receipt (IPN) for Official Gazette Notice'
      );
    } else if (state.serviceType === 'notice-statutory') {
      serviceHeading =
        lang === 'yo'
          ? 'Ìkéde Ilẹ̀, Oyè Jíjẹ, Ilé-Iṣẹ́ tàbí Òfin Nínú Ìwé-Ìròyìn Ìjọba'
          : 'Official Gazette Publication — Statutory, Land, Chieftaincy or Corporate Notice';
      unitFee = isMda ? 0 : 25000;
      revenueCode = '4020095 (Statutory & Legal Notice Gazette Publication)';
      turnaround =
        lang === 'yo'
          ? 'Ọjọ́ iṣẹ́ 5 – 14 lẹ́yìn àyẹ̀wò Iléeṣẹ́ Ìdájọ́'
          : '5 – 14 working days after Ministry of Justice legal vetting';
      issuingOffice =
        lang === 'yo'
          ? 'Iléeṣẹ́ Ìdájọ́ (Abere) & Ilé-Ìtẹ̀wé Ìjọba Ìpínlẹ̀ Ọ̀ṣun (Old Secretariat, Òṣogbo)'
          : 'Ministry of Justice (Abere) & Osun State Government Press (Old Secretariat, Osogbo)';
      checklist.push(
        lang === 'yo'
          ? 'Ẹ̀dà ìkéde lábẹ́ òfin tí agbẹjọ́rò tàbí olórí àjọ fọwọ́ sí (ní ẹ̀dà ìwé àti ẹ̀dà kọ̀ǹpútà)'
          : 'Authenticated draft of the Statutory, Land, Chieftaincy, or Corporate Notice (hard copy and editable digital copy)'
      );
      checklist.push(
        lang === 'yo'
          ? 'Ìwé ìfọwọ́sí láti iléeṣẹ́ ìjọba tó kàn (b.a. Iléeṣẹ́ Ilẹ̀, Iléeṣẹ́ Oyè Jíjẹ, tàbí CAC)'
          : 'Supporting clearance or enabling instrument from the supervising authority (e.g. Ministry of Lands, Chieftaincy Affairs, or CAC)'
      );
      checklist.push(
        isMda
          ? lang === 'yo'
            ? 'Ìwé àṣẹ ìtẹ̀jáde láti ọ́fíìsì Akọ̀wé Ìjọba Ìpínlẹ̀ (SSG) tàbí Agbẹjọ́rò Àgbà (Attorney-General)'
            : 'Authorisation memo from the Office of the Secretary to the State Government (SSG) or Attorney-General'
          : lang === 'yo'
            ? 'Ẹ̀dà ẹ̀rí ìsanwó OsunIRS (IPN Receipt) fún ìkéde lábẹ́ òfin'
            : 'Verified OsunIRS Treasury Payment Receipt (IPN) for Statutory Gazette Publication'
      );
    } else {
      serviceHeading =
        lang === 'yo'
          ? 'Rírà Àpapọ̀ Ìwé Àwọn Òfin Ìpínlẹ̀ Ọ̀ṣun (Revised Edition Volumes)'
          : 'Purchase of Printed Volumes — Revised Laws of Osun State';
      unitFee = 120000;
      revenueCode = '4020085 (Sale of Revised Laws of Osun State)';
      turnaround =
        lang === 'yo'
          ? 'Ọjọ́ iṣẹ́ 1 – 2 ní Iléeṣẹ́ Ìdájọ́ lẹ́yìn ìsanwó'
          : '1 – 2 working days collection at Ministry of Justice upon payment confirmation';
      issuingOffice =
        lang === 'yo'
          ? 'Ilé-Ìkàwé Òfin & Ẹ̀ka Àtúnṣe Òfin, Iléeṣẹ́ Ìdájọ́, Sẹkiteriati Ìpínlẹ̀, Abere, Òṣogbo'
          : 'Law Library & Directorate of Law Review, Ministry of Justice, State Secretariat, Abere, Osogbo';
      checklist.push(
        lang === 'yo'
          ? 'Ẹ̀dà ẹ̀rí ìsanwó OsunIRS (IPN Receipt) fún iye àpapọ̀ ìwé òfin tí o fẹ́ rà'
          : 'Verified OsunIRS Treasury Payment Receipt (IPN) for the requested number of bound sets'
      );
      checklist.push(
        lang === 'yo'
          ? 'Ìwé ìbéèrè láti ọwọ́ ilé-iṣẹ́ agbẹjọ́rò, ilé-ẹ̀kọ́, tàbí olùrà pẹ̀lú ìdánimọ̀'
          : 'Official collection letter or valid identification of the purchaser / law library representative'
      );
    }

    const totalFee = unitFee * state.copies;
    const formattedTotal =
      totalFee === 0
        ? lang === 'yo'
          ? 'Ọ̀fẹ́ fún Àjọ Ìjọba (₦0)'
          : 'Free for Official MDA Use (₦0)'
        : '₦' + totalFee.toLocaleString('en-NG');

    return {
      lang,
      serviceHeading,
      docLabel,
      copies: state.copies,
      unitFee,
      totalFee,
      formattedTotal,
      revenueCode,
      turnaround,
      issuingOffice,
      checklist,
    };
  }

  function renderServiceEstimate(state) {
    if (!resultsPanel) return;
    const data = buildServiceEstimate(state);
    const {
      lang,
      serviceHeading,
      docLabel,
      copies,
      formattedTotal,
      revenueCode,
      turnaround,
      issuingOffice,
      checklist,
    } = data;

    const checklistHtml = checklist
      .map(
        (item) => `
        <li class="birth-checklist__item">
          <svg class="birth-checklist__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span>${item}</span>
        </li>
      `
      )
      .join('');

    resultsPanel.innerHTML = `
      <div class="birth-results-header">
        <h3 class="tax-results__title">${
          lang === 'yo' ? 'Ìṣírò Owó Ìjọba & Àkójọ Ohun Tí O Nílò' : 'Your Statutory Fee & Application Checklist'
        }</h3>
        <button type="button" class="btn btn--outline btn--sm" data-print-checklist>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="display:inline-block; vertical-align:middle; margin-right:5px;"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
          ${lang === 'yo' ? 'Tẹ̀ Àkójọ Yìí' : 'Print checklist'}
        </button>
      </div>

      <div class="tax-summary-box">
        <div class="tax-summary-box__label">${serviceHeading}</div>
        <div class="tax-summary-box__amount">${formattedTotal}</div>
        <p class="tax-summary-box__sub"><strong>${
          lang === 'yo' ? 'Ìwé / Òfin Tí A Yàn:' : 'Selected Instrument:'
        }</strong> ${docLabel} (${copies} ${
          copies > 1 ? (lang === 'yo' ? 'ẹ̀dà' : 'copies/sets') : lang === 'yo' ? 'ẹ̀dà kan' : 'copy/set'
        })</p>
      </div>

      <dl class="tax-stat-grid">
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Àkókò Ìgbéjáde' : 'Processing Turnaround'}</dt>
          <dd style="font-size:0.95rem;">${turnaround}</dd>
        </div>
        <div class="tax-stat-card">
          <dt>${lang === 'yo' ? 'Kóòdù Owó-wíwọlé OsunIRS' : 'OsunIRS Revenue Head'}</dt>
          <dd style="font-size:0.9rem;">${revenueCode}</dd>
        </div>
      </dl>

      <h4 class="birth-subheading">${
        lang === 'yo' ? 'Àwọn Ìwé Tí O Gbọdọ̀ Mú Wá' : 'Required Documents & Steps'
      }</h4>
      <ul class="birth-checklist">
        ${checklistHtml}
      </ul>

      <div class="birth-lga-callout">
        <strong>${lang === 'yo' ? 'Ọ́fíìsì Ìgbàwé & Ìfọwọ́sí:' : 'Submission & Collection Office:'}</strong>
        <p>${issuingOffice}</p>
      </div>

      <div class="tax-cta-box">
        <p>${
          lang === 'yo'
            ? 'Pèsè nọ́mbà ìsanwó IPN lórí ojú-òpó OsunIRS kí o tó mú àwọn ìwé rẹ lọ sí ọ́fíìsì tó wà lókè yìí.'
            : 'Generate an Invoice Payment Number (IPN) via the OsunIRS portal before presenting your documents at the office above.'
        }</p>
        <a class="btn btn--primary" href="../taxes/pay-your-taxes.html">
          ${lang === 'yo' ? 'Lọ sí Ojú-ìwé Ìsanwó OsunIRS' : 'Pay Gazette / CTC Fee via OsunIRS'}
        </a>
      </div>
    `;

    const printBtnEl = resultsPanel.querySelector('[data-print-checklist]');
    if (printBtnEl) {
      printBtnEl.addEventListener('click', () => window.print());
    }

    if (defaultPanel) defaultPanel.hidden = true;
    resultsPanel.hidden = false;

    if (serviceStatusEl) {
      serviceStatusEl.textContent =
        lang === 'yo'
          ? `Ìṣírò owó ìjọba fún ${serviceHeading}: ${formattedTotal}.`
          : `Generated statutory fee estimate for ${serviceHeading}: ${formattedTotal}.`;
    }
  }

  [serviceTypeSelect, applicantSelect, targetDocSelect, copiesSelect].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener('change', () => {
      if (lastServiceState) {
        lastServiceState = getCurrentServiceState();
        renderServiceEstimate(lastServiceState);
      }
    });
  });

  if (serviceForm) {
    serviceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      lastServiceState = getCurrentServiceState();
      renderServiceEstimate(lastServiceState);
    });

    serviceForm.addEventListener('reset', () => {
      lastServiceState = null;
      if (resultsPanel) {
        resultsPanel.hidden = true;
        resultsPanel.innerHTML = '';
      }
      if (defaultPanel) defaultPanel.hidden = false;
      if (serviceStatusEl) serviceStatusEl.textContent = '';
    });
  }

  updateLawsPageLanguage = () => {
    renderLawsRepository();
    if (lastServiceState) {
      renderServiceEstimate(lastServiceState);
    }
    if (detailModal && detailModal.hasAttribute('open') && activeModalLawId) {
      openLawModal(activeModalLawId);
    }
  };

  renderLawsRepository();
})();

/* ---------------------------------------------------------
   Jobs and careers page
   --------------------------------------------------------- */
const OSUN_JOBS_DATA = [
  {
    id: 'OSG/2026/001',
    title: { en: 'Registered Nurse / Midwife', yo: 'Nọ́ọ̀sì Tí A Forúkọ Sílẹ̀ / Agbẹ̀bí' },
    dept: { en: 'Osun State Hospitals Management Board', yo: 'Ìgbìmọ̀ Ìṣàkóso Àwọn Ilé-ìwòsàn Ìpínlẹ̀ Ọ̀ṣun' },
    field: 'health',
    type: 'permanent',
    location: 'Osogbo',
    closes: '2026-11-20',
    summary: {
      en: 'Provide nursing and maternal care in state secondary hospitals, including ward duty, immunisation and antenatal clinics.',
      yo: 'Pèsè ìtọ́jú nọ́ọ̀sì àti ìtọ́jú ìyá tó ń bímọ ní àwọn ilé-ìwòsàn ìpínlẹ̀, pẹ̀lú iṣẹ́ ẹgbẹ́ aláìsàn, abẹ́rẹ́ ìdènà àti ilé-ìtọ́jú oyún.',
    },
    requirements: {
      en: ['RN/RM certificate from an accredited school of nursing', 'Valid Nursing and Midwifery Council of Nigeria licence', 'Not more than 40 years of age'],
      yo: ['Ìwé-ẹ̀rí RN/RM láti ilé-ẹ̀kọ́ nọ́ọ̀sì tí a mọ̀', 'Ìwé-àṣẹ Nursing and Midwifery Council of Nigeria tó wà ní ìlò', 'Kí ó má ju ọmọ ọdún 40 lọ'],
    },
  },
  {
    id: 'OSG/2026/002',
    title: { en: 'Primary School Teacher (Mathematics and English)', yo: 'Olùkọ́ Ilé-ìwé Alákọ̀ọ́bẹ̀rẹ̀ (Ìṣirò àti Èdè Gẹ̀ẹ́sì)' },
    dept: { en: 'State Universal Basic Education Board (SUBEB)', yo: 'Ìgbìmọ̀ Ẹ̀kọ́ Ìpìlẹ̀ Fún Gbogbo Ènìyàn (SUBEB)' },
    field: 'education',
    type: 'permanent',
    location: 'Ede',
    closes: '2026-11-27',
    summary: {
      en: 'Teach Mathematics and English to pupils in public primary schools and take part in school assessments and community activities.',
      yo: 'Kọ́ àwọn ọmọ ilé-ìwé alákọ̀ọ́bẹ̀rẹ̀ ìjọba ní Ìṣirò àti Èdè Gẹ̀ẹ́sì, kí o sì kópa nínú ìdánwò ilé-ìwé àti iṣẹ́ àdúgbò.',
    },
    requirements: {
      en: ['NCE or B.Ed in Education or a related subject', 'Teachers Registration Council of Nigeria (TRCN) registration', 'Willingness to serve in a rural school'],
      yo: ['NCE tàbí B.Ed nínú Ẹ̀kọ́ tàbí ẹ̀kọ́ tó jọ mọ́ ọn', 'Ìforúkọsílẹ̀ pẹ̀lú Teachers Registration Council of Nigeria (TRCN)', 'Ìfẹ́ láti sìn ní ilé-ìwé ìgbèríko'],
    },
  },
  {
    id: 'OSG/2026/003',
    title: { en: 'Civil Engineer (Roads)', yo: 'Onímọ̀-ẹ̀rọ Ìkọ́lé (Ọ̀nà)' },
    dept: { en: 'Ministry of Works and Transport', yo: 'Iléeṣẹ́ Iṣẹ́ Ọwọ́ àti Ìrìnnà' },
    field: 'engineering',
    type: 'contract',
    location: 'Osogbo',
    closes: '2026-11-14',
    summary: {
      en: 'Design, supervise and inspect rural and urban road projects for a 24-month contract, reporting to the Director of Roads.',
      yo: 'Ṣe àwòrán, ṣe àbójútó àti yẹ iṣẹ́ ọ̀nà ìgbèríko àti ìlú wò fún àdéhùn oṣù mẹ́rìnlélógún, kí o sì jábọ̀ fún Alákòóso Ọ̀nà.',
    },
    requirements: {
      en: ['B.Eng or HND in Civil Engineering', 'COREN registration', 'At least 3 years of road construction experience'],
      yo: ['B.Eng tàbí HND nínú Ìmọ̀-ẹ̀rọ Ìkọ́lé', 'Ìforúkọsílẹ̀ COREN', 'Ó kéré tán ọdún mẹ́ta ìrírí nínú kíkọ́ ọ̀nà'],
    },
  },
  {
    id: 'OSG/2026/004',
    title: { en: 'Land Surveyor', yo: 'Onímọ̀ Ìwọ̀n Ilẹ̀' },
    dept: { en: 'Ministry of Lands, Physical Planning and Urban Development', yo: 'Iléeṣẹ́ Ilẹ̀, Ìgbékalẹ̀ Ìlú àti Ìdàgbàsókè Ìlú' },
    field: 'engineering',
    type: 'permanent',
    location: 'Ile-Ife',
    closes: '2026-12-04',
    summary: {
      en: 'Carry out cadastral and topographic surveys, prepare survey plans and support the state land registration programme.',
      yo: 'Ṣe ìwọ̀n ilẹ̀ àti àwòrán ilẹ̀, pèsè àwòrán ìwọ̀n ilẹ̀ kí o sì ṣe àtìlẹ́yìn fún ètò ìforúkọsílẹ̀ ilẹ̀ ìpínlẹ̀.',
    },
    requirements: {
      en: ['HND or B.Sc in Surveying and Geoinformatics', 'SURCON registration', 'Proficiency in GIS and total station equipment'],
      yo: ['HND tàbí B.Sc nínú Surveying and Geoinformatics', 'Ìforúkọsílẹ̀ SURCON', 'Ìmọ̀ GIS àti ohun èlò total station'],
    },
  },
  {
    id: 'OSG/2026/005',
    title: { en: 'Revenue Officer', yo: 'Òṣìṣẹ́ Owó-Orí' },
    dept: { en: 'Osun State Internal Revenue Service', yo: 'Iléeṣẹ́ Owó-Orí Ìpínlẹ̀ Ọ̀ṣun' },
    field: 'admin',
    type: 'permanent',
    location: 'Ilesa',
    closes: '2026-11-30',
    summary: {
      en: 'Assess and collect state revenue, assist taxpayers and keep accurate records in a zonal revenue office.',
      yo: 'Díwọ̀n kí o sì gba owó-orí ìpínlẹ̀, ran àwọn agbowó-orí lọ́wọ́ kí o sì tọ́jú àkọsílẹ̀ tó péye ní ọ́fíìsì owó-orí agbègbè.',
    },
    requirements: {
      en: ['B.Sc or HND in Accounting, Economics or Business Administration', 'Knowledge of Nigerian tax law', 'Good communication skills'],
      yo: ['B.Sc tàbí HND nínú Ìṣirò-owó, Ọrọ̀-Ajé tàbí Ìṣàkóso Okòwò', 'Ìmọ̀ òfin owó-orí Nàìjíríà', 'Agbára ìbánisọ̀rọ̀ tó dára'],
    },
  },
  {
    id: 'OSG/2026/006',
    title: { en: 'Agricultural Extension Officer', yo: 'Òṣìṣẹ́ Ìmọ̀ràn Ọ̀gbìn' },
    dept: { en: 'Ministry of Agriculture', yo: 'Iléeṣẹ́ Ọ̀gbìn' },
    field: 'agriculture',
    type: 'permanent',
    location: 'Iwo',
    closes: '2026-12-11',
    summary: {
      en: 'Advise farmers on crop and livestock practices, run demonstration plots and link smallholders to inputs and markets.',
      yo: 'Gba àwọn àgbẹ̀ nímọ̀ràn lórí ọ̀gbìn àti ẹran-ọ̀sìn, ṣe ìfihàn oko kí o sì so àwọn àgbẹ̀ kéékèèké mọ́ ohun èlò àti ọjà.',
    },
    requirements: {
      en: ['B.Agric, B.Sc or HND in Agriculture', 'Ability to ride a motorcycle', 'Fluency in Yorùbá'],
      yo: ['B.Agric, B.Sc tàbí HND nínú Ọ̀gbìn', 'Agbára láti wa alùpùpù', 'Ìjáfáfá nínú èdè Yorùbá'],
    },
  },
  {
    id: 'OSG/2026/007',
    title: { en: 'Software Developer (e-Government)', yo: 'Olùdàgbàsókè Sọ́fítíwia (e-Government)' },
    dept: { en: 'Ministry of Communication and Digital Economy', yo: 'Iléeṣẹ́ Ìbánisọ̀rọ̀ àti Ọrọ̀-Ajé Ayélujára' },
    field: 'ict',
    type: 'contract',
    location: 'Osogbo',
    closes: '2026-11-18',
    summary: {
      en: 'Build and maintain accessible online services for residents, working with a small team on a 12-month contract.',
      yo: 'Kọ́ kí o sì tọ́jú àwọn iṣẹ́ orí ayélujára tí gbogbo ènìyàn lè lò fún àwọn olùgbé, pẹ̀lú ẹgbẹ́ kékeré lórí àdéhùn oṣù méjìlá.',
    },
    requirements: {
      en: ['B.Sc or HND in Computer Science or a related field', '2 years of experience with HTML, CSS and JavaScript', 'Understanding of web accessibility'],
      yo: ['B.Sc tàbí HND nínú Computer Science tàbí ẹ̀kọ́ tó jọ mọ́ ọn', 'Ọdún méjì ìrírí pẹ̀lú HTML, CSS àti JavaScript', 'Òye ìrọ̀rùn wíwọlé ojú-òpó wẹ́ẹ̀bù'],
    },
  },
  {
    id: 'OSG/2026/008',
    title: { en: 'Medical Laboratory Scientist', yo: 'Onímọ̀ Ẹ̀rọ Yàrá Ìṣègùn' },
    dept: { en: 'Osun State Hospitals Management Board', yo: 'Ìgbìmọ̀ Ìṣàkóso Àwọn Ilé-ìwòsàn Ìpínlẹ̀ Ọ̀ṣun' },
    field: 'health',
    type: 'permanent',
    location: 'Ilesa',
    closes: '2026-12-02',
    summary: {
      en: 'Run diagnostic tests in the hospital laboratory, maintain equipment and ensure quality control.',
      yo: 'Ṣe àyẹ̀wò nínú yàrá ilé-ìwòsàn, tọ́jú ohun èlò kí o sì rí i pé àyẹ̀wò péye.',
    },
    requirements: {
      en: ['B.MLS or equivalent degree', 'MLSCN licence and completed internship', 'Experience with haematology and microbiology'],
      yo: ['B.MLS tàbí oyè tó dọ́gba', 'Ìwé-àṣẹ MLSCN àti ìparí ìdánrawò', 'Ìrírí nínú ẹ̀kọ́ ẹ̀jẹ̀ àti kòkòrò-àìfojúrí'],
    },
  },
  {
    id: 'OSG/2026/009',
    title: { en: 'Graduate Intern, Budget and Planning', yo: 'Akẹ́kọ̀ọ́ṣẹ́ Gboyè, Ìṣúná àti Ìgbékalẹ̀' },
    dept: { en: 'Ministry of Budget and Economic Planning', yo: 'Iléeṣẹ́ Ìṣúná àti Ètò Ọrọ̀-Ajé' },
    field: 'admin',
    type: 'internship',
    location: 'Osogbo',
    closes: '2026-11-25',
    summary: {
      en: 'Learn how the state budget is prepared by supporting data collection and analysis during a 6-month paid internship.',
      yo: 'Kọ́ bí a ṣe ń pèsè ìṣúná ìpínlẹ̀ nípa ṣíṣe àtìlẹ́yìn fún ìkójọ àti ìtúpalẹ̀ ìròyìn, nínú ìdánrawò oṣù mẹ́fà tí a ń san owó fún.',
    },
    requirements: {
      en: ['Graduated within the last 3 years', 'Degree in Economics, Statistics or Public Administration', 'Skill with spreadsheets'],
      yo: ['Parí ilé-ẹ̀kọ́ láàrin ọdún mẹ́ta sẹ́yìn', 'Oyè nínú Ọrọ̀-Ajé, Ìṣirò-Ìkànìyàn tàbí Ìṣàkóso Ìjọba', 'Ìmọ̀ lílo ìwé ìṣirò'],
    },
  },
  {
    id: 'OSG/2026/010',
    title: { en: 'NYSC Placement: Teaching Assistant', yo: 'Ìfìdíkalẹ̀ NYSC: Olùrànlọ́wọ́ Olùkọ́' },
    dept: { en: 'State Ministry of Tertiary Education', yo: 'Iléeṣẹ́ Ẹ̀kọ́ Gíga Ìpínlẹ̀' },
    field: 'education',
    type: 'internship',
    location: 'Ile-Ife',
    closes: '2026-12-15',
    summary: {
      en: 'Corps members assist lecturers with tutorials, marking and laboratory sessions at a state tertiary institution.',
      yo: 'Àwọn ọmọ ẹgbẹ́ NYSC ń ran àwọn olùkọ́ni lọ́wọ́ ní ìkẹ́kọ̀ọ́, ìṣàmì àti iṣẹ́ yàrá ní ilé-ẹ̀kọ́ gíga ìpínlẹ̀.',
    },
    requirements: {
      en: ['Valid NYSC call-up letter', 'Degree with at least Second Class Lower', 'Interest in teaching'],
      yo: ['Ìwé ìpè NYSC tó wà ní ìlò', 'Oyè pẹ̀lú Second Class Lower tó kéré jù', 'Ìfẹ́ sí ẹ̀kọ́ kíkọ́'],
    },
  },
  {
    id: 'OSG/2026/011',
    title: { en: 'Community Health Extension Worker', yo: 'Òṣìṣẹ́ Ìlera Àdúgbò' },
    dept: { en: 'Osun State Primary Health Care Development Board', yo: 'Ìgbìmọ̀ Ìdàgbàsókè Ìtọ́jú Ìlera Ìpìlẹ̀ Ìpínlẹ̀ Ọ̀ṣun' },
    field: 'health',
    type: 'contract',
    location: 'Ikirun',
    closes: '2026-11-09',
    summary: {
      en: 'Deliver outreach, immunisation and health education in primary health centres on a 12-month renewable contract.',
      yo: 'Ṣe ìbẹ̀wò àdúgbò, abẹ́rẹ́ ìdènà àti ẹ̀kọ́ ìlera ní àwọn ilé-ìtọ́jú ìlera ìpìlẹ̀ lórí àdéhùn oṣù méjìlá tí a lè tún ṣe.',
    },
    requirements: {
      en: ['CHEW diploma from an accredited school', 'CHPRBN registration', 'Residence in or near the posting'],
      yo: ['Dípílómà CHEW láti ilé-ẹ̀kọ́ tí a mọ̀', 'Ìforúkọsílẹ̀ CHPRBN', 'Gbígbé nítòsí ibi tí a ó yàn ọ́ sí'],
    },
  },
  {
    id: 'OSG/2026/012',
    title: { en: 'Accountant (Internal Audit)', yo: 'Oníṣirò-owó (Àyẹ̀wò Inú)' },
    dept: { en: 'Office of the State Auditor-General', yo: 'Ọ́fíìsì Olùṣàyẹ̀wò Àgbà Ìpínlẹ̀' },
    field: 'admin',
    type: 'permanent',
    location: 'Osogbo',
    closes: '2026-12-18',
    summary: {
      en: 'Audit ministry accounts, test financial controls and prepare reports for the State Auditor-General.',
      yo: 'Ṣàyẹ̀wò ìwé-owó àwọn iléeṣẹ́, dán ìdarí ìnáwó wò kí o sì pèsè ìròyìn fún Olùṣàyẹ̀wò Àgbà Ìpínlẹ̀.',
    },
    requirements: {
      en: ['B.Sc in Accounting and ICAN or ANAN membership', 'At least 2 years of audit experience', 'Knowledge of IPSAS'],
      yo: ['B.Sc nínú Ìṣirò-owó àti ọmọ ẹgbẹ́ ICAN tàbí ANAN', 'Ó kéré tán ọdún méjì ìrírí àyẹ̀wò', 'Ìmọ̀ IPSAS'],
    },
  },
];

let updateJobsPageLanguage = null;

(function initJobsPage() {
  const jobsRoot = document.getElementById('jobs-page');
  if (!jobsRoot) return;

  const typeFilter = jobsRoot.querySelector('#jobs-type-filter');
  const fieldFilter = jobsRoot.querySelector('#jobs-field-filter');
  const locationFilter = jobsRoot.querySelector('#jobs-location-filter');
  const searchInput = jobsRoot.querySelector('#jobs-search-input');
  const resetBtn = jobsRoot.querySelector('#jobs-reset-filters');
  const countEl = jobsRoot.querySelector('#jobs-count');
  const listEl = jobsRoot.querySelector('#jobs-list');
  const moreWrapEl = jobsRoot.querySelector('#jobs-more-wrap');
  const moreBtn = jobsRoot.querySelector('#jobs-more');

  const modal = document.getElementById('job-detail-modal');
  const modalBadge = document.getElementById('job-modal-badge');
  const modalTitle = document.getElementById('job-modal-title');
  const modalBody = document.getElementById('job-modal-body');
  const modalApplyBtn = document.getElementById('job-modal-apply-btn');
  const modalPrintBtn = document.getElementById('job-modal-print-btn');

  const INITIAL_JOBS_LIMIT = 7;
  let showAllJobs = false;
  let activeJobId = null;

  const pick = (obj) => obj[i18n.lang === 'yo' ? 'yo' : 'en'] || obj.en;
  const fill = (key, values) =>
    Object.entries(values).reduce((s, [k, v]) => s.replace(`{${k}}`, v), i18n.t(key));

  // Whole days from today to the closing date (UTC), so the result does not shift with timezone.
  function daysLeft(closes) {
    const today = new Date().toISOString().slice(0, 10);
    return Math.round((Date.parse(`${closes}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  }

  function formatDate(iso) {
    const date = new Date(`${iso}T00:00:00Z`);
    try {
      return new Intl.DateTimeFormat(i18n.lang === 'yo' ? 'yo-NG' : 'en-NG', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
    } catch (e) {
      return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
    }
  }

  function closingText(job) {
    const n = daysLeft(job.closes);
    if (n === 0) return i18n.t('jobs.closing.today');
    if (n === 1) return i18n.t('jobs.closing.tomorrow');
    return fill('jobs.closing.days', { n });
  }

  // Only vacancies that have not closed are listed, soonest closing date first.
  const openJobs = OSUN_JOBS_DATA.filter((job) => daysLeft(job.closes) >= 0).sort((a, b) =>
    a.closes.localeCompare(b.closes)
  );

  // Location options come from the data; place names are not translated.
  if (locationFilter) {
    [...new Set(openJobs.map((job) => job.location))].sort().forEach((place) => {
      const opt = document.createElement('option');
      opt.value = place;
      opt.textContent = place;
      locationFilter.append(opt);
    });
  }

  function renderJobs() {
    if (!listEl) return;
    const typeVal = typeFilter ? typeFilter.value : 'all';
    const fieldVal = fieldFilter ? fieldFilter.value : 'all';
    const placeVal = locationFilter ? locationFilter.value : 'all';
    const query = searchInput ? normalise(searchInput.value.trim()) : '';

    if (resetBtn) {
      resetBtn.hidden = typeVal === 'all' && fieldVal === 'all' && placeVal === 'all' && !query;
    }

    const filtered = openJobs.filter((job) => {
      if (typeVal !== 'all' && job.type !== typeVal) return false;
      if (fieldVal !== 'all' && job.field !== fieldVal) return false;
      if (placeVal !== 'all' && job.location !== placeVal) return false;
      if (!query) return true;
      return normalise(
        `${job.id} ${job.title.en} ${job.title.yo} ${job.dept.en} ${job.dept.yo} ${job.location} ${job.summary.en} ${job.summary.yo}`
      ).includes(query);
    });

    if (countEl) countEl.textContent = fill('jobs.count', { shown: filtered.length, total: openJobs.length });

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="birth-lga-empty"><p>${i18n.t('jobs.empty')}</p></div>`;
      return;
    }

    const visible = showAllJobs ? filtered : filtered.slice(0, INITIAL_JOBS_LIMIT);
    if (moreWrapEl) moreWrapEl.hidden = filtered.length <= visible.length;

    listEl.innerHTML = visible
      .map(
        (job) => `
          <article class="job-row job-row--${job.type}">
            <div class="job-row__main">
              <p class="law-card__citation">${job.id}</p>
              <h3 class="law-card__title">${pick(job.title)}</h3>
              <p class="job-row__meta">
                <span class="law-badge job-badge--${job.type}">${i18n.t(`jobs.type.${job.type}`)}</span>
                <span>${job.location}</span>
              </p>
            </div>
            <div class="job-row__side">
              <p class="job-row__closes"><span>${i18n.t('jobs.card.closes')}</span> ${formatDate(job.closes)}</p>
              <a href="#" class="job-row__link" data-view-job="${job.id}">${i18n.t('jobs.card.view')}</a>
            </div>
          </article>
        `
      )
      .join('');
  }

  function openJobModal(jobId) {
    const job = openJobs.find((item) => item.id === jobId);
    if (!job || !modal) return;
    activeJobId = job.id;

    modalBadge.textContent = `${i18n.t(`jobs.type.${job.type}`)} • ${job.id}`;
    modalTitle.textContent = pick(job.title);
    modalBody.innerHTML = `
      <div class="law-citation-box">
        <strong>${i18n.t('jobs.card.closes')}</strong>
        <span>${formatDate(job.closes)} (${closingText(job)})</span>
      </div>
      <p>${pick(job.summary)}</p>
      <h3 class="birth-subheading" style="margin-top:1rem;">${i18n.t('jobs.modal.requirements')}</h3>
      <ul class="law-provisions-list">${pick(job.requirements).map((r) => `<li>${r}</li>`).join('')}</ul>
      <div class="birth-lga-callout" style="margin-bottom:0;">
        <strong>${i18n.t('jobs.card.dept')} · ${i18n.t('jobs.card.location')}:</strong>
        <p>${pick(job.dept)}, ${job.location}</p>
      </div>
    `;

    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }

  function closeJobModal() {
    if (!modal) return;
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  }

  if (modal) {
    const closeBtn = modal.querySelector('[data-close-job-modal]');
    if (closeBtn) closeBtn.addEventListener('click', closeJobModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeJobModal();
    });
  }
  if (modalPrintBtn) modalPrintBtn.addEventListener('click', () => window.print());
  if (modalApplyBtn) {
    modalApplyBtn.addEventListener('click', () => {
      closeJobModal();
      const target = document.getElementById('jobs-apply');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view-job]');
      if (!btn) return;
      e.preventDefault();
      openJobModal(btn.dataset.viewJob);
    });
  }

  [typeFilter, fieldFilter, locationFilter].forEach((el) => {
    if (el) el.addEventListener('change', renderJobs);
  });
  if (searchInput) searchInput.addEventListener('input', renderJobs);
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      showAllJobs = true;
      renderJobs();
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      [typeFilter, fieldFilter, locationFilter].forEach((el) => {
        if (el) el.value = 'all';
      });
      if (searchInput) searchInput.value = '';
      renderJobs();
    });
  }

  updateJobsPageLanguage = () => {
    renderJobs();
    if (modal && modal.hasAttribute('open') && activeJobId) openJobModal(activeJobId);
  };

  renderJobs();
})();

/* ---------------------------------------------------------
   Local Government Areas page (uses OSUN_LGAS from the birth registration section)
   --------------------------------------------------------- */
let updateLgaPageLanguage = null;

(function initLgaPage() {
  const lgaRoot = document.getElementById('lga-page');
  if (!lgaRoot) return;

  const groupEls = lgaRoot.querySelectorAll('[data-lga-group]');
  const pick = (obj) => obj[i18n.lang === 'yo' ? 'yo' : 'en'] || obj.en;

  // The Ife East Area Office is not one of the 30 LGAs, so it is left out of the lists.
  function renderLgas() {
    groupEls.forEach((listEl) => {
      listEl.innerHTML = OSUN_LGAS.filter(
        (item) => item.district === listEl.dataset.lgaGroup && item.id !== 'ife-east-area'
      )
        .map(
          (item) => `
            <li class="lga-item">
              <h4 class="lga-item__title">${pick(item.name)}</h4>
              <p class="lga-item__hq"><strong>${i18n.t('lga.card.hq')}</strong> ${pick(item.hq)}</p>
            </li>
          `
        )
        .join('');
    });
  }

  updateLgaPageLanguage = renderLgas;
  renderLgas();
})();

/* ---------------------------------------------------------
   Footer year + initial language
   --------------------------------------------------------- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

i18n.init();

