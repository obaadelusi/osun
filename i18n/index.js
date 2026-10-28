/* =========================================================
   English / Yorùbá i18n
   - English source text lives in each page's HTML (data-i18n / data-i18n-attr).
   - en-yo.json holds `yo` (the Yorùbá translations, keyed by data-i18n key)
     and `en` (English strings that only exist in JS).
   - NOTE: the Yorùbá text should be reviewed by a native-speaking translator
     before launch.
   ========================================================= */

const LOCALES = { en: 'en-NG', yo: 'yo-NG' };
const STORAGE_KEY = 'osun-lang';

function parseAttrMap(el) {
  return el.dataset.i18nAttr.split('|').map((pair) => pair.split(':').map((s) => s.trim()));
}

/**
 * Loads the dictionaries and wires up the language toggle.
 * `onChange(lang)` runs after every language switch so page code can refresh
 * any text it renders itself. Call `init()` once the page is ready.
 */
export async function createI18n({ onChange } = {}) {
  const res = await fetch(new URL('./en-yo.json', import.meta.url));
  const { en: EN, yo: YO } = await res.json();
  let lang = 'en';

  const t = (key) => (lang === 'yo' && YO[key]) || EN[key] || key;

  // Capture the English source text/attributes from the markup once.
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (!(key in EN)) EN[key] = el.textContent.trim();
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    parseAttrMap(el).forEach(([attr, key]) => {
      if (!(key in EN)) EN[key] = el.getAttribute(attr) || '';
    });
  });

  function formatDates() {
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'long', timeZone: 'UTC' });
    } catch (e) {
      fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
    }
    document.querySelectorAll('time[data-date]').forEach((el) => {
      el.textContent = fmt.format(new Date(el.dataset.date + 'T00:00:00Z'));
    });
  }

  function apply(next) {
    lang = next === 'yo' ? 'yo' : 'en';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      parseAttrMap(el).forEach(([attr, key]) => el.setAttribute(attr, t(key)));
    });

    // The toggle always offers the *other* language, labelled in that language.
    const other = lang === 'yo' ? 'en' : 'yo';
    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.textContent = other === 'yo' ? 'Yorùbá' : 'English';
      btn.lang = other;
    });

    formatDates();
    if (onChange) onChange(lang);

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* storage unavailable */
    }
    const url = new URL(window.location.href);
    if (lang === 'yo') url.searchParams.set('lang', 'yo');
    else url.searchParams.delete('lang');
    history.replaceState(null, '', url);
  }

  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => apply(lang === 'yo' ? 'en' : 'yo'));
  });

  /** Applies the language from ?lang=, then localStorage, else English. */
  function init() {
    let initial = new URLSearchParams(window.location.search).get('lang');
    if (!initial) {
      try {
        initial = localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
    }
    apply(initial === 'yo' ? 'yo' : 'en');
  }

  return {
    t,
    apply,
    init,
    get lang() {
      return lang;
    },
  };
}
