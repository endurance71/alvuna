// The tour of the live demo: the real Alvuna TV app (app/, a made-up home) driven the way a remote drives it. Each
// step presses keys in the app's window and leaves the screen showing one feature; `back` returns to the home screen.
// Used by the page's TV (index.html) and by the script that renders the feature pictures.
(function () {
  // `halted()`: the visitor took the remote; the step in progress stops before its next key, so it never fights them.
  // Texts of the steps in the page's language (lang: "pl" or "en"); the TV speaks it too (app/?lang=en).
  const TEXT = {
    en: {
      pulpit: ["The whole home on one screen", "Security, cameras, what is running, scenes and rooms. The layout builds itself from Home Assistant's areas."],
      pokoj: ["A room in a side panel", "OK on a room slides out its panel: lights with brightness, blinds, temperature. Here OK on the LED strip lights the wall behind the TV."],
      sceny: ["Scenes in one press", "Evening lights the lamp and the LEDs, Movie dims the living room and lowers the blind, Good night turns the house off."],
      kamery: ["Cameras full screen", "Live view from every camera; the arrows move to the next one."],
      dzwonek: ["Someone is at the door", "An automation with the alvuna.show_camera action puts the front door camera on every TV."],
      podsumowanie: ["What needs attention", "Left arrow slides out the summary: an open window, a low battery, the laundry, tomorrow's bin collection."],
      ukryj: ["Hide what you don't need", "Hold OK on a tile to hide it on every TV. Bring it back in the Alvuna panel."],
      powiadomienia: ["Notifications from automations", "The alvuna.notify action shows a message on the TV, for example when the washer is done."],
      ustawienia: ["Settings on the TV", "Tile look, accent, screensaver and OLED care, animations for slower TVs and homes. All with the remote."],
      wygaszacz: ["A screensaver for OLED", "When idle the screen dims and the clock slowly wanders, so nothing burns in."],
      bell: ["Doorbell", "Someone is at the front door"], washer: ["Washer", "Laundry is done, ready to unload"],
    },
    pl: { bell: ["Dzwonek", "Ktoś stoi przy drzwiach wejściowych"], washer: ["Pralka", "Pranie skończone, można wyjmować"] },
  };
  function tour(win, halted = () => false, lang = "pl") {
    const T = TEXT[lang] || TEXT.pl;
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const fire = (type, key) => win.dispatchEvent(new win.KeyboardEvent(type, { key, keyCode: key === "Enter" ? 13 : 0, bubbles: true }));
    const check = () => { if (halted()) throw new Error("halted"); };
    const press = async (key, gap = 420) => { check(); fire("keydown", key); await wait(60); fire("keyup", key); await wait(gap); };
    const ok = (gap) => press("Enter", gap);
    const hold = async () => { check(); fire("keydown", "Enter"); await wait(900); fire("keyup", "Enter"); await wait(500); };
    const S = () => win.__hd?.S;
    const open = () => { const s = S(); return !!(s && (s.panel || s.camera != null || s.saver)); };
    // Back only while something is open (a panel, a camera, the screensaver): no idle key presses between steps.
    const back = async () => { for (let i = 0; i < 5 && open(); i++) await press("Escape", 380); };
    const rows = () => [...win.document.querySelectorAll(".row")];
    const focusedRow = () => rows().find((r) => r.querySelector(".f"));
    // To a row by its key (data-line: security, working, scenes, rooms, media, climate), whatever the language:
    // down from where the focus is, or up when it lies above.
    const KEYS = { Ochrona: "security", Sceny: "scenes", Pokoje: "rooms" };
    const toRow = async (title) => {
      const key = KEYS[title] || title;
      const target = () => rows().findIndex((r) => r.dataset.line === key);
      for (let i = 0; i < 10; i++) {
        const at = rows().indexOf(focusedRow()), want = target();
        if (want < 0 || at === want) return;
        await press(at < want ? "ArrowDown" : "ArrowUp", 300);
      }
    };
    const home = async () => { await back(); };
    return [
      { id: "pulpit", title: "Cały dom na jednym ekranie", text: "Ochrona, kamery, to co teraz pracuje, sceny i pokoje. Układ powstaje sam z obszarów Home Assistanta.",
        run: async () => { win.__demo.reset(); await home(); await toRow("Ochrona"); await press("ArrowRight", 600); await press("ArrowRight", 600); await press("ArrowDown", 700); await press("ArrowDown", 700); } },
      { id: "pokoj", title: "Pokój w panelu z boku", text: "OK na pokoju wysuwa panel: światła z jasnością, rolety, temperatura. Tu OK na Listwie LED zapala ledy za telewizorem.",
        run: async () => {
          await home(); await toRow("Pokoje"); await ok(1100);
          for (let i = 0; i < 3; i++) await press("ArrowDown", 450);
          await wait(300); await ok(900);
        } },
      { id: "sceny", title: "Sceny jednym przyciskiem", text: "Wieczór zapala lampę i ledy, Kino przyciemnia salon i zasłania roletę, Dobranoc gasi cały dom.",
        run: async () => {
          await home(); await toRow("Sceny");
          for (let i = 0; i < 4 && win.document.querySelector(".f")?.dataset.entity !== "scene.wieczor"; i++) await press("ArrowLeft", 350);
          await wait(400); await ok(900);
        } },
      { id: "kamery", title: "Kamery na całym ekranie", text: "Obraz na żywo z każdej kamery, a strzałkami przechodzisz do następnej.",
        run: async () => { await home(); await toRow("Ochrona"); await press("ArrowRight", 500); await ok(1600); await press("ArrowRight", 1400); } },
      { id: "dzwonek", title: "Ktoś dzwoni do drzwi", text: "Automatyzacja z akcją alvuna.show_camera pokazuje kamerę przy drzwiach na każdym telewizorze.",
        run: async () => { await home(); win.__demo.camera("camera.wejscie", 12); await wait(600); win.__demo.notify(T.bell[0], T.bell[1], 8); } },
      { id: "podsumowanie", title: "Co wymaga uwagi", text: "Strzałka w lewo wysuwa podsumowanie: otwarte okno, słaba bateria, pranie, jutrzejszy wywóz śmieci.",
        run: async () => {
          await home();
          for (let i = 0; i < 10 && S()?.panel?.type !== "summary"; i++) await press("ArrowLeft", 350);
          await wait(900); await press("ArrowDown", 600);
        } },
      { id: "ukryj", title: "Ukryj to, czego nie potrzebujesz", text: "Przytrzymaj OK na kaflu, żeby go ukryć na wszystkich telewizorach. Wrócisz do niego w panelu Alvuna.",
        run: async () => { await home(); await toRow("Pokoje"); await press("ArrowRight", 500); await press("ArrowRight", 700); await hold(); } },
      { id: "powiadomienia", title: "Powiadomienia z automatyzacji", text: "Akcja alvuna.notify wyświetla komunikat na telewizorze, na przykład gdy pralka skończy.",
        run: async () => { await home(); win.__demo.notify(T.washer[0], T.washer[1], 7); await wait(400); } },
      { id: "ustawienia", title: "Ustawienia na telewizorze", text: "Wygląd kafli, akcent, wygaszacz i ochrona OLED, animacje dla słabszych telewizorów i domy. Wszystko pilotem.",
        run: async () => {
          await home();
          for (let i = 0; i < 10 && S()?.panel?.type !== "summary"; i++) await press("ArrowLeft", 350);
          await wait(700);
          win.document.querySelector('[data-act="settings"]')?.click();
          await wait(900);
          for (let i = 0; i < 4; i++) await press("ArrowDown", 380);
        } },
      { id: "wygaszacz", title: "Wygaszacz dla ekranu OLED", text: "Po bezczynności ekran się przyciemnia, a zegar powoli wędruje, żeby nic się nie wypaliło.",
        run: async () => { await home(); const s = S(); if (s) s.lastInput = Date.now() - 31 * 60000; await wait(1500); } },
    ].map((s) => ({ ...s, ...(T[s.id] ? { title: T[s.id][0], text: T[s.id][1] } : {}), back: home }));
  }
  window.AlvunaTour = tour;
})();
