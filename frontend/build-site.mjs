// Builds the website's live demo (site/app/): the real TV app with src/tv/demo/ha.js in place of ha.js, so a made-up
// home answers instead of Home Assistant. Paths the app takes from Home Assistant point at the site's own files:
//   /alvuna/static/fonts/ → /fonts/   /static/mdi/ → /app/mdi/ (MDI icon chunks)   camera stills → /img/cam/<id>.jpg
//   /local/alvuna/wallpapers/ → /img/wallpapers/ (the demo's own generated photo for the Mgła slot)
import { build } from "esbuild";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const OUT = new URL("../site/app/", import.meta.url).pathname;
const demoHa = new URL("src/tv/demo/ha.js", import.meta.url).pathname;
rmSync(`${OUT}main.js`, { force: true });
rmSync(`${OUT}styles.css`, { force: true });
mkdirSync(OUT, { recursive: true });

const swapHa = { name: "demo-ha", setup(b) { b.onResolve({ filter: /^\.\/ha\.js$/ }, (args) => (args.importer.endsWith("/tv/main.js") ? { path: demoHa } : undefined)); } };
await build({ entryPoints: ["src/tv/main.js", "src/tv/styles.css"], outdir: OUT, bundle: true, minify: true, format: "iife", target: "chrome108",
  external: ["/local/*", "/alvuna/*", "/static/*"], define: { HLS_FILE: JSON.stringify("hls.js") }, plugins: [swapHa], logLevel: "warning" });

const js = readFileSync(`${OUT}main.js`, "utf8");
const tokens = js.split("?token=").length - 1;
// The app's two still URLs (tile and full screen) and the demo cameras' own entity_picture.
if (tokens !== 3) throw new Error(`expected 3 camera URLs in the bundle, found ${tokens}`);
writeFileSync(`${OUT}main.js`, js.replaceAll("/static/mdi/", "/app/mdi/").replaceAll("/local/alvuna/wallpapers", "/img/wallpapers").replaceAll("/api/camera_proxy/", "/img/cam/").replaceAll("?token=", ".jpg?token=")
  // The demo's cameras are still photos: without the refresh stamp (&t=…) their URLs never change, so the tiles and the
  // full-screen view do not reload (and blink) every few seconds as a live camera's would.
  .replace(/&t=\$\{[^{}]*\}/g, ""));
writeFileSync(`${OUT}styles.css`, readFileSync(`${OUT}styles.css`, "utf8").replaceAll("/alvuna/static/fonts/", "/fonts/")
  + readFileSync("src/tv/demo/demo.css", "utf8"));
// A content hash on each file, so a browser never keeps last build's copy.
const v = (f) => createHash("sha1").update(readFileSync(`${OUT}${f}`)).digest("hex").slice(0, 8);
writeFileSync(`${OUT}index.html`, readFileSync("src/tv/index.html", "utf8").replace("__JS__", `main.js?v=${v("main.js")}`).replace("__CSS__", `styles.css?v=${v("styles.css")}`)
  .replace('<html lang="en">', '<html lang="pl">').replace("<title>Alvuna</title>", '<title>Alvuna demo</title>\n<meta name="robots" content="noindex">'));
console.log("site/app built");
