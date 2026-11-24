// The panel's own wording (the card's and the TV's live in src/i18n). Picked by the Home Assistant user's language,
// English when there is no translation. A value may be an object of plural forms, picked by {n}.

const STRINGS = {
  pl: {
    menu: "Menu",
    intro: "Alvuna sama buduje ekrany tabletu i telewizora z Twoich obszarów i urządzeń. Tu ukryjesz to, czego nie chcesz, zmienisz nazwy i kolejność, albo dodasz np. skrypt jako scenę.",
    intro_save: "Zmiany zapisują się same i od razu trafiają na tablety i telewizory.",
    sections: { rooms: "Pokoje", scenes: "Sceny", security: "Ochrona", cameras: "Kamery", media: "Media", persons: "Osoby", found: "Wykryte automatycznie" },
    notes: {
      rooms: "Pokoje to obszary Home Assistanta. Rozwiń pokój, żeby ukryć lub nazwać jego światła, rolety i nawilżacze.",
      scenes: "Sceny i skrypty uruchamiane jednym dotknięciem.",
      security: "Czujniki drzwi, okien, ruchu, dymu i zalania.",
      cameras: "Podgląd na żywo z kamer.",
      media: "Głośniki, telewizory i odtwarzacze.",
      persons: "Kto jest w domu.",
      found: "Te rzeczy Alvuna znajduje sama i pokazuje, gdy są dostępne.",
    },
    saving: "Zapisywanie…", saved: "Zapisano", save_error: "Nie zapisano", retry: "Ponów",
    add: "Dodaj", done: "Gotowe", search: "Szukaj po nazwie lub identyfikatorze", search_short: "Szukaj",
    no_candidates: "Nie ma już nic do dodania.", no_results: "Nic nie pasuje.",
    more_results: "I jeszcze {n} — zawęź wyszukiwanie.",
    add_item: "Dodaj: {name}", remove: "Usuń z listy: {name}",
    badge_added: "Dodane", badge_hidden: "Ukryte", badge_missing: "Brak w Home Assistant",
    visible: "Pokazuj: {name}", move_up: "Przesuń wyżej: {name}", move_down: "Przesuń niżej: {name}",
    rename: "Nazwa: {name}", rename_hint: "Kliknij, aby zmienić nazwę", auto_name: "automatycznie: {name}",
    reset_name: "Przywróć nazwę automatyczną",
    empty: "Alvuna nic tu nie znalazła. Możesz dodać coś sama.", empty_rooms: "Brak obszarów z urządzeniami.",
    area: "obszar {id}",
    devices: { zero: "bez urządzeń", one: "{n} urządzenie", few: "{n} urządzenia", many: "{n} urządzeń", other: "{n} urządzenia" },
    expand: "Pokaż urządzenia: {name}", collapse: "Zwiń urządzenia: {name}",
    kinds: { lights: "Światło", covers: "Roleta", humidifiers: "Nawilżacz" },
    no_devices: "W tym pokoju nie ma świateł, rolet ani nawilżaczy.",
    temperature: "Temperatura", humidity: "Wilgotność", sensor_none: "nie wybrano",
    sensor_area: "z ustawień obszaru", sensor_auto: "dobrany automatycznie",
    sensor_hint: "Czujniki pokoju ustawisz w Home Assistant, w ustawieniach obszaru.", area_settings: "Ustawienia obszaru",
    found: { weather: "Pogoda", climate: "Ogrzewanie", vacuum: "Odkurzacz", appliances: "Pralka i zmywarka", waste: "Wywóz odpadów",
      air_quality: "Jakość powietrza", weather_alert: "Ostrzeżenia pogodowe" },
    air: { index: "indeks", pm10: "PM10", pm25: "PM2,5" }, battery: "bateria",
    nothing_found: "Nic więcej nie wykryto.",
    loading: "Wczytywanie…",
    not_set_up: "Alvuna nie jest jeszcze skonfigurowana.",
    not_set_up_hint: "Dodaj integrację Alvuna w Ustawienia → Urządzenia i usługi, a ten panel pokaże Twój dom.",
    open_integrations: "Otwórz integrację",
    load_error: "Nie udało się wczytać ustawień Alvuny.", try_again: "Spróbuj ponownie",
    unsaved_leave: "Zmiany jeszcze się zapisują.",
  },
  en: {
    menu: "Menu",
    intro: "Alvuna builds the tablet and TV screens by itself from your areas and devices. Here you can hide what you don't want, change names and order, or add, say, a script as a scene.",
    intro_save: "Changes save by themselves and reach the tablets and TVs right away.",
    sections: { rooms: "Rooms", scenes: "Scenes", security: "Security", cameras: "Cameras", media: "Media", persons: "People", found: "Found automatically" },
    notes: {
      rooms: "Rooms are Home Assistant areas. Expand a room to hide or rename its lights, covers and humidifiers.",
      scenes: "Scenes and scripts started with one tap.",
      security: "Door, window, motion, smoke and leak sensors.",
      cameras: "Live view from your cameras.",
      media: "Speakers, TVs and players.",
      persons: "Who is home.",
      found: "Alvuna finds these by itself and shows them when they are available.",
    },
    saving: "Saving…", saved: "Saved", save_error: "Not saved", retry: "Retry",
    add: "Add", done: "Done", search: "Search by name or id", search_short: "Search",
    no_candidates: "There is nothing more to add.", no_results: "Nothing matches.",
    more_results: "And {n} more — narrow the search.",
    add_item: "Add: {name}", remove: "Remove from the list: {name}",
    badge_added: "Added", badge_hidden: "Hidden", badge_missing: "Not in Home Assistant",
    visible: "Show: {name}", move_up: "Move up: {name}", move_down: "Move down: {name}",
    rename: "Name: {name}", rename_hint: "Click to rename", auto_name: "automatic: {name}",
    reset_name: "Use the automatic name",
    empty: "Alvuna found nothing here. You can add something yourself.", empty_rooms: "No areas with devices.",
    area: "area {id}",
    devices: { zero: "no devices", one: "{n} device", other: "{n} devices" },
    expand: "Show devices: {name}", collapse: "Hide devices: {name}",
    kinds: { lights: "Light", covers: "Cover", humidifiers: "Humidifier" },
    no_devices: "This room has no lights, covers or humidifiers.",
    temperature: "Temperature", humidity: "Humidity", sensor_none: "not picked",
    sensor_area: "from the area's settings", sensor_auto: "picked automatically",
    sensor_hint: "The room's sensors are set in Home Assistant, in the area's settings.", area_settings: "Area settings",
    found: { weather: "Weather", climate: "Heating", vacuum: "Vacuum", appliances: "Washer and dishwasher", waste: "Waste collection",
      air_quality: "Air quality", weather_alert: "Weather warnings" },
    air: { index: "index", pm10: "PM10", pm25: "PM2.5" }, battery: "battery",
    nothing_found: "Nothing else found.",
    loading: "Loading…",
    not_set_up: "Alvuna is not set up yet.",
    not_set_up_hint: "Add the Alvuna integration in Settings → Devices & services, and this panel will show your home.",
    open_integrations: "Open the integration",
    load_error: "Alvuna's settings could not be loaded.", try_again: "Try again",
    unsaved_leave: "Changes are still being saved.",
  },
};

let lang = "en", dict = STRINGS.en, rules = new Intl.PluralRules("en");

// True when the language changed.
export function setLanguage(language) {
  const base = String(language || "en").toLowerCase().split(/[-_]/)[0];
  const next = STRINGS[base] ? base : "en";
  if (next === lang) return false;
  lang = next;
  dict = STRINGS[next];
  rules = new Intl.PluralRules(next);
  return true;
}

export const currentLanguage = () => lang;

const lookup = (tree, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), tree);

export function t(key, vars = {}) {
  let v = lookup(dict, key) ?? lookup(STRINGS.en, key) ?? key;
  if (v && typeof v === "object") {
    const n = Number(vars.n) || 0;
    v = (n === 0 && v.zero) || v[rules.select(n)] || v.other || "";
  }
  return String(v).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
