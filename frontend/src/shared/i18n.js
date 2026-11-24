// Wording and formats for the card and the TV app, in the language the Home Assistant user picked (English when Alvuna
// has no translation for it). Texts live in src/i18n/<lang>.json, one tree per language with the same keys:
//   t("home.lights_on", { n: 3 })   a string with {placeholders}; an object of plural forms is picked by `n`
//                                   ({ "one": "{n} light", "other": "{n} lights" }; Polish also has "few" and "many")
//   table("weather")                a whole lookup table (condition → word, wind directions…), English as fallback
// Numbers, dates, times and money use the user's language and number/time formats (hass.locale) and HA's currency.
import en from "../i18n/en.json";
import pl from "../i18n/pl.json";

const DICTS = { en, pl };
let lang = "en", dict = en, numLocale = "en", dateLocale = "en", hour12, currency = "EUR";
const cache = new Map();
const plurals = new Map();

// language: "pl", "en-GB"…; numberFormat / timeFormat: hass.locale.number_format / time_format. True when anything changed.
const NUMBER_LOCALES = { comma_decimal: "en-US", decimal_comma: "de-DE", space_comma: "fr-FR", system: undefined };
export function setLocale({ language, numberFormat, timeFormat, currency: cur } = {}) {
  const base = String(language || "en").toLowerCase().split(/[-_]/)[0];
  const next = {
    lang: DICTS[base] ? base : "en",
    dateLocale: language || "en",
    numLocale: numberFormat in NUMBER_LOCALES ? NUMBER_LOCALES[numberFormat] : language || "en",
    hour12: timeFormat === "12" ? true : timeFormat === "24" ? false : undefined,
    currency: cur || currency,
  };
  if (next.lang === lang && next.dateLocale === dateLocale && next.numLocale === numLocale && next.hour12 === hour12
    && next.currency === currency) return false;
  ({ lang, dateLocale, numLocale, hour12, currency } = next);
  dict = DICTS[lang];
  cache.clear();
  plurals.clear();
  return true;
}

export const language = () => lang;
export const locale = () => dateLocale;

const lookup = (tree, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), tree);

export function t(key, vars) {
  let s = lookup(dict, key) ?? lookup(en, key);
  if (s == null) return key;
  if (typeof s === "object") {
    const n = Number(vars?.n ?? 0);
    let rules = plurals.get(lang);
    if (!rules) plurals.set(lang, (rules = new Intl.PluralRules(lang)));
    s = s[rules.select(n)] ?? s.other ?? "";
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? "")) : s;
}

export const table = (key) => lookup(dict, key) ?? lookup(en, key) ?? {};

// Formatters are built once per locale and options: building one is slow on weak tablets and TVs.
function formatter(kind, loc, opts) {
  const key = `${kind}|${loc}|${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) cache.set(key, (f = kind === "n" ? new Intl.NumberFormat(loc, opts) : new Intl.DateTimeFormat(loc, opts)));
  return f;
}

export const num = (v, digits = 1) => formatter("n", numLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v));
export const int = (v) => formatter("n", numLocale, { maximumFractionDigits: 0 }).format(Number(v));
export const money = (v, digits = 2) => formatter("n", numLocale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v));
// Date parts: any Intl.DateTimeFormat options; times follow the user's 12/24 h choice.
export const date = (d, opts) => formatter("d", dateLocale, opts).format(d instanceof Date ? d : new Date(d));
export const time = (d) => formatter("d", dateLocale, { hour: "2-digit", minute: "2-digit", hour12 }).format(d instanceof Date ? d : new Date(d));
