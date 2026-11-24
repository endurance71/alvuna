// Wording and number formats, taken over from the tablet card (src/card/alvuna-card.js) so both read the same.

export const WEATHER_PL = {
  "clear-night": ["Pogodnie", "mdi:weather-night"],
  cloudy: ["Pochmurno", "mdi:weather-cloudy"],
  exceptional: ["Nietypowo", "mdi:alert-circle-outline"],
  fog: ["Mgła", "mdi:weather-fog"],
  hail: ["Grad", "mdi:weather-hail"],
  lightning: ["Burza", "mdi:weather-lightning"],
  "lightning-rainy": ["Burza z deszczem", "mdi:weather-lightning-rainy"],
  partlycloudy: ["Częściowe zachmurzenie", "mdi:weather-partly-cloudy"],
  pouring: ["Ulewa", "mdi:weather-pouring"],
  rainy: ["Deszcz", "mdi:weather-rainy"],
  snowy: ["Śnieg", "mdi:weather-snowy"],
  "snowy-rainy": ["Deszcz ze śniegiem", "mdi:weather-snowy-rainy"],
  sunny: ["Słonecznie", "mdi:weather-sunny"],
  windy: ["Wietrznie", "mdi:weather-windy"],
  "windy-variant": ["Wietrznie", "mdi:weather-windy-variant"],
};
export const wIcon = (cond, night) => (cond === "partlycloudy" && night ? "mdi:weather-night-partly-cloudy"
  : (WEATHER_PL[cond] || [])[1] || "mdi:weather-partly-cloudy");

// What an open (or wet) binary sensor means, by device class.
export const ALERT_WORD = { door: "otwarte", window: "otwarte", opening: "otwarte", garage_door: "otwarta",
  moisture: "zalanie", smoke: "dym", gas: "gaz", carbon_monoxide: "czad", safety: "alarm", problem: "problem" };
export const CALM_WORD = { door: "zamknięte", window: "zamknięte", opening: "zamknięte", garage_door: "zamknięta",
  moisture: "sucho", smoke: "brak dymu", gas: "brak gazu", carbon_monoxide: "brak czadu" };

export const AIR_PL = { very_good: "bardzo dobre", good: "dobre", moderate: "umiarkowane", sufficient: "dostateczne", bad: "złe",
  very_bad: "bardzo złe" };
export const AIR_BAD = ["sufficient", "bad", "very_bad"];
export const IMGW_ALERT_PL = { storms: "Burze", dense_fog: "Gęsta mgła", heavy_rainfall: "Intensywne opady deszczu",
  heavy_snowfall: "Intensywne opady śniegu", icing: "Oblodzenie", freezing_rain: "Marznący deszcz", snowfall: "Opady śniegu",
  frosts: "Przymrozki", thaw: "Roztopy", heavy_rain_with_storms: "Ulewy z burzami", heavy_frost: "Silny mróz",
  strong_wind: "Silny wiatr", heat: "Upał", snow_blizzard: "Zamieć śnieżna" };

// Streaming apps a TV can only name: [match on app id, name or source, logo in /local/logos/, background, paint white].
export const BRANDS = [
  [/hbo ?max/, "hbomax", "linear-gradient(135deg,#0b0b2b,#2b1bd1)", true], [/netflix/, "netflix", "#000"],
  [/prime|amazon/, "primevideo", "linear-gradient(135deg,#1a98ff,#0a5fd8)", true],
  [/disney/, "disneyplus", "linear-gradient(135deg,#0b1a5c,#1f3dd6)", true], [/canal/, "canalplus", "#000"],
  [/skyshowtime|sky ?show/, "skyshowtime", "linear-gradient(135deg,#120f3a,#3a1d8c)", true],
  [/\bmax\b|com\.wbd\.stream/, "max", "#002be7", true], [/apple ?tv|com\.apple/, "appletv", "#000", true],
  [/youtube/, "youtube", "#fff"], [/polsat/, "polsatboxgo", "#000"], [/spotify/, "spotify", "#000"],
  [/play ?now|playnow/, "playnow", "linear-gradient(135deg,#2a0f4f,#6a2bb8)", true],
  [/tvn\.player|\bplayer\.pl\b|^player$/, "player", "linear-gradient(135deg,#1b1b1b,#3a3a3a)", true],
  [/tv\.launcherx|com\.tcl\./, "tcl", "linear-gradient(135deg,#9e001e,#e4002b)", true],
];
// What a Google TV reports as the open app (only the package): a readable name.
export const TV_APPS = [
  [/tv\.launcherx/, "Ekran główny"], [/netflix/, "Netflix"], [/amazonvideo|primevideo/, "Prime Video"],
  [/com\.wbd\.stream|hbo/, "Max"], [/youtube\.tvmusic/, "YouTube Music"], [/youtube/, "YouTube"],
  [/canal/, "Canal+"], [/disney/, "Disney+"], [/skyshowtime/, "SkyShowtime"], [/playnow|rodzina\.tvstart/, "PLAY NOW"],
  [/tvn\.player/, "Player"], [/polsat/, "Polsat Box Go"], [/spotify/, "Spotify"], [/tv\.settings|tcl\.settings/, "Ustawienia"],
];

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
};
const NUM_FMT = new Map();
export const num = (v, digits = 1) => {
  let f = NUM_FMT.get(digits);
  if (!f) NUM_FMT.set(digits, (f = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: digits, maximumFractionDigits: digits })));
  return f.format(Number(v));
};
export const CLOCK_FMT = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
export const DATE_FMT = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" });
export const HOUR_FMT = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
export const DAY_FMT = new Intl.DateTimeFormat("pl-PL", { weekday: "short" });
export const ids = (list) => (list || []).map((x) => (typeof x === "string" ? x : x.entity));
export const isNum = (v) => v != null && v !== "" && !isNaN(v);
export const fmtTime = (s) => {
  if (!isFinite(s) || s < 0) return "0:00";
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
export const ago = (iso) => {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  return min < 1 ? "przed chwilą" : min < 60 ? `${min} min temu` : min < 1440 ? `${Math.round(min / 60)} godz. temu`
    : `${Math.round(min / 1440)} ${plural(Math.round(min / 1440), "dzień", "dni", "dni")} temu`;
};

// Robot vacuum and WashData appliances (washer, dishwasher: feminine in Polish), as on the tablet card.
export const VAC_STATE_PL = { cleaning: "Sprząta", docked: "W stacji", returning: "Wraca do stacji", paused: "Wstrzymany", idle: "Gotowy",
  error: "Błąd", unavailable: "Niedostępny", unknown: "Brak danych" };
export const VAC_SUCTION_PL = { quiet: "Cicho", silent: "Cicho", standard: "Standard", strong: "Mocno", turbo: "Turbo", max: "Max" };
export const APP_STATE_PL = { off: "Wyłączona", idle: "Gotowa", starting: "Uruchamia się", running: "Pracuje", paused: "Wstrzymana",
  user_paused: "Wstrzymana", ending: "Kończy", finished: "Zakończona", anti_wrinkle: "Ochrona przed zagnieceniem",
  delay_wait: "Opóźniony start", interrupted: "Przerwana", force_stopped: "Zatrzymana", clean: "Gotowe do wyjęcia", unknown: "Brak danych" };
export const APP_ACTIVE = ["starting", "running", "paused", "user_paused", "ending", "anti_wrinkle", "delay_wait"];
export const APP_DONE = ["finished", "clean"];
export const PROGRAM_PL = { "detecting...": "Rozpoznaje program", detecting: "Rozpoznaje program" };
