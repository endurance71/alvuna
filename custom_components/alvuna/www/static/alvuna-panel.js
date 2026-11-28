var Ce=["rooms","scenes","security","cameras","media","persons"],ie=["scenes","security","cameras","media","persons"];var ft=/^(?!.+__)(?!_)[\da-z_]+(?<!_)\.(?!_)[\da-z_]+(?<!_)$/,ae=n=>typeof n=="string"&&n.length>0&&n.length<=255,Se=n=>[...new Set(n)];function Z(n){let e=n&&typeof n=="object"?n:{},t={hidden:[],names:{},order:{},added:{}};if(Array.isArray(e.hidden)&&(t.hidden=Se(e.hidden.filter(ae))),e.names&&typeof e.names=="object")for(let[a,i]of Object.entries(e.names))ae(a)&&typeof i=="string"&&(t.names[a]=i);for(let a of["order","added"]){let i=e[a];if(!(!i||typeof i!="object"))for(let[o,r]of Object.entries(i))Ce.includes(o)&&Array.isArray(r)&&(t[a][o]=Se(r.filter(ae)))}return t}function Te(n){let e=Z(n),t={};for(let[o,r]of Object.entries(e.names)){let s=r.trim().slice(0,80).trim();s&&(t[o]=s)}let a={},i={};for(let o of Ce){e.order[o]?.length&&(a[o]=e.order[o]);let r=(e.added[o]||[]).filter(s=>ft.test(s));r.length&&(i[o]=r)}return{hidden:e.hidden,names:t,order:a,added:i}}function Pe(n,e=[]){let t=new Map(e.map((a,i)=>[a,i]));return n.map((a,i)=>[a,i]).sort((a,i)=>(t.get(a[0])??t.size)-(t.get(i[0])??t.size)||a[1]-i[1]).map(([a])=>a)}function G(n,e){let t=n?.sections?.rooms||[],a=new Map(t.map(i=>[i.id,i]));return Pe(t.map(i=>i.id),e.order.rooms).map(i=>a.get(i))}function M(n,e,t,a=i=>i){let i=n?.sections?.[t]||[],o=n?.sections?.[`${t}_candidates`]||[],r=i.filter(g=>!g.added),s=new Set(r.map(g=>g.id)),p=(e.added[t]||[]).filter(g=>!s.has(g)).map(g=>{let y=i.find(w=>w.id===g)||o.find(w=>w.id===g);return{id:g,auto_name:y?.auto_name||a(g),added:!0,missing:!y}}),h=new Map([...r.map(g=>[g.id,{id:g.id,auto_name:g.auto_name,added:!1}]),...p.map(g=>[g.id,g])]);return Pe([...h.keys()],e.order[t]).map(g=>h.get(g))}var Ae=n=>String(n||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ł/g,"l").replace(/Ł/g,"L").toLowerCase();function ne(n,e,t,a=""){let i=new Set(M(n,e,t).map(s=>s.id)),o=new Map;for(let s of n?.sections?.[`${t}_candidates`]||[])o.set(s.id,{id:s.id,auto_name:s.auto_name});for(let s of n?.sections?.[t]||[])s.added&&!o.has(s.id)&&o.set(s.id,{id:s.id,auto_name:s.auto_name});let r=Ae(a).split(/\s+/).filter(Boolean);return[...o.values()].filter(s=>!i.has(s.id)).filter(s=>{let p=Ae(`${s.id} ${s.auto_name}`);return r.every(h=>p.includes(h))}).sort((s,p)=>String(s.auto_name).localeCompare(String(p.auto_name)))}function Le(n,e,t){n.hidden=n.hidden.filter(a=>a!==e),t&&n.hidden.push(e)}function oe(n,e,t,a){let i=String(t||"").slice(0,80);!i.trim()||i.trim()===String(a||"").trim()?delete n.names[e]:n.names[e]=i}function Ne(n,e,t,a,i){let o=t.indexOf(a),r=o+i;if(o<0||r<0||r>=t.length)return!1;let s=[...t];return s.splice(o,1),s.splice(r,0,a),n.order[e]=s,!0}function Oe(n,e,t){let a=n.added[e]||[];a.includes(t)||(n.added[e]=[...a,t]),n.order[e]?.length&&!n.order[e].includes(t)&&(n.order[e]=[...n.order[e],t])}function Me(n,e,t,a=!1){let i=(n.added[e]||[]).filter(o=>o!==t);i.length?n.added[e]=i:delete n.added[e],n.order[e]&&(n.order[e]=n.order[e].filter(o=>o!==t)),a||(delete n.names[t],n.hidden=n.hidden.filter(o=>o!==t))}function We(n,e,t){let a=new Set;for(let i of n?.sections?.rooms||[]){a.add(i.id);for(let o of i.items||[])a.add(o.id)}for(let i of ie)if(i!==t)for(let o of M(n,e,i))a.add(o.id);return a}var q={pl:{menu:"Menu",intro:"Alvuna sama buduje ekran telewizora z Twoich obszar\xF3w i urz\u0105dze\u0144. Tu ukryjesz to, czego nie chcesz, zmienisz nazwy i kolejno\u015B\u0107, albo dodasz np. skrypt jako scen\u0119.",intro_save:"Zmiany zapisuj\u0105 si\u0119 same i od razu trafiaj\u0105 na telewizory.",sections:{rooms:"Pokoje",scenes:"Sceny",security:"Ochrona",cameras:"Kamery",media:"Media",persons:"Osoby",found:"Wykryte automatycznie"},notes:{rooms:"Pokoje to obszary Home Assistanta. Rozwi\u0144 pok\xF3j, \u017Ceby ukry\u0107 lub nazwa\u0107 jego \u015Bwiat\u0142a, rolety i nawil\u017Cacze.",scenes:"Sceny i skrypty uruchamiane jednym dotkni\u0119ciem.",security:"Czujniki drzwi, okien, ruchu, dymu i zalania.",cameras:"Podgl\u0105d na \u017Cywo z kamer.",media:"G\u0142o\u015Bniki, telewizory i odtwarzacze.",persons:"Kto jest w domu.",found:"Te rzeczy Alvuna znajduje sama i pokazuje, gdy s\u0105 dost\u0119pne."},saving:"Zapisywanie\u2026",saved:"Zapisano",save_error:"Nie zapisano",retry:"Pon\xF3w",add:"Dodaj",done:"Gotowe",search:"Szukaj po nazwie lub identyfikatorze",search_short:"Szukaj",no_candidates:"Nie ma ju\u017C nic do dodania.",no_results:"Nic nie pasuje.",more_results:"I jeszcze {n} \u2014 zaw\u0119\u017A wyszukiwanie.",add_item:"Dodaj: {name}",remove:"Usu\u0144 z listy: {name}",badge_added:"Dodane",badge_hidden:"Ukryte",badge_missing:"Brak w Home Assistant",visible:"Pokazuj: {name}",move_up:"Przesu\u0144 wy\u017Cej: {name}",move_down:"Przesu\u0144 ni\u017Cej: {name}",rename:"Nazwa: {name}",rename_hint:"Kliknij, aby zmieni\u0107 nazw\u0119",auto_name:"automatycznie: {name}",reset_name:"Przywr\xF3\u0107 nazw\u0119 automatyczn\u0105",empty:"Alvuna nic tu nie znalaz\u0142a. Mo\u017Cesz doda\u0107 co\u015B sama.",empty_rooms:"Brak obszar\xF3w z urz\u0105dzeniami.",area:"obszar {id}",devices:{zero:"bez urz\u0105dze\u0144",one:"{n} urz\u0105dzenie",few:"{n} urz\u0105dzenia",many:"{n} urz\u0105dze\u0144",other:"{n} urz\u0105dzenia"},expand:"Poka\u017C urz\u0105dzenia: {name}",collapse:"Zwi\u0144 urz\u0105dzenia: {name}",kinds:{lights:"\u015Awiat\u0142o",covers:"Roleta",humidifiers:"Nawil\u017Cacz"},no_devices:"W tym pokoju nie ma \u015Bwiate\u0142, rolet ani nawil\u017Caczy.",temperature:"Temperatura",humidity:"Wilgotno\u015B\u0107",sensor_none:"nie wybrano",sensor_area:"z ustawie\u0144 obszaru",sensor_auto:"dobrany automatycznie",sensor_hint:"Czujniki pokoju ustawisz w Home Assistant, w ustawieniach obszaru.",area_settings:"Ustawienia obszaru",found:{weather:"Pogoda",climate:"Ogrzewanie",vacuum:"Odkurzacz",appliances:"Pralka i zmywarka",waste:"Wyw\xF3z odpad\xF3w",air_quality:"Jako\u015B\u0107 powietrza",weather_alert:"Ostrze\u017Cenia pogodowe"},air:{index:"indeks",pm10:"PM10",pm25:"PM2,5"},battery:"bateria",nothing_found:"Nic wi\u0119cej nie wykryto.",loading:"Wczytywanie\u2026",not_set_up:"Alvuna nie jest jeszcze skonfigurowana.",not_set_up_hint:"Dodaj integracj\u0119 Alvuna w Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi, a ten panel poka\u017Ce Tw\xF3j dom.",open_integrations:"Otw\xF3rz integracj\u0119",load_error:"Nie uda\u0142o si\u0119 wczyta\u0107 ustawie\u0144 Alvuny.",try_again:"Spr\xF3buj ponownie",unsaved_leave:"Zmiany jeszcze si\u0119 zapisuj\u0105.",tabs:{layout:"Ekran",tvs:"Telewizory"},tvs:{intro:"Wybierz telewizor, \u017Ceby zobaczy\u0107, co pokazuje, wys\u0142a\u0107 mu polecenie albo zmieni\u0107 jego ustawienia.",none_title:"Nie ma jeszcze telewizora",none:"Otw\xF3rz aplikacj\u0119 Alvuna na telewizorze (LG, Google TV) albo {url} w jego przegl\u0105darce. Poka\u017Ce kod, kt\xF3ry wpiszesz w Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 Wykryte.",unavailable:"Integracja nie zna jeszcze listy telewizor\xF3w. Uruchom ponownie Home Assistanta po aktualizacji Alvuny.",online:"Po\u0142\u0105czony",online_since:"Po\u0142\u0105czony od {time}",offline:"Niepo\u0142\u0105czony",seen:"ostatnio {ago}",platform:{webos:"LG webOS",androidtv:"Android TV",browser:"Przegl\u0105darka"},on_screen:"Na ekranie",dimmed:"przyciemniony",views:{home:"Ekran g\u0142\xF3wny",saver:"Wygaszacz ekranu",camera:"Kamera: {name}",panel:"Panel"},panels:{room:"Pok\xF3j: {name}",media:"Media: {name}",weather:"Pogoda",climate:"Klimat",summary:"Przegl\u0105d",settings:"Ustawienia",wallpapers:"Ustawienia: tapeta",accents:"Ustawienia: kolor akcentu",entity:"Czujnik: {name}",device:"Urz\u0105dzenie",attn:"Wymaga uwagi: {name}",instances:"Domy",addhome:"Dodawanie domu",rename:"Zmiana nazwy domu",hold:"Menu kafelka: {name}"},last_key:"Ostatni klawisz pilota",just_now:"przed chwil\u0105",home:"Dom",homes:{one:"jeden z {n}",few:"jeden z {n}",many:"jeden z {n}",other:"jeden z {n}"},screen:"Ekran",language:"J\u0119zyk",uptime:"Czas dzia\u0142ania aplikacji",version:"Alvuna",ua:"Przegl\u0105darka telewizora",device:"Urz\u0105dzenie",actions:"Polecenia",offline_hint:"Polecenia dzia\u0142aj\u0105, gdy Alvuna jest otwarta na telewizorze.",reload:"Prze\u0142aduj",go_home:"Ekran g\u0142\xF3wny",saver_on:"W\u0142\u0105cz wygaszacz",saver_off:"Zamknij wygaszacz",exit:"Zamknij aplikacj\u0119",open:"Przejd\u017A do\u2026",open_label:"Otw\xF3rz na telewizorze",camera:"Poka\u017C kamer\u0119\u2026",camera_label:"Poka\u017C kamer\u0119 na telewizorze",rooms:"Pokoje",places:"Panele",targets:{summary:"Przegl\u0105d",weather:"Pogoda",climate:"Klimat",settings:"Ustawienia"},message:"Wiadomo\u015B\u0107 na ekran",message_placeholder:"Np. Obiad gotowy!",send:"Wy\u015Blij",sent:"Wys\u0142ano",failed:"Nie wys\u0142ano: {msg}",settings:"Ustawienia telewizora",settings_hint:"Te same, co w ustawieniach na telewizorze. Zmiana trafia na telewizor od razu, a wy\u0142\u0105czony dostanie j\u0105 przy nast\u0119pnym uruchomieniu.",pending:"Czeka na telewizor",no_settings:"Telewizor jeszcze nie przys\u0142a\u0142 swoich ustawie\u0144; zmiana i tak zostanie zapami\u0119tana.",follow_ha:"Jak w Alvunie ({value})",log:"Dziennik b\u0142\u0119d\xF3w",log_empty:"Bez b\u0142\u0119d\xF3w od uruchomienia Home Assistanta.",clear:"Wyczy\u015B\u0107",show:"Poka\u017C",hide:"Ukryj",pick:"Wybierz telewizor",preview:"Podgl\u0105d ekranu",preview_note:"Na \u017Cywo. Kliknij w podgl\u0105dzie, \u017Ceby nacisn\u0105\u0107 to na telewizorze.",remote:{label:"Pilot",back:"Wstecz",up:"W g\xF3r\u0119",down:"W d\xF3\u0142",left:"W lewo",right:"W prawo",ok:"OK",hint:"Klikni\u0119cie w podgl\u0105dzie naciska ten element na telewizorze. Po klikni\u0119ciu w podgl\u0105d dzia\u0142aj\u0105 te\u017C strza\u0142ki, Enter (OK) i Esc (Wstecz)."},preview_off:"Podgl\u0105d pojawi si\u0119, gdy Alvuna b\u0119dzie otwarta na tym telewizorze.",sections:{control:"Sterowanie",layout:"Uk\u0142ad ekranu",settings:"Ustawienia",log:"Dziennik b\u0142\u0119d\xF3w"},layout:{hint:"Tak jak na ekranie tego telewizora: rz\u0119dy od g\xF3ry, kafelki od lewej. Przeci\u0105gnij kafelek albo rz\u0105d, \u017Ceby zmieni\u0107 kolejno\u015B\u0107 (na telefonie za uchwyt \u22EE\u22EE); oko ukrywa. Dotyczy tylko tego telewizora; to, co ukryjesz w zak\u0142adce Ekran, znika ze wszystkich.",drag_row:"Przeci\u0105gnij rz\u0105d {name} (albo strza\u0142ki w g\xF3r\u0119 i w d\xF3\u0142)",drag_tile:"{name}: przeci\u0105gnij albo przesu\u0144 strza\u0142kami w lewo i w prawo",no_catalog:"Telewizor jeszcze nie przys\u0142a\u0142 swojego ekranu. W\u0142\u0105cz go i otw\xF3rz na nim Alvun\u0119.",row_hidden:"Ukryty",row_up:"Rz\u0105d wy\u017Cej: {name}",row_down:"Rz\u0105d ni\u017Cej: {name}",row_hide:"Ukryj rz\u0105d: {name}",row_show:"Poka\u017C rz\u0105d: {name}",tile_left:"W lewo: {name}",tile_right:"W prawo: {name}",tile_hide:"Ukryj: {name}",tile_show:"Poka\u017C: {name}",working_note:"Pojawia si\u0119 sam, gdy pracuje pralka, zmywarka albo odkurzacz.",security_note:"Otwarte okno, drzwi albo zalanie s\u0105 zawsze widoczne i na samej g\xF3rze.",reset:"Przywr\xF3\u0107 uk\u0142ad domy\u015Blny",empty:"Na tym telewizorze teraz nic tu nie ma."}}},en:{menu:"Menu",intro:"Alvuna builds the TV screen by itself from your areas and devices. Here you can hide what you don't want, change names and order, or add, say, a script as a scene.",intro_save:"Changes save by themselves and reach the TVs right away.",sections:{rooms:"Rooms",scenes:"Scenes",security:"Security",cameras:"Cameras",media:"Media",persons:"People",found:"Found automatically"},notes:{rooms:"Rooms are Home Assistant areas. Expand a room to hide or rename its lights, covers and humidifiers.",scenes:"Scenes and scripts started with one tap.",security:"Door, window, motion, smoke and leak sensors.",cameras:"Live view from your cameras.",media:"Speakers, TVs and players.",persons:"Who is home.",found:"Alvuna finds these by itself and shows them when they are available."},saving:"Saving\u2026",saved:"Saved",save_error:"Not saved",retry:"Retry",add:"Add",done:"Done",search:"Search by name or id",search_short:"Search",no_candidates:"There is nothing more to add.",no_results:"Nothing matches.",more_results:"And {n} more \u2014 narrow the search.",add_item:"Add: {name}",remove:"Remove from the list: {name}",badge_added:"Added",badge_hidden:"Hidden",badge_missing:"Not in Home Assistant",visible:"Show: {name}",move_up:"Move up: {name}",move_down:"Move down: {name}",rename:"Name: {name}",rename_hint:"Click to rename",auto_name:"automatic: {name}",reset_name:"Use the automatic name",empty:"Alvuna found nothing here. You can add something yourself.",empty_rooms:"No areas with devices.",area:"area {id}",devices:{zero:"no devices",one:"{n} device",other:"{n} devices"},expand:"Show devices: {name}",collapse:"Hide devices: {name}",kinds:{lights:"Light",covers:"Cover",humidifiers:"Humidifier"},no_devices:"This room has no lights, covers or humidifiers.",temperature:"Temperature",humidity:"Humidity",sensor_none:"not picked",sensor_area:"from the area's settings",sensor_auto:"picked automatically",sensor_hint:"The room's sensors are set in Home Assistant, in the area's settings.",area_settings:"Area settings",found:{weather:"Weather",climate:"Heating",vacuum:"Vacuum",appliances:"Washer and dishwasher",waste:"Waste collection",air_quality:"Air quality",weather_alert:"Weather warnings"},air:{index:"index",pm10:"PM10",pm25:"PM2.5"},battery:"battery",nothing_found:"Nothing else found.",loading:"Loading\u2026",not_set_up:"Alvuna is not set up yet.",not_set_up_hint:"Add the Alvuna integration in Settings \u2192 Devices & services, and this panel will show your home.",open_integrations:"Open the integration",load_error:"Alvuna's settings could not be loaded.",try_again:"Try again",unsaved_leave:"Changes are still being saved.",tabs:{layout:"Screen",tvs:"TVs"},tvs:{intro:"Pick a TV to see what it shows, send it a command or change its settings.",none_title:"No TV yet",none:"Open the Alvuna app on the TV (LG, Google TV), or {url} in its browser. It shows a code to type in Settings \u2192 Devices & services \u2192 Discovered.",unavailable:"The integration does not list TVs yet. Restart Home Assistant after updating Alvuna.",online:"Connected",online_since:"Connected since {time}",offline:"Not connected",seen:"last seen {ago}",platform:{webos:"LG webOS",androidtv:"Android TV",browser:"Browser"},on_screen:"On screen",dimmed:"dimmed",views:{home:"Home screen",saver:"Screensaver",camera:"Camera: {name}",panel:"Panel"},panels:{room:"Room: {name}",media:"Media: {name}",weather:"Weather",climate:"Climate",summary:"Overview",settings:"Settings",wallpapers:"Settings: wallpaper",accents:"Settings: accent colour",entity:"Sensor: {name}",device:"Device",attn:"Needs attention: {name}",instances:"Homes",addhome:"Adding a home",rename:"Renaming a home",hold:"Tile menu: {name}"},last_key:"Last remote key press",just_now:"just now",home:"Home",homes:{one:"one of {n}",other:"one of {n}"},screen:"Screen",language:"Language",uptime:"App uptime",version:"Alvuna",ua:"TV browser",device:"Device",actions:"Commands",offline_hint:"Commands work while Alvuna is open on the TV.",reload:"Reload",go_home:"Home screen",saver_on:"Start screensaver",saver_off:"Close screensaver",exit:"Close the app",open:"Go to\u2026",open_label:"Open on the TV",camera:"Show a camera\u2026",camera_label:"Show a camera on the TV",rooms:"Rooms",places:"Panels",targets:{summary:"Overview",weather:"Weather",climate:"Climate",settings:"Settings"},message:"Message on screen",message_placeholder:"E.g. Dinner is ready!",send:"Send",sent:"Sent",failed:"Not sent: {msg}",settings:"TV settings",settings_hint:"The same as in the settings on the TV. A change reaches it at once; a TV that is off gets it the next time it starts.",pending:"Waiting for the TV",no_settings:"The TV has not sent its settings yet; a change is remembered anyway.",follow_ha:"As in Alvuna ({value})",log:"Error log",log_empty:"No errors since Home Assistant started.",clear:"Clear",show:"Show",hide:"Hide",pick:"Pick a TV",preview:"Screen preview",preview_note:"Live. Click in the preview to press that on the TV.",remote:{label:"Remote",back:"Back",up:"Up",down:"Down",left:"Left",right:"Right",ok:"OK",hint:"A click in the preview presses that item on the TV. Once you click into the preview, the arrows, Enter (OK) and Esc (Back) work too."},preview_off:"The preview shows up while Alvuna is open on this TV.",sections:{control:"Control",layout:"Screen layout",settings:"Settings",log:"Error log"},layout:{hint:"As on this TV's screen: rows from the top, tiles from the left. Drag a tile or a row to change the order (on a phone by its \u22EE\u22EE grip); the eye hides. Only for this TV; what you hide on the Screen tab is gone from every TV.",drag_row:"Drag the {name} row (or up and down arrows)",drag_tile:"{name}: drag, or move with the left and right arrows",no_catalog:"The TV has not sent its screen yet. Turn it on and open Alvuna on it.",row_hidden:"Hidden",row_up:"Row up: {name}",row_down:"Row down: {name}",row_hide:"Hide row: {name}",row_show:"Show row: {name}",tile_left:"Left: {name}",tile_right:"Right: {name}",tile_hide:"Hide: {name}",tile_show:"Show: {name}",working_note:"Shows up by itself while the washer, dishwasher or vacuum works.",security_note:"An open window, door or a leak always shows, at the very top.",reset:"Back to the default layout",empty:"Nothing here on this TV right now."}}}},re="en",Ee=q.en,He=new Intl.PluralRules("en");function Be(n){let e=String(n||"en").toLowerCase().split(/[-_]/)[0],t=q[e]?e:"en";return t===re?!1:(re=t,Ee=q[t],He=new Intl.PluralRules(t),!0)}var Fe=()=>re,De=(n,e)=>e.split(".").reduce((t,a)=>t?.[a],n);function l(n,e={}){let t=De(Ee,n)??De(q.en,n)??n;if(t&&typeof t=="object"){let a=Number(e.n)||0;t=a===0&&t.zero||t[He.select(a)]||t.other||""}return String(t).replace(/\{(\w+)\}/g,(a,i)=>i in e?String(e[i]):a)}var F={weather:{conditions:{"clear-night":"Clear",cloudy:"Cloudy",exceptional:"Unusual",fog:"Fog",hail:"Hail",lightning:"Thunderstorm","lightning-rainy":"Storm and rain",partlycloudy:"Partly cloudy",pouring:"Heavy rain",rainy:"Rain",snowy:"Snow","snowy-rainy":"Sleet",sunny:"Sunny",windy:"Windy","windy-variant":"Windy"},wind:["N","NE","E","SE","S","SW","W","NW"],air:{very_good:"very good",good:"good",moderate:"moderate",sufficient:"fair",bad:"poor",very_bad:"very poor"},imgw:{storms:"Thunderstorms",dense_fog:"Dense fog",heavy_rainfall:"Heavy rain",heavy_snowfall:"Heavy snow",icing:"Icy roads",freezing_rain:"Freezing rain",snowfall:"Snow",frosts:"Ground frost",thaw:"Thaw",heavy_rain_with_storms:"Heavy rain and storms",heavy_frost:"Severe frost",strong_wind:"Strong wind",heat:"Heat",snow_blizzard:"Blizzard"},warning:"Warning: {alert}",smog:"Smog",imgw_line:"IMGW warning:",air_line:"Air quality {label}",no_airing:"Keep the windows shut",wind_label:"Wind",pressure:"Pressure",clouds:"Cloud cover",air_label:"Air quality",no_forecast:"No forecast",loading:"Loading forecast\u2026",title:"Weather",night:"night",high_low:"H: {hi}\xB0 \xB7 L: {lo}\xB0",imgw_source:"IMGW-PIB notice",hours:"Next hours",days:"Next days",partlycloudy_long:"Partly cloudy"},security:{alert:{door:"open",window:"open",opening:"open",garage_door:"open",moisture:"leak",smoke:"smoke",gas:"gas",carbon_monoxide:"CO",safety:"alarm",problem:"problem"},attention:"alert",more:"and {n} more",offline:{one:"{n} sensor offline",other:"{n} sensors offline"},safe:"All clear",monitored:{one:"{n} sensor monitored",other:"{n} sensors monitored"},offline_word:"offline",ok:"OK",sensors:"Sensors",no_sensors:"No sensors",people:"People",no_people:"No people",calm:{door:"closed",window:"closed",opening:"closed",garage_door:"closed",moisture:"dry",smoke:"no smoke",gas:"no gas",carbon_monoxide:"no CO"}},tabs:{home:"Home",rooms:"Rooms",media:"Media",clean:"Cleaning",heating:"Heating",usage:"Usage",security:"Security"},media:{home_screen:"Home screen",tv_settings:"Settings",playing_now:"Playing now",living_room:"Living room",nothing:"Nothing playing",previous:"Previous",play_pause:"Play/pause",next:"Next",playing:"Playing",paused:"Paused",unmute:"Unmute",mute:"Mute",vol_down:"Volume down",volume:"Volume",vol_up:"Volume up"},persons:{activity:{Stationary:"Still",Walking:"Walking",Running:"Running",Automotive:"Driving",Cycling:"Cycling"},home:"Home",away:"Away",unknown:"Unknown",dist_m:"{d} m from home",dist_km:"{d} km from home",battery_charging:"Battery \xB7 charging",steps:"Steps today",activity_label:"Activity",connection:"Connection",cellular:"Cellular",map:"Map and history",home_lc:"home",away_lc:"away"},common:{since:{now:"just now",min:"for {n} min",hour:"for {n} h",day:{one:"for {n} day",other:"for {n} days"}},changed:{now:"changed just now",min:"changed {n} min ago",hour:"changed {n} h ago",day:{one:"changed {n} day ago",other:"changed {n} days ago"}},close:"Close",settings:"Settings",unavailable_m:"Unavailable",unavailable_f:"Unavailable",unavailable_n:"Unavailable",on_m:"On",on_n:"On",off_m:"Off",off_n:"Off",turn_on:"Turn on",turn_off:"Turn off",now_value:"Now {v}",humidity:"Humidity",temperature:"Temperature",now:"Now",today:"Today",today_lc:"today",tomorrow_lc:"tomorrow",loading:"Loading\u2026",no_data:"No data",all_ok:"All good",battery:"Battery",less:"Less",more:"More",mode:"Mode",pause:"Pause",resume:"Resume",power_draw:"Power",this_month:"This month",month_cost:"Cost this month",maintenance:"Maintenance",power:"Power",ago:{now:"just now",min:"{n} min ago",hour:"{n} h ago",day:{one:"{n} day ago",other:"{n} days ago"}},age:{now:"just now",min:"{n} min",hour:"{n} h",day:{one:"{n} day",other:"{n} days"}},loading_layout:"Loading your home\u2026",no_integration:"Add the Alvuna integration (Settings \u2192 Devices & services), or write rooms in this card.",no_dashboard_card:"No Alvuna card with rooms on the dashboard \u201C{dashboard}\u201D.",no_rooms:"No rooms yet: assign lights or temperature sensors to areas in Home Assistant."},cleaning:{vacuum_state:{cleaning:"Cleaning",docked:"Docked",returning:"Returning to dock",paused:"Paused",idle:"Ready",error:"Error",unavailable:"Unavailable"},suction:{quiet:"Quiet",silent:"Quiet",standard:"Standard",strong:"Strong",turbo:"Turbo",max:"Max"},vacuum_mode:{Sweeping:"Vacuum",Mopping:"Mop","Sweeping and mopping":"Vacuum and mop"},wear:{main_brush_left:"Main brush",side_brush_left:"Side brush",filter_left:"Filter",mop_pad_left:"Mop",sensor_dirty_left:"Sensors"},start:"Clean",vacuum:"Vacuum",suction_label:"Suction",map:"Cleaning map",area:"Area",time:"Time",pause:"Pause",start_btn:"Start",stop:"Stop",dock:"Dock",locate:"Locate",room:"Clean a room",no_devices:"No devices"},appliances:{program:{"detecting...":"Detecting program",detecting:"Detecting program"},state:{off:"Off",idle:"Ready",starting:"Starting",running:"Running",paused:"Paused",user_paused:"Paused",ending:"Finishing",finished:"Finished",anti_wrinkle:"Anti-crease",delay_wait:"Delayed start",interrupted:"Interrupted",force_stopped:"Stopped",clean:"Ready to unload",unknown:"No data"},maint:"{n} cycles since last time \xB7 every {every}",cycles:"{n} cycles",unloaded:"Unloaded",left:"{n} min left",program_label:"Program",phase:"Phase",duration:"Cycle time",energy_today:"Energy today",cycles_label:"Cycles"},plants:{metrics:{moisture:{label:"Soil moisture",Low:"Dry \u2014 water the plant",High:"Too wet \u2014 hold off watering"},illuminance:{label:"Light",Low:"Too dark \u2014 move it closer to a window",High:"Too bright \u2014 move it away from the window"},dli:{label:"Daily light (DLI)",Low:"Not enough light during the day \u2014 move it closer to a window",High:"Too much sun \u2014 move it away from the window"},temperature:{label:"Temperature",Low:"Too cold",High:"Too warm"},humidity:{label:"Air humidity",Low:"Air too dry \u2014 mist the leaves",High:"Air too humid"}},attention:"Needs attention",ok:"Healthy",plant:"Plant",range:"range {range}",in_range:"In range",low:"Too low",high:"Too high",sensor_battery:"Sensor battery"},home:{battery_no_signal:"no signal",battery_low:"low",kiosk_exit:"Exit kiosk mode",kiosk:"Kiosk mode",lights_on:{one:"{n} light on at home",other:"{n} lights on at home"},all_off:"All lights off",status:"Home",all_on_btn:"All on",all_off_btn:"All off",attention:"Needs attention:"},scenes:{title:"Scenes"},waste:{today:"Pickup today:",tomorrow:"Pickup tomorrow:",in_days:"in {n} days",title:"Waste collection",none:"No pickups in the next 3 weeks",loading:"Loading schedule\u2026",note:"Put the bins out by 6:00 on pickup day."},rooms:{humidity:"Humidity {v}%",humidity_none:"Humidity \u2013",no_lights:"No lights",all_off:"All off",all_on:"All on",some_on:"{n} of {total} on",power:"{name} power",no_lights_room:"No lights in this room",power_now:"Power now"},devices:{active:"Active",asleep:"Asleep",charging:"charging",sleep_label:"Put {name} to sleep",sleep:"Sleep",sleeping:"Going to sleep\u2026"},climate:{humidity_short:"{v}% humidity",outside:"{t}\xB0 outside",title:"Climate",humidifier_off:"{name} off",heating_off:"Heating off",heating_word:"Heating to",holding_word:"Holding",boost_note:"1 h boost",boost_left:", {n} min left",manual:"manual, schedule {t}\xB0",cooler:"Cooler",warmer:"Warmer",schedule:"Schedule",boost:"1 h boost",outdoor:"Outside",humid:"humid",dry:"dry",average:"Average {t}\xB0 indoors",humidifier_modes:{auto:"auto",eco:"eco",laundry:"laundry",purify:"purify",sleep:"sleep",normal:"normal",boost:"boost"},drying:"Drying",humidifying:"Humidifying",holding_humidity:"Holding humidity",target:"target {v}",humidity_lower:"Lower target humidity",humidity_higher:"Raise target humidity"},todo:{error:"Couldn't load the list",open:{one:"{n} item to do",other:"{n} items to do"},all_done:"All done",add_placeholder:"Add item\u2026",new_item:"New item",add:"Add",done:"Done \xB7 {n}",clear:"Clear"},usage:{days:"{n} days",prev_month:"Last month",approx:"\u2248 {v}",this_month:"This month",data_until:"Data until"},heating:{burner_starts:{one:"burner \xB7 {n} start",other:"burner \xB7 {n} starts"},burner_time:"burner time",run_today:"Run time today",starts_today:"Starts today",loading:"Loading\u2026",no_data_24h:"No data from the last 24 hours",flow:"Flow",return:"Return",target_short:"Target",burner:"Burner",condense_line:"45\xB0 \xB7 the boiler condenses below this",goal:"target {t}\xB0",loop_aria:"Boiler and radiator: flow {flow}, return {ret}, radiator {rad}, indoors {room}",dhw_short:"DHW",gas_lc:"gas",boiler_lc:"boiler",radiator_lc:"radiator",indoors:"indoors",flow_lc:"flow",return_lc:"return",water_lc:"water",outside_lc:"outside",thermostat:"Thermostat",now_lc:"now {t}\xB0",boiler_line:"Boiler:",power_pct:"{n}% power",power_min:"minimum power",offline:"No connection",esp_silent:"ESP not responding",fault:"Boiler fault",check_display:"check the boiler display",heating_water:"Heating water",heating_home:"Heating the home",burner_resting:"Burner resting",pump:"pump circulating",waiting:"Waiting",water_warmer:"boiler water {t}\xB0 \u2013 warmer than needed",igniting:"burner about to light",heating_off:"Heating off",no_demand:"thermostat needs no heat",condensing:"Condensing",partial:"Partly condensing",no_condensing:"Not condensing",target_water_lc:"target water",delta:"spread {t}\xB0",gas_cost:"gas \xB7 about {v}",gas_estimate:"gas (estimate)",pressure_low:"pressure \xB7 top up water",pressure_lc:"water pressure",hot_water_lc:"hot water",since_morning:"Since this morning",last_24h:"Last 24 h",curve:"Heating curve",slope_lc:"slope",offset_lc:"offset",from_room:"from room",min:"Lowest",avg:"Average",max:"Highest",info:{flow:{title:"Flow",hint:"Water going from the boiler to the radiators. On the weather curve usually 35\u201350\xB0, lower the warmer it is outside."},return:{title:"Return",hint:"Water coming back from the radiators. Below 45\xB0 the boiler condenses and burns less gas."},setpoint:{title:"Target water",hint:"The water temperature the controller asks the boiler for: the weather curve plus the living-room correction."},curve:{title:"Curve water",hint:"The weather curve's result including the room correction."},correction:{title:"Room correction",hint:"How much the controller adds to the curve when the living room is too cold (or takes off when too warm). Builds up slowly."},dhw:{title:"Hot water",hint:"Hot water temperature in the boiler. The boiler heats it as soon as someone opens a tap."},pressure:{title:"Water pressure",hint:"1.2\u20131.5 bar recommended on a cold boiler (a bit more when warm). Below 0.7 bar the boiler stops (E59), and above 2.7 bar too."},outdoor:{title:"Outside",hint:"The outdoor temperature the curve is worked out from."},radiator:{title:"Radiator",hint:"Sensor on the living-room radiator."},modulation:{title:"Burner power",hint:"0% is the smallest flame (about 4 kW), 100% full power."},gas_today:{title:"Gas today",hint:"Estimated from burner power (modulation and the boiler manual's data) since midnight. Calibrating against the meter will make it more accurate."},flame:{title:"Burner",hint:"How long the burner has run since midnight and how many times it lit. On the curve it burns long at low power, with few starts."},status:{title:"Boiler status",hint:"Problems Home Assistant can see. Urgent ones (red) also arrive as a critical alert on the iPhone."},slope:{title:"Curve slope",hint:"How many degrees the water temperature rises for each degree colder outside. Lower = cheaper, but slower to warm up."},offset:{title:"Curve offset",hint:"Moves the whole curve up or down. If the home is always too warm, lower it by 1\u20132\xB0."}},burning_pct:"on \xB7 {n}%",not_burning:"off",cost_today:"Cost today",about:"about {v}",draw_now:"Using now",set_temp:"Set temperature",setting:"Setting",from_curve:"From curve",correction:"Correction",burning:"On",not_burning_big:"Off",sensor_outdoor:"Outdoor sensor",room:"Room",boiler:"Boiler",details:"Details and full history"},covers:{opening:"Opening\u2026",closing:"Closing\u2026",closed:"Closed",open:"Open",open_pct:"{n}% open",up:"Raise",stop:"Stop",down:"Lower",position:"Blind position"},lights:{color_tone:"Color and white",tone:"White tone",brightness:"Brightness",color_temp:"Color temperature",color:"Color"},cameras:{count:"Cameras \xB7 {n}",title:"Cameras",fullscreen:"Full screen",live:"Live",connecting:"Connecting\u2026",exit_fullscreen:"Exit full screen"},tv:{lights_on:{one:"{n} light on",other:"{n} lights on"},min_left:"{n} min left",no_airing_lc:"keep the windows shut",indoors:"Indoors",off_lc:"off",on_short:"On",off_short:"Off",scene_active:"active",since_time:"since {t}",sensors_ok:{one:"{n} sensor OK",other:"{n} sensors OK"},rows:{working:"Running now",climate:"Climate and weather"},humidity_lc:"humidity {v}%",room_empty:"No devices in this room",media:{muted_hint:"Muted \xB7 OK unmutes",mute_hint:"OK mutes",playing:"Playing",now_playing:"Now playing",no_controls:"No controls for this device"},rain:{showers:"Showers in the next few hours",showers_snow:"Snow showers in the next few hours",rain_on:"Rain for the next few hours",snow_on:"Snow for the next few hours",rain_until:"Rain until about {t}",snow_until:"Snow until about {t}",rain_from:"Rain from about {t}",snow_from:"Snow from about {t}",dry_until:"No rain until {t}"},weather:{feels:"feels like {t}\xB0",day_length:"daylight {h} h {m} min",gusts:"gusts {n}",clouds:"cloud cover {n}%",steady:"steady",rising:"rising",falling:"falling",sun:"Sun",precip:"Precipitation",in_24h:"in the next 24 hours",next_24h:"Next 24 hours",no_hourly:"No hourly forecast",loading:"Loading forecast\u2026",forecast_days:{one:"{n}-day forecast",other:"{n}-day forecast"}},climate:{turn_off:"Turn heating off",turn_on:"Turn heating on",average:"Average {t}\xB0 indoors"},history:{yesterday:"yesterday {t}",loading:"Loading the last 24 hours\u2026",error:"Couldn't load the history",total:"Total",last:"Last",ongoing:"ongoing",over_day:"over a day ago",events:"Events",from:"Since {t}",value:"Value",since_yesterday:"Since yesterday",no_data:"No readings from the last 24 hours"},binary:{unavailable:"unavailable",ok:"all good",active:"active"},events:{open:{count:{one:"{n} opening",other:"{n} openings"},none:"No openings"},water:{count:{one:"Water detected once",other:"Water detected {n} times"},none:"No water detected"},motion:{count:{one:"{n} motion",other:"{n} motions"},none:"No motion"},other:{count:{one:"{n} event",other:"{n} events"},none:"No events"}},notif:{title:"Notification",dismissed:"Notification dismissed",gone:"It's no longer in Home Assistant.",dismiss:"Dismiss",dismiss_hint:"Also removes it from Home Assistant"},update:{skip:"Skip this version",skip_hint:"Also skipped in Home Assistant; back with the next one",hide:"Hide here only",hide_hint:"Until the next version"},battery:"Battery {n}%",battery_lc:"battery {n}%",battery_hide:"Hide until the battery is replaced",battery_hide_hint:"Comes back when it runs low again",alarm:{history:"Show history",history_hint:"Last 24 hours",hide:"Hide until it closes",hide_hint:"Comes back the next time it opens"},summary:{battery_low:"Low battery",update_to:"Update to {v}",update:"Update",lights:"Lights",lights_on:{one:"{n} on",other:"{n} on"},ok_off:"OK turns off",all_off:"All off",people_home:"{n} of {total} home",nobody:"Nobody",heating:"Heating",unload_hint:"OK once unloaded",waste_today:"Pickup today",waste_tomorrow:"Pickup tomorrow",imgw:"IMGW warning",title:"Overview",attention:{one:"{n} item needs attention",other:"{n} items need attention"},all_clear:"Nothing needs attention",attention_title:"Needs attention"},vac:{resume:"Resume cleaning",pause_hint:"Stays where it is",start_hint:"Whole home, as in the app",dock:"Return to dock",dock_hint:"Ends cleaning",suction:"Suction"},app:{pause_hint:"The cycle will wait",resume_hint:"The cycle carries on",unloaded_hint:"Leaves the overview until the next cycle",total:"Whole cycle",to_go:"to go"},settings:{subtitle:"On this TV",look:"Appearance",wallpaper:"Wallpaper",accent:"Accent color",accent_hint:"Selection and what is on",performance:"Performance",anim:"Animations",anim_hint:"Turn off on a slower TV",accent_sub:"What lights up and shows selection",wallpaper_sub:"Background of the whole screen",photos:"Photos",colors:"Colors",screen:"Screen and OLED care",saver:"Screensaver",saver_hint:"A clock on black",dim:"Dimming",dim_hint:"Dims before the screensaver",shift:"Pixel shift",shift_hint:"A few pixels every 3 min",exit:"Close the app after",exit_hint:"With the remote unused",off:"Off",never:"Never",min:"{n} min",from_ha:"from HA",glass:"Tiles",glass_frost:"Frosted glass",glass_solid:"Full color",glass_clear:"Transparent",glass_frost_hint:"Blurred wallpaper; the nicest",glass_solid_hint:"Wallpaper's color; the lightest",glass_clear_hint:"The wallpaper shows through",ring:"Focus outline",ring_hint:"A ring in the accent color",connection:"Connection",homes:"Homes",logout:"Sign this TV out",logout_hint:"Of {name}; then pair again",logout_confirm:"Press OK again to sign out"},instances:{current:"Showing now",title:"Homes",sub:"OK switches, the pencil renames, the bin removes"},camera:{preview:"Preview"},reconnecting:"Reconnecting to Home Assistant\u2026",failed:"That didn't work: {msg}",switching:"Connecting to {name}\u2026",unreachable:"{name}: server not reachable from this network",connecting:"Connecting to Home Assistant\u2026",connect_failed:"Can't connect to Home Assistant.",no_card:"Dashboard \u201C{dashboard}\u201D has no Alvuna card",wallpapers:{homedeck:{name:"Alvuna",sub:"Teal, the default"},glebia:{name:"Deep",sub:"Dark blue"},noc:{name:"Night",sub:"Navy and violet"},zorza:{name:"Aurora",sub:"Green and violet on navy"},las:{name:"Forest",sub:"Deep green"},zachod:{name:"Sunset",sub:"Warm evening"},grafit:{name:"Graphite",sub:"Neutral grey"},czern:{name:"Black",sub:"True OLED black"},"foto-zorza":{name:"Northern lights",sub:"Green lights over a lake"},"foto-las":{name:"Misty forest",sub:"Pines in the fog"},"foto-morze":{name:"Moon over the sea",sub:"The sea at night"},"foto-gory":{name:"Mountains at dusk",sub:"Blue ridges"},"foto-gwiazdy":{name:"Milky Way",sub:"Night sky over the mountains"},"foto-baltyk":{name:"Sunset over the sea",sub:"Warm light on the water"},"foto-miasto":{name:"City lights",sub:"Blurred lights at night"},"foto-snieg":{name:"Winter night",sub:"Snowy peak and stars"},"foto-fale":{name:"Teal waves",sub:"Abstract in Alvuna colors"},"foto-mgla":{name:"Mist over a lake",sub:"The shore at dawn"}},accents:{limonka:"Lime",turkus:"Turquoise",blekit:"Sky blue",fiolet:"Violet",roz:"Pink",koral:"Coral",zloto:"Gold",bialy:"White",dab:"Oak"},pair_title:"Pair this TV",pair_asking:"Asking Home Assistant for a code\u2026",pair_steps:"In Home Assistant open Settings \u2192 Devices &amp; services. Under Discovered, pick Alvuna TV and type this code.",pair_busy:"Home Assistant is not answering, or Alvuna is not set up there yet. Trying again\u2026",pair_login:"To use your own account instead, open {url}",camera_unknown:"Camera {entity} is not in Alvuna\u2019s layout",no_layout:"No layout yet: add the Alvuna integration in Home Assistant.",home:{add:"Add a home",add_hint:"Another Home Assistant with Alvuna",add_sub:"Its Home Assistant's address",address_hint:"For example 192.168.1.20, homeassistant.local or https://home.example.com. Without a port, 8123.",connect:"Connect",connect_hint:"The TV goes there and asks to be paired",bad_address:"That does not look like an address",rename:"Home name",save:"Save"},hold:{sub:"OK held",hide:"Hide in Alvuna",hide_hint:"Gone from the TVs; bring it back in the Alvuna panel in HA",cancel:"Cancel",hidden:"Hidden. Bring it back in the Alvuna panel in Home Assistant.",failed:"Could not hide it"},remote:{no_room:"That room is not on this TV."}}};var Ue={weather:{conditions:{"clear-night":"Pogodnie",cloudy:"Pochmurno",exceptional:"Nietypowo",fog:"Mg\u0142a",hail:"Grad",lightning:"Burza","lightning-rainy":"Burza z deszczem",partlycloudy:"Cz\u0119\u015Bciowe zachm.",pouring:"Ulewa",rainy:"Deszcz",snowy:"\u015Anieg","snowy-rainy":"Deszcz ze \u015Bniegiem",sunny:"S\u0142onecznie",windy:"Wietrznie","windy-variant":"Wietrznie"},wind:["Pn","Pn-Wsch","Wsch","Pd-Wsch","Pd","Pd-Zach","Zach","Pn-Zach"],air:{very_good:"bardzo dobre",good:"dobre",moderate:"umiarkowane",sufficient:"dostateczne",bad:"z\u0142e",very_bad:"bardzo z\u0142e"},imgw:{storms:"Burze",dense_fog:"G\u0119sta mg\u0142a",heavy_rainfall:"Intensywne opady deszczu",heavy_snowfall:"Intensywne opady \u015Bniegu",icing:"Oblodzenie",freezing_rain:"Marzn\u0105cy deszcz",snowfall:"Opady \u015Bniegu",frosts:"Przymrozki",thaw:"Roztopy",heavy_rain_with_storms:"Ulewy z burzami",heavy_frost:"Silny mr\xF3z",strong_wind:"Silny wiatr",heat:"Upa\u0142",snow_blizzard:"Zamie\u0107 \u015Bnie\u017Cna"},warning:"Ostrze\u017Cenie: {alert}",smog:"Smog",imgw_line:"Ostrze\u017Cenie IMGW:",air_line:"Powietrze {label}",no_airing:"Lepiej nie wietrzy\u0107",wind_label:"Wiatr",pressure:"Ci\u015Bnienie",clouds:"Zachmurzenie",air_label:"Powietrze",no_forecast:"Brak prognozy",loading:"\u0141adowanie prognozy\u2026",title:"Pogoda",night:"noc",high_low:"Maks. {hi}\xB0 \xB7 Min. {lo}\xB0",imgw_source:"Komunikat IMGW-PIB",hours:"Najbli\u017Csze godziny",days:"Kolejne dni",partlycloudy_long:"Cz\u0119\u015Bciowe zachmurzenie"},security:{alert:{door:"otwarte",window:"otwarte",opening:"otwarte",garage_door:"otwarta",moisture:"zalanie",smoke:"dym",gas:"gaz",carbon_monoxide:"czad",safety:"alarm",problem:"problem"},attention:"uwaga",more:"i {n} wi\u0119cej",offline:{one:"{n} czujnik offline",few:"{n} czujniki offline",many:"{n} czujnik\xF3w offline",other:"{n} czujnik\xF3w offline"},safe:"Bezpiecznie",monitored:{one:"{n} monitorowany czujnik",few:"{n} monitorowane czujniki",many:"{n} monitorowanych czujnik\xF3w",other:"{n} monitorowanych czujnik\xF3w"},offline_word:"offline",ok:"OK",sensors:"Czujniki",no_sensors:"Brak czujnik\xF3w",people:"Domownicy",no_people:"Brak os\xF3b",calm:{door:"zamkni\u0119te",window:"zamkni\u0119te",opening:"zamkni\u0119te",garage_door:"zamkni\u0119ta",moisture:"sucho",smoke:"brak dymu",gas:"brak gazu",carbon_monoxide:"brak czadu"}},tabs:{home:"Dom",rooms:"Pokoje",media:"Media",clean:"Porz\u0105dki",heating:"Ogrzewanie",usage:"Zu\u017Cycie",security:"Ochrona"},media:{home_screen:"Ekran g\u0142\xF3wny",tv_settings:"Ustawienia",playing_now:"Gra teraz",living_room:"Salon",nothing:"Nic nie gra",previous:"Poprzedni",play_pause:"Odtw\xF3rz/pauza",next:"Nast\u0119pny",playing:"Odtwarzanie",paused:"Wstrzymane",unmute:"W\u0142\u0105cz d\u017Awi\u0119k",mute:"Wycisz",vol_down:"Ciszej",volume:"G\u0142o\u015Bno\u015B\u0107",vol_up:"G\u0142o\u015Bniej"},persons:{activity:{Stationary:"W spoczynku",Walking:"Spacer",Running:"Bieg",Automotive:"W samochodzie",Cycling:"Rower"},home:"W domu",away:"Poza domem",unknown:"Nieznane",dist_m:"{d} m od domu",dist_km:"{d} km od domu",battery_charging:"Bateria \xB7 \u0142aduje",steps:"Kroki dzi\u015B",activity_label:"Aktywno\u015B\u0107",connection:"Po\u0142\u0105czenie",cellular:"Kom\xF3rkowe",map:"Mapa i historia",home_lc:"w domu",away_lc:"poza domem"},common:{since:{now:"od chwili",min:"od {n} min",hour:"od {n} godz.",day:{one:"od {n} dnia",few:"od {n} dni",many:"od {n} dni",other:"od {n} dni"}},changed:{now:"zmiana przed chwil\u0105",min:"zmiana {n} min temu",hour:"zmiana {n} godz. temu",day:{one:"zmiana {n} dzie\u0144 temu",few:"zmiana {n} dni temu",many:"zmiana {n} dni temu",other:"zmiana {n} dni temu"}},close:"Zamknij",settings:"Ustawienia",unavailable_m:"Niedost\u0119pny",unavailable_f:"Niedost\u0119pna",unavailable_n:"Niedost\u0119pne",on_m:"W\u0142\u0105czony",on_n:"W\u0142\u0105czone",off_m:"Wy\u0142\u0105czony",off_n:"Wy\u0142\u0105czone",turn_on:"W\u0142\u0105cz",turn_off:"Wy\u0142\u0105cz",now_value:"Teraz {v}",humidity:"Wilgotno\u015B\u0107",temperature:"Temperatura",now:"Teraz",today:"Dzi\u015B",today_lc:"dzi\u015B",tomorrow_lc:"jutro",loading:"\u0141adowanie\u2026",no_data:"Brak danych",all_ok:"Wszystko w porz\u0105dku",battery:"Bateria",less:"Mniej",more:"Wi\u0119cej",mode:"Tryb",pause:"Wstrzymaj",resume:"Wzn\xF3w",power_draw:"Moc",this_month:"Ten miesi\u0105c",month_cost:"Koszt w miesi\u0105cu",maintenance:"Konserwacja",power:"Zasilanie",ago:{now:"przed chwil\u0105",min:"{n} min temu",hour:"{n} godz. temu",day:{one:"{n} dzie\u0144 temu",few:"{n} dni temu",many:"{n} dni temu",other:"{n} dni temu"}},age:{now:"przed chwil\u0105",min:"{n} min",hour:"{n} godz.",day:{one:"{n} dzie\u0144",few:"{n} dni",many:"{n} dni",other:"{n} dni"}},loading_layout:"Wczytuj\u0119 dom\u2026",no_integration:"Dodaj integracj\u0119 Alvuna (Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi) albo wpisz pokoje w tej karcie.",no_dashboard_card:"Na dashboardzie \u201E{dashboard}\u201D nie ma karty Alvuna z pokojami.",no_rooms:"Nie ma jeszcze pokoi: przypisz \u015Bwiat\u0142a albo czujniki temperatury do obszar\xF3w w Home Assistancie."},cleaning:{vacuum_state:{cleaning:"Sprz\u0105ta",docked:"W stacji",returning:"Wraca do stacji",paused:"Wstrzymany",idle:"Gotowy",error:"B\u0142\u0105d",unavailable:"Niedost\u0119pny"},suction:{quiet:"Cicho",silent:"Cicho",standard:"Standard",strong:"Mocno",turbo:"Turbo",max:"Max"},vacuum_mode:{Sweeping:"Odkurzanie",Mopping:"Mopowanie","Sweeping and mopping":"Odkurzanie z mopem"},wear:{main_brush_left:"Szczotka g\u0142\xF3wna",side_brush_left:"Szczotka boczna",filter_left:"Filtr",mop_pad_left:"Mop",sensor_dirty_left:"Czujniki"},start:"Sprz\u0105taj",vacuum:"Odkurzacz",suction_label:"Moc ssania",map:"Mapa sprz\u0105tania",area:"Powierzchnia",time:"Czas",pause:"Pauza",start_btn:"Start",stop:"Stop",dock:"Do stacji",locate:"Znajd\u017A",room:"Sprz\u0105taj pok\xF3j",no_devices:"Brak urz\u0105dze\u0144"},appliances:{program:{"detecting...":"Rozpoznaje program",detecting:"Rozpoznaje program"},state:{off:"Wy\u0142\u0105czona",idle:"Gotowa",starting:"Uruchamia si\u0119",running:"Pracuje",paused:"Wstrzymana",user_paused:"Wstrzymana",ending:"Ko\u0144czy",finished:"Zako\u0144czona",anti_wrinkle:"Ochrona przed zagnieceniem",delay_wait:"Op\xF3\u017Aniony start",interrupted:"Przerwana",force_stopped:"Zatrzymana",clean:"Gotowe do wyj\u0119cia",unknown:"Brak danych"},maint:"{n} cykli od ostatniego razu \xB7 co {every}",cycles:"{n} cykli",unloaded:"Wyj\u0119te",left:"zosta\u0142o {n} min",program_label:"Program",phase:"Faza",duration:"Czas cyklu",energy_today:"Energia dzi\u015B",cycles_label:"Cykle"},plants:{metrics:{moisture:{label:"Wilgotno\u015B\u0107 gleby",Low:"Sucho \u2014 podlej ro\u015Blin\u0119",High:"Za mokro \u2014 wstrzymaj podlewanie"},illuminance:{label:"\u015Awiat\u0142o",Low:"Za ciemno \u2014 przestaw bli\u017Cej okna",High:"Za jasno \u2014 odsu\u0144 od okna"},dli:{label:"\u015Awiat\u0142o dzienne (DLI)",Low:"Za ma\u0142o \u015Bwiat\u0142a w ci\u0105gu dnia \u2014 przestaw bli\u017Cej okna",High:"Za du\u017Co s\u0142o\u0144ca \u2014 odsu\u0144 od okna"},temperature:{label:"Temperatura",Low:"Za zimno",High:"Za ciep\u0142o"},humidity:{label:"Wilgotno\u015B\u0107 powietrza",Low:"Za suche powietrze \u2014 zrosi\u0107 li\u015Bcie",High:"Za wilgotne powietrze"}},attention:"Wymaga uwagi",ok:"W porz\u0105dku",plant:"Ro\u015Blina",range:"zakres {range}",in_range:"W normie",low:"Za ma\u0142o",high:"Za du\u017Co",sensor_battery:"Bateria czujnika"},home:{battery_no_signal:"brak sygna\u0142u",battery_low:"s\u0142aba",kiosk_exit:"Wyjd\u017A z trybu kiosku",kiosk:"Tryb kiosku",lights_on:{one:"{n} \u015Bwiat\u0142o w\u0142\u0105czone w domu",few:"{n} \u015Bwiat\u0142a w\u0142\u0105czone w domu",many:"{n} \u015Bwiate\u0142 w\u0142\u0105czonych w domu",other:"{n} \u015Bwiate\u0142 w\u0142\u0105czonych w domu"},all_off:"Wszystkie \u015Bwiat\u0142a wy\u0142\u0105czone",status:"Status domu",all_on_btn:"W\u0142\u0105cz wszystkie",all_off_btn:"Wy\u0142\u0105cz wszystkie",attention:"Wymaga uwagi:"},scenes:{title:"Sceny"},waste:{today:"Dzi\u015B wyw\xF3z:",tomorrow:"Jutro wyw\xF3z:",in_days:"za {n} dni",title:"Wyw\xF3z \u015Bmieci",none:"Brak odbior\xF3w w najbli\u017Cszych 3 tygodniach",loading:"Wczytuj\u0119 harmonogram\u2026",note:"Pojemniki wystaw przed posesj\u0119 do 6:00 w dniu odbioru."},rooms:{humidity:"Wilgotno\u015B\u0107 {v}%",humidity_none:"Wilgotno\u015B\u0107 \u2013",no_lights:"Brak \u015Bwiate\u0142",all_off:"Wszystko wy\u0142\u0105czone",all_on:"Wszystkie w\u0142\u0105czone",some_on:"W\u0142\u0105czone {n} z {total}",power:"Zasilanie {name}",no_lights_room:"Brak \u015Bwiate\u0142 w tym pokoju",power_now:"Moc teraz"},devices:{active:"Aktywny",asleep:"U\u015Bpiony",charging:"\u0142aduje",sleep_label:"U\u015Bpij {name}",sleep:"U\u015Bpij",sleeping:"Usypiam\u2026"},climate:{humidity_short:"{v}% wilg.",outside:"na zewn\u0105trz {t}\xB0",title:"Klimat",humidifier_off:"{name} wy\u0142\u0105czony",heating_off:"Ogrzewanie wy\u0142\u0105czone",heating_word:"Grzeje do",holding_word:"Utrzymuje",boost_note:"grzanie 1h",boost_left:", jeszcze {n} min",manual:"r\u0119cznie, harmonogram {t}\xB0",cooler:"Ch\u0142odniej",warmer:"Cieplej",schedule:"Harmonogram",boost:"Grzanie 1h",outdoor:"Na zewn\u0105trz",humid:"wilgotno",dry:"sucho",average:"\u015Arednio {t}\xB0 w mieszkaniu",humidifier_modes:{auto:"auto",eco:"eko",laundry:"pranie",purify:"oczyszczanie",sleep:"noc",normal:"normalny",boost:"turbo"},drying:"Osusza",humidifying:"Nawil\u017Ca",holding_humidity:"Trzyma wilgotno\u015B\u0107",target:"cel {v}",humidity_lower:"Ni\u017Cszy cel wilgotno\u015Bci",humidity_higher:"Wy\u017Cszy cel wilgotno\u015Bci"},todo:{error:"Nie uda\u0142o si\u0119 wczyta\u0107 listy",open:{one:"{n} pozycja do zrobienia",few:"{n} pozycje do zrobienia",many:"{n} pozycji do zrobienia",other:"{n} pozycji do zrobienia"},all_done:"Wszystko zrobione",add_placeholder:"Dodaj pozycj\u0119\u2026",new_item:"Nowa pozycja",add:"Dodaj",done:"Zrobione \xB7 {n}",clear:"Wyczy\u015B\u0107"},usage:{days:"{n} dni",prev_month:"Poprzedni miesi\u0105c",approx:"\u2248 {v}",this_month:"W tym miesi\u0105cu",data_until:"Dane do"},heating:{burner_starts:{one:"palnik \xB7 {n} zapalenie",few:"palnik \xB7 {n} zapalenia",many:"palnik \xB7 {n} zapale\u0144",other:"palnik \xB7 {n} zapale\u0144"},burner_time:"pracy palnika",run_today:"Pracy dzi\u015B",starts_today:"Zapale\u0144 dzi\u015B",loading:"Wczytywanie\u2026",no_data_24h:"Brak danych z ostatniej doby",flow:"Zasilanie",return:"Powr\xF3t",target_short:"Zadane",burner:"Palnik",condense_line:"45\xB0 \xB7 poni\u017Cej kocio\u0142 kondensuje",goal:"cel {t}\xB0",loop_aria:"Kocio\u0142 i grzejnik: zasilanie {flow}, powr\xF3t {ret}, grzejnik {rad}, w domu {room}",dhw_short:"CWU",gas_lc:"gaz",boiler_lc:"kocio\u0142",radiator_lc:"grzejnik",indoors:"w domu",flow_lc:"zasilanie",return_lc:"powr\xF3t",water_lc:"woda",outside_lc:"na zewn\u0105trz",thermostat:"Termostat",now_lc:"teraz {t}\xB0",boiler_line:"Kocio\u0142:",power_pct:"{n}% mocy",power_min:"minimalna moc",offline:"Brak po\u0142\u0105czenia",esp_silent:"ESP nie odpowiada",fault:"Awaria kot\u0142a",check_display:"sprawd\u017A wy\u015Bwietlacz kot\u0142a",heating_water:"Grzeje wod\u0119",heating_home:"Grzeje dom",burner_resting:"Palnik odpoczywa",pump:"pompa kr\u0105\u017Cy wod\u0105",waiting:"Czeka",water_warmer:"woda w kotle {t}\xB0 \u2013 cieplejsza ni\u017C potrzeba",igniting:"zaraz zapali palnik",heating_off:"Grzanie wy\u0142\u0105czone",no_demand:"termostat nie potrzebuje ciep\u0142a",condensing:"Kondensuje",partial:"Cz\u0119\u015Bciowa kondensacja",no_condensing:"Bez kondensacji",target_water_lc:"woda zadana",delta:"r\xF3\u017Cnica {t}\xB0",gas_cost:"gaz \xB7 ok. {v}",gas_estimate:"gaz (szacunek)",pressure_low:"ci\u015Bnienie \xB7 dolej wody",pressure_lc:"ci\u015Bnienie wody",hot_water_lc:"ciep\u0142a woda",since_morning:"Od rana",last_24h:"Ostatnie 24 h",curve:"Krzywa grzewcza",slope_lc:"nachylenie",offset_lc:"przesuni\u0119cie",from_room:"z pokoju",min:"Najni\u017Cej",avg:"\u015Arednio",max:"Najwy\u017Cej",info:{flow:{title:"Zasilanie",hint:"Woda p\u0142yn\u0105ca z kot\u0142a do grzejnik\xF3w. Na krzywej pogodowej zwykle 35\u201350\xB0, im cieplej na zewn\u0105trz, tym ni\u017Cej."},return:{title:"Powr\xF3t",hint:"Woda wracaj\u0105ca z grzejnik\xF3w do kot\u0142a. Poni\u017Cej 45\xB0 kocio\u0142 kondensuje i spala mniej gazu."},setpoint:{title:"Woda zadana",hint:"Temperatura wody, kt\xF3r\u0105 sterownik zamawia u kot\u0142a: krzywa pogodowa plus korekta z pokoju dziennego."},curve:{title:"Woda z krzywej",hint:"Wynik krzywej pogodowej razem z korekt\u0105 pokojow\u0105."},correction:{title:"Korekta z pokoju",hint:"Ile sterownik dok\u0142ada do krzywej, gdy w pokoju dziennym jest za zimno (albo ujmuje, gdy za ciep\u0142o). Narasta powoli."},dhw:{title:"Ciep\u0142a woda",hint:"Temperatura ciep\u0142ej wody w kotle. Kocio\u0142 grzeje j\u0105 od razu, gdy kto\u015B odkr\u0119ci kran."},pressure:{title:"Ci\u015Bnienie wody",hint:"Zalecane 1,2\u20131,5 bar na zimnym kotle (na ciep\u0142ym troch\u0119 wi\u0119cej). Poni\u017Cej 0,7 bar kocio\u0142 staje (E59), powy\u017Cej 2,7 bar te\u017C."},outdoor:{title:"Na zewn\u0105trz",hint:"Temperatura zewn\u0119trzna, z kt\xF3rej liczy si\u0119 krzywa."},radiator:{title:"Grzejnik",hint:"Czujnik na grzejniku w pokoju dziennym."},modulation:{title:"Moc palnika",hint:"0% to najmniejszy p\u0142omie\u0144 (ok. 4 kW), 100% to pe\u0142na moc."},gas_today:{title:"Gaz dzi\u015B",hint:"Szacunek z mocy palnika (modulacja i dane z instrukcji kot\u0142a), liczony od p\xF3\u0142nocy. Dok\u0142adno\u015B\u0107 poprawi kalibracja z licznikiem."},flame:{title:"Palnik",hint:"Jak d\u0142ugo palnik pracowa\u0142 od p\xF3\u0142nocy i ile razy si\u0119 zapala\u0142. Na krzywej pali d\u0142ugo na ma\u0142ej mocy, z niewieloma zapaleniami."},status:{title:"Stan kot\u0142a",hint:"Problemy, kt\xF3re widzi Home Assistant. Pilne (czerwone) przychodz\u0105 te\u017C jako alert krytyczny na iPhone'a."},slope:{title:"Nachylenie krzywej",hint:"O ile stopni ro\u015Bnie temperatura wody, gdy na zewn\u0105trz robi si\u0119 o stopie\u0144 zimniej. Mniej = taniej, ale wolniej si\u0119 nagrzewa."},offset:{title:"Przesuni\u0119cie krzywej",hint:"Przesuwa ca\u0142\u0105 krzyw\u0105 w g\xF3r\u0119 lub w d\xF3\u0142. Gdy w domu stale za ciep\u0142o, zmniejsz o 1\u20132\xB0."}},burning_pct:"pali \xB7 {n}%",not_burning:"nie pali",cost_today:"Koszt dzi\u015B",about:"ok. {v}",draw_now:"Pob\xF3r teraz",set_temp:"Ustawiona temperatura",setting:"Ustawienie",from_curve:"Z krzywej",correction:"Korekta",burning:"Pali",not_burning_big:"Nie pali",sensor_outdoor:"Czujnik na zewn\u0105trz",room:"Pok\xF3j",boiler:"Kocio\u0142",details:"Szczeg\xF3\u0142y i pe\u0142na historia"},covers:{opening:"Podnosi si\u0119\u2026",closing:"Opuszcza si\u0119\u2026",closed:"Zamkni\u0119ta",open:"Otwarta",open_pct:"Otwarta w {n}%",up:"Podnie\u015B",stop:"Zatrzymaj",down:"Opu\u015B\u0107",position:"Pozycja rolety"},lights:{color_tone:"Kolor i barwa",tone:"Barwa \u015Bwiat\u0142a",brightness:"Jasno\u015B\u0107",color_temp:"Temperatura barwowa",color:"Kolor"},cameras:{count:"Kamery \xB7 {n}",title:"Kamery",fullscreen:"Pe\u0142ny ekran",live:"Na \u017Cywo",connecting:"\u0141\u0105czenie\u2026",exit_fullscreen:"Zamknij pe\u0142ny ekran"},tv:{lights_on:{one:"{n} \u015Bwiat\u0142o w\u0142\u0105czone",few:"{n} \u015Bwiat\u0142a w\u0142\u0105czone",many:"{n} \u015Bwiate\u0142 w\u0142\u0105czonych",other:"{n} \u015Bwiate\u0142 w\u0142\u0105czonych"},min_left:"jeszcze {n} min",no_airing_lc:"lepiej nie wietrzy\u0107",indoors:"W domu",off_lc:"wy\u0142\u0105czone",on_short:"W\u0142.",off_short:"Wy\u0142.",scene_active:"aktywna",since_time:"od {t}",sensors_ok:{one:"{n} czujnik w porz\u0105dku",few:"{n} czujniki w porz\u0105dku",many:"{n} czujnik\xF3w w porz\u0105dku",other:"{n} czujnik\xF3w w porz\u0105dku"},rows:{working:"Teraz pracuje",climate:"Klimat i pogoda"},humidity_lc:"wilgotno\u015B\u0107 {v}%",room_empty:"Brak urz\u0105dze\u0144 w tym pokoju",media:{muted_hint:"Wyciszone \xB7 OK w\u0142\u0105cza d\u017Awi\u0119k",mute_hint:"OK wycisza",playing:"Odtwarza",now_playing:"Teraz gra",no_controls:"Brak sterowania dla tego urz\u0105dzenia"},rain:{showers:"Przelotne opady w najbli\u017Cszych godzinach",showers_snow:"Przelotne opady \u015Bniegu w najbli\u017Cszych godzinach",rain_on:"Opady przez najbli\u017Csze godziny",snow_on:"\u015Anieg przez najbli\u017Csze godziny",rain_until:"Opady do ok. {t}",snow_until:"\u015Anieg do ok. {t}",rain_from:"Deszcz od ok. {t}",snow_from:"\u015Anieg od ok. {t}",dry_until:"Bez opad\xF3w do {t}"},weather:{feels:"odczuwalna {t}\xB0",day_length:"dzie\u0144 {h} h {m} min",gusts:"porywy {n}",clouds:"zachmurzenie {n}%",steady:"sta\u0142e",rising:"ro\u015Bnie",falling:"spada",sun:"S\u0142o\u0144ce",precip:"Opady",in_24h:"w ci\u0105gu 24 godzin",next_24h:"Najbli\u017Csze 24 godziny",no_hourly:"Brak prognozy godzinowej",loading:"Wczytuj\u0119 prognoz\u0119\u2026",forecast_days:{one:"Prognoza na {n} dzie\u0144",few:"Prognoza na {n} dni",many:"Prognoza na {n} dni",other:"Prognoza na {n} dni"}},climate:{turn_off:"Wy\u0142\u0105cz ogrzewanie",turn_on:"W\u0142\u0105cz ogrzewanie",average:"\u015Arednio {t}\xB0 w domu"},history:{yesterday:"wczoraj {t}",loading:"Wczytuj\u0119 histori\u0119 z ostatnich 24 godzin\u2026",error:"Nie uda\u0142o si\u0119 wczyta\u0107 historii",total:"\u0141\u0105cznie",last:"Ostatnio",ongoing:"trwa",over_day:"ponad dob\u0119 temu",events:"Zdarzenia",from:"Od {t}",value:"Warto\u015B\u0107",since_yesterday:"Od wczoraj",no_data:"Brak zapisanych pomiar\xF3w z ostatniej doby"},binary:{unavailable:"niedost\u0119pny",ok:"w porz\u0105dku",active:"aktywne"},events:{open:{count:{one:"{n} otwarcie",few:"{n} otwarcia",many:"{n} otwar\u0107",other:"{n} otwar\u0107"},none:"Bez otwar\u0107"},water:{count:{one:"{n} wykrycie wody",few:"{n} wykrycia wody",many:"{n} wykry\u0107 wody",other:"{n} wykry\u0107 wody"},none:"Bez wykry\u0107 wody"},motion:{count:{one:"{n} ruch",few:"{n} ruchy",many:"{n} ruch\xF3w",other:"{n} ruch\xF3w"},none:"Bez ruch\xF3w"},other:{count:{one:"{n} zdarzenie",few:"{n} zdarzenia",many:"{n} zdarze\u0144",other:"{n} zdarze\u0144"},none:"Bez zdarze\u0144"}},notif:{title:"Powiadomienie",dismissed:"Powiadomienie odrzucone",gone:"Nie ma go ju\u017C w Home Assistant.",dismiss:"Odrzu\u0107",dismiss_hint:"Znika te\u017C z Home Assistanta"},update:{skip:"Pomi\u0144 t\u0119 wersj\u0119",skip_hint:"Znika te\u017C z Home Assistanta, wr\xF3ci przy nast\u0119pnej",hide:"Ukryj tylko tutaj",hide_hint:"Do nast\u0119pnej wersji"},battery:"Bateria {n}%",battery_lc:"bateria {n}%",battery_hide:"Ukryj do wymiany baterii",battery_hide_hint:"Wr\xF3ci, gdy po wymianie zn\xF3w b\u0119dzie s\u0142aba",alarm:{history:"Poka\u017C histori\u0119",history_hint:"Ostatnie 24 godziny",hide:"Ukryj, dop\xF3ki si\u0119 nie zamknie",hide_hint:"Wr\xF3ci przy nast\u0119pnym otwarciu"},summary:{battery_low:"S\u0142aba bateria",update_to:"Aktualizacja do {v}",update:"Aktualizacja",lights:"\u015Awiat\u0142a",lights_on:{one:"{n} w\u0142\u0105czone",few:"{n} w\u0142\u0105czone",many:"{n} w\u0142\u0105czonych",other:"{n} w\u0142\u0105czonych"},ok_off:"OK gasi",all_off:"Wszystkie zgaszone",people_home:"{n} z {total} w domu",nobody:"Nikogo",heating:"Grzeje",unload_hint:"OK, gdy wyj\u0119te",waste_today:"Dzi\u015B wyw\xF3z",waste_tomorrow:"Jutro wyw\xF3z",imgw:"Ostrze\u017Cenie IMGW",title:"Podsumowanie",attention:{one:"{n} sprawa wymaga uwagi",few:"{n} sprawy wymagaj\u0105 uwagi",many:"{n} spraw wymaga uwagi",other:"{n} spraw wymaga uwagi"},all_clear:"Nic nie wymaga uwagi",attention_title:"Wymaga uwagi"},vac:{resume:"Wzn\xF3w sprz\u0105tanie",pause_hint:"Zostaje tam, gdzie jest",start_hint:"Ca\u0142y dom, jak w aplikacji",dock:"Wr\xF3\u0107 do stacji",dock_hint:"Ko\u0144czy sprz\u0105tanie",suction:"Ssanie"},app:{pause_hint:"Cykl poczeka",resume_hint:"Cykl rusza dalej",unloaded_hint:"Znika z Podsumowania do nast\u0119pnego prania",total:"Ca\u0142y cykl",to_go:"do ko\u0144ca"},settings:{subtitle:"Na tym telewizorze",look:"Wygl\u0105d",wallpaper:"Tapeta",accent:"Kolor akcentu",accent_hint:"Zaznaczenia i to, co w\u0142\u0105czone",performance:"Wydajno\u015B\u0107",anim:"Animacje",anim_hint:"Wy\u0142\u0105cz na s\u0142abszym telewizorze",accent_sub:"To, co si\u0119 \u015Bwieci i jest zaznaczone",wallpaper_sub:"T\u0142o ca\u0142ego ekranu",photos:"Zdj\u0119cia",colors:"Kolory",screen:"Ekran i ochrona OLED",saver:"Wygaszacz",saver_hint:"Zegar na czarnym tle",dim:"Przyciemnianie",dim_hint:"Ekran ciemnieje przed wygaszaczem",shift:"Przesuwanie obrazu",shift_hint:"Co 3 min o kilka pikseli",exit:"Zamknij aplikacj\u0119 po",exit_hint:"Bez u\u017Cycia pilota",off:"Wy\u0142\u0105czony",never:"Nigdy",min:"{n} min",from_ha:"z HA",glass:"Kafle",glass_frost:"Szronione szk\u0142o",glass_solid:"Pe\u0142ny kolor",glass_clear:"Przezroczyste",glass_frost_hint:"Rozmyta tapeta, naj\u0142adniejsze",glass_solid_hint:"W kolorze tapety, najl\u017Cejsze",glass_clear_hint:"Tapeta prze\u015Bwituje",ring:"Obramowanie zaznaczenia",ring_hint:"Ramka w kolorze akcentu",connection:"Po\u0142\u0105czenie",homes:"Domy",logout:"Wyloguj ten telewizor",logout_hint:"Z domu {name}; potem nowe parowanie",logout_confirm:"Naci\u015Bnij OK jeszcze raz, \u017Ceby wylogowa\u0107"},instances:{current:"Teraz wy\u015Bwietlany",title:"Domy",sub:"OK prze\u0142\u0105cza, o\u0142\xF3wek zmienia nazw\u0119, kosz usuwa"},camera:{preview:"Podgl\u0105d"},reconnecting:"\u0141\u0105cz\u0119 ponownie z Home Assistantem\u2026",failed:"Nie uda\u0142o si\u0119: {msg}",switching:"\u0141\u0105cz\u0119 z: {name}\u2026",unreachable:"{name}: serwer nie odpowiada z tej sieci",connecting:"\u0141\u0105cz\u0119 z Home Assistantem\u2026",connect_failed:"Nie mog\u0119 po\u0142\u0105czy\u0107 si\u0119 z Home Assistantem.",no_card:"Na dashboardzie \u201E{dashboard}\u201D nie ma karty Alvuna",wallpapers:{homedeck:{name:"Alvuna",sub:"Morski, domy\u015Blny"},glebia:{name:"G\u0142\u0119bia",sub:"Ciemny b\u0142\u0119kit"},noc:{name:"Noc",sub:"Granat z fioletem"},zorza:{name:"Zorza",sub:"Ziele\u0144 i fiolet na granacie"},las:{name:"Las",sub:"G\u0142\u0119boka ziele\u0144"},zachod:{name:"Zach\xF3d",sub:"Ciep\u0142y, wieczorny"},grafit:{name:"Grafit",sub:"Neutralny szary"},czern:{name:"Czer\u0144",sub:"Prawdziwa czer\u0144 OLED"},"foto-zorza":{name:"Zorza polarna",sub:"Zielone \u015Bwiat\u0142a nad jeziorem"},"foto-las":{name:"Mglisty las",sub:"Sosny we mgle"},"foto-morze":{name:"Ksi\u0119\u017Cyc nad morzem",sub:"Nocne morze"},"foto-gory":{name:"G\xF3ry o zmierzchu",sub:"Niebieskie grzbiety"},"foto-gwiazdy":{name:"Droga Mleczna",sub:"Nocne niebo nad g\xF3rami"},"foto-baltyk":{name:"Zach\xF3d nad morzem",sub:"Ciep\u0142e \u015Bwiat\u0142o nad wod\u0105"},"foto-miasto":{name:"\u015Awiat\u0142a miasta",sub:"Rozmyte \u015Bwiat\u0142a noc\u0105"},"foto-snieg":{name:"Zimowa noc",sub:"O\u015Bnie\u017Cony szczyt i gwiazdy"},"foto-fale":{name:"Turkusowe fale",sub:"Abstrakcja w kolorach Alvuna"},"foto-mgla":{name:"Mg\u0142a nad jeziorem",sub:"Brzeg o \u015Bwicie"}},accents:{limonka:"Limonka",turkus:"Turkus",blekit:"B\u0142\u0119kit",fiolet:"Fiolet",roz:"R\xF3\u017C",koral:"Koral",zloto:"Z\u0142oto",bialy:"Biel",dab:"D\u0105b"},pair_title:"Sparuj ten telewizor",pair_asking:"Pytam Home Assistanta o kod\u2026",pair_steps:"W Home Assistancie otw\xF3rz Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi. W sekcji Wykryte wybierz Alvuna TV i wpisz ten kod.",pair_busy:"Home Assistant nie odpowiada albo nie ma w nim jeszcze Alvuny. Pr\xF3buj\u0119 dalej\u2026",pair_login:"\u017Beby u\u017Cy\u0107 w\u0142asnego konta, otw\xF3rz {url}",camera_unknown:"Kamery {entity} nie ma w uk\u0142adzie Alvuny",no_layout:"Nie ma jeszcze uk\u0142adu: dodaj integracj\u0119 Alvuna w Home Assistancie.",home:{add:"Dodaj dom",add_hint:"Inny Home Assistant z Alvun\u0105",add_sub:"Adres jego Home Assistanta",address_hint:"Na przyk\u0142ad 192.168.1.20, homeassistant.local albo https://dom.example.com. Bez portu przyjmuj\u0119 8123.",connect:"Po\u0142\u0105cz",connect_hint:"Telewizor przejdzie tam i poprosi o sparowanie",bad_address:"To nie wygl\u0105da na adres",rename:"Nazwa domu",save:"Zapisz"},hold:{sub:"Przytrzymany OK",hide:"Ukryj w Alvunie",hide_hint:"Zniknie z telewizor\xF3w; przywr\xF3cisz w panelu Alvuna w HA",cancel:"Anuluj",hidden:"Ukryte. Przywr\xF3cisz je w panelu Alvuna w Home Assistancie.",failed:"Nie uda\u0142o si\u0119 ukry\u0107"},remote:{no_room:"Tego pokoju nie ma na tym telewizorze."}}};var Re={en:F,pl:Ue},W="en",me=F,le="en",de="en",ce,se="EUR",pe=new Map,ue=new Map,Ie={comma_decimal:"en-US",decimal_comma:"de-DE",space_comma:"fr-FR",system:void 0};function he({language:n,numberFormat:e,timeFormat:t,currency:a}={}){let i=String(n||"en").toLowerCase().split(/[-_]/)[0],o={lang:Re[i]?i:"en",dateLocale:n||"en",numLocale:e in Ie?Ie[e]:n||"en",hour12:t==="12"?!0:t==="24"?!1:void 0,currency:a||se};return o.lang===W&&o.dateLocale===de&&o.numLocale===le&&o.hour12===ce&&o.currency===se?!1:({lang:W,dateLocale:de,numLocale:le,hour12:ce,currency:se}=o,me=Re[W],pe.clear(),ue.clear(),!0)}var Y=(n,e)=>e.split(".").reduce((t,a)=>t?.[a],n);function m(n,e){let t=Y(me,n)??Y(F,n);if(t==null)return n;if(typeof t=="object"){let a=Number(e?.n??0),i=ue.get(W);i||ue.set(W,i=new Intl.PluralRules(W)),t=t[i.select(a)]??t.other??""}return e?t.replace(/\{(\w+)\}/g,(a,i)=>e[i]??""):t}var $=n=>Y(me,n)??Y(F,n)??{};function Ve(n,e,t){let a=`${n}|${e}|${JSON.stringify(t)}`,i=pe.get(a);return i||pe.set(a,i=n==="n"?new Intl.NumberFormat(e,t):new Intl.DateTimeFormat(e,t)),i}var D=(n,e=1)=>Ve("n",le,{minimumFractionDigits:e,maximumFractionDigits:e}).format(Number(n));var ge=n=>Ve("d",de,{hour:"2-digit",minute:"2-digit",hour12:ce}).format(n instanceof Date?n:new Date(n));var E=(n,e="28%")=>`radial-gradient(70% 55% at ${e} 0%, ${n}, transparent 72%)`,O=[{id:"homedeck",tone:"#114556",bg:`${E("rgba(44,140,152,.45)")}, radial-gradient(45% 40% at 95% 0%, rgba(56,170,180,.14), transparent 70%), linear-gradient(180deg, #165566 0%, #114556 32%, #0B2633 70%, #081A24 100%)`,base:"#081A24"},{id:"glebia",tone:"#13284F",bg:`${E("rgba(64,120,220,.38)")}, linear-gradient(180deg, #1A3566 0%, #13284F 32%, #0A1630 70%, #060D1F 100%)`,base:"#060D1F"},{id:"noc",tone:"#1A1640",bg:`${E("rgba(130,96,220,.34)","70%")}, linear-gradient(180deg, #25204F 0%, #1A1640 32%, #0F0D28 70%, #08071A 100%)`,base:"#08071A"},{id:"zorza",tone:"#0C1E2E",bg:"radial-gradient(60% 50% at 20% 0%, rgba(60,200,150,.34), transparent 70%), radial-gradient(50% 45% at 85% 5%, rgba(150,90,220,.30), transparent 70%), linear-gradient(180deg, #102A3A 0%, #0C1E2E 40%, #08131F 75%, #050C14 100%)",base:"#050C14"},{id:"las",tone:"#173B2A",bg:`${E("rgba(90,170,100,.32)")}, linear-gradient(180deg, #1F4A35 0%, #173B2A 32%, #0E241A 70%, #08150F 100%)`,base:"#08150F"},{id:"zachod",tone:"#3A1B2B",bg:`${E("rgba(255,140,90,.30)","35%")}, linear-gradient(180deg, #4E2634 0%, #3A1B2B 32%, #22101C 70%, #12090F 100%)`,base:"#12090F"},{id:"grafit",tone:"#23282C",bg:`${E("rgba(255,255,255,.10)")}, linear-gradient(180deg, #2D3338 0%, #23282C 32%, #16191C 70%, #0D0F11 100%)`,base:"#0D0F11"},{id:"czern",tone:"#101010",bg:"#000",base:"#000"}],J=1,X="/local/alvuna/wallpapers",Ke="linear-gradient(180deg, rgba(4,12,18,.30) 0%, rgba(4,12,18,.50) 40%, rgba(4,12,18,.78) 100%)",L=(n,e,t="#05090D")=>({id:`foto-${n}`,tone:e,photo:!0,base:t,frostImg:`${X}/frost/${n}.webp?v=${J}`,img:`${X}/${n}.webp?v=${J}`,bg:`${Ke}, url(${X}/${n}.webp?v=${J}) center/cover no-repeat`,preview:`${Ke}, url(${X}/thumbs/${n}.webp?v=${J}) center/cover no-repeat`});O.push(L("zorza","#356758"),L("las","#4e534c"),L("morze","#1a2a2f"),L("gory","#1a5992"),L("gwiazdy","#242135"),L("baltyk","#a0654a"),L("miasto","#4a3514"),L("snieg","#0e1c25"),L("fale","#0c2624"),L("mgla","#4d5351"));for(let n of O)Object.defineProperties(n,{name:{get:()=>$("tv.wallpapers")[n.id]?.name},sub:{get:()=>$("tv.wallpapers")[n.id]?.sub}});var H=[{id:"limonka",c:"#B8F03C",rgb:"184,240,60",ink:"#13240A",deep:"#4F7A12",deeper:"#3E6410"},{id:"turkus",c:"#3EE0D0",rgb:"62,224,208",ink:"#06302C",deep:"#0E7A70",deeper:"#0B6159"},{id:"blekit",c:"#5AB4FF",rgb:"90,180,255",ink:"#06223D",deep:"#1F6FB8",deeper:"#195A96"},{id:"fiolet",c:"#B794FF",rgb:"183,148,255",ink:"#22114A",deep:"#6A3FD0",deeper:"#5631AC"},{id:"roz",c:"#FF7EB6",rgb:"255,126,182",ink:"#3D0B22",deep:"#C23A78",deeper:"#A22E63"},{id:"koral",c:"#FF8A6B",rgb:"255,138,107",ink:"#3D1408",deep:"#C04A2A",deeper:"#9E3C22"},{id:"zloto",c:"#FFD84A",rgb:"255,216,74",ink:"#3A2E00",deep:"#9A7A00",deeper:"#7D6300"},{id:"bialy",c:"#F2F4F5",rgb:"242,244,245",ink:"#12232C",deep:"#3D5260",deeper:"#2F404B"},{id:"dab",c:"#E2BE8A",rgb:"226,190,138",ink:"#2B1E0C",deep:"#8A6230",deeper:"#704E25"}];for(let n of H)Object.defineProperty(n,"name",{get:()=>$("tv.accents")[n.id]});var U={glass:["frost","solid","clear"],saver:[0,1,2,3,5,10,15,30,60],exit:[0,5,10,15,30,60,120,240]};var R=["working","scenes","rooms","media","climate","security"];var fe=`/* Alvuna TV. Drawn for a 1920\xD71080 screen seen from the sofa (main.js scales other sizes); the palette, glass and
   type are Alvuna's (src/card/alvuna-card.js), sized up: no text under 24 px. Only transform and opacity move. */
@font-face { font-family: Figtree; font-weight: 300 700; font-display: swap; src: url(/alvuna/static/fonts/figtree-latin.woff2) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: Figtree; font-weight: 300 700; font-display: swap; src: url(/alvuna/static/fonts/figtree-latin-ext.woff2) format("woff2");
  unicode-range: U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }

:root {
  --lime: #B8F03C; --lime-rgb: 184,240,60; --lime-ink: #13240A; --lime-deep: #4F7A12; --lime-deeper: #3E6410; --tile-on: rgba(226,233,237,.94); --ink: #12232C;
  --glass: rgba(255,255,255,.075); --glass-line: rgba(255,255,255,.12); --muted: rgba(255,255,255,.64);
  --alert: #FF6B5A; --warn: #FFB340; --ease: cubic-bezier(.25,.8,.25,1); --sheet-out: cubic-bezier(.45,0,.2,1);
  /* iOS sheet curve: a quick start that settles softly, used both ways so in and out feel like one motion. */
  /* Motion, Apple style: things arrive on --sheet (fast, then a long soft landing) and leave on --sheet-out (a gentle
     start and a gentle end, never a jump); --ease is the focus and scrolling curve. */
  --sheet: cubic-bezier(.32,.72,0,1);
  /* Side panels and the dimming behind them; applyWallpaper (src/ui/wallpapers.js) tints both to the wallpaper. */
  --sheet-bg: #0F3341; --dim: rgba(4,14,20,.8);
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #081A24; }
html { overflow: hidden; }
body {
  width: 1920px; height: 1080px; overflow: hidden; position: relative; transform-origin: 0 0;
  color: #fff; font: 400 24px/1.3 Figtree, system-ui, sans-serif; -webkit-font-smoothing: antialiased;
  background: radial-gradient(70% 55% at 28% 0%, rgba(44,140,152,.45), transparent 72%),
    radial-gradient(45% 40% at 95% 0%, rgba(56,170,180,.14), transparent 70%),
    linear-gradient(180deg, #165566 0%, #114556 32%, #0B2633 70%, #081A24 100%);
}
hd-icon { display: inline-flex; width: 1em; height: 1em; flex: none; }
hd-icon svg { width: 100%; height: 100%; fill: currentColor; }
hd-icon.xl { font-size: 120px; }

/* --- page and header ----------------------------------------------------------------------------- */
#home { position: absolute; inset: 0; }
/* OLED care (main.js oledShift): the home screen moves a few pixels with the independent translate property, so the
   focus engine's transforms are untouched and nothing repaints. Only layers that are positioned themselves: a translate
   on #panel would make that empty wrapper the containing block of the absolute panel inside it (and squash it to 0 px).
   Panels are open briefly; they need no shift. */
#home, #edge { translate: var(--sx, 0) var(--sy, 0); }
/* Dimmed halfway to the screensaver: one black layer fades in over everything; at 0 opacity the TV skips it. */
body::after { content: ""; position: fixed; inset: 0; z-index: 45; background: #000; opacity: 0; pointer-events: none; transition: opacity 2s var(--sheet-out); }
body.dimmed::after { opacity: .55; }
/* Back to full brightness on a key press: quickly, not over the two seconds it took to dim. */
body:not(.dimmed)::after { transition-duration: .5s; }
.page { position: relative; padding: 54px 0 40px; transition: transform .45s var(--ease); will-change: transform; }
.hero { display: flex; justify-content: space-between; align-items: flex-start; padding: 0 96px; min-height: 330px; }
.date { font-size: 26px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.clock { font-size: 140px; font-weight: 300; letter-spacing: -.03em; line-height: 1; margin-top: 6px; font-variant-numeric: tabular-nums; }
.headline { font-size: 40px; margin-top: 14px; }
.notes { display: flex; flex-wrap: wrap; gap: 10px 28px; margin-top: 14px; }
.note { display: inline-flex; align-items: center; gap: 10px; font-size: 26px; color: var(--muted); }
.note b { color: #fff; font-weight: 600; }
.note.alert, .note.alert hd-icon { color: var(--alert); }
.note.warn hd-icon { color: var(--warn); }
.note.dev hd-icon { color: var(--lime); }
.hero-r { display: flex; flex-direction: column; align-items: flex-end; gap: 22px; padding-top: 6px; }
.wx-now { display: flex; align-items: center; gap: 18px; }
.wx-now hd-icon { font-size: 72px; }
.wx-now b { display: block; font-size: 72px; font-weight: 300; line-height: 1; }
.wx-now span { font-size: 26px; color: var(--muted); }
.people { display: flex; gap: 12px; }
.avatar { position: relative; width: 68px; height: 68px; border-radius: 50%; background: #2A5A68 center/cover; display: grid;
  place-items: center; font-size: 30px; font-weight: 600; border: 3px solid rgba(255,255,255,.18); }
.avatar i { position: absolute; right: -2px; bottom: -2px; width: 20px; height: 20px; border-radius: 50%; background: #5B7480; border: 3px solid #0E3542; }
.avatar.home i { background: var(--lime); }
.instance { position: relative; display: inline-flex; align-items: center; gap: 12px; height: 64px; padding: 0 28px; border-radius: 32px;
  background: var(--glass); border: 1.5px solid var(--glass-line); font-size: 26px; font-weight: 600; transition: transform .3s var(--ease); }
.instance hd-icon { font-size: 32px; }

/* --- rows and tiles ------------------------------------------------------------------------------- */
/* Vertical rhythm: a row's title sits close to its own tiles (14 px) and well apart from the row above (48 px), so
   rows read as groups. The track's 16 px above and below is the room the focused tile grows into. */
.row { margin-top: 32px; transition: opacity .4s var(--ease); }
.hero { transition: opacity .4s var(--ease); }
.hero.above { opacity: 0; }
.row.above { opacity: .38; }
.row h2 { margin: 0; padding: 0 96px; font-size: 30px; font-weight: 500; line-height: 1.2; color: var(--muted); }
.row:has(.f) h2 { color: #fff; }
.track { display: flex; gap: 28px; padding: 14px 96px 16px; scroll-margin: 0; transition: transform .45s var(--ease); will-change: transform; width: max-content; }
.tile { position: relative; flex: none; width: 320px; height: 210px; padding: 26px; border-radius: 30px;
  background: var(--glass); border: 1.5px solid var(--glass-line); display: flex; flex-direction: column;
  transition: transform .3s var(--ease); contain: layout style; }
.tile .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: auto; }
.ic { width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); font-size: 30px; flex: none; }
.ic.lime, .tile.on .ic { background: var(--lime); color: var(--lime-ink); }
.tile.on { background: var(--tile-on); color: var(--ink); border-color: transparent; }
.tile.on .sub, .tile.on .kicker { color: rgba(18,35,44,.66); }
.name { font-size: 28px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 24px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kicker { font-size: 20px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--lime); }
.big { font-size: 64px; font-weight: 300; line-height: 1; margin: 4px 0 6px; }
.temp { font-size: 28px; font-weight: 500; }
.dots { display: flex; gap: 8px; margin-top: 12px; }
.dots i { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,.22); }
.tile.on .dots i { background: rgba(18,35,44,.2); }
.dots i.on { background: var(--lime); }
.tile.on .dots i.on { background: var(--lime-deep); }
.tile.scene { height: 170px; }
.tile.scene .ic { margin-bottom: auto; width: 52px; height: 52px; font-size: 28px; }
.tile.scene.on .sub { color: var(--lime-deeper); }
.label { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 600; white-space: nowrap; overflow: hidden; }
.label hd-icon { font-size: 34px; color: var(--lime); }
.tile.on .label hd-icon { color: var(--lime-deep); }
.tile.weather .big, .tile.climate .big, .tile.sensor .big { margin-top: auto; font-size: 72px; }
.tile.sensor.out { border-style: dashed; }
.tile.sec.alert { background: rgba(255,90,78,.26); border-color: rgba(255,107,90,.7); }
.tile.sec.alert .ic { background: var(--alert); color: #2A0A06; }
.tile.sec.off { opacity: .55; }

/* Focus: the item grows, with a soft shadow under it (no ring). The shadow is drawn once on a pseudo-element and
   only fades in, so a focus change moves transform and opacity only (nothing repainted every frame on the TV). */
/* Everything that can take the focus always has a transform (scale(1)), so gaining focus only changes its value:
   going from no transform to one (or changing z-index) rebuilds the element's layer and forces a layout on the TV.
   Focus animates only transform and opacity (the GPU plays those); colours switch at once, since a colour transition
   repaints on the TV's CPU every frame and made panel moves drop to ~50 fps. */
.tile.f, .instance.f { transform: scale(1.08); }
.tile::after, .instance::after, .p-row::after, .btn::after, .sensors > .sensor::after { content: ""; position: absolute; inset: -1.5px; border-radius: inherit;
  box-shadow: 0 24px 48px rgba(0,0,0,.45); opacity: 0; transition: opacity .3s var(--ease); pointer-events: none; }
.f::after { opacity: 1; }

/* Media: the first player that plays gets a double tile with its artwork. */
.tile.media.wide { width: 668px; flex-direction: row; gap: 26px; padding: 20px; }
.tile.media.wide .art { width: 170px; height: 170px; border-radius: 22px; flex: none; }
.media-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.tile.media:not(.wide) .media-body .ic { margin-bottom: auto; }
.tile.media:not(.wide) .media-body { height: 100%; }
.tile.media.wide .media-body { justify-content: center; }
.tile.media.wide .name { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tile.media.lit:not(.wide) .ic { background: var(--lime); color: var(--lime-ink); }
.art { object-fit: cover; background: #0E3542; }
.art.logo { display: grid; place-items: center; }
.art.logo img { width: 70%; max-height: 50%; object-fit: contain; }
.art.logo img.mono { filter: brightness(0) invert(1); }
.art.none { display: grid; place-items: center; font-size: 72px; color: var(--muted); }
.bar, .pbar { height: 8px; border-radius: 4px; background: rgba(255,255,255,.16); overflow: hidden; margin-top: 14px; }
.bar i, .pbar i { display: block; height: 100%; background: var(--lime); border-radius: 4px; }
.times { display: flex; justify-content: space-between; font-size: 22px; color: var(--muted); margin-top: 6px; font-variant-numeric: tabular-nums; }
.tile.cam { width: 356px; padding: 0; justify-content: flex-end; }
.tile.cam .art { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 29px; }
.tile.cam .media-body { flex: none; border-radius: 0 0 29px 29px; position: relative; padding: 18px 22px; background: linear-gradient(transparent, rgba(0,0,0,.7)); }

/* --- panels ---------------------------------------------------------------------------------------- */
.panel-wrap { position: absolute; inset: 0; z-index: 10; display: flex; justify-content: flex-end; background: var(--dim); animation: fade .55s var(--sheet) both; }
/* The sheet itself is drawn by ::before, so a change of width between stacked panels (Podsumowanie 860 \u2192 Szafa 800)
   can be played as a scale of that layer on the GPU (animateNav) instead of a layout of the whole panel every frame. */
.panel { position: relative; width: 800px; height: 100%; display: flex; flex-direction: column;
  animation: in-r .6s var(--sheet) both; will-change: transform; }
.panel::before { content: ""; position: absolute; inset: 0; z-index: -1; transform-origin: right center;
  background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.015)), var(--sheet-bg);
  border-left: 1.5px solid var(--glass-line); box-shadow: -30px 0 80px rgba(0,0,0,.45); }
.panel.wide { width: 1040px; }
.panel.media-panel { width: 920px; }
.panel.weather-panel { width: 1560px; }
@keyframes fade { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }
@keyframes in-r { from { transform: translateX(100%); } }
@keyframes in-l { from { transform: translateX(-100%); } }
@keyframes out-r { to { transform: translateX(100%); } }
@keyframes out-l { to { transform: translateX(-100%); } }
/* Closing: the same curve back to the edge the panel came from, the dimming fading with it. */
.panel-wrap.closing { animation: fade-out .55s var(--sheet-out) both; pointer-events: none; }
/* Painted in place but not shown yet (see whenSettled in main.js); the slide-in starts when .prep goes. */
.panel-wrap.prep .panel { animation: none; opacity: .01; }
.panel-wrap.closing .panel { animation: out-r .55s var(--sheet-out) both; }
.panel-wrap.left.closing .panel { animation-name: out-l; }
.p-head { flex: none; display: flex; align-items: center; gap: 26px; padding: 54px 64px 26px; border-bottom: 1.5px solid rgba(255,255,255,.06); }
.p-head .ic { width: 84px; height: 84px; font-size: 42px; }
.p-head .hic { font-size: 64px; color: var(--lime); }
.p-title { min-width: 0; }
.p-head h1 { margin: 0; font-size: 46px; font-weight: 600; line-height: 1.15; }
.p-head .sub { white-space: normal; font-size: 26px; margin-top: 4px; }
.panel-view { flex: 1; min-height: 0; overflow: hidden; padding: 22px 64px 0; }
.panel-body { transition: transform .45s var(--ease); will-change: transform; padding: 8px 0 54px; }
.p-empty { font-size: 26px; color: var(--muted); padding: 20px 0; }
.p-line { display: flex; gap: 18px; margin-top: 14px; }
.p-line:first-child { margin-top: 0; }

/* A list row: same height for every kind of row; the value sits right, a thin bar runs along the bottom edge. */
.p-row { position: relative; flex: 1; min-width: 0; display: flex; align-items: center; gap: 24px; height: 112px; padding: 0 30px 0 24px; border-radius: 26px;
  background: var(--glass); border: 1.5px solid var(--glass-line); transition: transform .3s var(--ease); }
.p-row .ic { width: 60px; height: 60px; font-size: 32px; }
.p-row .t { flex: 1; min-width: 0; }
.p-row .t b { display: block; font-size: 30px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-row .t span { display: block; font-size: 24px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-row .v { display: flex; align-items: center; gap: 6px; font-size: 30px; font-variant-numeric: tabular-nums; }
.p-row .v b { font-weight: 600; min-width: 64px; text-align: center; }
.p-row .v .chev { font-size: 36px; color: var(--muted); opacity: 0; transition: opacity .3s var(--ease); }
.p-row.f .v .chev { opacity: 1; }
/* Rows with a bar lift their text, so the bar never reads as an underline. */
.p-row:has(.rbar) .t, .p-row:has(.rbar) .v { margin-top: -18px; }
.rbar { position: absolute; left: 108px; right: 30px; bottom: 18px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.14); overflow: hidden; }
/* The level is a scale of a full-width bar (transform, on the GPU), not a width (a layout every frame). */
.rbar i { display: block; width: 100%; height: 100%; border-radius: 3px; background: var(--lime); transform-origin: left center; transition: transform .45s var(--ease); }
.p-row.on { background: rgba(var(--lime-rgb),.09); border-color: rgba(var(--lime-rgb),.28); }
.p-row.alert { background: rgba(255,90,78,.2); border-color: rgba(255,107,90,.55); }
.p-row.alert .ic { background: var(--alert); color: #2A0A06; }
.p-row.off { opacity: .5; }
.p-row.cam { height: 140px; padding-left: 14px; }
.p-row.cam img { width: 200px; height: 112px; border-radius: 16px; object-fit: cover; background: var(--sheet-bg); }
/* Focus in a panel: the row grows a little (the panel's side padding leaves room) and lightens. */
.p-row.f { background: rgba(255,255,255,.14); transform: scale(1.03); }
.p-row.on.f { background: rgba(var(--lime-rgb),.16); }
.btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 14px; height: 84px; padding: 0 36px; border-radius: 42px;
  background: var(--glass); border: 1.5px solid var(--glass-line); font-size: 28px; font-weight: 600; transition: transform .3s var(--ease); }
.btn hd-icon { font-size: 36px; }
.btn.round { width: 116px; height: 116px; padding: 0; border-radius: 50%; }
.btn.round hd-icon { font-size: 56px; }
.btn.f { background: rgba(255,255,255,.16); transform: scale(1.06); }
.transport { display: flex; justify-content: center; gap: 30px; width: 100%; padding: 6px 0 10px; }

/* Media header: artwork and what plays. */
.p-head.np { align-items: center; gap: 36px; }
.p-head.np .art { width: 260px; height: 260px; border-radius: 28px; flex: none; }
.np-text { min-width: 0; flex: 1; }
.np-text h1 { margin: 6px 0; font-size: 40px; font-weight: 600; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.np-text .sub { font-size: 26px; }

/* Climate */
.sensors { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.sensors > .sensor { position: relative; padding: 22px; border-radius: 24px; background: var(--glass); border: 1.5px solid var(--glass-line);
  transition: transform .3s var(--ease); }
.sensors > .sensor.f { background: rgba(255,255,255,.14); transform: scale(1.05); }
.sensors > .sensor .sn { display: flex; align-items: center; gap: 10px; font-size: 24px; color: var(--muted); white-space: nowrap; overflow: hidden; }
.sensors > .sensor b { display: block; font-size: 54px; font-weight: 300; margin: 6px 0 2px; }
.sensors > .sensor span { font-size: 22px; color: var(--muted); }
.sensor.out { border-style: dashed; }

/* Weather: two columns, now and details on the left, the next 24 h and the week on the right. */
.wx-cols { display: grid; grid-template-columns: 560px 816px; gap: 56px; padding-top: 46px; }
/* Now: a card whose sky follows the weather (day, night, cloud, rain, snow). */
.wx-hero { position: relative; padding: 30px 36px 32px; border-radius: 34px; overflow: hidden;
  background: linear-gradient(160deg, #3D86C6 0%, #1D568F 100%); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.1); }
.wx-hero.sky-cloud { background: linear-gradient(160deg, #5A7486 0%, #2C4250 100%); }
.wx-hero.sky-rain { background: linear-gradient(160deg, #46617A 0%, #1F3242 100%); }
.wx-hero.sky-snow { background: linear-gradient(160deg, #8DA3B4 0%, #4A6175 100%); }
.wx-hero.sky-night { background: linear-gradient(160deg, #26306A 0%, #0E1538 100%); }
.wh-top { display: flex; align-items: center; justify-content: space-between; font-size: 28px; font-weight: 600; }
.wh-top hd-icon { font-size: 96px; margin: -10px -6px -30px 0; filter: drop-shadow(0 8px 20px rgba(0,0,0,.25)); }
.wh-temp { display: block; font-size: 150px; font-weight: 200; line-height: .95; letter-spacing: -.04em; margin-top: 2px; }
.wh-cond { font-size: 34px; font-weight: 600; margin-top: 4px; }
.wh-hl { font-size: 26px; color: rgba(255,255,255,.78); margin-top: 6px; }
.wh-rain { display: flex; align-items: center; gap: 12px; margin-top: 22px; padding-top: 20px; border-top: 1.5px solid rgba(255,255,255,.16);
  font-size: 26px; font-weight: 500; }
.wh-rain hd-icon { font-size: 32px; color: #A9DBFF; }
.wx-alert { display: flex; align-items: center; gap: 12px; margin-top: 18px; padding: 16px 22px; border-radius: 20px; background: rgba(255,179,64,.16);
  border: 1.5px solid rgba(255,179,64,.45); font-size: 24px; }
.wx-alert hd-icon { color: var(--warn); font-size: 32px; }
.wx-sec { font-size: 24px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin: 4px 0 12px; }
.wx-sec:empty { display: none; }
.wtiles { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
.wtile { padding: 20px 24px 18px; border-radius: 26px; background: var(--glass); border: 1.5px solid rgba(255,255,255,.07); min-width: 0; }
.wt-l { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 600; color: var(--muted); }
.wt-l hd-icon { font-size: 26px; color: var(--lime); }
.wtile b { display: block; font-size: 38px; font-weight: 500; margin-top: 8px; white-space: nowrap; }
.wtile b i { font-style: normal; font-size: 24px; color: var(--muted); font-weight: 500; }
.wtile small { display: block; font-size: 22px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* 24 hours: 12 columns, with one smooth line and the rain under them. */
.hstrip { padding: 22px 0 14px; margin-bottom: 30px; border-radius: 30px; background: var(--glass); border: 1.5px solid rgba(255,255,255,.07); }
.hcols { display: flex; }
.hc, .hc-r { flex: 1; display: flex; flex-direction: column; align-items: center; }
.hc span { font-size: 22px; color: var(--muted); }
.hc span:first-child { font-weight: 600; }
.hc:first-child span { color: #fff; }
.hc hd-icon { font-size: 44px; margin: 10px 0 6px; }
.hc b { font-size: 30px; font-weight: 600; }
.hcurve { display: block; margin-top: 6px; }
.hcurve .tline { fill: none; stroke: var(--lime); stroke-width: 4; stroke-linecap: round; }
.hcurve .tdot { fill: var(--sheet-bg); stroke: var(--lime); stroke-width: 3; }
.hcurve .rain { fill: #4FB3FF; opacity: .7; }
.rainrow .hc-r { font-size: 20px; color: #7FC8FF; height: 26px; margin-top: 4px; }
.p-row.day { height: 76px; padding: 0 28px; }
.p-row.day .dn { display: inline-block; width: 110px; font-size: 28px; font-weight: 600; }
.p-row.day .dn::first-letter { text-transform: uppercase; }
.p-row.day > hd-icon { font-size: 42px; }
.p-row.day .pp { display: flex; align-items: center; gap: 4px; width: 130px; font-size: 22px; color: #7FC8FF; }
.p-row.day .lo, .p-row.day .hi { width: 70px; font-size: 28px; text-align: right; }
.p-row.day .lo { color: var(--muted); }
.range { flex: 1; height: 10px; border-radius: 5px; background: rgba(255,255,255,.12); position: relative; }
.range i { position: absolute; top: 0; bottom: 0; border-radius: 5px; background: linear-gradient(90deg, #7FC8FF, var(--warn)); }

/* --- camera, full screen ----------------------------------------------------------------------------- */
.camera-full { position: absolute; inset: 0; z-index: 20; background: #000; animation: cam-in .55s var(--sheet) both; }
.camera-full.closing { animation: cam-out .5s var(--sheet-out) both; pointer-events: none; }
@keyframes cam-in { from { opacity: 0; transform: scale(.96); } }
@keyframes cam-out { to { opacity: 0; transform: scale(.96); } }
.cam-stage, .cam-stage video, .cam-stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
/* The camera's last frame (the still) shows until the live picture is on screen (.playing: main.js sets it on the
   video's first shown frame). A video with no frame is see-through in a browser and on webOS, but Android TV's WebView
   paints it black, so it stays hidden until then and appears at once (a fade showed a black frame on the Chromecast);
   the still goes a moment later, under the video. */
.cam-stage video { opacity: 0; }
.cam-stage.playing video { opacity: 1; }
.cam-stage.playing img.still { opacity: 0; transition: opacity 0s .3s; }
.cam-top { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; gap: 22px; padding: 40px 96px 60px;
  font-size: 34px; font-weight: 600; background: linear-gradient(rgba(0,0,0,.6), transparent); transition: opacity .45s var(--ease); }
.live { display: inline-flex; align-items: center; gap: 10px; padding: 8px 18px; border-radius: 20px; background: rgba(255,255,255,.14); font-size: 22px; font-weight: 600; }
.live i { width: 12px; height: 12px; border-radius: 50%; background: var(--muted); }
.live.on { background: rgba(255,59,48,.85); }
.live.on i { background: #fff; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .3; } }
.cam-strip { position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 0 30px; background: linear-gradient(transparent, rgba(0,0,0,.75)); transition: opacity .5s var(--ease), transform .5s var(--ease); }
.camera-full.bare .cam-strip { opacity: 0; transform: translateY(40px); }
.camera-full.bare .cam-top { opacity: 0; }
.cam-strip .track { padding: 14px 96px; gap: 20px; }
.cthumb { position: relative; flex: none; width: 300px; height: 169px; border-radius: 20px; overflow: visible; background: #111; transition: transform .3s var(--ease); }
.cthumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 20px; }
.cthumb span { position: absolute; left: 0; right: 0; bottom: 0; padding: 30px 16px 12px; font-size: 22px; font-weight: 600; border-radius: 0 0 20px 20px;
  background: linear-gradient(transparent, rgba(0,0,0,.8)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cthumb::after { content: ""; position: absolute; left: 30%; right: 30%; bottom: -14px; height: 5px; border-radius: 3px; background: var(--lime); opacity: 0; transition: opacity .3s var(--ease); }
.cthumb.cur::after { opacity: 1; }
.cthumb.f { transform: scale(1.08); }
.cthumb.f { box-shadow: 0 20px 40px rgba(0,0,0,.6); }

/* --- screensaver, status, errors ------------------------------------------------------------------- */
#saver { position: absolute; inset: 0; z-index: 50; background: #000; animation: fade 1.2s var(--sheet-out) both; }
/* Waking up: the black fades away instead of vanishing (main.js wake drops it once the fade is done). */
#saver.out { animation: fade-out .5s var(--sheet-out) both; pointer-events: none; }
.saver-box { position: absolute; left: 0; top: 0; color: #8C9AA0; transition: transform 4s var(--sheet-out); }
.saver-box .clock { font-size: 150px; color: #A9B6BB; }
.saver-wx { display: flex; align-items: center; gap: 14px; font-size: 40px; margin-top: 10px; }
.saver-wx span { font-size: 26px; margin-left: 16px; }
.saver-wx span::first-letter, .p-row.day .dn::first-letter { text-transform: uppercase; }
#status, #toast { position: absolute; right: 96px; z-index: 60; }
#status { bottom: 54px; }
#toast { top: 54px; }
.pill { display: inline-flex; align-items: center; gap: 12px; padding: 16px 28px; border-radius: 40px; background: var(--sheet-bg);
  border: 1.5px solid var(--glass-line); font-size: 26px; box-shadow: 0 16px 40px rgba(0,0,0,.4); animation: pill-in .55s var(--sheet) both; }
.pill.out { animation: pill-out .45s var(--sheet-out) both; }
@keyframes pill-in { from { opacity: 0; transform: translateY(-16px) scale(.98); } }
@keyframes pill-out { to { opacity: 0; transform: translateY(-10px) scale(.98); } }
.fatal { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; text-align: center; gap: 4px; }
.fatal .logo { width: 130px; height: 130px; display: block; }
.fatal h1 { margin: 16px 0 0; font-size: 56px; font-weight: 600; }
.fatal p { margin: 0; font-size: 30px; color: var(--muted); }
/* Pairing: the code is read off the screen from the sofa and typed nowhere, only compared, so it is large and spaced. */
.pair .code { display: flex; gap: 14px; margin: 28px 0 24px; }
.pair .code span { width: 92px; height: 120px; display: grid; place-items: center; border-radius: 22px; background: var(--glass);
  border: 1.5px solid var(--glass-line); font-size: 76px; font-weight: 600; color: var(--accent, #B8F03C); }
.pair p { max-width: 1100px; line-height: 1.4; }
.pair p.small { margin-top: 26px; font-size: 24px; opacity: .7; }
.pill.note { margin-top: 96px; max-width: 900px; font-size: 30px; padding: 22px 32px; border-radius: 32px; align-items: flex-start; }
.pill.note b { font-weight: 600; }

/* --- header variants (?hero= / tv_hero) -------------------------------------------------------------- */
/* glance: a lower header, then one row of large status pills. */
.hero.glance { display: block; min-height: 0; padding-bottom: 6px; }
.g-top { display: flex; justify-content: space-between; align-items: flex-start; }
.hero.glance .clock { font-size: 112px; }
.hero.glance .hero-r { flex-direction: row; align-items: center; gap: 22px; }
.gpills { display: flex; gap: 18px; margin-top: 22px; }
.gpill { display: flex; align-items: center; gap: 16px; min-width: 0; padding: 18px 26px 18px 20px; border-radius: 26px; background: var(--glass);
  border: 1.5px solid var(--glass-line); }
.gpill > hd-icon { font-size: 44px; color: var(--lime); flex: none; }
.gpill span { display: block; font-size: 22px; color: var(--muted); white-space: nowrap; }
.gpill b { display: block; font-size: 30px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px; }
.gpill b small { font-size: 22px; font-weight: 500; color: var(--muted); }
.gpill.lit { background: rgba(var(--lime-rgb),.1); border-color: rgba(var(--lime-rgb),.3); }
.gpill.alert { background: rgba(255,90,78,.22); border-color: rgba(255,107,90,.6); }
.gpill.alert > hd-icon { color: var(--alert); }

/* cover: a full-width backdrop, Google TV style: the playing artwork blurred, or a sky for the weather. */
.hero.cover { position: relative; margin: -54px 0 0; padding: 54px 96px 40px; min-height: 470px; overflow: hidden; }
.cv-bg { position: absolute; inset: 0; z-index: -2; }
.cv-bg.art-bg { background: center/cover no-repeat; filter: blur(40px) saturate(1.3); transform: scale(1.15); opacity: .75; }
.cv-bg.sky-sun { background: radial-gradient(60% 90% at 80% 10%, rgba(255,196,84,.55), transparent 70%), linear-gradient(180deg, #2B7EA6, #165566); }
.cv-bg.sky-cloud { background: radial-gradient(60% 90% at 80% 10%, rgba(200,214,222,.35), transparent 70%), linear-gradient(180deg, #3F6574, #165566); }
.cv-bg.sky-rain { background: radial-gradient(60% 90% at 80% 10%, rgba(120,160,190,.35), transparent 70%), linear-gradient(180deg, #2E4E5C, #12404E); }
.cv-bg.sky-night { background: radial-gradient(50% 80% at 80% 10%, rgba(120,140,220,.3), transparent 70%), linear-gradient(180deg, #14243E, #0E3542); }
.cv-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(8,26,36,.7), rgba(8,26,36,.1) 60%), linear-gradient(180deg, transparent 55%, #114556); }
.cv-right { display: flex; flex-direction: column; align-items: flex-end; gap: 26px; }
.cv-right .hero-r { flex-direction: row; align-items: center; padding: 0; }
.cv-feature { display: flex; align-items: center; gap: 26px; max-width: 760px; padding: 22px 30px 22px 22px; border-radius: 30px;
  background: rgba(8,26,36,.45); border: 1.5px solid rgba(255,255,255,.14); }
.cv-feature img { width: 180px; height: 180px; border-radius: 22px; object-fit: cover; flex: none; }
.cv-feature.wx hd-icon.xl { font-size: 130px; }
.cv-feature b { display: block; font-size: 40px; font-weight: 600; line-height: 1.15; margin: 4px 0; }
.cv-feature span { font-size: 26px; color: var(--muted); }

/* today: clock left, a "Dzi\u015B" card with the next hours right. */
.td-side { display: flex; flex-direction: column; align-items: flex-end; gap: 22px; }
.hero-r.row-r { flex-direction: row; align-items: center; padding: 0; }
.td-card { width: 760px; padding: 24px 28px; border-radius: 30px; background: var(--glass); border: 1.5px solid var(--glass-line); }
.td-now { display: flex; align-items: center; gap: 18px; }
.td-now > hd-icon { font-size: 64px; }
.td-now > b { font-size: 64px; font-weight: 300; line-height: 1; }
.td-now span { display: block; font-size: 26px; }
.td-now small { font-size: 22px; color: var(--muted); }
.td-sun { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 24px; color: var(--muted); }
.td-sun hd-icon { font-size: 30px; color: var(--lime); margin-left: 10px; }
.td-hours { display: flex; justify-content: space-between; margin-top: 18px; padding-top: 16px; border-top: 1.5px solid rgba(255,255,255,.08); }
.th { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 22px; color: var(--muted); }
.th hd-icon { font-size: 38px; color: #fff; }
.th b { font-size: 26px; color: #fff; font-weight: 500; }

/* --- one sensor: last 24 h ----------------------------------------------------------------------------- */
.stl { margin: 4px 0 6px; }
.tl24 { display: block; width: 100%; height: 86px; overflow: visible; }
.tl24 .bg { fill: rgba(255,255,255,.08); }
.tl24 .on { fill: var(--alert); }
.tick { stroke: rgba(255,255,255,.12); stroke-width: 1; vector-effect: non-scaling-stroke; }
.tickl { fill: var(--muted); font: 500 20px Figtree, sans-serif; text-anchor: middle; }
.sstats { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 14px; margin: 22px 0 26px; }
.sstats > div { padding: 18px 22px; border-radius: 22px; background: var(--glass); border: 1.5px solid var(--glass-line); }
.sstats span { display: block; font-size: 22px; color: var(--muted); white-space: nowrap; }
.sstats b { display: block; font-size: 32px; font-weight: 500; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nchart { position: relative; }
.nchart svg { display: block; width: 100%; height: 300px; overflow: visible; }
.nchart .tmp { fill: none; stroke: var(--lime); stroke-width: 4; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.nchart .hum { fill: none; stroke: #4FB3FF; stroke-width: 3; stroke-dasharray: 8 6; vector-effect: non-scaling-stroke; opacity: .8; }
.legend { display: flex; gap: 28px; margin-top: 18px; font-size: 22px; color: var(--muted); }
.legend span::before { content: ""; display: inline-block; width: 26px; height: 4px; border-radius: 2px; margin-right: 10px; vertical-align: middle; background: var(--lime); }
.legend .hum::before { background: #4FB3FF; }

/* --- summary from the left, and the edge that hints at it ---------------------------------------------- */
.panel-wrap.left { justify-content: flex-start; }
.panel-wrap.left .panel { animation-name: in-l; }
.panel-wrap.left .panel::before { transform-origin: left center; border-left: 0; border-right: 1.5px solid var(--glass-line); box-shadow: 30px 0 80px rgba(0,0,0,.45); }
.panel.summary { width: 860px; }
.panel.summary .wx-sec { margin-top: 26px; }
.panel.summary .wx-sec:first-child { margin-top: 0; }
#edge { position: absolute; left: 0; top: 50%; z-index: 5; transform: translateY(-50%); }
/* The tab that says a summary slides out from the left: a rounded pull-tab with a bell, lit when something waits. */
.edge { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; width: 54px; padding: 28px 0 28px 4px;
  border-radius: 0 36px 36px 0; background: rgba(255,255,255,.08); border: 1.5px solid var(--glass-line); border-left: 0;
  color: rgba(255,255,255,.7); font-size: 32px; box-shadow: 10px 0 30px rgba(0,0,0,.25); transition: opacity .45s var(--ease); }
.edge.has { background: rgba(var(--lime-rgb),.14); border-color: rgba(var(--lime-rgb),.35); color: var(--lime); }
.edge b { display: grid; place-items: center; min-width: 40px; height: 40px; padding: 0 8px; border-radius: 20px; background: var(--lime);
  color: var(--lime-ink); font-size: 24px; font-weight: 700; }
body.has-panel #edge { opacity: 0; }
.tile.sec.calm .ic { background: rgba(var(--lime-rgb),.18); color: var(--lime); }

/* summary: rows that need doing, then the house as cards two to a line */
.p-row.notif { height: auto; min-height: 112px; padding-top: 20px; padding-bottom: 20px; align-items: flex-start; }
.p-row.notif .t span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.p-row.warn .ic { background: rgba(255,179,64,.22); color: var(--warn); }
.scard { position: relative; flex: 1; min-width: 0; display: grid; grid-template-columns: 56px 1fr; grid-template-rows: auto auto auto; column-gap: 18px;
  align-items: center; padding: 22px 24px; border-radius: 26px; background: var(--glass); border: 1.5px solid var(--glass-line); transition: transform .3s var(--ease); }
.scard .ic { grid-row: span 3; width: 56px; height: 56px; font-size: 30px; align-self: start; }
.scard span { font-size: 21px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scard b { font-size: 30px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scard small { font-size: 21px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scard.lit { background: rgba(var(--lime-rgb),.09); border-color: rgba(var(--lime-rgb),.28); }
.scard.lit .ic { background: var(--lime); color: var(--lime-ink); }
.scard.warn .ic { background: rgba(255,179,64,.22); color: var(--warn); }
.scard.f { background: rgba(255,255,255,.14); transform: scale(1.04); }
.scard::after { content: ""; position: absolute; inset: -1.5px; border-radius: inherit; box-shadow: 0 24px 48px rgba(0,0,0,.45);
  opacity: 0; transition: opacity .3s var(--ease); pointer-events: none; }
.scard.f::after { opacity: 1; }
.scard.playing { display: block; padding: 18px; }
.pl-view { overflow: hidden; border-radius: 20px; }
.pl-track { display: flex; transition: transform .5s var(--ease); will-change: transform; }
.pl-slide { flex: 0 0 100%; display: flex; align-items: center; gap: 24px; min-width: 0; padding-right: 8px; }
.pl-slide .art { width: 132px; height: 132px; border-radius: 20px; flex: none; }
.pl-slide .art.none { font-size: 56px; }
.pl-slide .pl { min-width: 0; flex: 1; }
.pl-slide .pl span, .pl-slide .pl small { display: block; font-size: 21px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pl-slide .pl b { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal; overflow: hidden; font-size: 30px; font-weight: 600; line-height: 1.2; margin: 4px 0; }
.scard.playing .dots { display: flex; justify-content: center; gap: 10px; margin-top: 14px; }
.scard.playing .dots i { width: 10px; height: 10px; border-radius: 5px; background: rgba(255,255,255,.25); transition: width .45s var(--ease), background-color .45s var(--ease); }
.scard.playing .dots i.on { width: 28px; background: var(--lime); }
.panel.summary .p-line { margin-top: 22px; }
.panel.summary .wx-sec + .p-line { margin-top: 0; }
.p-note { font-size: 26px; line-height: 1.45; color: rgba(255,255,255,.85); margin: 4px 0 26px; white-space: normal; }

/* --- vacuum, washer, dishwasher ("Teraz pracuje") ------------------------------------------------------ */
.tile.device { width: 360px; }
.tile.device.done .ic { background: var(--lime); color: var(--lime-ink); }
.ring { display: block; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(255,255,255,.14); stroke-width: 5; }
.ring-fg { fill: none; stroke: var(--lime); stroke-width: 5; stroke-linecap: round; }
.tile.on .ring-bg { stroke: rgba(18,35,44,.12); }
.tile.on .ring-fg { stroke: var(--lime-deep); }
.dring { position: relative; width: 86px; height: 86px; margin: -8px -6px 0 0; }
.dring .ring-bg, .dring .ring-fg { stroke-width: 3.5; }
.dring span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
.dring span small { font-size: 14px; font-weight: 600; margin: 4px 0 0 1px; }
.dcheck { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: rgba(var(--lime-rgb),.18); color: var(--lime); font-size: 26px; }
.dbadge { display: flex; align-items: center; gap: 4px; font-size: 22px; font-weight: 600; color: rgba(18,35,44,.7); }
.dbadge hd-icon { font-size: 26px; }
.dev-hero { display: flex; align-items: center; gap: 36px; padding: 30px 34px; margin-bottom: 20px; border-radius: 30px; background: var(--glass); }
.dev-hero.on { background: rgba(var(--lime-rgb),.1); }
.dev-hero > hd-icon.xl { font-size: 110px; color: var(--lime); }
.dev-hero b { display: block; font-size: 50px; font-weight: 500; line-height: 1.1; }
.dev-hero span { display: block; font-size: 26px; color: var(--muted); margin-top: 4px; }
.bigring { position: relative; width: 200px; height: 200px; flex: none; }
.bigring .ring-bg, .bigring .ring-fg { stroke-width: 4; }
.bigring > div { position: absolute; inset: 0; display: grid; place-items: center; }
.bigring > div b { font-size: 52px; font-weight: 500; margin: 0; }
.bigring > div hd-icon { font-size: 80px; color: var(--lime); }
.dev-tiles { margin: 0 0 22px; }
.dev-tiles .wtile.wide { grid-column: span 2; }
.dev-tiles .wtile b { font-size: 32px; overflow: hidden; text-overflow: ellipsis; }

/* Layers made up front. Each item that can take the focus, its shadow and each home row are their own GPU layer
   from the start: otherwise the TV creates and paints the layer when the move begins and drops that first frame
   (measured on the C4: dropped frames per 20 moves 21-25 \u2192 10). Costs some tens of MB of GPU memory. */
.tile, .instance, .p-row, .sensors > .sensor, .scard, .cthumb, .btn { transform: scale(1); will-change: transform; }
.tile::after, .instance::after, .p-row::after, .btn::after, .sensors > .sensor::after, .scard::after { will-change: opacity; }
.row, .hero { will-change: opacity; }

/* --- settings ------------------------------------------------------------------------------------------ */
.p-tools { margin-left: auto; align-self: flex-start; }
.p-gear { position: relative; width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; font-size: 38px;
  background: var(--glass); border: 1.5px solid var(--glass-line); color: var(--muted); transition: transform .3s var(--ease);
  transform: scale(1); will-change: transform; }
.p-gear.f { transform: scale(1.12); background: rgba(255,255,255,.16); color: #fff; }
.p-row .v hd-icon { font-size: 34px; color: var(--muted); vertical-align: -6px; }
.wgrid .p-line { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-bottom: 22px; }
.wcard { position: relative; padding: 14px 14px 18px; border-radius: 28px; background: var(--glass); border: 1.5px solid var(--glass-line);
  transition: transform .3s var(--ease); transform: scale(1); will-change: transform; }
.wcard.on { border-color: rgba(var(--lime-rgb),.7); }
.wcard.f { transform: scale(1.05); background: rgba(255,255,255,.14); }
.wprev { position: relative; height: 180px; border-radius: 18px; margin-bottom: 14px; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.08); }
.wcheck { position: absolute; right: 12px; top: 12px; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
  background: var(--lime); color: var(--lime-ink); font-size: 26px; }
.wcard > b { display: block; font-size: 28px; font-weight: 600; padding: 0 6px; }
/* Direct children only: the check mark is a span too, and must keep its own grid, colour and size. */
.wcard > span { display: block; font-size: 22px; color: var(--muted); padding: 0 6px; }
.adot { display: inline-block; width: 26px; height: 26px; border-radius: 50%; margin-right: 12px; vertical-align: -4px; box-shadow: inset 0 0 0 1.5px rgba(0,0,0,.2); }
.acgrid .p-line { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.acard { position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px 12px 20px; border-radius: 28px;
  background: var(--glass); border: 1.5px solid var(--glass-line); transition: transform .3s var(--ease); transform: scale(1); will-change: transform; }
.acard.on { border-color: rgba(var(--lime-rgb),.7); }
.acard.f { transform: scale(1.06); background: rgba(255,255,255,.14); }
.aswatch { width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center; font-size: 44px; box-shadow: 0 10px 30px rgba(0,0,0,.3); }
.acard b { font-size: 26px; font-weight: 600; }

/* --- frosted glass (body.frost, see src/ui/frost.js) and no animations (body.no-anim) ------------------------ */
body.frost #home .tile:not(.on):not(.cam):not(.alert), body.frost #home .td-card, body.frost #home .instance, body.frost #edge .edge {
  position: relative; background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.22); isolation: isolate;
  /* The lit top edge of a pane of glass. Painted once with the tile; it does not move on its own. */
  box-shadow: inset 0 1.5px 0 rgba(255,255,255,.16); }
.fzw { position: absolute; inset: 0; z-index: -1; border-radius: inherit; overflow: hidden; pointer-events: none; }
/* Same curve and duration as the page and the rows (.page, .track), so the counter-move cancels theirs exactly. */
.fzw canvas { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; will-change: transform;
  transition: transform .45s var(--ease); }
body:not(.frost) .fzw { display: none; }
/* Tiles in full colour (Ustawienia \u2192 Kafle \u2192 Pe\u0142ny kolor): opaque, in the wallpaper's hue like the panels, the lightest
   option for the TV. Without frost or solid the tiles are the plain translucent glass (Przezroczyste). */
body.solid #home .tile:not(.on):not(.cam):not(.alert), body.solid #home .td-card, body.solid #home .instance, body.solid #edge .edge {
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0)), var(--sheet-bg); border-color: rgba(255,255,255,.10); }
/* The glass stays under an open panel: hiding its canvases when a panel opened and showing them again when it closed
   made the TV draw them all anew each time (on a Chromecast with Google TV 4K a frame of 100-180 ms at the start of the
   room panel and of its way out; kept, 33-83 ms). Under the full-screen camera, which covers everything and plays
   video, the glass is hidden. */
body.has-camera #home .fzw { visibility: hidden; }
body.frost #home .tile.sec.off { opacity: .7; }
body.no-anim *, body.no-anim *::before, body.no-anim *::after { transition: none !important; animation: none !important; }

/* --- the focused tile is lit, not only grown -------------------------------------------------------------------
   Scale alone was hard to see from the sofa. A white layer brightens the focused tile's glass: in frosted mode inside
   the glass (.fzw::after, under the text, fading with opacity on the GPU); in the other looks the background switches
   at once. Lit tiles go from 94 % to full white. */
.fzw::after { content: ""; position: absolute; inset: 0; z-index: 2; background: rgba(255,255,255,.22); opacity: 0; transition: opacity .3s var(--ease); }
.f > .fzw::after { opacity: 1; }
#home .tile.f:not(.on):not(.cam):not(.alert), #home .td-card.f, #home .instance.f, #edge .edge.f { background: rgba(255,255,255,.24); }
body.solid #home .tile.f:not(.on):not(.cam):not(.alert), body.solid #home .instance.f, body.solid #edge .edge.f {
  background: linear-gradient(rgba(255,255,255,.2), rgba(255,255,255,.2)), var(--sheet-bg); }
#home .tile.on.f { background: #fff; }
/* Ustawienia \u2192 Obramowanie zaznaczenia: a ring in the accent colour around whatever has the focus, drawn as a spread
   shadow of the ::after layer that already carries the focus shadow; items without that layer get an accent border.
   The body class is "focus-ring", not "ring": .ring (the progress ring) rotates by -90\xB0, and took the whole screen with it. */
body.focus-ring .f::after { box-shadow: 0 0 0 4px var(--lime), 0 24px 48px rgba(0,0,0,.45); }
body.focus-ring .wcard.f, body.focus-ring .cthumb.f, body.focus-ring .p-gear.f, body.focus-ring .acard.f { border-color: var(--lime); }

/* An alarm in Ochrona (a door left open): the same frosted glass, tinted red inside the pane; focused, a red mask and a
   red ring (whatever the outline setting), so it reads as an alarm and as the focus at once. */
body.frost #home .tile.alert { position: relative; isolation: isolate; background: rgba(255,90,78,.10); border-color: rgba(255,107,90,.75);
  box-shadow: inset 0 1.5px 0 rgba(255,190,180,.25); }
.tile.alert > .fzw::before { content: ""; position: absolute; inset: 0; z-index: 1; background: rgba(255,70,55,.30); }
.tile.alert > .fzw::after { background: rgba(255,120,100,.32); }
#home .tile.alert.f { background: rgba(255,90,78,.42); }
#home .tile.alert.f::after { box-shadow: 0 0 0 4px var(--alert), 0 24px 48px rgba(0,0,0,.45); }

/* --- Po\u0142\u0105czenie: homes, adding one, signing out ------------------------------------------------------------------ */
.btn.round.small { width: 112px; height: 112px; flex: none; border-radius: 26px; }
.btn.round.small hd-icon { font-size: 40px; }
.p-input { position: relative; flex: 1; display: flex; align-items: center; gap: 22px; height: 112px; padding: 0 30px; border-radius: 26px;
  background: rgba(0,0,0,.25); border: 1.5px solid var(--glass-line); transition: transform .3s var(--ease); }
.p-input hd-icon { font-size: 34px; color: var(--muted); }
.p-input input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: #fff; font: 600 34px var(--font, Figtree), sans-serif; caret-color: var(--lime); }
.p-input input::placeholder { color: rgba(255,255,255,.3); }
.p-input.f { transform: scale(1.03); border-color: rgba(var(--lime-rgb),.7); background: rgba(0,0,0,.35); }
.p-input:focus-within { border-color: var(--lime); }
.p-note { margin: 16px 6px 4px; font-size: 24px; color: var(--muted); line-height: 1.4; }

/* The Alvuna panel's preview (main.js MIRROR): its items can be clicked to press them on the TV. */
body.mirror [data-f] { cursor: pointer; }
`;function yt(n){let e=[],t=0,a="";for(let i of n)i==="("?t++:i===")"&&t--,i===","&&!t?(e.push(a),a=""):a+=i;return e.push(a),e.map(i=>i.trim()).filter(Boolean)}function Ge(n,e){let t="",a=0;for(;a<n.length;){let i=n.indexOf("{",a);if(i<0)break;let o=n.slice(a,i).trim(),r=1,s=i+1;for(;s<n.length&&r;)n[s]==="{"?r++:n[s]==="}"&&r--,s++;let p=n.slice(i+1,s-1);if(/^@(media|supports|container)/.test(o))t+=`${o}{${Ge(p,e)}}`;else if(!o.startsWith("@font-face"))if(o.startsWith("@"))t+=`${o}{${p}}`;else{let h=yt(o).map(g=>g===":root"?e:/^(html|body)\b/.test(g)?null:`${e} ${g}`).filter(Boolean);h.length&&(t+=`${h.join(",")}{${p}}`)}a=s}return t}var qe=Ge(fe.replace(/\/\*[\s\S]*?\*\//g,""),".tvp"),Ze=!1;function Ye(){if(Ze)return;Ze=!0;let n=document.createElement("style");n.textContent=(fe.match(/@font-face\s*\{[^}]*\}/g)||[]).join(`
`),document.head.appendChild(n)}var xt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},d=n=>String(n??"").replace(/[&<>"']/g,e=>xt[e]),P=n=>`<ha-icon icon="${n}"></ha-icon>`,_t={wallpaper:O[0].id,accent:H[0].id,glass:"frost",ring:!1,anim:!0,dim:!0,shift:!0,saver:null,exit:null};function Je(n,e){if(!n)return"";let t=Math.round((Date.now()-new Date(n).getTime())/1e3);if(t<60)return l("tvs.just_now");let a=new Intl.RelativeTimeFormat(e,{numeric:"auto"});return t<3600?a.format(-Math.round(t/60),"minute"):t<86400?a.format(-Math.round(t/3600),"hour"):a.format(-Math.round(t/86400),"day")}var zt=(n,e)=>new Intl.DateTimeFormat(e,{hour:"2-digit",minute:"2-digit"}).format(new Date(n));function kt(n,e){let t=(a,i)=>new Intl.NumberFormat(e,{style:"unit",unit:i,unitDisplay:"long",maximumFractionDigits:0}).format(a);return n<3600?t(Math.max(1,Math.round(n/60)),"minute"):n<172800?t(Math.round(n/3600),"hour"):t(Math.round(n/86400),"day")}function Xe(n){if(!n.view)return"";let[e,...t]=String(n.detail||"").split(":"),a=t.join(":");if(n.view==="camera")return l("tvs.views.camera",{name:a});if(n.view==="panel"){let i=l(`tvs.panels.${e}`,{name:a});return i===`tvs.panels.${e}`?l("tvs.views.panel"):i.replace(/:\s*$/,"")}return l(`tvs.views.${n.view}`)}function $t(n){let e=n.status||{};return e.idle==null||!n.last_seen?null:new Date(new Date(n.last_seen).getTime()-e.idle*1e3).toISOString()}function Qe(n){let{data:e,lang:t}=n;if(e==="unavailable")return`<div class="state card"><p>${d(l("tvs.unavailable"))}</p></div>`;if(!e)return`<div class="state"><span class="dot"></span>${d(l("loading"))}</div>`;let a=`<div class="intro"><p>${d(l("tvs.intro"))}</p></div>`;if(!e.tvs.length){let o=`${location.origin}/alvuna/tv/`;return`${a}<div class="state card">
      <p class="state-title">${d(l("tvs.none_title"))}</p>
      <p>${d(l("tvs.none",{url:o}))}</p>
    </div>`}let i=e.tvs.find(o=>o.entry_id===n.selected)||e.tvs[0];return a+(e.tvs.length>1?jt(e.tvs,i,n):"")+St(i,n)}function et(n,e){return n.connected?{on:!0,text:n.since?l("tvs.online_since",{time:zt(n.since,e)}):l("tvs.online")}:{on:!1,text:n.last_seen?`${l("tvs.offline")} \xB7 ${l("tvs.seen",{ago:Je(n.last_seen,e)})}`:l("tvs.offline")}}function jt(n,e,t){return`<div class="tv-picker" role="tablist" aria-label="${d(l("tvs.pick"))}">${n.map(a=>{let i=a.status||{},o=et(a,t.lang),r=a===e,s=a.connected&&i.view?Xe(i):o.text;return`<button class="tv-pick" role="tab" aria-selected="${r}" data-action="tv-pick" data-id="${d(a.entry_id)}" data-focus="tv-pick|${d(a.entry_id)}">
      <span class="icon tv-icon small ${a.connected?"":"off"}">${P("mdi:television")}</span>
      <span class="tv-pick-text"><span class="tv-pick-name">${d(a.name)}</span>
        <span class="tv-pick-state"><span class="tv-dot ${o.on?"on":""}"></span>${d(s)}</span></span>
    </button>`}).join("")}</div>`}function St(n,e){let t=["control","layout","settings","log"].includes(e.section)?e.section:"control",a=(n.log||[]).length,i=(s,p,h="")=>`<button class="tab" role="tab" data-action="tv-section" data-key="${s}" data-focus="tv-section|${s}"
    aria-selected="${t===s}">${d(p)}${h}</button>`,o=`<div class="tabs sub" role="tablist">
    ${i("control",l("tvs.sections.control"))}
    ${i("layout",l("tvs.sections.layout"))}
    ${i("settings",l("tvs.sections.settings"),n.pending?` <span class="pending-dot" title="${d(l("tvs.pending"))}"></span>`:"")}
    ${i("log",l("tvs.sections.log"),a?`<span class="count">${a}</span>`:"")}
  </div>`,r=t==="settings"?Nt(n,e):t==="log"?Mt(n,e):t==="layout"?Ot(n,e):Pt(n,e);return`${At(n,e)}${o}${r}`}function At(n,e){let{lang:t,data:a}=e,i=n.status||{},o=d(n.entry_id),r=et(n,t),s=`<span class="tv-dot ${r.on?"on":""}"></span>${d(r.text)}`,p=i.platform?`<span class="badge muted">${d(l(`tvs.platform.${i.platform}`))}</span>`:"",h=n.device_id?`<a class="tv-link" href="/config/devices/device/${encodeURIComponent(n.device_id)}" data-nav>${d(l("tvs.device"))}${e.svg(e.P.next)}</a>`:"",g=n.connected&&i.view?`<div class="tv-now">
        <span class="tv-now-label">${d(l("tvs.on_screen"))}</span>
        <span class="tv-now-value">${d(Xe(i))}${i.dimmed&&i.view!=="saver"?` <span class="badge muted">${d(l("tvs.dimmed"))}</span>`:""}</span>
      </div>`:"",y=$t(n),w=[y&&[l("tvs.last_key"),Je(y,t)],i.home&&[l("tvs.home"),i.homes>1?`${i.home} (${l("tvs.homes",{n:i.homes})})`:i.home],i.screen&&[l("tvs.screen"),i.screen.replace("x"," \xD7 ")],i.language&&[l("tvs.language"),i.language.toUpperCase()],n.connected&&i.uptime!=null&&[l("tvs.uptime"),kt(i.uptime,t)],a.version&&[l("tvs.version"),a.version]].filter(Boolean);return`<section class="tv" aria-labelledby="tv-${o}">
    <div class="card">
      <div class="tv-head">
        <div class="icon tv-icon ${n.connected?"":"off"}">${P("mdi:television")}</div>
        <div class="main">
          <h2 id="tv-${o}" class="tv-name">${d(n.name)}</h2>
          <div class="sub">${s}${p}</div>
        </div>
        ${h}
      </div>
      ${g}
      ${w.length?`<dl class="tv-facts">${w.map(([_,u])=>`<div><dt>${d(_)}</dt><dd>${d(u)}</dd></div>`).join("")}</dl>`:""}
      ${i.ua?`<details class="tv-ua"><summary>${d(l("tvs.ua"))}</summary><p class="mono">${d(i.ua)}</p></details>`:""}
    </div>
  </section>`}function Ct(n){let e=d(n.entry_id);return`<div class="tv-mirror">
    <div class="tv-mirror-head"><h3>${d(l("tvs.preview"))}</h3>${n.connected?`<span class="tv-mirror-note">${d(l("tvs.preview_note"))}</span>`:""}</div>
    ${n.connected?`<div class="tv-mirror-slot" data-id="${e}"></div>${Tt(n)}`:`<div class="tv-mirror-off"><span>${P("mdi:television-off")}</span><p>${d(l("tvs.preview_off"))}</p></div>`}
  </div>`}function Tt(n){let e=d(n.entry_id),t=(a,i,o,r="")=>`<button class="rc-btn ${r}" data-action="tv-key" data-id="${e}" data-key="${a}"
    data-focus="rc|${a}" title="${d(o)}" aria-label="${d(o)}">${P(i)}</button>`;return`<div class="rc" role="group" aria-label="${d(l("tvs.remote.label"))}">
    ${t("back","mdi:arrow-left",l("tvs.remote.back"),"rc-back")}
    <div class="rc-pad">
      ${t("up","mdi:chevron-up",l("tvs.remote.up"),"rc-up")}
      ${t("left","mdi:chevron-left",l("tvs.remote.left"),"rc-left")}
      <button class="rc-btn rc-ok" data-action="tv-key" data-id="${e}" data-key="ok" data-focus="rc|ok" aria-label="${d(l("tvs.remote.ok"))}">OK</button>
      ${t("right","mdi:chevron-right",l("tvs.remote.right"),"rc-right")}
      ${t("down","mdi:chevron-down",l("tvs.remote.down"),"rc-down")}
    </div>
    <span class="rc-hint">${d(l("tvs.remote.hint"))}</span>
  </div>`}function Pt(n,e){return`<div class="tv-control">${Ct(n)}${Lt(n,e)}</div>`}function Lt(n,e){let t=d(n.entry_id),a=n.connected?"":"disabled",i=n.status||{},o=(w,_,u,v="")=>`<button class="tv-act" data-action="tv-cmd" data-id="${t}" data-command="${w}"
    data-focus="tv-cmd|${t}|${w}" ${a} ${v}>${P(_)}<span>${d(u)}</span></button>`,r=i.view==="saver"?o("saver_off","mdi:monitor-eye",l("tvs.saver_off")):o("saver_on","mdi:monitor-star",l("tvs.saver_on")),s=["summary","weather",...e.hasClimate?["climate"]:[],"settings"],p=`<select class="tv-select" data-action="tv-open" data-id="${t}" data-focus="tv-open|${t}" aria-label="${d(l("tvs.open_label"))}" ${a}>
      <option value="">${d(l("tvs.open"))}</option>
      <optgroup label="${d(l("tvs.places"))}">${s.map(w=>`<option value="${w}">${d(l(`tvs.targets.${w}`))}</option>`).join("")}</optgroup>
      ${e.rooms.length?`<optgroup label="${d(l("tvs.rooms"))}">${e.rooms.map(w=>`<option value="room:${d(w.area)}">${d(w.name)}</option>`).join("")}</optgroup>`:""}
    </select>`,h=e.cameras.length?`<select class="tv-select" data-action="tv-camera" data-id="${t}" data-focus="tv-camera|${t}" aria-label="${d(l("tvs.camera_label"))}" ${a}>
      <option value="">${d(l("tvs.camera"))}</option>
      ${e.cameras.map(w=>`<option value="${d(w.id)}">${d(w.name)}</option>`).join("")}
    </select>`:"",g=e.flash[n.entry_id],y=e.drafts[n.entry_id]||"";return`<div class="tv-block">
    <div class="tv-flash-row" role="status">${g?`<span class="tv-flash ${g.error?"error":""}">${d(g.text)}</span>`:""}</div>
    <div class="card tv-pad">
      <div class="tv-acts">
        ${o("reload","mdi:refresh",l("tvs.reload"))}
        ${o("home","mdi:home-outline",l("tvs.go_home"))}
        ${r}
        ${i.platform&&i.platform!=="browser"?o("exit","mdi:exit-to-app",l("tvs.exit")):""}
      </div>
      <div class="tv-selects">${p}${h}</div>
      <form class="tv-msg" data-action="tv-notify" data-id="${t}">
        <label class="tv-msg-field"><span class="sr">${d(l("tvs.message"))}</span>
          <input type="text" maxlength="500" data-action="tv-draft" data-id="${t}" data-focus="tv-draft|${t}" value="${d(y)}"
            placeholder="${d(l("tvs.message_placeholder"))}" aria-label="${d(l("tvs.message"))}" autocomplete="off" ${a}>
        </label>
        <button class="button small" type="submit" data-focus="tv-send|${t}" ${a||(y.trim()?"":"disabled")}>${d(l("tvs.send"))}</button>
      </form>
      ${n.connected?"":`<p class="note in">${d(l("tvs.offline_hint"))}</p>`}
    </div>
  </div>`}function Nt(n,e){let t=d(n.entry_id),a=n.settings&&Object.keys(n.settings).length>0,i={..._t,...n.settings||{}},o=`<div class="tv-flash-row">${n.pending?`<span class="badge warn">${d(l("tvs.pending"))}</span>`:""}</div>`,r=(u,v,x,f,j="")=>`<button class="${j}" data-action="tv-set" data-id="${t}" data-key="${u}" data-value="${d(v)}"
    data-focus="tv-set|${t}|${u}|${d(v)}" aria-pressed="${String(i[u])===String(v)}" title="${d(x)}" aria-label="${d(x)}">${f}</button>`,s=u=>`<div class="tv-wps">${u.map(v=>r("wallpaper",v.id,v.name||v.id,`<span class="tv-wp" style="background:${d(v.base||"#000")};background:${d(v.preview||v.bg)}"></span><span class="tv-wp-name">${d(v.name||v.id)}</span>`,"tv-wp-btn")).join("")}</div>`,p=`<div class="tv-accents">${H.map(u=>r("accent",u.id,u.name||u.id,`<span class="tv-swatch" style="background:${u.c};color:${u.ink}">${i.accent===u.id?P("mdi:check-bold"):""}</span>`,"tv-accent")).join("")}</div>`,h=`<div class="seg" role="group" aria-label="${d(m("tv.settings.glass"))}">${U.glass.map(u=>r("glass",u,m(`tv.settings.glass_${u}`),d(m(`tv.settings.glass_${u}`)),"seg-btn")).join("")}</div>`,g=(u,v,x)=>`<div class="tv-row"><div class="main"><div class="tv-row-label">${d(u)}</div>
    ${v?`<div class="sub">${d(v)}</div>`:""}</div><div class="controls">${x}</div></div>`,y=u=>e.switch(`tv-pref|${n.entry_id}|${u}`,i[u],m(`tv.settings.${u}`),`data-tv-id="${t}" data-tv-key="${u}"`),w=(u,v)=>{let x=e.data.defaults?.[u],f=S=>S===0?v:m("tv.settings.min",{n:S}),j=U[u].includes(i[u])||i[u]==null?U[u]:[...U[u],i[u]].sort((S,K)=>S-K);return`<select class="tv-select" data-action="tv-minutes" data-id="${t}" data-key="${u}" data-focus="tv-min|${t}|${u}" aria-label="${d(m(`tv.settings.${u}`))}">
      <option value="" ${i[u]==null?"selected":""}>${d(l("tvs.follow_ha",{value:f(Number(x??0))}))}</option>
      ${j.map(S=>`<option value="${S}" ${i[u]===S?"selected":""}>${d(f(S))}</option>`).join("")}
    </select>`},_=u=>`<div class="tv-sec">${d(m(`tv.settings.${u}`))}</div>`;return`<div class="tv-block">${o}
    <div class="card tv-pad tv-settings">
      ${a?"":`<p class="note in">${d(l("tvs.no_settings"))}</p>`}
      ${_("look")}
      <div class="tv-field"><div class="tv-row-label">${d(m("tv.settings.wallpaper"))}</div>
        <div class="tv-sub-label">${d(m("tv.settings.colors"))}</div>${s(O.filter(u=>!u.photo))}
        <div class="tv-sub-label">${d(m("tv.settings.photos"))}</div>${s(O.filter(u=>u.photo))}</div>
      <div class="tv-field"><div class="tv-row-label">${d(m("tv.settings.accent"))}</div>${p}</div>
      <div class="tv-field"><div class="tv-row-label">${d(m("tv.settings.glass"))}</div>${h}</div>
      ${g(m("tv.settings.ring"),m("tv.settings.ring_hint"),y("ring"))}
      ${_("screen")}
      ${g(m("tv.settings.saver"),m("tv.settings.saver_hint"),w("saver",m("tv.settings.off")))}
      ${g(m("tv.settings.dim"),m("tv.settings.dim_hint"),y("dim"))}
      ${g(m("tv.settings.shift"),m("tv.settings.shift_hint"),y("shift"))}
      ${g(m("tv.settings.exit"),m("tv.settings.exit_hint"),w("exit",m("tv.settings.never")))}
      ${_("performance")}
      ${g(m("tv.settings.anim"),m("tv.settings.anim_hint"),y("anim"))}
      <p class="note in">${d(l("tvs.settings_hint"))}</p>
    </div>
  </div>`}var tt=n=>[...(n.rows||[]).filter(e=>R.includes(e)),...R.filter(e=>!(n.rows||[]).includes(e))];function at(n,e){let t=n.order?.[e.key]||[],a=e.items.map(o=>o.id),i=o=>{let r=t.indexOf(o);return r<0?t.length+a.indexOf(o):r};return e.items.slice().sort((o,r)=>i(o.id)-i(r.id))}function Q(n,e,t){let a=JSON.parse(JSON.stringify(n||{})),i=(r,s)=>r.includes(s)?r.filter(p=>p!==s):[...r,s],o=(r,s,p)=>{if(p<0||p>=r.length)return r;let h=r.slice();return[h[s],h[p]]=[h[p],h[s]],h};if(t.kind==="row-move"){let r=tt(a),s=r.indexOf(t.row);a.rows=o(r,s,s+t.step)}else if(t.kind==="row-hide")a.hidden_rows=i(a.hidden_rows||[],t.row);else if(t.kind==="tile-hide")a.hidden=i(a.hidden||[],t.id);else if(t.kind==="tile-move"){let r=e.find(h=>h.key===t.row);if(!r)return a;let s=at(a,r).map(h=>h.id),p=s.indexOf(t.id);a.order={...a.order||{},[t.row]:o(s,p,p+t.step)}}else if(t.kind==="row-order")a.rows=t.ids.filter(r=>R.includes(r));else if(t.kind==="tile-order")a.order={...a.order||{},[t.row]:t.ids};else if(t.kind==="reset")return{};return a}function Ot(n,e){let t=d(n.entry_id),a=n.catalog||[];if(!a.length)return`<div class="tv-flash-row"></div><div class="state card"><p>${d(l("tvs.layout.no_catalog"))}</p></div>`;let i=n.settings?.layout||{},o=new Set(i.hidden_rows||[]),r=new Set(i.hidden||[]),s=O.find(u=>u.id===n.settings?.wallpaper)||O[0],p=H.find(u=>u.id===n.settings?.accent)||H[0],h=`--lime:${p.c};--lime-rgb:${p.rgb};--lime-ink:${p.ink};--lime-deep:${p.deep};--lime-deeper:${p.deeper}`,g=tt(i).map(u=>a.find(v=>v.key===u)).filter(Boolean),y=(u,v,x,f=!1)=>`<button class="tvl-btn" ${u} title="${d(x)}" aria-label="${d(x)}" ${f?"disabled":""}>${P(v)}</button>`,w=g.map((u,v)=>{let x=o.has(u.key),f=at(i,u),j=(z,ze="")=>`data-action="tv-layout" data-id="${t}" data-op="${z}" data-row="${u.key}" ${ze}`,S=`<div class="tvl-row-head">
      <button class="tvl-grip" data-grip data-action="tv-layout-key" data-id="${t}" data-row="${u.key}" data-focus="tvl|${u.key}|grip"
        title="${d(l("tvs.layout.drag_row",{name:u.title}))}" aria-label="${d(l("tvs.layout.drag_row",{name:u.title}))}">${P("mdi:drag")}</button>
      <h4>${d(u.title)}</h4>${x?`<span class="badge muted">${d(l("tvs.layout.row_hidden"))}</span>`:""}
      <span class="spacer"></span>
      ${y(`${j("row-hide")} data-focus="tvl|${u.key}|hide"`,x?"mdi:eye-off-outline":"mdi:eye-outline",l(x?"tvs.layout.row_show":"tvs.layout.row_hide",{name:u.title}))}
    </div>`,K=f.map((z,ze)=>{let N=r.has(z.id),ke=(ht,gt="")=>`data-action="tv-layout" data-id="${t}" data-op="${ht}" data-row="${u.key}" data-tile="${d(z.id)}" ${gt}`,$e=e.preview?.get(z.id),je=`data-sort-item="${d(z.id)}" tabindex="0" data-action="tv-layout-key" data-id="${t}" data-row="${u.key}"
        data-tile="${d(z.id)}" data-focus="tvl|${d(z.id)}" aria-label="${d(l("tvs.layout.drag_tile",{name:z.name||z.id}))}"`;return $e?`<div class="tvl-tile live ${N?"off":""}" ${je}>
          <div class="tvp-box"><div class="tvp" style="${h}">${$e}</div></div>
          <div class="tvl-tile-bar">
            <span class="tvl-grip small" data-grip aria-hidden="true">${P("mdi:drag")}</span>
            ${N?`<span class="tvl-hidden">${d(l("tvs.layout.row_hidden"))}</span>`:""}
            ${y(`${ke("tile-hide")} data-focus="tvl|${d(z.id)}|hide"`,N?"mdi:eye-off-outline":"mdi:eye-outline",l(N?"tvs.layout.tile_show":"tvs.layout.tile_hide",{name:z.name}))}
          </div>
        </div>`:`<div class="tvl-tile ${N?"off":""}" ${je}>
        <div class="tvl-tile-top">
          <div class="tvl-tile-ic">${P(z.icon||"mdi:checkbox-blank-outline")}</div>
          <span class="tvl-grip small" data-grip aria-hidden="true">${P("mdi:drag")}</span>
        </div>
        <div class="tvl-tile-name">${d(z.name||z.id)}</div>
        <div class="tvl-tile-ctl">
          ${y(`${ke("tile-hide")} data-focus="tvl|${d(z.id)}|hide"`,N?"mdi:eye-off-outline":"mdi:eye-outline",l(N?"tvs.layout.tile_show":"tvs.layout.tile_hide",{name:z.name}))}
          ${N?`<span class="tvl-hidden">${d(l("tvs.layout.row_hidden"))}</span>`:""}
        </div>
      </div>`}).join(""),_e=u.key==="working"?l("tvs.layout.working_note"):u.key==="security"?l("tvs.layout.security_note"):f.length?"":l("tvs.layout.empty");return`<section class="tvl-row ${x?"off":""}" data-sort-item="${u.key}" data-sort-handle=".tvl-row-head">${S}
      ${K?`<div class="tvl-track" data-sort-list="x" data-id="${t}" data-row="${u.key}" data-scroll-key="tvl|${u.key}">${K}</div>`:""}
      ${_e?`<p class="tvl-note">${d(_e)}</p>`:""}</section>`}).join(""),_=Object.keys(i).some(u=>Array.isArray(i[u])?i[u].length:Object.keys(i[u]||{}).length);return`<div class="tv-flash-row">${n.pending?`<span class="badge warn">${d(l("tvs.pending"))}</span>`:""}
      ${_?`<button class="text-button" data-action="tv-layout" data-id="${t}" data-op="reset" data-focus="tvl-reset">${d(l("tvs.layout.reset"))}</button>`:""}</div>
    <div class="tvl-screen" data-sort-list="y" data-id="${t}" style="background:${d(s.base||"#0b2633")};background:${d(s.bg)}">${w}</div>
    <p class="note">${d(l("tvs.layout.hint"))}</p>`}function Mt(n,e){let t=d(n.entry_id),a=n.log||[],i=`<div class="tv-flash-row">${a.length?`<button class="text-button" data-action="tv-clear-log" data-id="${t}"
    data-focus="tv-clear|${t}">${d(l("tvs.clear"))}</button>`:""}</div>`,o=a.length?`<ol class="tv-log">${a.slice().reverse().map(r=>`<li>
      <span class="tv-log-time">${d(new Intl.DateTimeFormat(e.lang,{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(r.at)))}</span>
      <span class="tv-log-msg mono">${d(r.message)}${r.source?` <span class="id">${d(r.source)}</span>`:""}</span></li>`).join("")}</ol>`:`<div class="empty">${d(l("tvs.log_empty"))}</div>`;return`<div class="tv-block">${i}<div class="card">${o}</div></div>`}var it=`
.tabs { display: flex; gap: 4px; margin: 0 0 20px; padding: 4px; border-radius: 999px; background: var(--alv-hover); width: fit-content; }
.tab { border: 0; background: transparent; padding: 8px 18px; border-radius: 999px; font-size: 15px; font-weight: 500; color: var(--alv-sub); cursor: pointer; display: inline-flex; gap: 6px; align-items: baseline; }
.tab[aria-selected="true"] { background: var(--alv-card); color: var(--primary-text-color); box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }
.tab .count { font-size: 13px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

section.tv { margin-top: 8px; }
.tv-picker { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 320px)); gap: 10px; margin: 18px 0 20px; }
.tv-pick { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; align-items: center; text-align: left; padding: 12px 14px;
  border-radius: var(--alv-radius); border: 1px solid var(--alv-div); background: var(--alv-card); cursor: pointer; color: var(--primary-text-color); }
.tv-pick:hover { background: var(--alv-hover); }
.tv-pick[aria-selected="true"] { border-color: var(--alv-accent); box-shadow: 0 0 0 1px var(--alv-accent); background: var(--alv-tint); }
.tv-icon.small { width: 36px; height: 36px; border-radius: 10px; --mdc-icon-size: 22px; }
.tv-pick-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tv-pick-name { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-pick-state { font-size: 13px; color: var(--alv-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tabs.sub { margin: 20px 0 0; }
.tv-control { display: grid; gap: 4px 24px; }
.tv-mirror { margin-top: 12px; }
.tv-mirror-head { display: flex; align-items: baseline; gap: 12px; margin: 0 2px 8px; flex-wrap: wrap; }
.tv-mirror-head h3 { margin: 0; font-size: 16px; font-weight: 600; }
.tv-mirror-note { font-size: 13px; color: var(--alv-sub); }
.tv-mirror-slot { width: 100%; aspect-ratio: 16 / 9; border-radius: var(--alv-radius); background: #000; }
.rc { display: flex; align-items: center; gap: 18px; margin-top: 12px; flex-wrap: wrap; }
.rc-pad { display: grid; grid-template-columns: repeat(3, 44px); grid-template-rows: repeat(3, 44px); gap: 4px; }
.rc-btn { border: 1px solid var(--alv-div); background: var(--alv-card); color: var(--primary-text-color); border-radius: 12px; cursor: pointer;
  display: grid; place-items: center; padding: 0; --mdc-icon-size: 24px; font: inherit; font-weight: 600; }
.rc-btn:hover { background: var(--alv-tint); border-color: transparent; }
.rc-btn:active { transform: scale(.94); }
.rc-up { grid-area: 1 / 2; } .rc-left { grid-area: 2 / 1; } .rc-ok { grid-area: 2 / 2; border-radius: 50%; background: var(--alv-tint); color: var(--alv-accent); }
.rc-right { grid-area: 2 / 3; } .rc-down { grid-area: 3 / 2; }
.rc-back { width: 44px; height: 44px; border-radius: 50%; }
.rc-hint { font-size: 13px; color: var(--alv-sub); max-width: 420px; line-height: 1.45; }
.tv-mirror-off { width: 100%; aspect-ratio: 16 / 9; border-radius: var(--alv-radius); background: var(--alv-wash); border: 1px dashed var(--alv-div);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--alv-sub); text-align: center; padding: 16px; }
.tv-mirror-off span { --mdc-icon-size: 40px; opacity: .6; }
.tv-mirror-off p { margin: 0; font-size: 14px; max-width: 360px; }
@media (min-width: 1300px) {
  .tv-control { grid-template-columns: minmax(0, 1.7fr) minmax(340px, 1fr); align-items: start; }
}
.pending-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warning-color, #ffa600); display: inline-block; align-self: center; }
.tv-flash-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-height: 30px; margin: 6px 0 4px; }
.tv-head { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 16px; }
.tv-icon { width: 44px; height: 44px; border-radius: 12px; --mdc-icon-size: 26px; }
.tv-icon.off { background: var(--alv-hover); color: var(--alv-sub); }
.tv-name { font-size: 20px; }
.tv-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--alv-sub); opacity: .5; display: inline-block; margin-right: 6px; }
.tv-dot.on { background: var(--success-color, #43a047); opacity: 1; box-shadow: 0 0 0 3px rgba(67, 160, 71, .18); }
.tv-head .sub { font-size: 14px; }
.tv-link { display: inline-flex; align-items: center; color: var(--alv-accent); text-decoration: none; font-size: 14px; font-weight: 500; white-space: nowrap; }
.tv-link svg { width: 18px; height: 18px; }
.tv-link:hover { text-decoration: underline; }
.tv-now { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; padding: 14px 16px; background: var(--alv-wash); }
.tv-now-label { font-size: 13px; color: var(--alv-sub); }
.tv-now-value { font-size: 17px; font-weight: 500; display: inline-flex; gap: 8px; align-items: center; }
.tv-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px 20px; margin: 0; padding: 14px 16px; }
.tv-facts dt { font-size: 12px; color: var(--alv-sub); }
.tv-facts dd { margin: 2px 0 0; font-size: 15px; }
.tv-ua { padding: 0 16px 14px; font-size: 13px; color: var(--alv-sub); }
.tv-ua summary { cursor: pointer; width: fit-content; }
.tv-ua p { margin: 6px 0 0; overflow-wrap: anywhere; }

.tv-block { margin-top: 0; }
.section-head.small { min-height: 32px; margin-bottom: 8px; justify-content: flex-start; }
.section-head.small h3 { margin: 0; font-size: 16px; font-weight: 600; display: flex; gap: 8px; align-items: baseline; }
.section-head.small .text-button { margin-left: auto; font-size: 14px; padding: 6px 10px; }
.section-head.small .spacer { flex: 1; }
.section-head.small .spacer + .text-button { margin-left: 0; }
.tv-flash { font-size: 13px; color: var(--success-color, #2e7d32); }
.tv-flash.error { color: var(--error-color, #c62828); }
.tv-pad { padding: 14px 16px; }
.card.tv-pad > * + *::before { display: none; }
.tv-acts { display: flex; flex-wrap: wrap; gap: 8px; }
.tv-act { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--alv-div); background: var(--alv-card); border-radius: 999px;
  padding: 8px 16px 8px 12px; font-size: 14px; font-weight: 500; cursor: pointer; --mdc-icon-size: 20px; color: var(--primary-text-color); }
.tv-act ha-icon { color: var(--alv-accent); }
.tv-act:hover:not(:disabled) { background: var(--alv-tint); border-color: transparent; }
.tv-act:disabled, .tv-select:disabled { opacity: .45; cursor: default; }
.tv-selects { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.tv-select { height: 40px; border-radius: 10px; border: 1px solid var(--alv-div); background: var(--alv-card); color: var(--primary-text-color);
  font: inherit; font-size: 14px; padding: 0 10px; min-width: 180px; max-width: 100%; cursor: pointer; }
.tv-msg { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
.tv-msg-field { flex: 1; min-width: 0; }
.tv-msg input { width: 100%; height: 40px; border-radius: 10px; border: 1px solid var(--alv-div); background: var(--alv-card); color: var(--primary-text-color);
  font: inherit; font-size: 15px; padding: 0 12px; }
.tv-msg input:focus, .tv-select:focus { outline: 2px solid var(--alv-accent); outline-offset: -1px; border-color: transparent; }
.button.small { margin: 0; padding: 9px 18px; font-size: 14px; }
.button:disabled { opacity: .45; cursor: default; }
.note.in { margin: 12px 0 0; }

.tv-settings { padding-top: 6px; }
.tv-sec { margin: 16px 0 6px; font-size: 12px; font-weight: 600; color: var(--alv-sub); letter-spacing: .02em; }
.tv-field { padding: 8px 0 12px; }
.tv-row-label { font-size: 15px; font-weight: 500; }
.tv-sub-label { font-size: 12px; color: var(--alv-sub); margin: 10px 0 6px; }
.tv-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--alv-div); }
.tv-row .sub { margin-top: 2px; }
.tv-row .tv-select { min-width: 160px; }
.tv-wps { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.tv-wp-btn { border: 0; background: transparent; padding: 0; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 4px; border-radius: 10px; }
.tv-wp { display: block; aspect-ratio: 16 / 9; border-radius: 10px; background-size: cover; outline: 1px solid var(--alv-div); outline-offset: -1px; }
.tv-wp-btn[aria-pressed="true"] .tv-wp { outline: 3px solid var(--alv-accent); outline-offset: 1px; }
.tv-wp-name { font-size: 12px; color: var(--alv-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-wp-btn[aria-pressed="true"] .tv-wp-name { color: var(--primary-text-color); font-weight: 500; }
.tv-accents { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.tv-accent { border: 0; background: transparent; padding: 3px; border-radius: 50%; cursor: pointer; }
.tv-swatch { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; --mdc-icon-size: 20px; outline: 1px solid rgba(0, 0, 0, .12); outline-offset: -1px; }
.tv-accent[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--alv-accent); }
.seg { display: inline-flex; flex-wrap: wrap; margin-top: 8px; border: 1px solid var(--alv-div); border-radius: 10px; overflow: hidden; }
.seg-btn { border: 0; background: var(--alv-card); padding: 8px 14px; font-size: 14px; cursor: pointer; color: var(--primary-text-color); }
.seg-btn + .seg-btn { border-left: 1px solid var(--alv-div); }
.seg-btn[aria-pressed="true"] { background: var(--alv-tint); color: var(--alv-accent); font-weight: 600; }

.tv-log { list-style: none; margin: 0; padding: 6px 0; max-height: 320px; overflow-y: auto; }
.tv-log li { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 10px; padding: 6px 16px; font-size: 13px; }
.tv-log-time { color: var(--alv-sub); font-variant-numeric: tabular-nums; }
.tv-log-msg { overflow-wrap: anywhere; }

.tvl-screen { border-radius: var(--alv-radius); padding: 18px 0 8px; color: #fff; background-size: cover; overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08); }
.tvl-row { padding: 0 0 14px; }
.tvl-row-head { display: flex; align-items: center; gap: 6px; padding: 0 14px 8px 10px; }
.tvl-row-head h4 { margin: 0; font-size: 16px; font-weight: 600; color: rgba(255, 255, 255, .92); }
.tvl-row-head .spacer { flex: 1; }
.tvl-row.off .tvl-row-head h4, .tvl-row.off .tvl-track { opacity: .38; }
.tvl-row .badge.muted { background: rgba(255, 255, 255, .14); color: rgba(255, 255, 255, .8); }
.tvl-track { display: flex; gap: 10px; overflow-x: auto; padding: 2px 20px 6px; scrollbar-width: thin; }
.tvl-tile { flex: none; width: 140px; border-radius: 14px; padding: 12px 10px 8px; display: flex; flex-direction: column; gap: 8px;
  background: rgba(255, 255, 255, .12); backdrop-filter: blur(6px); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); }
.tvl-tile.off { background: rgba(0, 0, 0, .25); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .06); }
.tvl-tile.off .tvl-tile-ic, .tvl-tile.off .tvl-tile-name { opacity: .4; }
.tvl-tile-ic { --mdc-icon-size: 24px; color: rgba(255, 255, 255, .95); }
.tvl-tile-name { font-size: 14px; font-weight: 500; line-height: 1.25; min-height: 2.5em; overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tvl-tile-ctl { display: flex; align-items: center; gap: 4px; margin: 0 -4px; }
.tvl-hidden { font-size: 11px; color: rgba(255, 255, 255, .6); }
.tvl-tile-top { display: flex; align-items: flex-start; justify-content: space-between; }
.tvl-tile { cursor: grab; user-select: none; -webkit-user-select: none; }
.tvl-tile:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.tvl-grip { border: 0; background: transparent; color: rgba(255, 255, 255, .7); cursor: grab; display: grid; place-items: center;
  width: 30px; height: 30px; border-radius: 8px; padding: 0; --mdc-icon-size: 22px; touch-action: none; }
.tvl-grip.small { width: 26px; height: 26px; margin: -6px -4px 0 0; --mdc-icon-size: 20px; }
.tvl-grip:hover { background: rgba(255, 255, 255, .14); color: #fff; }
.tvl-grip:focus-visible { outline: 2px solid #fff; }
.tvl-row-head { cursor: grab; user-select: none; -webkit-user-select: none; }
.dragging { cursor: grabbing !important; z-index: 5; position: relative; transition: none !important; }
.tvl-tile.dragging { box-shadow: 0 14px 30px rgba(0, 0, 0, .45), inset 0 0 0 2px rgba(255, 255, 255, .6); background: rgba(255, 255, 255, .22); }
.tvl-row.dragging { background: rgba(255, 255, 255, .08); box-shadow: 0 14px 30px rgba(0, 0, 0, .4); border-radius: 12px; }
.sorting { scroll-behavior: auto; }
/* A tile drawn by the TV's code, at 42% of its size on the TV (320 \xD7 210 px there), larger as the editor widens. */
.tvl-screen { container-type: inline-size; }
.tvl-tile.live { width: auto; padding: 0; background: transparent; box-shadow: none; backdrop-filter: none; gap: 4px; border-radius: 0; }
.tvp-box { zoom: .42; }
@container (min-width: 1000px) { .tvp-box { zoom: .5; } }
@container (min-width: 1300px) { .tvp-box { zoom: .56; } }
@container (min-width: 1700px) { .tvp-box { zoom: .64; } }
.tvp { color: #fff; font: 400 24px/1.3 Figtree, system-ui, sans-serif; -webkit-font-smoothing: antialiased; pointer-events: none; }
.tvp .tile { transition: none; }
.tvl-tile.live.off .tvp { opacity: .32; filter: grayscale(.6); }
.tvl-tile.live.dragging { box-shadow: none; background: transparent; }
.tvl-tile.live.dragging .tvp .tile { box-shadow: 0 24px 50px rgba(0, 0, 0, .5); outline: 4px solid rgba(255, 255, 255, .7); }
.tvl-tile.live:focus-visible { outline: none; }
.tvl-tile.live:focus-visible .tvp .tile { outline: 5px solid #fff; outline-offset: 4px; }
.tvl-tile-bar { display: flex; align-items: center; gap: 2px; min-height: 30px; }
.tvl-tile-bar .tvl-grip.small { margin: 0; }
.tvl-btn { width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; color: rgba(255, 255, 255, .85); cursor: pointer;
  display: grid; place-items: center; --mdc-icon-size: 20px; padding: 0; }
.tvl-btn:hover:not(:disabled) { background: rgba(255, 255, 255, .16); color: #fff; }
.tvl-btn:disabled { opacity: .25; cursor: default; }
.tvl-btn:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.tvl-note { margin: 2px 20px 0; font-size: 12px; color: rgba(255, 255, 255, .62); }

@media (max-width: 600px) {
  .tvl-tile { width: 124px; }
  .tv-head { grid-template-columns: 40px minmax(0, 1fr); }
  .tv-head .tv-link { grid-column: 2; }
  .tv-select { min-width: 0; flex: 1 1 160px; }
  .tv-row { grid-template-columns: 1fr; }
  .tv-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;var Wt={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",exceptional:"mdi:alert-circle-outline",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},nt=n=>n==="partlycloudy"?m("weather.partlycloudy_long"):$("weather.conditions")[n],ve=(n,e)=>n==="partlycloudy"&&e?"mdi:weather-night-partly-cloudy":Wt[n]||"mdi:weather-partly-cloudy",ot=n=>$("security.alert")[n];var rt=["sufficient","bad","very_bad"],st=[[/hbo ?max/,"hbomax","linear-gradient(135deg,#0b0b2b,#2b1bd1)",!0],[/netflix/,"netflix","#000"],[/prime|amazon/,"primevideo","linear-gradient(135deg,#1a98ff,#0a5fd8)",!0],[/disney/,"disneyplus","linear-gradient(135deg,#0b1a5c,#1f3dd6)",!0],[/canal/,"canalplus","#000"],[/skyshowtime|sky ?show/,"skyshowtime","linear-gradient(135deg,#120f3a,#3a1d8c)",!0],[/\bmax\b|com\.wbd\.stream/,"max","#002be7",!0],[/apple ?tv|com\.apple/,"appletv","#000",!0],[/youtube/,"youtube","#fff"],[/polsat/,"polsatboxgo","#000"],[/spotify/,"spotify","#000"],[/play ?now|playnow/,"playnow","linear-gradient(135deg,#2a0f4f,#6a2bb8)",!0],[/tvn\.player|\bplayer\.pl\b|^player$/,"player","linear-gradient(135deg,#1b1b1b,#3a3a3a)",!0],[/tv\.launcherx|com\.tcl\./,"tcl","linear-gradient(135deg,#9e001e,#e4002b)",!0]],Dt=[[/tv\.launcherx/,"media.home_screen"],[/netflix/,"Netflix"],[/amazonvideo|primevideo/,"Prime Video"],[/com\.wbd\.stream|hbo/,"Max"],[/youtube\.tvmusic/,"YouTube Music"],[/youtube/,"YouTube"],[/canal/,"Canal+"],[/disney/,"Disney+"],[/skyshowtime/,"SkyShowtime"],[/playnow|rodzina\.tvstart/,"PLAY NOW"],[/tvn\.player/,"Player"],[/polsat/,"Polsat Box Go"],[/spotify/,"Spotify"],[/tv\.settings|tcl\.settings/,"media.tv_settings"]],lt=n=>{let e=(Dt.find(([t])=>t.test(n))||[])[1]||"";return e.startsWith("media.")?m(e):e},b=n=>String(n??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);var ee=n=>(n||[]).map(e=>typeof e=="string"?e:e.entity),I=n=>n!=null&&n!==""&&!isNaN(n),we=n=>{if(!isFinite(n)||n<0)return"0:00";n=Math.floor(n);let e=Math.floor(n/3600),t=Math.floor(n%3600/60),a=String(n%60).padStart(2,"0");return e?`${e}:${String(t).padStart(2,"0")}:${a}`:`${t}:${a}`};var dt=["starting","running","paused","user_paused","ending","anti_wrinkle","delay_wait"],ct=["finished","clean"];var te=class{constructor(e,t){this.states=e||{},this.c=t||{rooms:[]}}st(e){return e?this.states[e]:void 0}on(e){return this.st(e)?.state==="on"}val(e){let t=this.st(e)?.state;return I(t)?Number(t):null}name(e){if(typeof e!="string"&&e?.name)return e.name;let t=typeof e=="string"?e:e?.entity;return this.st(t)?.attributes.friendly_name||t||""}rooms(){return this.c.rooms||[]}lights(e){return ee(e.lights)}allLights(){return this.rooms().flatMap(e=>this.lights(e))}lightsOn(){return this.allLights().filter(e=>this.on(e))}watched(){let e=this.c,t=new Set(["sun.sun"]),a=o=>{typeof o=="string"&&o.includes(".")&&t.add(o)},i=o=>{Array.isArray(o)?o.forEach(i):o&&typeof o=="object"?Object.values(o).forEach(i):a(o)};for(let o of["rooms","persons","scenes","security","climate","media","cameras","weather","outdoor_temperature","weather_alert","air_quality","vacuum","appliances"])i(e[o]);return t}scenes(){return(this.c.scenes||[]).map(e=>typeof e=="string"?{entity:e}:e)}sceneOn(e){let t=this.st(e.active);if(!t||!["on","active","playing","heat","open"].includes(t.state))return null;let a=t.attributes.finishes_at;return{left:a?Math.max(1,Math.round((new Date(a)-Date.now())/6e4)):null}}roomSummary(e){let t=this.lights(e),a=t.filter(s=>this.on(s)).length,i=this.val(e.temperature),o=this.val(e.humidity),r=t.length?a===0?m("rooms.all_off"):a===t.length?a>1?m("rooms.all_on"):m("common.on_n"):m("rooms.some_on",{n:a,total:t.length}):o!=null?m("rooms.humidity",{v:Math.round(o)}):m("rooms.no_lights");return{lights:t,on:a,t:i,h:o,sub:r}}securityItems(){return(this.c.security||[]).map(e=>{let t=typeof e=="string"?e:e.entity,a=this.st(t);return{id:t,name:this.name(e),st:a,dc:a?.attributes.device_class,alert:a?.state==="on",off:!a||["unavailable","unknown"].includes(a.state)}})}cameras(){return(this.c.cameras||[]).map(e=>typeof e=="string"?{entity:e}:e).filter(e=>this.st(e.entity))}thermo(){let e=this.c.climate||{},t=this.st(e.entity);if(!t||t.state==="unavailable")return null;let a=t.attributes,i=Number(a.temperature),o=t.state!=="off";return{id:e.entity,a,on:o,heating:o&&a.hvac_action==="heating",target:i,current:Number(a.current_temperature),min:Number(a.min_temp??7),max:Number(a.max_temp??30),step:Number(a.target_temp_step||.5),status:o?m(a.hvac_action==="heating"?"climate.heating_word":"climate.holding_word"):m("climate.heating_off")}}climateSensors(){let e=this.c,t=e.climate||{},i=(t.sensors||this.rooms().filter(o=>o.temperature||o.humidity).map(o=>({name:o.name,icon:o.icon,temperature:o.temperature,humidity:o.humidity}))).map(o=>({...o,t:this.val(o.temperature),h:this.val(o.humidity)}));return!t.sensors&&e.outdoor_temperature&&i.push({name:m("climate.outdoor"),icon:"mdi:tree-outline",outdoor:!0,temperature:e.outdoor_temperature,humidity:t.outdoor_humidity,t:this.val(e.outdoor_temperature),h:this.val(t.outdoor_humidity)}),i}indoorAverage(){let e=this.climateSensors().filter(t=>!t.outdoor&&t.t!=null);return e.length?e.reduce((t,a)=>t+a.t,0)/e.length:null}weatherId(){let e=[].concat(this.c.weather||[]);return e.find(t=>this.st(t)&&!["unavailable","unknown"].includes(this.st(t).state))||e.find(t=>this.st(t))}night(){return this.st("sun.sun")?.state==="below_horizon"}weatherNow(){let e=this.st(this.weatherId()),t=this.val(this.c.outdoor_temperature);return{w:e,cond:e?.state,night:this.night(),temp:t??(I(e?.attributes.temperature)?Number(e.attributes.temperature):null),humidity:e?.attributes.humidity,wind:e?.attributes.wind_speed,windUnit:e?.attributes.wind_speed_unit||"km/h"}}air(){let e=this.c.air_quality,t=e&&this.st(e.index);if(!t||!$("weather.air")[t.state])return null;let a=i=>{let o=this.val(i);return o!=null?Math.round(o):null};return{level:t.state,label:$("weather.air")[t.state],bad:rt.includes(t.state),pm10:a(e.pm10),pm25:a(e.pm25)}}weatherAlert(){let e=this.st(this.c.weather_alert)?.state;return e&&!["no_alert","unknown","unavailable"].includes(e)?$("weather.imgw")[e]||e:""}persons(){return(this.c.persons||[]).map(e=>typeof e=="string"?{entity:e}:e).map(e=>{let t=this.st(e.entity),a=t?.attributes||{},i=(e.picture||a.entity_picture||"").replace(/(\/api\/image\/serve\/[^/]+\/)512x512$/,"$1256x256");return{id:e.entity,name:e.name||a.friendly_name||e.entity,pic:i,home:t?.state==="home"}})}lowBatteries(e={}){let t=Number(this.c.battery_low??10),a=new Set(ee(this.c.battery_ignore));return Object.values(this.states).filter(i=>i.attributes.device_class==="battery"&&i.entity_id.startsWith("sensor.")&&I(i.state)&&Number(i.state)<t&&!a.has(i.entity_id)&&!["mobile_app","browser_mod"].includes(e[i.entity_id])).map(i=>({id:i.entity_id,name:i.attributes.friendly_name||i.entity_id,value:Math.round(Number(i.state))})).sort((i,o)=>i.value-o.value)}updates(){return Object.values(this.states).filter(e=>e.entity_id.startsWith("update.")&&e.state==="on").map(e=>({id:e.entity_id,name:e.attributes.title||e.attributes.friendly_name||e.entity_id,version:e.attributes.latest_version||""}))}wasteDue(){let e=r=>`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}-${String(r.getDate()).padStart(2,"0")}`,t=new Date,a=e(t),i=e(new Date(t.getFullYear(),t.getMonth(),t.getDate()+1)),o=r=>ee(this.c.waste).map(s=>this.st(s)).filter(s=>s&&String(s.attributes.start_time||"").startsWith(r)).map(s=>s.attributes.message||s.attributes.friendly_name);return t.getHours()<12&&o(a).length?{when:"today",list:o(a)}:o(i).length?{when:"tomorrow",list:o(i)}:null}roomsLit(){return this.rooms().filter(e=>this.lights(e).some(t=>this.on(t))).map(e=>e.name)}vacuum(){let e=this.c.vacuum,t=this.st(e?.entity);if(!t)return null;let a=t.attributes,i=e.battery?this.st(e.battery)?.state:a.battery_level??a.battery,o=this.st(e.room)?.state,r=this.st(e.suction)?.state??a.fan_speed,s=p=>p!=null&&!["unknown","unavailable",""].includes(String(p));return{id:e.entity,name:e.name||a.friendly_name||m("cleaning.vacuum"),st:t,state:t.state,label:$("cleaning.vacuum_state")[t.state]||(t.state==="unknown"?m("common.no_data"):t.state),active:["cleaning","returning","paused"].includes(t.state),cleaning:t.state==="cleaning",charging:!!a.charging,battery:I(i)?Number(i):null,room:s(o)?o:"",time:this.val(e.time),timeUnit:this.st(e.time)?.attributes.unit_of_measurement||"min",area:this.val(e.area),suction:s(r)?$("cleaning.suction")[String(r).toLowerCase()]||r:""}}appliances(){return(this.c.appliances||[]).map((e,t)=>{let a=this.st(e.state),i=a?.state||"unknown",o=this.st(e.program)?.state,r=this.st(e.phase)?.state,s=h=>h&&!["off","none","unknown","unavailable"].includes(h),p=h=>{let g=this.st(h);return g&&g.state!=="unavailable"?h:""};return{i:t,name:e.name||this.name(e.state),icon:e.icon||"mdi:washing-machine",room:e.room||"",state:i,label:$("appliances.state")[i]||i,active:dt.includes(i),done:ct.includes(i),paused:/paused/.test(i),pct:this.val(e.progress),left:this.val(e.remaining),total:this.val(e.duration),power:this.val(e.power),cycles:this.val(e.cycles),program:s(o)?$("appliances.program")[o]||o:"",phase:s(r)?r:"",pause:p(e.pause),resume:p(e.resume),unloaded:p(e.unloaded),doneKey:`done:${e.state}:${a?.last_changed||""}`}})}working(e=!1,t={}){let a=this.vacuum();return[...a?.active?[{kind:"vac",v:a}]:[],...this.appliances().filter(i=>i.active||e&&i.done&&!t[i.doneKey]).map(i=>({kind:"app",ap:i}))]}mediaItems(){return(this.c.media||[]).map(e=>this.mediaInfo(e)).filter(Boolean)}mediaInfo(e){let t=typeof e=="string"?e:e?.entity,a=this.st(t);if(!a)return null;let i=f=>f&&["playing","paused","buffering"].includes(f.state),o=!["off","unavailable","unknown","standby"].includes(a.state),r=f=>!f?.app||new RegExp(f.app,"i").test([a.attributes.app_id,a.attributes.app_name].join(" ")),s=o&&typeof e=="object"&&[].concat(e.now_playing||[]).filter(r).map(f=>this.st(typeof f=="string"?f:f.entity)).find(i),p=s||a,h={...a.attributes,...e?.name&&{friendly_name:e.name}},g=s?{...s.attributes,friendly_name:h.friendly_name,device_class:h.device_class,volume_level:h.volume_level,is_volume_muted:h.is_volume_muted,supported_features:h.supported_features}:h,y=i(p),w=typeof e=="object"&&e.sources||{},_=f=>f&&(w[f]||String(f).replace(/^HDMI\s*(\d)$/i,"HDMI $1")),u=g.entity_picture_local||g.entity_picture||"",v=[g.app_id,g.app_name,g.source,h.app_id,h.source].join(" ").toLowerCase(),x=[g.app_name,_(g.source),h.app_name,_(h.source)].filter(Boolean).map(f=>/^[a-z][\w]*(\.[\w]+)+$/i.test(f)?lt(f):f).find(Boolean)||"";return{id:p.entity_id,tv:t,name:h.friendly_name,on:o,active:y,playing:p.state==="playing",st:a,src:p,a:g,isTv:h.device_class==="tv",volume:h.volume_level,muted:!!h.is_volume_muted,features:h.supported_features||0,title:g.media_title||(y?x:"")||"",artist:g.media_artist||g.media_album_name||g.media_series_title||"",input:o&&!y?_(h.source)||x:"",app:x,pic:u,logoOnly:!g.media_title,duration:Number(g.media_duration)||0,position:Number(g.media_position)||0,positionAt:g.media_position_updated_at,brand:st.find(([f])=>f.test(v))}}mediaPosition(e){let t=e.position;return e.playing&&e.positionAt&&(t+=(Date.now()-Date.parse(e.positionAt))/1e3),e.duration?Math.min(t,e.duration):t}};var be=new Map,V=new Map,pt=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${n}"/></svg>`,Et=null,Ht=()=>Et||=fetch("/static/mdi/iconMetadata.json").then(n=>n.json());async function Bt(n){let e=n.replace(/^mdi:/,""),t=await Ht(),a=t.parts[0].file;for(let o of t.parts)o.start&&o.start<=e&&(a=o.file);if(!be.has(a)){let o=`hd-mdi-${t.version}-${a}`;be.set(a,(async()=>{try{let s=localStorage.getItem(o);if(s)return JSON.parse(s)}catch{}let r=await(await fetch(`/static/mdi/${a}.json`)).json();try{localStorage.setItem(o,JSON.stringify(r))}catch{}return r})())}let i=(await be.get(a))[e]||"";return V.set(n,i),i}var ye=class extends HTMLElement{static get observedAttributes(){return["name"]}connectedCallback(){this._draw()}attributeChangedCallback(){this.isConnected&&this._draw()}async _draw(){let e=this.getAttribute("name")||"";if(e===this._drawn||(this._drawn=e,V.has(e)&&this.getAttribute("data-d")===e))return;let t=V.has(e)?V.get(e):e?await Bt(e).catch(()=>""):"";this._drawn===e&&(this.innerHTML=t?pt(t):"")}};customElements.define("hd-icon",ye);var k=(n,e="",t="")=>{let a=V.get(n);return`<hd-icon name="${n}"${a?` data-d="${n}"`:""}${e?` class="${e}"`:""}${t?` ${t}`:""}>${a?pt(a):""}</hd-icon>`};function ut(n,e){return{working:Ut(n),scenes:Rt(n),rooms:It(n),media:Kt(n),climate:Zt(n,e),security:Jt(n)}}var A=(n,e,t,a,i={})=>({id:n,name:e,icon:t,html:a,...i}),B=(n,e,t,a={})=>({key:n,title:e,items:t,...a});function Ft(n,e,t=""){let i=2*Math.PI*22,o=Math.max(0,Math.min(100,n||0));return`<svg class="ring ${t}" viewBox="0 0 52 52" width="${e}" height="${e}"><circle cx="26" cy="26" r="22" class="ring-bg"/>
    <circle cx="26" cy="26" r="22" class="ring-fg" stroke-dasharray="${i.toFixed(1)}" stroke-dashoffset="${(i*(1-o/100)).toFixed(1)}"/></svg>`}function Ut(n){let e=n.working().map(({kind:t,v:a,ap:i})=>{if(t==="vac")return A("dev:vac",a.name,"mdi:robot-vacuum",`<div class="tile device on" data-f="dev:vac" data-act="device" data-dev="vac">
      <div class="head"><div class="ic">${k("mdi:robot-vacuum")}</div>${a.battery!=null?`<div class="dbadge">${k(a.charging?"mdi:battery-charging":"mdi:battery-outline")}${Math.round(a.battery)}%</div>`:""}</div>
      <div class="name">${b(a.name)}</div><div class="sub">${b([a.label,a.room].filter(Boolean).join(" \xB7 "))}</div></div>`,{dynamic:!0});let o=i.active?[i.left>0?`${Math.round(i.left)} min`:"",i.paused||!i.program?i.label:i.program].filter(Boolean).join(" \xB7 "):i.label;return A(`dev:${i.i}`,i.name,i.icon,`<div class="tile device ${i.active?"on":"done"}" data-f="dev:${i.i}" data-act="device" data-dev="${i.i}">
      <div class="head"><div class="ic">${k(i.icon)}</div>
        ${i.active?`<div class="dring">${Ft(i.pct,86)}<span>${i.pct!=null?Math.round(i.pct):0}<small>%</small></span></div>`:`<div class="dcheck">${k("mdi:check-bold")}</div>`}</div>
      <div class="name">${b(i.name)}</div><div class="sub">${b(o)}</div></div>`,{dynamic:!0})});return e.length?B("working",m("tv.rows.working"),e):null}function Rt(n){let e=n.scenes().map(a=>{let i=n.sceneOn(a),o=n.st(a.entity),r=a.icon||o?.attributes.icon||"mdi:palette-outline";return A(a.entity,n.name(a),r,`<div class="tile scene ${i?"on":""}" data-f="scene:${b(a.entity)}" data-act="scene" data-entity="${b(a.entity)}"
      ${i&&a.off?`data-off="${b(a.off)}"`:""}>
      <div class="ic">${k(r)}</div>
      <div class="name">${b(n.name(a))}</div>${i?`<div class="sub">${i.left?m("tv.min_left",{n:i.left}):m("tv.scene_active")}</div>`:""}</div>`)});if(!n.allLights().length&&!e.length)return null;let t=n.lightsOn().length;return e.push(A("all-off",m("home.all_off_btn"),"mdi:lightbulb-off-outline",`<div class="tile scene" data-f="all-off" data-act="all" data-on="0"><div class="ic">${k("mdi:lightbulb-off-outline")}</div>
    <div class="name">${m("home.all_off_btn")}</div>${t?`<div class="sub">${m("tv.summary.lights_on",{n:t})}</div>`:""}</div>`)),e.push(A("all-on",m("home.all_on_btn"),"mdi:lightbulb-group-outline",`<div class="tile scene" data-f="all-on" data-act="all" data-on="1"><div class="ic">${k("mdi:lightbulb-group-outline")}</div>
    <div class="name">${m("home.all_on_btn")}</div></div>`)),B("scenes",m("scenes.title"),e)}function It(n){let e=n.rooms().map((t,a)=>{let i=n.roomSummary(t);return A(`area:${t.area??a}`,t.name,t.icon||"mdi:home-outline",`<div class="tile room ${i.on?"on":""}" data-f="room:${a}" data-act="room" data-room="${a}">
      <div class="head"><div class="ic">${k(t.icon||"mdi:home-outline")}</div>${i.t!=null?`<div class="temp">${D(i.t)}\xB0</div>`:""}</div>
      <div class="name">${b(t.name)}</div><div class="sub">${b(i.sub)}</div>
      ${i.lights.length?`<div class="dots">${i.lights.map(o=>`<i class="${n.on(o)?"on":""}"></i>`).join("")}</div>`:""}</div>`)});return e.length?B("rooms",m("tabs.rooms"),e):null}function Vt(n,e){if(n.pic&&!n.logoOnly)return`<img class="art" src="${b(n.pic)}" alt="">`;if(n.brand){let[,t,a,i]=n.brand;return`<div class="art logo" style="background:${a}"><img src="/local/logos/${t}.svg?v=2" alt="" class="${i?"mono":""}"></div>`}return`<div class="art none">${k(n.isTv?"mdi:television":"mdi:speaker",e?"xl":"")}</div>`}function Kt(n){let e=n.mediaItems();if(!e.length)return null;let t=e.map((a,i)=>{let o=i===0&&a.active,r=a.active?a.playing?m("tv.media.playing"):m("media.paused"):a.on?a.input||m("common.on_m"):m("common.off_m"),s=a.duration?Math.min(100,n.mediaPosition(a)/a.duration*100):0,p=a.isTv?"mdi:television":/soundbar/i.test(a.name)?"mdi:soundbar":"mdi:speaker";return A(a.tv,a.name,p,`<div class="tile media ${o?"wide":""} ${a.on?"lit":""}" data-f="media:${i}" data-act="media" data-media="${i}">
      ${o?Vt(a,!0):""}
      <div class="media-body">
        ${o?"":`<div class="ic">${k(p)}</div>`}
        ${a.active&&a.app?`<div class="kicker">${b(a.app)}</div>`:""}
        <div class="name">${b(a.active?a.title:a.name)}</div>
        <div class="sub">${b(a.active&&a.artist||r)}</div>
        ${o&&a.duration?`<div class="bar"><i style="width:${s.toFixed(1)}%" data-progress="${i}"></i></div>
          <div class="times"><span data-elapsed="${i}">${we(n.mediaPosition(a))}</span><span>${we(a.duration)}</span></div>`:""}
      </div></div>`)});return B("media",m("tabs.media"),t)}function Zt(n,e){let t=[],a=n.weatherNow();if(a.w){let o=nt(a.cond)||"",r=e.forecast?.daily?.[0];t.push(A("weather",m("weather.title"),ve(a.cond,a.night),`<div class="tile weather" data-f="weather" data-act="weather">
      <div class="label">${k(ve(a.cond,a.night))}${m("weather.title")}</div>
      <div class="big">${a.temp!=null?Math.round(a.temp)+"\xB0":"\u2013"}</div>
      <div class="sub">${b(o)}${r?` \xB7 ${Math.round(r.temperature)}\xB0 / ${Math.round(r.templow??r.temperature)}\xB0`:""}</div></div>`))}let i=n.thermo();i&&t.push(A("thermo",m("tabs.heating"),"mdi:thermostat",`<div class="tile climate ${i.heating?"on":""}" data-f="thermo" data-act="climate">
      <div class="label">${k(i.heating?"mdi:fire":"mdi:thermostat")}${m("tabs.heating")}</div>
      <div class="big">${D(i.target)}\xB0</div><div class="sub">${b(i.status)}${isFinite(i.current)?` \xB7 ${m("heating.now_lc",{t:D(i.current)})}`:""}</div></div>`));for(let[o,r]of n.climateSensors().entries()){if(r.t==null&&r.h==null)continue;let s=r.temperature||r.humidity,p=r.temperature&&r.humidity?r.humidity:"";t.push(A(`sensor:${s||r.name}`,r.name,r.icon||"mdi:thermometer",`<div class="tile sensor ${r.outdoor?"out":""}" data-f="sensor:${o}" data-act="entity" data-kind="numeric"
      data-entity="${b(s)}" data-entity2="${b(p)}" data-name="${b(r.name)}" data-icon="${b(r.icon||"mdi:thermometer")}">
      <div class="label">${k(r.icon||"mdi:thermometer")}${b(r.name)}</div>
      <div class="big">${r.t!=null?D(r.t)+"\xB0":"\u2013"}</div>
      <div class="sub">${r.h!=null?m("rooms.humidity",{v:Math.round(r.h)}):"&nbsp;"}</div></div>`))}return t.length?B("climate",m("tv.rows.climate"),t):null}var Gt=new Map,qt=(n,e,t)=>{let a=n.st(e)?.attributes||{};return`/api/camera_proxy/${e}?token=${encodeURIComponent(a.access_token||"")}${t?`&width=${t}`:""}&t=${Math.floor(Date.now()/15e3)}`},Yt=(n,e,t=640)=>{let a=typeof e=="string"?{entity:e}:e,i=t&&a.preview||a.entity,o=t===640&&Gt.get(i);return o&&Date.now()-o.at<24e4?o.url:qt(n,i,t)};function Jt(n){let e=n.securityItems(),t=n.cameras(),a=e.filter(r=>r.alert),i=e.filter(r=>r.off);if(!a.length&&!i.length&&!t.length)return null;let o=a.map(r=>A(`sec:${r.id}`,r.name,"mdi:shield-alert-outline",`<div class="tile sec alert" data-f="sec:${b(r.id)}" data-act="entity" data-kind="binary"
      data-entity="${b(r.id)}" data-name="${b(r.name)}">
      <div class="head"><div class="ic">${k("mdi:shield-alert-outline")}</div></div>
      <div class="name">${b(r.name)}</div><div class="sub">${b(ot(r.dc)||m("security.attention"))}${r.st?.last_changed?` \xB7 ${m("tv.since_time",{t:ge(new Date(r.st.last_changed))})}`:""}</div></div>`,{dynamic:!0,always:!0}));if(i.length&&o.push(A("sec-offline",m("security.offline",{n:i.length}),"mdi:shield-off-outline",`<div class="tile sec off" data-f="sec-offline" data-act="summary">
      <div class="head"><div class="ic">${k("mdi:shield-off-outline")}</div></div>
      <div class="name">${m("security.offline",{n:i.length})}</div>
      <div class="sub">${b(i.map(r=>r.name).join(", "))}</div></div>`,{dynamic:!0})),!a.length&&e.length>i.length&&t.length){let r=e.length-i.length;o.unshift(A("sec-calm",m("security.safe"),"mdi:shield-check-outline",`<div class="tile sec calm" data-f="sec-calm" data-act="summary">
      <div class="head"><div class="ic">${k("mdi:shield-check-outline")}</div></div>
      <div class="name">${m("security.safe")}</div><div class="sub">${m("tv.sensors_ok",{n:r})}</div></div>`,{dynamic:!0}))}for(let[r,s]of t.entries())o.push(A(s.entity,n.name(s),"mdi:cctv",`<div class="tile cam" data-f="cam:${r}" data-act="camera" data-cam="${r}">
      <img class="art" src="${b(Yt(n,s))}" alt="" decoding="async"><div class="media-body"><div class="name">${b(n.name(s))}</div></div></div>`));return B("security",a.length||!t.length?m("tabs.security"):m("cameras.title"),o,{alarm:a.length>0})}function mt(n,{onStart:e,onDrop:t}){let a=null,i=r=>[...r.children].filter(s=>s.hasAttribute("data-sort-item"));n.addEventListener("pointerdown",r=>{let s=r.target.closest?.("[data-sort-item]");if(!s||r.button!==0||!s.parentElement?.dataset.sortList)return;let p=r.target.closest("[data-grip]");!p&&r.target.closest("button, input, select, a, summary")||r.pointerType!=="mouse"&&!p||s.dataset.sortHandle&&!p&&!r.target.closest(s.dataset.sortHandle)||(a={item:s,list:s.parentElement,pid:r.pointerId,x0:r.clientX,y0:r.clientY,ox:0,oy:0,started:!1,scroll:s.parentElement.scrollLeft})}),n.addEventListener("pointermove",r=>{if(!a||r.pointerId!==a.pid)return;let s=a.list.dataset.sortList==="x",p=r.clientX-a.x0,h=r.clientY-a.y0;if(!a.started){if(Math.hypot(p,h)<6)return;a.started=!0;try{a.item.setPointerCapture(r.pointerId)}catch{}a.item.classList.add("dragging"),a.list.classList.add("sorting"),e?.()}if(r.preventDefault(),s){let f=a.list.getBoundingClientRect();r.clientX>f.right-48?a.list.scrollLeft+=14:r.clientX<f.left+48&&(a.list.scrollLeft-=14),a.ox-=a.list.scrollLeft-a.scroll,a.scroll=a.list.scrollLeft}let g=()=>{a.item.style.transform=s?`translate(${p-a.ox}px, 0)`:`translate(0, ${h-a.oy}px)`};g();let y=i(a.list).filter(f=>f!==a.item),w=s?r.clientX:r.clientY,_=y.find(f=>{let j=f.getBoundingClientRect();return w<(s?j.left+j.width/2:j.top+j.height/2)})||null;if(_===a.item.nextElementSibling||!_&&a.item===i(a.list).at(-1))return;let u=new Map(y.map(f=>[f,f.getBoundingClientRect()])),v=a.item.getBoundingClientRect();a.list.insertBefore(a.item,_);let x=a.item.getBoundingClientRect();a.ox+=x.left-v.left,a.oy+=x.top-v.top,g();for(let f of y){let j=u.get(f),S=f.getBoundingClientRect();(j.left!==S.left||j.top!==S.top)&&f.animate([{transform:`translate(${j.left-S.left}px, ${j.top-S.top}px)`},{transform:"none"}],{duration:200,easing:"cubic-bezier(.22, 1, .36, 1)"})}});let o=r=>{if(!a||r.pointerId!==a.pid)return;let s=a;if(a=null,!s.started)return;s.item.classList.remove("dragging"),s.item.style.transform="",s.list.classList.remove("sorting");let p=h=>{h.stopPropagation(),h.preventDefault()};n.addEventListener("click",p,{capture:!0,once:!0}),setTimeout(()=>n.removeEventListener("click",p,{capture:!0}),0),t(s.list,i(s.list).map(h=>h.dataset.sortItem),r.type==="pointercancel")};n.addEventListener("pointerup",o),n.addEventListener("pointercancel",o)}var Xt=600,Qt=150,ea={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},c=n=>String(n??"").replace(/[&<>"']/g,e=>ea[e]),C={menu:"M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",up:"M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z",down:"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",next:"M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",plus:"M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",search:"M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",reset:"M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z",remove:"M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7",check:"M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",alert:"M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"},T=n=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${n}"/></svg>`,ta={light:"mdi:lightbulb-outline",cover:"mdi:window-shutter",humidifier:"mdi:air-humidifier",scene:"mdi:palette-outline",script:"mdi:script-text-outline",binary_sensor:"mdi:shield-outline",camera:"mdi:cctv",media_player:"mdi:cast",person:"mdi:account-outline",sensor:"mdi:eye-outline",calendar:"mdi:calendar",weather:"mdi:weather-partly-cloudy",climate:"mdi:thermostat",vacuum:"mdi:robot-vacuum"},aa={weather:"mdi:weather-partly-cloudy",climate:"mdi:radiator",vacuum:"mdi:robot-vacuum",appliances:"mdi:washing-machine",waste:"mdi:trash-can-outline",air_quality:"mdi:weather-dust",weather_alert:"mdi:alert-outline"},ia=["weather","climate","vacuum","appliances","waste","air_quality","weather_alert"],xe=class extends HTMLElement{constructor(){super(),this._hass=null,this._narrow=!1,this._data=null,this._ov=Z({}),this._state="loading",this._loadError="",this._expanded=new Set,this._picker=null,this._version=0,this._savedVersion=0,this._saving=!1,this._save="idle",this._saveError="",this._timer=null,this._built=!1,this._tvs=null,this._tvUnsub=null,this._tvSel=null,this._tvSection="control",this._drafts={},this._flash={},this._ticker=null,this._mirror=null;let e=this;this._mirrorHost={get connection(){return e._hass?.connection},listen(t,a){e._mirror={id:t,cb:a},a(e._tv(t))},press(t){e._mirror&&e._tvCommand(e._mirror.id,"press",{item:t},{quiet:!0})},key(t){e._mirror&&e._tvCommand(e._mirror.id,"key",{key:t},{quiet:!0})}},this.attachShadow({mode:"open"});for(let t of["ha-switch","ha-state-icon"])customElements.get(t)||customElements.whenDefined(t).then(()=>this._built&&this._render());this._onBeforeUnload=t=>{this._version!==this._savedVersion&&(this._flush(),t.preventDefault(),t.returnValue=l("unsaved_leave"))}}set hass(e){let t=!this._hass;this._hass=e;let a=Be(e?.locale?.language||e?.language),i=he({language:e?.locale?.language||e?.language});this._syncMenu(),t?(this._render(),this._load(),this._subscribeTvs()):this._tab==="tvs"&&this._tvSection==="layout"&&!a&&!i?this._liveTimer||(this._liveTimer=setTimeout(()=>{this._liveTimer=null,this._render()},2e3)):(a||i)&&(this._render(),this._renderStatus())}get hass(){return this._hass}set narrow(e){this._narrow=!!e,this._syncMenu()}get narrow(){return this._narrow}set route(e){let t=this._tab;this._route=e,this._built&&this._tab!==t&&(this._render(),this.scrollTop=0,window.scrollTo(0,0))}get _tab(){return/^\/tvs/.test(this._route?.path||"")?"tvs":"layout"}get route(){return this._route}set panel(e){this._panel=e}get panel(){return this._panel}connectedCallback(){window.addEventListener("beforeunload",this._onBeforeUnload),this._built||this._render(),this._hass&&this._state==="error"&&this._load(),this._hass&&!this._tvUnsub&&this._subscribeTvs(),this._ticker=setInterval(()=>{this._tab==="tvs"&&this._render()},3e4)}disconnectedCallback(){window.removeEventListener("beforeunload",this._onBeforeUnload),this._version!==this._savedVersion&&this._flush(),clearInterval(this._ticker);let e=this._tvUnsub;this._tvUnsub=null,typeof e?.then=="function"&&e.then(a=>a?.()).catch(()=>{});let t=this._layoutUnsub;this._layoutUnsub=null,typeof t?.then=="function"&&t.then(a=>a?.()).catch(()=>{})}_previewTiles(){if(!this._layoutConfig||!this._hass?.states)return null;try{let e=ut(new te(this._hass.states,this._layoutConfig),{}),t=new Map;for(let a of Object.values(e))for(let i of a?.items||[])t.set(i.id,i.html);return t}catch{return null}}_subscribeTvs(){this._hass?.connection&&(this._layoutUnsub=this._hass.connection.subscribeMessage(e=>{this._layoutConfig=e.config||null,this._tab==="tvs"&&this._render()},{type:"alvuna/layout/subscribe"}),this._layoutUnsub.catch(()=>{this._layoutUnsub=null}),this._tvUnsub=this._hass.connection.subscribeMessage(e=>{if(this._tvs=e,this._mirror)try{this._mirror.cb(this._tv(this._mirror.id))}catch{}this._render()},{type:"alvuna/tvs/subscribe"}),this._tvUnsub.catch(()=>{this._tvUnsub=null,this._tvs="unavailable",this._render()}))}_tv(e){return this._tvs?.tvs?.find(t=>t.entry_id===e)}_selectedTv(){let e=this._tvs?.tvs||[];return this._tvSel&&e.some(t=>t.entry_id===this._tvSel)?this._tvSel:(e.find(t=>t.connected)||e[0])?.entry_id||null}_flashFor(e,t,a=!1){this._flash[e]={text:t,error:a},clearTimeout(this._flash[`${e}:t`]),this._flash[`${e}:t`]=setTimeout(()=>{delete this._flash[e],this._render()},a?6e3:2500),this._render()}async _tvCommand(e,t,a={},{quiet:i=!1}={}){try{return await this._hass.callWS({type:"alvuna/tvs/command",entry_id:e,command:t,...a}),i||this._flashFor(e,l("tvs.sent")),!0}catch(o){return this._flashFor(e,l("tvs.failed",{msg:o?.message||String(o||"")}),!0),!1}}async _tvSettings(e,t){let a=this._hass.callWS({type:"alvuna/tvs/settings",entry_id:e,settings:t}),i=this._tv(e);i&&(i.settings={...i.settings||{},...t},i.pending=!0,this._render());try{await a}catch(o){this._flashFor(e,l("tvs.failed",{msg:o?.message||String(o||"")}),!0)}}_tvsContent(){let e=i=>!this._ov.hidden.includes(i),t=this._data?G(this._data,this._ov).filter(i=>e(i.id)).map(i=>({area:i.id.replace(/^area:/,""),name:this._ov.names[i.id]||i.auto_name})):[],a=this._data?M(this._data,this._ov,"cameras",this._nameOf).filter(i=>e(i.id)&&!i.missing).map(i=>({id:i.id,name:this._ov.names[i.id]||i.auto_name})):[];return Qe({data:this._tvs,lang:this._hass?.locale?.language||Fe(),rooms:t,cameras:a,preview:this._tvSection==="layout"?this._previewTiles():null,hasClimate:!!this._data?.found?.climate,selected:this._selectedTv(),section:this._tvSection,drafts:this._drafts,flash:this._flash,svg:T,P:C,switch:(i,o,r,s)=>this._tvSwitch(i,o,r,s)})}_tvSwitch(e,t,a,i){let o=`data-action="tv-pref" data-focus="${c(e)}" data-on="${t?1:0}" aria-label="${c(a)}" title="${c(a)}" ${i}`;return customElements.get("ha-switch")?`<ha-switch ${o}></ha-switch>`:`<input type="checkbox" role="switch" class="switch" ${o} ${t?"checked":""}>`}_tabs(){let e=Array.isArray(this._tvs?.tvs)?this._tvs.tvs.length:null,t=(a,i,o)=>`<button class="tab" role="tab" data-action="tab" data-key="${a}" data-focus="tab|${a}"
      aria-selected="${this._tab===a}">${c(i)}${o!=null?`<span class="count">${o}</span>`:""}</button>`;return`<div class="tabs" role="tablist">${t("layout",l("tabs.layout"))}${t("tvs",l("tabs.tvs"),e)}</div>`}async _load({quiet:e=!1}={}){if(this._hass){!e&&!this._data&&(this._state="loading",this._render());try{let t=await this._hass.callWS({type:"alvuna/editor/get"});this._data=t,this._version===this._savedVersion&&!this._saving&&(this._ov=Z(t.overrides)),this._state="ready"}catch(t){if(e&&this._data)return;this._state=t?.code==="not_set_up"?"not_set_up":"error",this._loadError=t?.message||String(t||"")}this._render()}}_change(e,{render:t=!0,focus:a}={}){e(this._ov),this._version+=1,this._setSave("pending"),clearTimeout(this._timer),this._timer=setTimeout(()=>{this._timer=null,this._flush()},Xt),t&&this._render(a)}async _flush(){if(clearTimeout(this._timer),this._timer=null,this._saving||!this._hass||this._version===this._savedVersion)return;let e=this._version;this._saving=!0,this._setSave("saving");try{await this._hass.callWS({type:"alvuna/editor/save",overrides:Te(this._ov)}),this._savedVersion=e}catch(t){this._saving=!1,this._saveError=t?.message||String(t||""),this._setSave("error");return}if(this._saving=!1,this._version!==this._savedVersion){this._timer||this._flush();return}this._setSave("saved"),this._load({quiet:!0})}_setSave(e){this._save=e,this._renderStatus()}_nameOf=e=>this._hass?.states?.[e]?.attributes?.friendly_name||e;_build(){this.shadowRoot.innerHTML=`<style>${na}</style>
      <header class="toolbar">
        <button class="menu ib" data-action="menu" hidden>${T(C.menu)}</button>
        <h1 class="title">Alvuna</h1>
        <div class="status" role="status" aria-live="polite"></div>
      </header>
      <main class="content"><div class="content-body"></div><div class="mirror-layer" hidden></div></main>`,this.shadowRoot.querySelector("style").textContent+=it+qe,Ye();let e=this.shadowRoot;e.addEventListener("click",t=>this._onClick(t)),e.addEventListener("input",t=>this._onInput(t)),e.addEventListener("keydown",t=>this._onKey(t)),e.addEventListener("focusout",t=>this._onFocusOut(t)),e.addEventListener("change",t=>this._onChange(t)),mt(e,{onStart:()=>{this._dragging=!0},onDrop:(t,a,i)=>{this._dragging=!1;let o=this._tv(t.dataset.id);if(i||!o){this._lastHtml=null,this._render();return}let r=t.dataset.sortList==="y"?{kind:"row-order",ids:a}:{kind:"tile-order",row:t.dataset.row,ids:a};this._lastHtml=null,this._tvSettings(o.entry_id,{layout:Q(o.settings?.layout,o.catalog||[],r)})}}),e.addEventListener("submit",t=>this._onSubmit(t)),e.addEventListener("focusin",t=>{t.target.dataset?.action==="rename"&&(t.target.dataset.before=t.target.value)}),this._built=!0,this._syncMenu()}_syncMenu(){let e=this.shadowRoot.querySelector(".menu");e&&(e.hidden=!(this._narrow||this._hass?.dockedSidebar==="always_hidden"),e.setAttribute("aria-label",l("menu")))}_renderStatus(){let e=this.shadowRoot.querySelector(".status");if(!e)return;let t=this._save;e.className=`status ${t}`,t==="pending"||t==="saving"?e.innerHTML=`<span class="dot"></span>${c(l("saving"))}`:t==="saved"?e.innerHTML=`${T(C.check)}${c(l("saved"))}`:t==="error"?e.innerHTML=`<span title="${c(this._saveError)}">${T(C.alert)}${c(l("save_error"))}</span>
        <button class="retry" data-action="retry-save">${c(l("retry"))}</button>`:e.textContent=""}_render(e){this._built||this._build();let t=this.shadowRoot,a=t.activeElement,i=e||a?.dataset?.focus,o=a&&"selectionStart"in a&&a.selectionStart!=null?[a.selectionStart,a.selectionEnd]:null,r=this._content(),s=t.querySelector(".content-body");if(t.querySelector(".content").classList.toggle("wide",this._tab==="tvs"),r!==this._lastHtml&&(a?.tagName==="SELECT"&&!e||this._dragging)){this._deferred=!0;return}if(this._deferred=!1,r!==this._lastHtml){let p=new Map([...s.querySelectorAll("[data-scroll-key]")].map(h=>[h.dataset.scrollKey,h.scrollLeft]));s.innerHTML=r;for(let h of s.querySelectorAll("[data-scroll-key]"))p.get(h.dataset.scrollKey)&&(h.scrollLeft=p.get(h.dataset.scrollKey));this._lastHtml=r,this._hydrate(s)}i&&this._refocus(s,i,e?null:o),this._placeMirror()}_placeMirror(){let e=this.shadowRoot,t=e.querySelector(".content"),a=e.querySelector(".mirror-layer"),i=e.querySelector(".tv-mirror-slot"),o=i?.dataset.id;if(!a)return;if(!o){a.firstChild&&a.replaceChildren(),a.hidden=!0,this._mirror=null;return}window.__alvunaMirror=this._mirrorHost;let r=a.querySelector("iframe");(!r||r.dataset.id!==o)&&(r=document.createElement("iframe"),r.dataset.id=o,r.title=l("tvs.preview"),r.tabIndex=0,r.src=`/alvuna/tv/?mirror=${encodeURIComponent(o)}`,a.replaceChildren(r)),a.hidden=!1;let s=t.getBoundingClientRect(),p=i.getBoundingClientRect();Object.assign(a.style,{top:`${p.top-s.top}px`,left:`${p.left-s.left}px`,width:`${p.width}px`,height:`${p.height}px`}),this._mirrorResize||(this._mirrorResize=new ResizeObserver(()=>this._placeMirror()),this._mirrorResize.observe(e.querySelector(".content-body")))}_refocus(e,t,a){let i=r=>[...e.querySelectorAll("[data-focus]")].find(s=>s.dataset.focus===r&&!s.disabled),o=i(t);if(!o&&/^move-(up|down)\|/.test(t)&&(o=i(t.replace(/^move-(up|down)/,(r,s)=>`move-${s==="up"?"down":"up"}`))),!(!o||o===this.shadowRoot.activeElement)){try{o.focus({preventScroll:!0})}catch{requestAnimationFrame(()=>{try{o.focus({preventScroll:!0})}catch{}})}if(a&&typeof o.setSelectionRange=="function")try{o.setSelectionRange(a[0],a[1])}catch{}}}_hydrate(e){for(let t of e.querySelectorAll("[data-action=visible]"))t.checked=t.dataset.on==="1",t.addEventListener("change",()=>{let a=t.dataset.id;this._change(i=>Le(i,a,!t.checked),{focus:`visible|${a}`})});for(let t of e.querySelectorAll("[data-action=tv-pref]"))t.checked=t.dataset.on==="1",t.addEventListener("change",()=>{this._tvSettings(t.dataset.tvId,{[t.dataset.tvKey]:!!t.checked})});for(let t of e.querySelectorAll("ha-state-icon[data-entity]"))t.hass=this._hass,t.stateObj=this._hass?.states?.[t.dataset.entity]}_content(){return this._tabs()+(this._tab==="tvs"?this._tvsContent():this._layoutContent())}_layoutContent(){return this._state==="loading"?`<div class="state"><span class="dot"></span>${c(l("loading"))}</div>`:this._state==="not_set_up"?`<div class="state card">
        <p class="state-title">${c(l("not_set_up"))}</p>
        <p>${c(l("not_set_up_hint"))}</p>
        <a class="button" href="/config/integrations/integration/alvuna" data-nav>${c(l("open_integrations"))}</a>
      </div>`:this._state==="error"?`<div class="state card">
        <p class="state-title">${c(l("load_error"))}</p>
        ${this._loadError?`<p class="mono">${c(this._loadError)}</p>`:""}
        <button class="button" data-action="retry-load" data-focus="retry-load">${c(l("try_again"))}</button>
      </div>`:`<div class="intro">
        <p>${c(l("intro"))}</p>
        <p class="intro-save">${c(l("intro_save"))}</p>
      </div>
      ${this._roomsSection()}
      ${ie.map(e=>this._listSection(e)).join("")}
      ${this._foundSection()}`}_icon(e,t){let a=String(e).split(".")[0];return this._hass?.states?.[e]&&customElements.get("ha-state-icon")?`<ha-state-icon data-entity="${c(e)}"></ha-state-icon>`:`<ha-icon icon="${c(t||ta[a]||"mdi:circle-outline")}"></ha-icon>`}_switch(e,t,a){let i=c(l("visible",{name:a})),o=`data-action="visible" data-id="${c(e)}" data-focus="visible|${c(e)}" data-on="${t?1:0}" aria-label="${i}" title="${i}"`;return customElements.get("ha-switch")?`<ha-switch ${o}></ha-switch>`:`<input type="checkbox" role="switch" class="switch" ${o} ${t?"checked":""}>`}_nameField(e,t){let a=this._ov.names[e];return`<div class="name-wrap">
      <input class="name" type="text" maxlength="80" spellcheck="false" autocomplete="off" data-action="rename" data-id="${c(e)}"
        data-auto="${c(t)}" data-focus="rename|${c(e)}" value="${c(a||t)}" placeholder="${c(t)}"
        aria-label="${c(l("rename",{name:t}))}" title="${c(l("rename_hint"))}">
      <button class="ib small reset" data-action="reset" data-id="${c(e)}" data-focus="reset|${c(e)}"
        aria-label="${c(l("reset_name"))}" title="${c(l("reset_name"))}">${T(C.reset)}</button>
    </div>`}_moveButtons(e,t,a,i,o){return`<button class="ib" data-action="move-up" data-key="${e}" data-id="${c(t)}" data-focus="move-up|${c(t)}"
        aria-label="${c(l("move_up",{name:o}))}" title="${c(l("move_up",{name:o}))}" ${a===0?"disabled":""}>${T(C.up)}</button>
      <button class="ib" data-action="move-down" data-key="${e}" data-id="${c(t)}" data-focus="move-down|${c(t)}"
        aria-label="${c(l("move_down",{name:o}))}" title="${c(l("move_down",{name:o}))}" ${a===i-1?"disabled":""}>${T(C.down)}</button>`}_rowClass(e,t=""){let a=this._ov.hidden.includes(e);return`row ${t} ${a?"is-hidden":""} ${this._ov.names[e]?"renamed":""}`}_badges(e,{added:t=!1,missing:a=!1}={}){return`${t?`<span class="badge">${c(l("badge_added"))}</span>`:""}
      ${a?`<span class="badge warn">${c(l("badge_missing"))}</span>`:""}
      <span class="badge muted hidden-badge">${c(l("badge_hidden"))}</span>`}_sectionHead(e,t,a=""){return`<div class="section-head">
      <h2 id="h-${e}">${c(l(`sections.${e}`))}${t!=null?`<span class="count">${t}</span>`:""}</h2>
      ${a}
    </div>`}_roomsSection(){let e=G(this._data,this._ov),t=e.length?e.map((a,i)=>this._room(a,i,e.length)).join(""):`<div class="empty">${c(l("empty_rooms"))}</div>`;return`<section aria-labelledby="h-rooms">
      ${this._sectionHead("rooms",e.length)}
      <div class="card">${t}</div>
      <p class="note">${c(l("notes.rooms"))}</p>
    </section>`}_room(e,t,a){let i=e.id,o=i.replace(/^area:/,""),r=this._ov.names[i]||e.auto_name,s=this._expanded.has(i),p=e.items||[],h=l(s?"collapse":"expand",{name:r}),g=`<div class="${this._rowClass(i,"room")}">
      <div class="icon"><ha-icon icon="${c(e.icon||"mdi:texture-box")}"></ha-icon></div>
      <div class="main">
        ${this._nameField(i,e.auto_name)}
        <div class="sub">
          <button class="disclose ${s?"open":""}" data-action="expand" data-id="${c(i)}" data-focus="expand|${c(i)}"
            aria-expanded="${s}" aria-controls="body-${c(o)}" aria-label="${c(h)}">
            ${c(l("devices",{n:p.length}))}${T(C.down)}
          </button>
          <span class="id">${c(l("area",{id:o}))}</span>
          <span class="auto">${c(l("auto_name",{name:e.auto_name}))}</span>
          ${this._badges(i)}
        </div>
      </div>
      <div class="controls">${this._moveButtons("rooms",i,t,a,r)}${this._switch(i,!this._ov.hidden.includes(i),r)}</div>
    </div>`;if(!s)return g;let y=p.length?p.map(u=>{let v=this._ov.names[u.id]||u.auto_name;return`<div class="${this._rowClass(u.id,"device")}">
        <div class="icon">${this._icon(u.id)}</div>
        <div class="main">
          ${this._nameField(u.id,u.auto_name)}
          <div class="sub"><span class="kind">${c(l(`kinds.${u.kind}`))}</span><span class="id">${c(u.id)}</span>
            <span class="auto">${c(l("auto_name",{name:u.auto_name}))}</span>${this._badges(u.id)}</div>
        </div>
        <div class="controls">${this._switch(u.id,!this._ov.hidden.includes(u.id),v)}</div>
      </div>`}).join(""):`<div class="empty small">${c(l("no_devices"))}</div>`,w=this._hass?.areas?.[o],_=u=>{let v=e.sensors?.[u],x=v?`<span class="sensor-name">${c(this._nameOf(v))}</span> <span class="id">${c(v)}</span>
           ${w?`<span class="origin">${c(l(w[`${u}_entity_id`]===v?"sensor_area":"sensor_auto"))}</span>`:""}`:`<span class="muted-text">${c(l("sensor_none"))}</span>`;return`<div class="sensor"><span class="sensor-label">${c(l(u))}</span><span class="sensor-value">${x}</span></div>`};return`${g}<div class="room-body" id="body-${c(o)}" role="group" aria-label="${c(r)}">
      ${y}
      <div class="sensors">
        ${_("temperature")}${_("humidity")}
        <p class="hint">${c(l("sensor_hint"))}
          <a href="/config/areas/area/${encodeURIComponent(o)}" data-nav>${c(l("area_settings"))}${T(C.next)}</a></p>
      </div>
    </div>`}_listSection(e){let t=M(this._data,this._ov,e,this._nameOf),a=this._picker?.key===e,i=`<button class="add" data-action="open-picker" data-key="${e}" data-focus="open-picker|${e}"
      aria-expanded="${a}">${T(C.plus)}${c(l("add"))}</button>`,o=t.map((r,s)=>{let p=this._ov.names[r.id]||r.auto_name,h=r.added?`<button class="ib" data-action="remove" data-key="${e}" data-id="${c(r.id)}"
        data-focus="remove|${c(r.id)}" aria-label="${c(l("remove",{name:p}))}" title="${c(l("remove",{name:p}))}">${T(C.remove)}</button>`:"";return`<div class="${this._rowClass(r.id,r.missing?"missing":"")}">
        <div class="icon">${this._icon(r.id)}</div>
        <div class="main">
          ${this._nameField(r.id,r.auto_name)}
          <div class="sub"><span class="id">${c(r.id)}</span>
            <span class="auto">${c(l("auto_name",{name:r.auto_name}))}</span>${this._badges(r.id,r)}</div>
        </div>
        <div class="controls">${h}${this._moveButtons(e,r.id,s,t.length,p)}${this._switch(r.id,!this._ov.hidden.includes(r.id),p)}</div>
      </div>`}).join("");return`<section aria-labelledby="h-${e}">
      ${this._sectionHead(e,t.length,i)}
      <div class="card">
        ${a?this._pickerHtml(e):""}
        ${o||(a?"":`<div class="empty">${c(l("empty"))}</div>`)}
      </div>
      <p class="note">${c(l(`notes.${e}`))}</p>
    </section>`}_pickerHtml(e){let t=this._picker.query,a=ne(this._data,this._ov,e,t),i=ne(this._data,this._ov,e,"").length>0,o=a.slice(0,Qt),r=o.map(p=>`<li><button class="result" data-action="pick" data-key="${e}" data-id="${c(p.id)}"
        data-focus="pick|${c(p.id)}" aria-label="${c(l("add_item",{name:p.auto_name}))}">
        <span class="icon small">${this._icon(p.id)}</span>
        <span class="result-text"><span class="result-name">${c(p.auto_name)}</span><span class="id">${c(p.id)}</span></span>
        <span class="plus">${T(C.plus)}</span>
      </button></li>`).join(""),s=i?a.length?"":l("no_results"):l("no_candidates");return`<div class="picker">
      <div class="picker-bar">
        <label class="search">${T(C.search)}
          <input type="search" data-action="search" data-key="${e}" data-focus="search|${e}" value="${c(t)}"
            placeholder="${c(l("search_short"))}" aria-label="${c(l("search"))}" title="${c(l("search"))}" autocomplete="off" spellcheck="false">
        </label>
        <button class="text-button" data-action="close-picker" data-key="${e}" data-focus="close-picker|${e}">${c(l("done"))}</button>
      </div>
      ${s?`<p class="picker-empty">${c(s)}</p>`:`<ul class="results">${r}</ul>`}
      ${a.length>o.length?`<p class="picker-empty">${c(l("more_results",{n:a.length-o.length}))}</p>`:""}
    </div>`}_foundSection(){let e=this._data?.found||{},t=i=>`<span class="found-item"><span>${c(this._nameOf(i))}</span> <span class="id">${c(i)}</span></span>`,a=ia.filter(i=>e[i]!=null&&!(Array.isArray(e[i])&&!e[i].length)).map(i=>{let o=e[i],r;return i==="appliances"?r=o.map(s=>`<span class="found-item">${c(s.name)}${s.state?` <span class="id">${c(s.state)}</span>`:""}</span>`).join(""):i==="air_quality"?r=Object.entries(o).map(([s,p])=>`<span class="found-item"><span class="found-part">${c(l(`air.${s}`))}</span> ${c(this._nameOf(p))} <span class="id">${c(p)}</span></span>`).join(""):i==="vacuum"?r=`${t(o.entity)}${o.battery?`<span class="found-item"><span class="found-part">${c(l("battery"))}</span> <span class="id">${c(o.battery)}</span></span>`:""}`:Array.isArray(o)?r=o.map(s=>typeof s=="string"?t(s):c(JSON.stringify(s))).join(""):typeof o=="string"?r=t(o):o&&typeof o=="object"&&o.entity?r=t(o.entity):r=`<span class="id">${c(JSON.stringify(o))}</span>`,`<div class="row found">
        <div class="icon"><ha-icon icon="${aa[i]}"></ha-icon></div>
        <div class="main"><div class="found-label">${c(l(`found.${i}`))}</div><div class="found-values">${r}</div></div>
      </div>`}).join("");return`<section aria-labelledby="h-found">
      ${this._sectionHead("found",null)}
      <div class="card">${a||`<div class="empty">${c(l("nothing_found"))}</div>`}</div>
      <p class="note">${c(l("notes.found"))}</p>
    </section>`}_onClick(e){let t=e.target.closest("a[data-nav]");if(t){if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault(),history.pushState(null,"",t.getAttribute("href")),window.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1}}));return}let a=e.target.closest("[data-action]");if(!a||a.disabled)return;let{action:i,id:o,key:r}=a.dataset;switch(i){case"menu":this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}));break;case"move-up":case"move-down":{let s=r==="rooms"?G(this._data,this._ov).map(p=>p.id):M(this._data,this._ov,r).map(p=>p.id);this._change(p=>Ne(p,r,s,o,i==="move-up"?-1:1),{focus:`${i}|${o}`});break}case"expand":this._expanded.has(o)?this._expanded.delete(o):this._expanded.add(o),this._render(`expand|${o}`);break;case"reset":{this._change(s=>oe(s,o,""),{focus:`rename|${o}`});break}case"open-picker":this._picker=this._picker?.key===r?null:{key:r,query:""},this._render(this._picker?`search|${r}`:`open-picker|${r}`);break;case"close-picker":this._picker=null,this._render(`open-picker|${r}`);break;case"pick":this._change(s=>Oe(s,r,o),{focus:`search|${r}`});break;case"remove":{let s=We(this._data,this._ov,r).has(o);this._change(p=>Me(p,r,o,s),{focus:`open-picker|${r}`});break}case"retry-load":this._load();break;case"tab":{if(r===this._tab)break;let s=`/${this._panel?.url_path||"alvuna"}`;history.pushState(null,"",r==="tvs"?`${s}/tvs`:s),window.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1}}));break}case"tv-cmd":this._tvCommand(o,a.dataset.command);break;case"tv-key":this._tvCommand(o,"key",{key:r},{quiet:!0});break;case"tv-set":this._tvSettings(o,{[r]:a.dataset.value});break;case"tv-layout":{let s=this._tv(o);if(!s)break;let p=a.dataset,h=Q(s.settings?.layout,s.catalog||[],{kind:p.op,row:p.row,id:p.tile,step:Number(p.step||0)});this._tvSettings(o,{layout:h});break}case"tv-pick":this._tvSel=o,this._render(`tv-pick|${o}`);break;case"tv-section":this._tvSection=r,this._render(`tv-section|${r}`);break;case"tv-clear-log":this._hass.callWS({type:"alvuna/tvs/clear_log",entry_id:o}).catch(()=>{});break;case"retry-save":this._flush();break;default:}}_onInput(e){let t=e.target;if(t.dataset?.action==="rename"){let{id:a,auto:i}=t.dataset;this._change(o=>oe(o,a,t.value,i),{render:!1}),t.closest(".row")?.classList.toggle("renamed",!!this._ov.names[a])}else if(t.dataset?.action==="tv-draft"){this._drafts[t.dataset.id]=t.value;let a=t.closest("form")?.querySelector("button[type=submit]");a&&(a.disabled=!t.value.trim())}else t.dataset?.action==="search"&&this._picker&&(this._picker.query=t.value,this._render())}_onKey(e){let t=e.target;if(t.dataset?.action==="tv-layout-key"&&/^Arrow/.test(e.key)){let a=this._tv(t.dataset.id),i=t.dataset.tile,o=i?{ArrowLeft:-1,ArrowRight:1}[e.key]:{ArrowUp:-1,ArrowDown:1}[e.key];if(!a||!o)return;e.preventDefault();let r=i?{kind:"tile-move",row:t.dataset.row,id:i,step:o}:{kind:"row-move",row:t.dataset.row,step:o};this._tvSettings(a.entry_id,{layout:Q(a.settings?.layout,a.catalog||[],r)});return}if(e.key==="Escape"&&this._picker&&t.closest?.(".picker")){e.preventDefault();let a=this._picker.key;this._picker=null,this._render(`open-picker|${a}`)}else e.key==="Enter"&&t.dataset?.action==="rename"?t.blur():e.key==="Escape"&&t.dataset?.action==="rename"&&(t.dataset.before!=null&&(t.value=t.dataset.before,t.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))),t.blur())}_onChange(e){let t=e.target,{action:a,id:i,key:o}=t.dataset||{};if(a==="tv-open"&&t.value){let r=t.value;t.value="",this._tvCommand(i,"open",{target:r})}else if(a==="tv-camera"&&t.value){let r=t.value;t.value="",this._tvCommand(i,"camera",{entity_id:r})}else a==="tv-minutes"&&this._tvSettings(i,{[o]:t.value===""?null:Number(t.value)});this._deferred&&setTimeout(()=>this._render(),0)}async _onSubmit(e){let t=e.target;if(t.dataset?.action!=="tv-notify")return;e.preventDefault();let a=t.dataset.id,i=(this._drafts[a]||"").trim();i&&await this._tvCommand(a,"notify",{message:i})&&(this._drafts[a]="",this._lastHtml=null,this._render(`tv-draft|${a}`))}_onFocusOut(e){let t=e.target;t.tagName==="SELECT"&&this._deferred&&setTimeout(()=>this._render(),0),t.dataset?.action==="rename"&&!t.value.trim()&&(t.value=t.dataset.auto)}},na=`
:host {
  display: block; height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;
  scroll-padding-top: calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px) + 16px);
  background: var(--primary-background-color);
  color: var(--primary-text-color);
  font-family: var(--ha-font-family-body, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  -webkit-font-smoothing: antialiased;
  --alv-radius: var(--ha-card-border-radius, 12px);
  --alv-card: var(--card-background-color, var(--ha-card-background, #fff));
  --alv-sub: var(--secondary-text-color);
  --alv-div: var(--divider-color, rgba(0, 0, 0, .12));
  --alv-accent: var(--primary-color);
  --alv-tint: rgba(var(--rgb-primary-color, 3, 169, 244), .12);
  --alv-hover: rgba(var(--rgb-primary-text-color, 33, 33, 33), .06);
  --alv-wash: rgba(var(--rgb-primary-text-color, 33, 33, 33), .03);
  --alv-mono: var(--ha-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
svg { width: 24px; height: 24px; fill: currentColor; flex: none; }
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--alv-accent); outline-offset: 2px; }

.toolbar {
  position: sticky; top: 0; z-index: 4; display: flex; align-items: center; gap: 4px;
  height: calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px));
  padding: var(--safe-area-inset-top, 0px) 12px 0;
  background: var(--app-header-background-color, var(--primary-color));
  color: var(--app-header-text-color, var(--text-primary-color, #fff));
  border-bottom: var(--app-header-border-bottom, none);
}
.toolbar .menu { color: inherit; }
.title { flex: 1; margin: 0 0 0 12px; font-size: var(--ha-font-size-xl, 20px); font-weight: 400; line-height: 1; white-space: nowrap; }
.menu:not([hidden]) + .title { margin-left: 8px; }
.status { display: flex; align-items: center; gap: 6px; font-size: 14px; opacity: .92; min-height: 24px; }
.status svg { width: 18px; height: 18px; vertical-align: -4px; margin-right: 4px; }
.status.saved svg { opacity: .9; }
.status .retry { border: 1px solid currentColor; background: transparent; border-radius: 999px; padding: 3px 12px; cursor: pointer; font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; display: inline-block; margin-right: 6px; animation: pulse 1s ease-in-out infinite alternate; }
@keyframes pulse { from { opacity: .35; } to { opacity: 1; } }

.content { max-width: 880px; margin: 0 auto; padding: 28px 16px calc(72px + var(--safe-area-inset-bottom, 0px)); }
.content.wide { max-width: none; padding-left: 32px; padding-right: 32px; }
.content { position: relative; }
.mirror-layer { position: absolute; z-index: 1; border-radius: var(--ha-card-border-radius, 12px); overflow: hidden; background: #000;
  box-shadow: 0 0 0 1px var(--alv-div); }
.mirror-layer iframe { display: block; width: 100%; height: 100%; border: 0; }
.mirror-layer:focus-within { box-shadow: 0 0 0 2px var(--alv-accent); }
.intro { margin: 0 4px 8px; max-width: 680px; }
.intro p { margin: 0; font-size: 16px; line-height: 1.5; }
.intro .intro-save { margin-top: 8px; font-size: 14px; color: var(--alv-sub); }

section { margin-top: 36px; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 4px 10px; min-height: 36px; }
h2 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -.01em; display: flex; align-items: baseline; gap: 8px; }
.count { font-size: 15px; font-weight: 400; color: var(--alv-sub); }
.note { margin: 10px 4px 0; font-size: 13px; line-height: 1.45; color: var(--alv-sub); }

.card {
  background: var(--alv-card); border-radius: var(--alv-radius); overflow: hidden;
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--alv-div));
  box-shadow: var(--ha-card-box-shadow, none);
}
.card > * { position: relative; }
.card > * + *::before { content: ""; position: absolute; top: 0; left: 64px; right: 0; border-top: 1px solid var(--alv-div); pointer-events: none; }
.card > .room-body::before, .card > .room-body + *::before { left: 0; }

.row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 64px; padding: 10px 10px 10px 16px; }
.icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--alv-tint); color: var(--alv-accent); --mdc-icon-size: 22px; transition: background .2s, color .2s; }
.icon.small { width: 30px; height: 30px; border-radius: 8px; --mdc-icon-size: 18px; }
.main { min-width: 0; }
.controls { display: flex; align-items: center; gap: 2px; }
.controls ha-switch, .controls .switch { margin-left: 8px; }

.name-wrap { position: relative; display: flex; align-items: center; }
.name {
  width: 100%; min-width: 0; font: inherit; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
  background: transparent; border: 0; border-radius: 8px; padding: 5px 34px 5px 8px; margin: -5px 0 -5px -8px; text-overflow: ellipsis;
}
.name::placeholder { color: var(--alv-sub); font-weight: 400; }
.name:hover { background: var(--alv-hover); }
.name:focus { outline: 2px solid var(--alv-accent); outline-offset: 0; background: var(--alv-card); }
.name-wrap .reset { position: absolute; right: 0; display: none; }
.renamed .name-wrap .reset { display: grid; }
.sub { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 10px; margin-top: 4px; font-size: 13px; color: var(--alv-sub); min-width: 0; }
.id { font-family: var(--alv-mono); font-size: 12px; color: var(--alv-sub); overflow-wrap: anywhere; }
.auto { display: none; }
.renamed .auto { display: inline; }
.kind { color: var(--primary-text-color); opacity: .75; }

.badge { font-size: 11px; font-weight: 600; line-height: 1; padding: 4px 8px; border-radius: 999px; background: var(--alv-tint); color: var(--alv-accent); white-space: nowrap; }
.badge.muted { background: var(--alv-hover); color: var(--alv-sub); }
.badge.warn { background: rgba(var(--rgb-warning-color, 255, 166, 0), .16); color: var(--warning-color, #b26a00); }
.hidden-badge { display: none; }
.is-hidden .hidden-badge { display: inline; }
.is-hidden .icon { background: var(--alv-hover); color: var(--alv-sub); }
.is-hidden .name, .is-hidden .sub > :not(.hidden-badge):not(.disclose) { opacity: .5; }
.missing .icon { background: rgba(var(--rgb-warning-color, 255, 166, 0), .14); color: var(--warning-color, #b26a00); }

.ib { width: 36px; height: 36px; border: 0; border-radius: 50%; background: transparent; color: var(--alv-sub); display: grid; place-items: center; cursor: pointer; padding: 0; transition: background .15s, color .15s; }
.ib.small { width: 28px; height: 28px; }
.ib.small svg { width: 18px; height: 18px; }
.ib:hover:not(:disabled) { background: var(--alv-hover); color: var(--primary-text-color); }
.ib:disabled { opacity: .25; cursor: default; }
.toolbar .ib:hover { background: rgba(255, 255, 255, .12); color: inherit; }

.disclose { display: inline-flex; align-items: center; gap: 2px; border: 0; background: transparent; padding: 2px 6px 2px 0; margin: 0; color: var(--alv-accent); font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; }
.disclose svg { width: 18px; height: 18px; transition: transform .25s cubic-bezier(.22, 1, .36, 1); }
.disclose.open svg { transform: rotate(180deg); }

.room-body { background: var(--alv-wash); padding: 2px 0 6px; }
.room-body > * { position: relative; }
.room-body > .row + .row::before { content: ""; position: absolute; top: 0; left: 88px; right: 0; border-top: 1px solid var(--alv-div); }
.row.device { padding-left: 40px; min-height: 58px; }
.row.device .icon { width: 32px; height: 32px; border-radius: 9px; --mdc-icon-size: 20px; }
.row.device { grid-template-columns: 32px minmax(0, 1fr) auto; }
.sensors { padding: 12px 16px 8px 40px; border-top: 1px solid var(--alv-div); font-size: 14px; }
.sensor { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; padding: 4px 0; align-items: baseline; }
.sensor-label { color: var(--alv-sub); }
.sensor-value { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; min-width: 0; }
.origin { font-size: 12px; color: var(--alv-sub); }
.muted-text { color: var(--alv-sub); }
.hint { margin: 8px 0 4px; font-size: 13px; line-height: 1.45; color: var(--alv-sub); }
.hint a { display: inline-flex; align-items: center; color: var(--alv-accent); text-decoration: none; font-weight: 500; white-space: nowrap; }
.hint a:hover { text-decoration: underline; }
.hint a svg { width: 16px; height: 16px; }

.add { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--alv-accent); font-size: 15px; font-weight: 500; padding: 6px 14px 6px 8px; border-radius: 999px; cursor: pointer; }
.add svg { width: 20px; height: 20px; }
.add:hover, .add[aria-expanded="true"] { background: var(--alv-tint); }

.picker { padding: 12px; background: var(--alv-wash); }
.picker-bar { display: flex; align-items: center; gap: 8px; }
.search { position: relative; flex: 1; display: flex; align-items: center; }
.search svg { position: absolute; left: 10px; width: 20px; height: 20px; color: var(--alv-sub); pointer-events: none; }
.search input {
  width: 100%; height: 42px; border-radius: 10px; border: 1px solid var(--alv-div); background: var(--alv-card);
  color: var(--primary-text-color); font: inherit; font-size: 15px; padding: 0 12px 0 38px;
}
.search input:focus { outline: 2px solid var(--alv-accent); outline-offset: -1px; border-color: transparent; }
.text-button { border: 0; background: transparent; color: var(--alv-accent); font-weight: 500; font-size: 15px; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
.text-button:hover { background: var(--alv-tint); }
.results { list-style: none; margin: 8px 0 0; padding: 0; max-height: min(50vh, 380px); overflow-y: auto; }
.result { width: 100%; display: grid; grid-template-columns: 30px minmax(0, 1fr) 28px; gap: 12px; align-items: center; text-align: left; border: 0; background: transparent; padding: 8px; border-radius: 10px; cursor: pointer; }
.result:hover { background: var(--alv-hover); }
.result-text { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.result-name { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plus { color: var(--alv-accent); display: grid; place-items: center; }
.plus svg { width: 22px; height: 22px; }
.picker-empty { margin: 12px 4px 4px; font-size: 14px; color: var(--alv-sub); }

.row.found { grid-template-columns: 36px minmax(0, 1fr); }
.found-label { font-size: 16px; font-weight: 500; }
.found-values { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; font-size: 14px; }
.found-item { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; }
.found-part { color: var(--alv-sub); min-width: 56px; }

.empty { padding: 20px 16px; color: var(--alv-sub); font-size: 15px; }
.empty.small { padding: 14px 16px 14px 40px; font-size: 14px; }
.state { padding: 32px 24px; margin-top: 8px; font-size: 15px; line-height: 1.5; color: var(--alv-sub); display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.state:not(.card) { flex-direction: row; align-items: center; }
.state p { margin: 0; }
.state-title { color: var(--primary-text-color); font-size: 18px; font-weight: 600; }
.mono { font-family: var(--alv-mono); font-size: 13px; }
.button { margin-top: 16px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; padding: 10px 20px; background: var(--alv-accent); color: var(--text-primary-color, #fff); font-size: 15px; font-weight: 500; text-decoration: none; cursor: pointer; }

.switch {
  -webkit-appearance: none; appearance: none; flex: none; width: 46px; height: 28px; border-radius: 14px; margin: 0;
  background: rgba(var(--rgb-primary-text-color, 33, 33, 33), .2); position: relative; cursor: pointer; transition: background .2s;
}
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, .3); transition: transform .25s cubic-bezier(.22, 1, .36, 1); }
.switch:checked { background: var(--switch-checked-color, var(--alv-accent)); }
.switch:checked::after { transform: translateX(18px); }

@media (max-width: 600px) {
  .content, .content.wide { padding: 20px 12px calc(56px + var(--safe-area-inset-bottom, 0px)); }
  section { margin-top: 28px; }
  .row { gap: 10px; padding: 10px 6px 10px 12px; }
  .card > * + *::before { left: 58px; }
  .ib { width: 32px; height: 32px; }
  .row.device { padding-left: 24px; }
  .room-body > .row + .row::before { left: 66px; }
  .sensors { padding-left: 24px; }
  .sensor { grid-template-columns: 96px minmax(0, 1fr); }
  .controls ha-switch, .controls .switch { margin-left: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .dot { animation: none; }
  .disclose svg, .switch, .switch::after, .icon { transition: none; }
}
`;customElements.get("alvuna-panel")||customElements.define("alvuna-panel",xe);
