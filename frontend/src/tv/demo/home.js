// The made-up home of the website demo: what the Alvuna integration would build from a real Home Assistant (its
// layout) and the states of the entities in it. Pictures are the site's own generated images (site/img).
const IMG = "/img";

// The demo speaks the page's language: /app/?lang=en for the English page (the app's own texts follow userLocale in
// ha.js; the home's names are translated here).
const PARAMS = new URLSearchParams(location.search);
export const LANG = PARAMS.get("lang") === "en" ? "en" : "pl";
// Opened on a TV by the LG app's "Try a sample home" (app/?tv=1), not inside the website's photo.
export const TV = PARAMS.has("tv");
const EN = {
  "Słońce": "Sun", "Sufit": "Ceiling", "Lampa stojąca": "Floor lamp", "Listwa LED": "LED strip", "Kinkiet": "Wall light",
  "Roleta": "Blind", "Temperatura": "Temperature", "Wilgotność": "Humidity", "Nad wyspą": "Island", "Pod szafkami": "Under cabinets",
  "Lampka nocna": "Bedside lamp", "Lampa biurkowa": "Desk lamp", "Gwiazdki": "Star lights", "Lustro": "Mirror", "Girlanda": "String lights",
  "Temperatura na zewnątrz": "Outdoor temperature", "Wieczór": "Evening", "Kino": "Movie", "Dobranoc": "Good night",
  "Drzwi wejściowe": "Front door", "Okno w sypialni": "Bedroom window", "Łazienka zalanie": "Bathroom leak", "Czujnik dymu": "Smoke detector",
  "Wejście": "Entrance", "Ogród": "Garden", "Podjazd": "Driveway", "Korytarz": "Hallway", "Marek": "Mark", "Telewizor": "TV",
  "Głośnik w kuchni": "Kitchen speaker", "Spokojny wieczór": "Quiet evening", "Głośnik w sypialni": "Bedroom speaker", "Dom": "Home",
  "Ogrzewanie": "Heating", "Odkurzacz": "Vacuum", "Pralka": "Washer", "Pralka stan": "Washer state", "Pralka program": "Washer program",
  "Pralka pozostało": "Washer time left", "Pralka czas": "Washer duration", "Pralka postęp": "Washer progress", "Bawełna 40°": "Cotton 40°",
  "Papier": "Paper", "Jakość powietrza": "Air quality", "Czujnik okna w łazience": "Bathroom window sensor", "Salon": "Living room",
  "Kuchnia": "Kitchen", "Sypialnia": "Bedroom", "Gabinet": "Study", "Pokój Zosi": "Zoe's room", "Łazienka": "Bathroom", "Taras": "Terrace",
};
export const tr = (x) => (LANG === "en" && EN[x]) || x;
// Every name in the states and the layout, in place: friendly names, item names, rooms, a calendar's event, a title.
const NAMED = new Set(["friendly_name", "name", "message", "media_title", "room"]);
const localize = (v) => {
  if (LANG !== "en") return v;
  if (Array.isArray(v)) return v.map(localize);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, NAMED.has(k) && typeof x === "string" ? tr(x) : localize(x)]));
  return v;
};
const iso = (d) => d.toISOString();
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const light = (id, name, pct) => [id, pct ? "on" : "off", { friendly_name: name, brightness: pct ? Math.round(pct * 2.55) : null,
  supported_color_modes: ["brightness"], color_mode: pct ? "brightness" : null, supported_features: 0 }];
const sensor = (id, name, value, unit, device_class) => [id, String(value), { friendly_name: name, unit_of_measurement: unit, device_class, state_class: "measurement" }];

export function HOME() {
  const t = new Date().toISOString();
  const rising = new Date(); rising.setHours(7, 31, 0, 0); if (rising < new Date()) rising.setDate(rising.getDate() + 1);
  const setting = new Date(); setting.setHours(15, 52, 0, 0); if (setting < new Date()) setting.setDate(setting.getDate() + 1);
  const dark = new Date().getHours() >= 16 || new Date().getHours() < 7;
  const list = [
    ["sun.sun", dark ? "below_horizon" : "above_horizon", { friendly_name: "Słońce", next_rising: iso(rising), next_setting: iso(setting) }],
    light("light.salon_sufit", "Sufit", 0), light("light.salon_lampa", "Lampa stojąca", 0), light("light.salon_led", "Listwa LED", 0),
    light("light.salon_kinkiet", "Kinkiet", 0),
    ["cover.salon_roleta", "open", { friendly_name: "Roleta", current_position: 100, device_class: "shade", supported_features: 15 }],
    sensor("sensor.salon_temperatura", "Temperatura", "21.6", "°C", "temperature"), sensor("sensor.salon_wilgotnosc", "Wilgotność", "44", "%", "humidity"),
    light("light.kuchnia_sufit", "Sufit", 0), light("light.kuchnia_wyspa", "Nad wyspą", 70), light("light.kuchnia_szafki", "Pod szafkami", 0),
    sensor("sensor.kuchnia_temperatura", "Temperatura", "22.3", "°C", "temperature"),
    light("light.sypialnia_sufit", "Sufit", 0), light("light.sypialnia_nocna", "Lampka nocna", 0),
    ["cover.sypialnia_roleta", "open", { friendly_name: "Roleta", current_position: 100, device_class: "shade", supported_features: 15 }],
    sensor("sensor.sypialnia_temperatura", "Temperatura", "19.4", "°C", "temperature"), sensor("sensor.sypialnia_wilgotnosc", "Wilgotność", "48", "%", "humidity"),
    light("light.gabinet_biurko", "Lampa biurkowa", 0), light("light.gabinet_sufit", "Sufit", 0),
    sensor("sensor.gabinet_temperatura", "Temperatura", "20.8", "°C", "temperature"),
    light("light.pokoj_zosi_sufit", "Sufit", 0), light("light.pokoj_zosi_gwiazdy", "Gwiazdki", 0),
    sensor("sensor.pokoj_zosi_temperatura", "Temperatura", "21.1", "°C", "temperature"),
    light("light.lazienka_lustro", "Lustro", 0), sensor("sensor.lazienka_wilgotnosc", "Wilgotność", "63", "%", "humidity"),
    light("light.taras_girlanda", "Girlanda", 0), sensor("sensor.ogrod_temperatura", "Temperatura na zewnątrz", "6.1", "°C", "temperature"),
    ["scene.wieczor", "2026-11-24T17:00:00+00:00", { friendly_name: "Wieczór", icon: "mdi:weather-night" }],
    ["scene.kino", "2026-11-20T20:00:00+00:00", { friendly_name: "Kino", icon: "mdi:movie-open-outline" }],
    ["scene.dobranoc", "2026-11-23T22:30:00+00:00", { friendly_name: "Dobranoc", icon: "mdi:bed-outline" }],
    ["binary_sensor.drzwi_wejsciowe", "off", { friendly_name: "Drzwi wejściowe", device_class: "door" }],
    ["binary_sensor.okno_sypialnia", "on", { friendly_name: "Okno w sypialni", device_class: "window" }],
    ["binary_sensor.lazienka_zalanie", "off", { friendly_name: "Łazienka zalanie", device_class: "moisture" }],
    ["binary_sensor.korytarz_dym", "off", { friendly_name: "Czujnik dymu", device_class: "smoke" }],
    ...[["wejscie", "Wejście"], ["ogrod", "Ogród"], ["podjazd", "Podjazd"], ["korytarz", "Korytarz"]].map(([id, name]) =>
      [`camera.${id}`, "idle", { friendly_name: name, access_token: "demo", entity_picture: `/api/camera_proxy/camera.${id}?token=demo`, supported_features: 0 }]),
    ["person.anna", "home", { friendly_name: "Anna", entity_picture: `${IMG}/person-1.jpg` }],
    ["person.marek", "not_home", { friendly_name: "Marek", entity_picture: `${IMG}/person-2.jpg` }],
    ["media_player.salon_tv", "on", { friendly_name: "Telewizor", device_class: "tv", source: "HDMI 1", volume_level: .18, is_volume_muted: false, supported_features: 23997 }],
    ["media_player.kuchnia_glosnik", "playing", { friendly_name: "Głośnik w kuchni", device_class: "speaker", media_title: "Spokojny wieczór", media_artist: "Radio Jazz",
      media_duration: 0, volume_level: .3, is_volume_muted: false, supported_features: 152463 }],
    ["media_player.sypialnia_glosnik", "off", { friendly_name: "Głośnik w sypialni", device_class: "speaker", supported_features: 152463 }],
    ["weather.dom", "cloudy", { friendly_name: "Dom", temperature: 6, humidity: 82, wind_speed: 14, wind_speed_unit: "km/h", pressure: 1012, temperature_unit: "°C" }],
    ["climate.ogrzewanie", "heat", { friendly_name: "Ogrzewanie", current_temperature: 21.4, temperature: 21.5, hvac_action: "heating", hvac_modes: ["off", "heat"],
      min_temp: 7, max_temp: 30, target_temp_step: 0.5, supported_features: 385 }],
    ["vacuum.odkurzacz", "docked", { friendly_name: "Odkurzacz", battery_level: 100, fan_speed: "standard", supported_features: 12796 }],
    ["sensor.pralka_stan", "running", { friendly_name: "Pralka stan" }],
    ["sensor.pralka_program", "Bawełna 40°", { friendly_name: "Pralka program" }],
    ["sensor.pralka_pozostalo", "42", { friendly_name: "Pralka pozostało", unit_of_measurement: "min" }],
    ["sensor.pralka_czas", "118", { friendly_name: "Pralka czas", unit_of_measurement: "min" }],
    ["sensor.pralka_postep", "64", { friendly_name: "Pralka postęp", unit_of_measurement: "%" }],
    ["calendar.odpady_papier", "off", { friendly_name: "Papier", message: "Papier", all_day: true, start_time: `${ymd(day(1))} 00:00:00`, end_time: `${ymd(day(2))} 00:00:00` }],
    ["sensor.powietrze_indeks", "good", { friendly_name: "Jakość powietrza", device_class: "enum", options: ["very_good", "good", "moderate", "sufficient", "bad", "very_bad"] }],
    sensor("sensor.powietrze_pm10", "PM10", "18", "µg/m³", "pm10"), sensor("sensor.powietrze_pm25", "PM2.5", "11", "µg/m³", "pm25"),
    ["sensor.czujnik_okna_bateria", "8", { friendly_name: "Czujnik okna w łazience", device_class: "battery", unit_of_measurement: "%" }],
  ];
  const out = {};
  for (const [entity_id, state, attributes] of list) {
    out[entity_id] = { entity_id, state: entity_id === "sensor.pralka_program" ? tr(state) : state, attributes: localize(attributes),
      last_changed: t, last_updated: t, context: { id: entity_id, parent_id: null, user_id: null } };
  }
  return out;
}

const L = (entity, name) => ({ entity, name });
export const layout = () => localize({
  rooms: [
    { id: "area:salon", name: "Salon", area: "salon", icon: "mdi:sofa-outline",
      lights: [L("light.salon_sufit", "Sufit"), L("light.salon_lampa", "Lampa stojąca"), L("light.salon_led", "Listwa LED"), L("light.salon_kinkiet", "Kinkiet")],
      covers: [L("cover.salon_roleta", "Roleta")], temperature: "sensor.salon_temperatura", humidity: "sensor.salon_wilgotnosc" },
    { id: "area:kuchnia", name: "Kuchnia", area: "kuchnia", icon: "mdi:countertop-outline",
      lights: [L("light.kuchnia_sufit", "Sufit"), L("light.kuchnia_wyspa", "Nad wyspą"), L("light.kuchnia_szafki", "Pod szafkami")], temperature: "sensor.kuchnia_temperatura" },
    { id: "area:sypialnia", name: "Sypialnia", area: "sypialnia", icon: "mdi:bed-outline",
      lights: [L("light.sypialnia_sufit", "Sufit"), L("light.sypialnia_nocna", "Lampka nocna")], covers: [L("cover.sypialnia_roleta", "Roleta")],
      temperature: "sensor.sypialnia_temperatura", humidity: "sensor.sypialnia_wilgotnosc" },
    { id: "area:gabinet", name: "Gabinet", area: "gabinet", icon: "mdi:desk",
      lights: [L("light.gabinet_biurko", "Lampa biurkowa"), L("light.gabinet_sufit", "Sufit")], temperature: "sensor.gabinet_temperatura" },
    { id: "area:pokoj_zosi", name: "Pokój Zosi", area: "pokoj_zosi", icon: "mdi:teddy-bear",
      lights: [L("light.pokoj_zosi_sufit", "Sufit"), L("light.pokoj_zosi_gwiazdy", "Gwiazdki")], temperature: "sensor.pokoj_zosi_temperatura" },
    { id: "area:lazienka", name: "Łazienka", area: "lazienka", icon: "mdi:shower-head",
      lights: [L("light.lazienka_lustro", "Lustro")], humidity: "sensor.lazienka_wilgotnosc" },
    { id: "area:taras", name: "Taras", area: "taras", icon: "mdi:flower-outline",
      lights: [L("light.taras_girlanda", "Girlanda")], temperature: "sensor.ogrod_temperatura" },
  ],
  scenes: [L("scene.wieczor", "Wieczór"), L("scene.kino", "Kino"), L("scene.dobranoc", "Dobranoc")],
  security: [L("binary_sensor.okno_sypialnia", "Okno w sypialni"), L("binary_sensor.drzwi_wejsciowe", "Drzwi wejściowe"),
    L("binary_sensor.lazienka_zalanie", "Łazienka zalanie"), L("binary_sensor.korytarz_dym", "Czujnik dymu")],
  cameras: [L("camera.wejscie", "Wejście"), L("camera.ogrod", "Ogród"), L("camera.podjazd", "Podjazd"), L("camera.korytarz", "Korytarz")],
  persons: ["person.anna", "person.marek"],
  media: [{ ...L("media_player.salon_tv", "Telewizor"), room: "Salon" }, { ...L("media_player.kuchnia_glosnik", "Głośnik w kuchni"), room: "Kuchnia" },
    { ...L("media_player.sypialnia_glosnik", "Głośnik w sypialni"), room: "Sypialnia" }],
  weather: "weather.dom",
  climate: { entity: "climate.ogrzewanie" },
  vacuum: { entity: "vacuum.odkurzacz" },
  appliances: [{ name: "Pralka", icon: "mdi:washing-machine", state: "sensor.pralka_stan", program: "sensor.pralka_program",
    remaining: "sensor.pralka_pozostalo", duration: "sensor.pralka_czas", progress: "sensor.pralka_postep" }],
  waste: ["calendar.odpady_papier"],
  air_quality: { index: "sensor.powietrze_indeks", pm10: "sensor.powietrze_pm10", pm25: "sensor.powietrze_pm25" },
  tv_screensaver_minutes: 30, tv_idle_minutes: 0,
});

// Hourly for a day and daily for a week, from now: cloudy evening, a dry cold week.
export function forecast() {
  const h0 = new Date(); h0.setMinutes(0, 0, 0);
  const conds = ["cloudy", "cloudy", "partlycloudy", "cloudy", "cloudy", "rainy", "rainy", "cloudy"];
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(h0.getTime() + (i + 1) * 3600e3), hr = d.getHours(), night = hr >= 16 || hr < 7;
    return { datetime: iso(d), condition: night && conds[i % 8] === "partlycloudy" ? "clear-night" : conds[i % 8],
      temperature: Math.round(6 - 3 * Math.sin(((hr - 14) / 24) * Math.PI * 2) * -1 - 2), precipitation: conds[i % 8] === "rainy" ? 0.4 : 0, precipitation_probability: conds[i % 8] === "rainy" ? 60 : 10 };
  });
  const dc = ["cloudy", "partlycloudy", "sunny", "rainy", "cloudy", "partlycloudy", "sunny"];
  const daily = dc.map((condition, i) => ({ datetime: iso(day(i)), condition, temperature: [6, 7, 8, 5, 4, 6, 7][i], templow: [1, 2, 0, 2, 1, -1, 0][i],
    precipitation: condition === "rainy" ? 3.2 : 0, precipitation_probability: condition === "rainy" ? 70 : 10 }));
  return { hourly, daily, at: Date.now() };
}
