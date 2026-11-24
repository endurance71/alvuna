var E=["rooms","scenes","security","cameras","media","persons"],$=["scenes","security","cameras","media","persons"];var B=/^(?!.+__)(?!_)[\da-z_]+(?<!_)\.(?!_)[\da-z_]+(?<!_)$/,y=r=>typeof r=="string"&&r.length>0&&r.length<=255,j=r=>[...new Set(r)];function x(r){let e=r&&typeof r=="object"?r:{},a={hidden:[],names:{},order:{},added:{}};if(Array.isArray(e.hidden)&&(a.hidden=j(e.hidden.filter(y))),e.names&&typeof e.names=="object")for(let[t,n]of Object.entries(e.names))y(t)&&typeof n=="string"&&(a.names[t]=n);for(let t of["order","added"]){let n=e[t];if(!(!n||typeof n!="object"))for(let[i,o]of Object.entries(n))E.includes(i)&&Array.isArray(o)&&(a[t][i]=j(o.filter(y)))}return a}function H(r){let e=x(r),a={};for(let[i,o]of Object.entries(e.names)){let d=o.trim().slice(0,80).trim();d&&(a[i]=d)}let t={},n={};for(let i of E){e.order[i]?.length&&(t[i]=e.order[i]);let o=(e.added[i]||[]).filter(d=>B.test(d));o.length&&(n[i]=o)}return{hidden:e.hidden,names:a,order:t,added:n}}function C(r,e=[]){let a=new Map(e.map((t,n)=>[t,n]));return r.map((t,n)=>[t,n]).sort((t,n)=>(a.get(t[0])??a.size)-(a.get(n[0])??a.size)||t[1]-n[1]).map(([t])=>t)}function z(r,e){let a=r?.sections?.rooms||[],t=new Map(a.map(n=>[n.id,n]));return C(a.map(n=>n.id),e.order.rooms).map(n=>t.get(n))}function _(r,e,a,t=n=>n){let n=r?.sections?.[a]||[],i=r?.sections?.[`${a}_candidates`]||[],o=n.filter(p=>!p.added),d=new Set(o.map(p=>p.id)),c=(e.added[a]||[]).filter(p=>!d.has(p)).map(p=>{let b=n.find(g=>g.id===p)||i.find(g=>g.id===p);return{id:p,auto_name:b?.auto_name||t(p),added:!0,missing:!b}}),v=new Map([...o.map(p=>[p.id,{id:p.id,auto_name:p.auto_name,added:!1}]),...c.map(p=>[p.id,p])]);return C([...v.keys()],e.order[a]).map(p=>v.get(p))}var M=r=>String(r||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ł/g,"l").replace(/Ł/g,"L").toLowerCase();function k(r,e,a,t=""){let n=new Set(_(r,e,a).map(d=>d.id)),i=new Map;for(let d of r?.sections?.[`${a}_candidates`]||[])i.set(d.id,{id:d.id,auto_name:d.auto_name});for(let d of r?.sections?.[a]||[])d.added&&!i.has(d.id)&&i.set(d.id,{id:d.id,auto_name:d.auto_name});let o=M(t).split(/\s+/).filter(Boolean);return[...i.values()].filter(d=>!n.has(d.id)).filter(d=>{let c=M(`${d.id} ${d.auto_name}`);return o.every(v=>c.includes(v))}).sort((d,c)=>String(d.auto_name).localeCompare(String(c.auto_name)))}function V(r,e,a){r.hidden=r.hidden.filter(t=>t!==e),a&&r.hidden.push(e)}function S(r,e,a,t){let n=String(a||"").slice(0,80);!n.trim()||n.trim()===String(t||"").trim()?delete r.names[e]:r.names[e]=n}function O(r,e,a,t,n){let i=a.indexOf(t),o=i+n;if(i<0||o<0||o>=a.length)return!1;let d=[...a];return d.splice(i,1),d.splice(o,0,t),r.order[e]=d,!0}function T(r,e,a){let t=r.added[e]||[];t.includes(a)||(r.added[e]=[...t,a]),r.order[e]?.length&&!r.order[e].includes(a)&&(r.order[e]=[...r.order[e],a])}function I(r,e,a,t=!1){let n=(r.added[e]||[]).filter(i=>i!==a);n.length?r.added[e]=n:delete r.added[e],r.order[e]&&(r.order[e]=r.order[e].filter(i=>i!==a)),t||(delete r.names[a],r.hidden=r.hidden.filter(i=>i!==a))}function N(r,e,a){let t=new Set;for(let n of r?.sections?.rooms||[]){t.add(n.id);for(let i of n.items||[])t.add(i.id)}for(let n of $)if(n!==a)for(let i of _(r,e,n))t.add(i.id);return t}var w={pl:{menu:"Menu",intro:"Alvuna sama buduje ekran telewizora z Twoich obszar\xF3w i urz\u0105dze\u0144. Tu ukryjesz to, czego nie chcesz, zmienisz nazwy i kolejno\u015B\u0107, albo dodasz np. skrypt jako scen\u0119.",intro_save:"Zmiany zapisuj\u0105 si\u0119 same i od razu trafiaj\u0105 na telewizory.",sections:{rooms:"Pokoje",scenes:"Sceny",security:"Ochrona",cameras:"Kamery",media:"Media",persons:"Osoby",found:"Wykryte automatycznie"},notes:{rooms:"Pokoje to obszary Home Assistanta. Rozwi\u0144 pok\xF3j, \u017Ceby ukry\u0107 lub nazwa\u0107 jego \u015Bwiat\u0142a, rolety i nawil\u017Cacze.",scenes:"Sceny i skrypty uruchamiane jednym dotkni\u0119ciem.",security:"Czujniki drzwi, okien, ruchu, dymu i zalania.",cameras:"Podgl\u0105d na \u017Cywo z kamer.",media:"G\u0142o\u015Bniki, telewizory i odtwarzacze.",persons:"Kto jest w domu.",found:"Te rzeczy Alvuna znajduje sama i pokazuje, gdy s\u0105 dost\u0119pne."},saving:"Zapisywanie\u2026",saved:"Zapisano",save_error:"Nie zapisano",retry:"Pon\xF3w",add:"Dodaj",done:"Gotowe",search:"Szukaj po nazwie lub identyfikatorze",search_short:"Szukaj",no_candidates:"Nie ma ju\u017C nic do dodania.",no_results:"Nic nie pasuje.",more_results:"I jeszcze {n} \u2014 zaw\u0119\u017A wyszukiwanie.",add_item:"Dodaj: {name}",remove:"Usu\u0144 z listy: {name}",badge_added:"Dodane",badge_hidden:"Ukryte",badge_missing:"Brak w Home Assistant",visible:"Pokazuj: {name}",move_up:"Przesu\u0144 wy\u017Cej: {name}",move_down:"Przesu\u0144 ni\u017Cej: {name}",rename:"Nazwa: {name}",rename_hint:"Kliknij, aby zmieni\u0107 nazw\u0119",auto_name:"automatycznie: {name}",reset_name:"Przywr\xF3\u0107 nazw\u0119 automatyczn\u0105",empty:"Alvuna nic tu nie znalaz\u0142a. Mo\u017Cesz doda\u0107 co\u015B sama.",empty_rooms:"Brak obszar\xF3w z urz\u0105dzeniami.",area:"obszar {id}",devices:{zero:"bez urz\u0105dze\u0144",one:"{n} urz\u0105dzenie",few:"{n} urz\u0105dzenia",many:"{n} urz\u0105dze\u0144",other:"{n} urz\u0105dzenia"},expand:"Poka\u017C urz\u0105dzenia: {name}",collapse:"Zwi\u0144 urz\u0105dzenia: {name}",kinds:{lights:"\u015Awiat\u0142o",covers:"Roleta",humidifiers:"Nawil\u017Cacz"},no_devices:"W tym pokoju nie ma \u015Bwiate\u0142, rolet ani nawil\u017Caczy.",temperature:"Temperatura",humidity:"Wilgotno\u015B\u0107",sensor_none:"nie wybrano",sensor_area:"z ustawie\u0144 obszaru",sensor_auto:"dobrany automatycznie",sensor_hint:"Czujniki pokoju ustawisz w Home Assistant, w ustawieniach obszaru.",area_settings:"Ustawienia obszaru",found:{weather:"Pogoda",climate:"Ogrzewanie",vacuum:"Odkurzacz",appliances:"Pralka i zmywarka",waste:"Wyw\xF3z odpad\xF3w",air_quality:"Jako\u015B\u0107 powietrza",weather_alert:"Ostrze\u017Cenia pogodowe"},air:{index:"indeks",pm10:"PM10",pm25:"PM2,5"},battery:"bateria",nothing_found:"Nic wi\u0119cej nie wykryto.",loading:"Wczytywanie\u2026",not_set_up:"Alvuna nie jest jeszcze skonfigurowana.",not_set_up_hint:"Dodaj integracj\u0119 Alvuna w Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi, a ten panel poka\u017Ce Tw\xF3j dom.",open_integrations:"Otw\xF3rz integracj\u0119",load_error:"Nie uda\u0142o si\u0119 wczyta\u0107 ustawie\u0144 Alvuny.",try_again:"Spr\xF3buj ponownie",unsaved_leave:"Zmiany jeszcze si\u0119 zapisuj\u0105."},en:{menu:"Menu",intro:"Alvuna builds the TV screen by itself from your areas and devices. Here you can hide what you don't want, change names and order, or add, say, a script as a scene.",intro_save:"Changes save by themselves and reach the TVs right away.",sections:{rooms:"Rooms",scenes:"Scenes",security:"Security",cameras:"Cameras",media:"Media",persons:"People",found:"Found automatically"},notes:{rooms:"Rooms are Home Assistant areas. Expand a room to hide or rename its lights, covers and humidifiers.",scenes:"Scenes and scripts started with one tap.",security:"Door, window, motion, smoke and leak sensors.",cameras:"Live view from your cameras.",media:"Speakers, TVs and players.",persons:"Who is home.",found:"Alvuna finds these by itself and shows them when they are available."},saving:"Saving\u2026",saved:"Saved",save_error:"Not saved",retry:"Retry",add:"Add",done:"Done",search:"Search by name or id",search_short:"Search",no_candidates:"There is nothing more to add.",no_results:"Nothing matches.",more_results:"And {n} more \u2014 narrow the search.",add_item:"Add: {name}",remove:"Remove from the list: {name}",badge_added:"Added",badge_hidden:"Hidden",badge_missing:"Not in Home Assistant",visible:"Show: {name}",move_up:"Move up: {name}",move_down:"Move down: {name}",rename:"Name: {name}",rename_hint:"Click to rename",auto_name:"automatic: {name}",reset_name:"Use the automatic name",empty:"Alvuna found nothing here. You can add something yourself.",empty_rooms:"No areas with devices.",area:"area {id}",devices:{zero:"no devices",one:"{n} device",other:"{n} devices"},expand:"Show devices: {name}",collapse:"Hide devices: {name}",kinds:{lights:"Light",covers:"Cover",humidifiers:"Humidifier"},no_devices:"This room has no lights, covers or humidifiers.",temperature:"Temperature",humidity:"Humidity",sensor_none:"not picked",sensor_area:"from the area's settings",sensor_auto:"picked automatically",sensor_hint:"The room's sensors are set in Home Assistant, in the area's settings.",area_settings:"Area settings",found:{weather:"Weather",climate:"Heating",vacuum:"Vacuum",appliances:"Washer and dishwasher",waste:"Waste collection",air_quality:"Air quality",weather_alert:"Weather warnings"},air:{index:"index",pm10:"PM10",pm25:"PM2.5"},battery:"battery",nothing_found:"Nothing else found.",loading:"Loading\u2026",not_set_up:"Alvuna is not set up yet.",not_set_up_hint:"Add the Alvuna integration in Settings \u2192 Devices & services, and this panel will show your home.",open_integrations:"Open the integration",load_error:"Alvuna's settings could not be loaded.",try_again:"Try again",unsaved_leave:"Changes are still being saved."}},D="en",q=w.en,P=new Intl.PluralRules("en");function U(r){let e=String(r||"en").toLowerCase().split(/[-_]/)[0],a=w[e]?e:"en";return a===D?!1:(D=a,q=w[a],P=new Intl.PluralRules(a),!0)}var R=(r,e)=>e.split(".").reduce((a,t)=>a?.[t],r);function l(r,e={}){let a=R(q,r)??R(w.en,r)??r;if(a&&typeof a=="object"){let t=Number(e.n)||0;a=t===0&&a.zero||a[P.select(t)]||a.other||""}return String(a).replace(/\{(\w+)\}/g,(t,n)=>n in e?String(e[n]):t)}var F=600,W=150,K={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},s=r=>String(r??"").replace(/[&<>"']/g,e=>K[e]),h={menu:"M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",up:"M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z",down:"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",next:"M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",plus:"M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",search:"M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",reset:"M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z",remove:"M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7",check:"M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",alert:"M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"},m=r=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${r}"/></svg>`,X={light:"mdi:lightbulb-outline",cover:"mdi:window-shutter",humidifier:"mdi:air-humidifier",scene:"mdi:palette-outline",script:"mdi:script-text-outline",binary_sensor:"mdi:shield-outline",camera:"mdi:cctv",media_player:"mdi:cast",person:"mdi:account-outline",sensor:"mdi:eye-outline",calendar:"mdi:calendar",weather:"mdi:weather-partly-cloudy",climate:"mdi:thermostat",vacuum:"mdi:robot-vacuum"},Y={weather:"mdi:weather-partly-cloudy",climate:"mdi:radiator",vacuum:"mdi:robot-vacuum",appliances:"mdi:washing-machine",waste:"mdi:trash-can-outline",air_quality:"mdi:weather-dust",weather_alert:"mdi:alert-outline"},G=["weather","climate","vacuum","appliances","waste","air_quality","weather_alert"],A=class extends HTMLElement{constructor(){super(),this._hass=null,this._narrow=!1,this._data=null,this._ov=x({}),this._state="loading",this._loadError="",this._expanded=new Set,this._picker=null,this._version=0,this._savedVersion=0,this._saving=!1,this._save="idle",this._saveError="",this._timer=null,this._built=!1,this.attachShadow({mode:"open"});for(let e of["ha-switch","ha-state-icon"])customElements.get(e)||customElements.whenDefined(e).then(()=>this._built&&this._render());this._onBeforeUnload=e=>{this._version!==this._savedVersion&&(this._flush(),e.preventDefault(),e.returnValue=l("unsaved_leave"))}}set hass(e){let a=!this._hass;this._hass=e;let t=U(e?.locale?.language||e?.language);this._syncMenu(),a?(this._render(),this._load()):t&&(this._render(),this._renderStatus())}get hass(){return this._hass}set narrow(e){this._narrow=!!e,this._syncMenu()}get narrow(){return this._narrow}set route(e){this._route=e}get route(){return this._route}set panel(e){this._panel=e}get panel(){return this._panel}connectedCallback(){window.addEventListener("beforeunload",this._onBeforeUnload),this._built||this._render(),this._hass&&this._state==="error"&&this._load()}disconnectedCallback(){window.removeEventListener("beforeunload",this._onBeforeUnload),this._version!==this._savedVersion&&this._flush()}async _load({quiet:e=!1}={}){if(this._hass){!e&&!this._data&&(this._state="loading",this._render());try{let a=await this._hass.callWS({type:"alvuna/editor/get"});this._data=a,this._version===this._savedVersion&&!this._saving&&(this._ov=x(a.overrides)),this._state="ready"}catch(a){if(e&&this._data)return;this._state=a?.code==="not_set_up"?"not_set_up":"error",this._loadError=a?.message||String(a||"")}this._render()}}_change(e,{render:a=!0,focus:t}={}){e(this._ov),this._version+=1,this._setSave("pending"),clearTimeout(this._timer),this._timer=setTimeout(()=>{this._timer=null,this._flush()},F),a&&this._render(t)}async _flush(){if(clearTimeout(this._timer),this._timer=null,this._saving||!this._hass||this._version===this._savedVersion)return;let e=this._version;this._saving=!0,this._setSave("saving");try{await this._hass.callWS({type:"alvuna/editor/save",overrides:H(this._ov)}),this._savedVersion=e}catch(a){this._saving=!1,this._saveError=a?.message||String(a||""),this._setSave("error");return}if(this._saving=!1,this._version!==this._savedVersion){this._timer||this._flush();return}this._setSave("saved"),this._load({quiet:!0})}_setSave(e){this._save=e,this._renderStatus()}_nameOf=e=>this._hass?.states?.[e]?.attributes?.friendly_name||e;_build(){this.shadowRoot.innerHTML=`<style>${J}</style>
      <header class="toolbar">
        <button class="menu ib" data-action="menu" hidden>${m(h.menu)}</button>
        <h1 class="title">Alvuna</h1>
        <div class="status" role="status" aria-live="polite"></div>
      </header>
      <main class="content"></main>`;let e=this.shadowRoot;e.addEventListener("click",a=>this._onClick(a)),e.addEventListener("input",a=>this._onInput(a)),e.addEventListener("keydown",a=>this._onKey(a)),e.addEventListener("focusout",a=>this._onFocusOut(a)),e.addEventListener("focusin",a=>{a.target.dataset?.action==="rename"&&(a.target.dataset.before=a.target.value)}),this._built=!0,this._syncMenu()}_syncMenu(){let e=this.shadowRoot.querySelector(".menu");e&&(e.hidden=!(this._narrow||this._hass?.dockedSidebar==="always_hidden"),e.setAttribute("aria-label",l("menu")))}_renderStatus(){let e=this.shadowRoot.querySelector(".status");if(!e)return;let a=this._save;e.className=`status ${a}`,a==="pending"||a==="saving"?e.innerHTML=`<span class="dot"></span>${s(l("saving"))}`:a==="saved"?e.innerHTML=`${m(h.check)}${s(l("saved"))}`:a==="error"?e.innerHTML=`<span title="${s(this._saveError)}">${m(h.alert)}${s(l("save_error"))}</span>
        <button class="retry" data-action="retry-save">${s(l("retry"))}</button>`:e.textContent=""}_render(e){this._built||this._build();let a=this.shadowRoot,t=a.activeElement,n=e||t?.dataset?.focus,i=t&&"selectionStart"in t&&t.selectionStart!=null?[t.selectionStart,t.selectionEnd]:null,o=this._content(),d=a.querySelector(".content");o!==this._lastHtml&&(d.innerHTML=o,this._lastHtml=o,this._hydrate(d)),n&&this._refocus(d,n,e?null:i)}_refocus(e,a,t){let n=o=>[...e.querySelectorAll("[data-focus]")].find(d=>d.dataset.focus===o&&!d.disabled),i=n(a);if(!i&&/^move-(up|down)\|/.test(a)&&(i=n(a.replace(/^move-(up|down)/,(o,d)=>`move-${d==="up"?"down":"up"}`))),!(!i||i===this.shadowRoot.activeElement)&&(i.focus({preventScroll:!0}),t&&typeof i.setSelectionRange=="function"))try{i.setSelectionRange(t[0],t[1])}catch{}}_hydrate(e){for(let a of e.querySelectorAll("[data-action=visible]"))a.checked=a.dataset.on==="1",a.addEventListener("change",()=>{let t=a.dataset.id;this._change(n=>V(n,t,!a.checked),{focus:`visible|${t}`})});for(let a of e.querySelectorAll("ha-state-icon[data-entity]"))a.hass=this._hass,a.stateObj=this._hass?.states?.[a.dataset.entity]}_content(){return this._state==="loading"?`<div class="state"><span class="dot"></span>${s(l("loading"))}</div>`:this._state==="not_set_up"?`<div class="state card">
        <p class="state-title">${s(l("not_set_up"))}</p>
        <p>${s(l("not_set_up_hint"))}</p>
        <a class="button" href="/config/integrations/integration/alvuna" data-nav>${s(l("open_integrations"))}</a>
      </div>`:this._state==="error"?`<div class="state card">
        <p class="state-title">${s(l("load_error"))}</p>
        ${this._loadError?`<p class="mono">${s(this._loadError)}</p>`:""}
        <button class="button" data-action="retry-load" data-focus="retry-load">${s(l("try_again"))}</button>
      </div>`:`<div class="intro">
        <p>${s(l("intro"))}</p>
        <p class="intro-save">${s(l("intro_save"))}</p>
      </div>
      ${this._roomsSection()}
      ${$.map(e=>this._listSection(e)).join("")}
      ${this._foundSection()}`}_icon(e,a){let t=String(e).split(".")[0];return this._hass?.states?.[e]&&customElements.get("ha-state-icon")?`<ha-state-icon data-entity="${s(e)}"></ha-state-icon>`:`<ha-icon icon="${s(a||X[t]||"mdi:circle-outline")}"></ha-icon>`}_switch(e,a,t){let n=s(l("visible",{name:t})),i=`data-action="visible" data-id="${s(e)}" data-focus="visible|${s(e)}" data-on="${a?1:0}" aria-label="${n}" title="${n}"`;return customElements.get("ha-switch")?`<ha-switch ${i}></ha-switch>`:`<input type="checkbox" role="switch" class="switch" ${i} ${a?"checked":""}>`}_nameField(e,a){let t=this._ov.names[e];return`<div class="name-wrap">
      <input class="name" type="text" maxlength="80" spellcheck="false" autocomplete="off" data-action="rename" data-id="${s(e)}"
        data-auto="${s(a)}" data-focus="rename|${s(e)}" value="${s(t||a)}" placeholder="${s(a)}"
        aria-label="${s(l("rename",{name:a}))}" title="${s(l("rename_hint"))}">
      <button class="ib small reset" data-action="reset" data-id="${s(e)}" data-focus="reset|${s(e)}"
        aria-label="${s(l("reset_name"))}" title="${s(l("reset_name"))}">${m(h.reset)}</button>
    </div>`}_moveButtons(e,a,t,n,i){return`<button class="ib" data-action="move-up" data-key="${e}" data-id="${s(a)}" data-focus="move-up|${s(a)}"
        aria-label="${s(l("move_up",{name:i}))}" title="${s(l("move_up",{name:i}))}" ${t===0?"disabled":""}>${m(h.up)}</button>
      <button class="ib" data-action="move-down" data-key="${e}" data-id="${s(a)}" data-focus="move-down|${s(a)}"
        aria-label="${s(l("move_down",{name:i}))}" title="${s(l("move_down",{name:i}))}" ${t===n-1?"disabled":""}>${m(h.down)}</button>`}_rowClass(e,a=""){let t=this._ov.hidden.includes(e);return`row ${a} ${t?"is-hidden":""} ${this._ov.names[e]?"renamed":""}`}_badges(e,{added:a=!1,missing:t=!1}={}){return`${a?`<span class="badge">${s(l("badge_added"))}</span>`:""}
      ${t?`<span class="badge warn">${s(l("badge_missing"))}</span>`:""}
      <span class="badge muted hidden-badge">${s(l("badge_hidden"))}</span>`}_sectionHead(e,a,t=""){return`<div class="section-head">
      <h2 id="h-${e}">${s(l(`sections.${e}`))}${a!=null?`<span class="count">${a}</span>`:""}</h2>
      ${t}
    </div>`}_roomsSection(){let e=z(this._data,this._ov),a=e.length?e.map((t,n)=>this._room(t,n,e.length)).join(""):`<div class="empty">${s(l("empty_rooms"))}</div>`;return`<section aria-labelledby="h-rooms">
      ${this._sectionHead("rooms",e.length)}
      <div class="card">${a}</div>
      <p class="note">${s(l("notes.rooms"))}</p>
    </section>`}_room(e,a,t){let n=e.id,i=n.replace(/^area:/,""),o=this._ov.names[n]||e.auto_name,d=this._expanded.has(n),c=e.items||[],v=l(d?"collapse":"expand",{name:o}),p=`<div class="${this._rowClass(n,"room")}">
      <div class="icon"><ha-icon icon="${s(e.icon||"mdi:texture-box")}"></ha-icon></div>
      <div class="main">
        ${this._nameField(n,e.auto_name)}
        <div class="sub">
          <button class="disclose ${d?"open":""}" data-action="expand" data-id="${s(n)}" data-focus="expand|${s(n)}"
            aria-expanded="${d}" aria-controls="body-${s(i)}" aria-label="${s(v)}">
            ${s(l("devices",{n:c.length}))}${m(h.down)}
          </button>
          <span class="id">${s(l("area",{id:i}))}</span>
          <span class="auto">${s(l("auto_name",{name:e.auto_name}))}</span>
          ${this._badges(n)}
        </div>
      </div>
      <div class="controls">${this._moveButtons("rooms",n,a,t,o)}${this._switch(n,!this._ov.hidden.includes(n),o)}</div>
    </div>`;if(!d)return p;let b=c.length?c.map(u=>{let f=this._ov.names[u.id]||u.auto_name;return`<div class="${this._rowClass(u.id,"device")}">
        <div class="icon">${this._icon(u.id)}</div>
        <div class="main">
          ${this._nameField(u.id,u.auto_name)}
          <div class="sub"><span class="kind">${s(l(`kinds.${u.kind}`))}</span><span class="id">${s(u.id)}</span>
            <span class="auto">${s(l("auto_name",{name:u.auto_name}))}</span>${this._badges(u.id)}</div>
        </div>
        <div class="controls">${this._switch(u.id,!this._ov.hidden.includes(u.id),f)}</div>
      </div>`}).join(""):`<div class="empty small">${s(l("no_devices"))}</div>`,g=this._hass?.areas?.[i],L=u=>{let f=e.sensors?.[u],Z=f?`<span class="sensor-name">${s(this._nameOf(f))}</span> <span class="id">${s(f)}</span>
           ${g?`<span class="origin">${s(l(g[`${u}_entity_id`]===f?"sensor_area":"sensor_auto"))}</span>`:""}`:`<span class="muted-text">${s(l("sensor_none"))}</span>`;return`<div class="sensor"><span class="sensor-label">${s(l(u))}</span><span class="sensor-value">${Z}</span></div>`};return`${p}<div class="room-body" id="body-${s(i)}" role="group" aria-label="${s(o)}">
      ${b}
      <div class="sensors">
        ${L("temperature")}${L("humidity")}
        <p class="hint">${s(l("sensor_hint"))}
          <a href="/config/areas/area/${encodeURIComponent(i)}" data-nav>${s(l("area_settings"))}${m(h.next)}</a></p>
      </div>
    </div>`}_listSection(e){let a=_(this._data,this._ov,e,this._nameOf),t=this._picker?.key===e,n=`<button class="add" data-action="open-picker" data-key="${e}" data-focus="open-picker|${e}"
      aria-expanded="${t}">${m(h.plus)}${s(l("add"))}</button>`,i=a.map((o,d)=>{let c=this._ov.names[o.id]||o.auto_name,v=o.added?`<button class="ib" data-action="remove" data-key="${e}" data-id="${s(o.id)}"
        data-focus="remove|${s(o.id)}" aria-label="${s(l("remove",{name:c}))}" title="${s(l("remove",{name:c}))}">${m(h.remove)}</button>`:"";return`<div class="${this._rowClass(o.id,o.missing?"missing":"")}">
        <div class="icon">${this._icon(o.id)}</div>
        <div class="main">
          ${this._nameField(o.id,o.auto_name)}
          <div class="sub"><span class="id">${s(o.id)}</span>
            <span class="auto">${s(l("auto_name",{name:o.auto_name}))}</span>${this._badges(o.id,o)}</div>
        </div>
        <div class="controls">${v}${this._moveButtons(e,o.id,d,a.length,c)}${this._switch(o.id,!this._ov.hidden.includes(o.id),c)}</div>
      </div>`}).join("");return`<section aria-labelledby="h-${e}">
      ${this._sectionHead(e,a.length,n)}
      <div class="card">
        ${t?this._pickerHtml(e):""}
        ${i||(t?"":`<div class="empty">${s(l("empty"))}</div>`)}
      </div>
      <p class="note">${s(l(`notes.${e}`))}</p>
    </section>`}_pickerHtml(e){let a=this._picker.query,t=k(this._data,this._ov,e,a),n=k(this._data,this._ov,e,"").length>0,i=t.slice(0,W),o=i.map(c=>`<li><button class="result" data-action="pick" data-key="${e}" data-id="${s(c.id)}"
        data-focus="pick|${s(c.id)}" aria-label="${s(l("add_item",{name:c.auto_name}))}">
        <span class="icon small">${this._icon(c.id)}</span>
        <span class="result-text"><span class="result-name">${s(c.auto_name)}</span><span class="id">${s(c.id)}</span></span>
        <span class="plus">${m(h.plus)}</span>
      </button></li>`).join(""),d=n?t.length?"":l("no_results"):l("no_candidates");return`<div class="picker">
      <div class="picker-bar">
        <label class="search">${m(h.search)}
          <input type="search" data-action="search" data-key="${e}" data-focus="search|${e}" value="${s(a)}"
            placeholder="${s(l("search_short"))}" aria-label="${s(l("search"))}" title="${s(l("search"))}" autocomplete="off" spellcheck="false">
        </label>
        <button class="text-button" data-action="close-picker" data-key="${e}" data-focus="close-picker|${e}">${s(l("done"))}</button>
      </div>
      ${d?`<p class="picker-empty">${s(d)}</p>`:`<ul class="results">${o}</ul>`}
      ${t.length>i.length?`<p class="picker-empty">${s(l("more_results",{n:t.length-i.length}))}</p>`:""}
    </div>`}_foundSection(){let e=this._data?.found||{},a=n=>`<span class="found-item"><span>${s(this._nameOf(n))}</span> <span class="id">${s(n)}</span></span>`,t=G.filter(n=>e[n]!=null&&!(Array.isArray(e[n])&&!e[n].length)).map(n=>{let i=e[n],o;return n==="appliances"?o=i.map(d=>`<span class="found-item">${s(d.name)}${d.state?` <span class="id">${s(d.state)}</span>`:""}</span>`).join(""):n==="air_quality"?o=Object.entries(i).map(([d,c])=>`<span class="found-item"><span class="found-part">${s(l(`air.${d}`))}</span> ${s(this._nameOf(c))} <span class="id">${s(c)}</span></span>`).join(""):n==="vacuum"?o=`${a(i.entity)}${i.battery?`<span class="found-item"><span class="found-part">${s(l("battery"))}</span> <span class="id">${s(i.battery)}</span></span>`:""}`:Array.isArray(i)?o=i.map(d=>typeof d=="string"?a(d):s(JSON.stringify(d))).join(""):typeof i=="string"?o=a(i):i&&typeof i=="object"&&i.entity?o=a(i.entity):o=`<span class="id">${s(JSON.stringify(i))}</span>`,`<div class="row found">
        <div class="icon"><ha-icon icon="${Y[n]}"></ha-icon></div>
        <div class="main"><div class="found-label">${s(l(`found.${n}`))}</div><div class="found-values">${o}</div></div>
      </div>`}).join("");return`<section aria-labelledby="h-found">
      ${this._sectionHead("found",null)}
      <div class="card">${t||`<div class="empty">${s(l("nothing_found"))}</div>`}</div>
      <p class="note">${s(l("notes.found"))}</p>
    </section>`}_onClick(e){let a=e.target.closest("a[data-nav]");if(a){if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault(),history.pushState(null,"",a.getAttribute("href")),window.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1}}));return}let t=e.target.closest("[data-action]");if(!t||t.disabled)return;let{action:n,id:i,key:o}=t.dataset;switch(n){case"menu":this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}));break;case"move-up":case"move-down":{let d=o==="rooms"?z(this._data,this._ov).map(c=>c.id):_(this._data,this._ov,o).map(c=>c.id);this._change(c=>O(c,o,d,i,n==="move-up"?-1:1),{focus:`${n}|${i}`});break}case"expand":this._expanded.has(i)?this._expanded.delete(i):this._expanded.add(i),this._render(`expand|${i}`);break;case"reset":{this._change(d=>S(d,i,""),{focus:`rename|${i}`});break}case"open-picker":this._picker=this._picker?.key===o?null:{key:o,query:""},this._render(this._picker?`search|${o}`:`open-picker|${o}`);break;case"close-picker":this._picker=null,this._render(`open-picker|${o}`);break;case"pick":this._change(d=>T(d,o,i),{focus:`search|${o}`});break;case"remove":{let d=N(this._data,this._ov,o).has(i);this._change(c=>I(c,o,i,d),{focus:`open-picker|${o}`});break}case"retry-load":this._load();break;case"retry-save":this._flush();break;default:}}_onInput(e){let a=e.target;if(a.dataset?.action==="rename"){let{id:t,auto:n}=a.dataset;this._change(i=>S(i,t,a.value,n),{render:!1}),a.closest(".row")?.classList.toggle("renamed",!!this._ov.names[t])}else a.dataset?.action==="search"&&this._picker&&(this._picker.query=a.value,this._render())}_onKey(e){let a=e.target;if(e.key==="Escape"&&this._picker&&a.closest?.(".picker")){e.preventDefault();let t=this._picker.key;this._picker=null,this._render(`open-picker|${t}`)}else e.key==="Enter"&&a.dataset?.action==="rename"?a.blur():e.key==="Escape"&&a.dataset?.action==="rename"&&(a.dataset.before!=null&&(a.value=a.dataset.before,a.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))),a.blur())}_onFocusOut(e){let a=e.target;a.dataset?.action==="rename"&&!a.value.trim()&&(a.value=a.dataset.auto)}},J=`
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
  .content { padding: 20px 12px calc(56px + var(--safe-area-inset-bottom, 0px)); }
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
`;customElements.get("alvuna-panel")||customElements.define("alvuna-panel",A);
