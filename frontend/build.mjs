// Builds Alvuna's frontend into the integration's www folder, which Home Assistant serves:
//   www/static/  at /alvuna/static/  the tablet card and the sidebar panel (alvuna-card.js, alvuna-panel.js, loaded with
//                                    ?v=<content hash>) and the fonts
//   www/tv/      at /alvuna/tv/      the TV app: index.html (never cached) and content-hashed main-*.js / styles-*.css
// Everything under both paths is served with a long cache, so a file's content may only change with its name or ?v=.
import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const WWW = new URL("../custom_components/alvuna/www/", import.meta.url).pathname;
const external = ["/local/*", "/alvuna/*", "/static/*"];

rmSync(WWW, { recursive: true, force: true });
mkdirSync(`${WWW}static/fonts`, { recursive: true });
mkdirSync(`${WWW}tv`, { recursive: true });
cpSync("static/fonts", `${WWW}static/fonts`, { recursive: true });

// The Alvuna panel in the sidebar (administrators only), registered by frontend.py through panel_custom.
await build({ entryPoints: ["src/panel/alvuna-panel.js"], outfile: `${WWW}static/alvuna-panel.js`, bundle: true, minify: true,
  format: "esm", target: "es2022", external, logLevel: "warning" });

// hls.js (plays HA's fMP4 HLS through MSE; the TV's own player cannot) is loaded only when a camera opens.
const hlsVer = require("hls.js/package.json").version;
cpSync(require.resolve("hls.js/dist/hls.light.min.js"), `${WWW}tv/hls-${hlsVer}.js`);
await build({ entryPoints: ["src/tv/main.js", "src/tv/styles.css"], outdir: `${WWW}tv`, entryNames: "[name]-[hash]", bundle: true,
  minify: true, format: "iife", target: "chrome108", external, define: { HLS_FILE: JSON.stringify(`hls-${hlsVer}.js`) },
  logLevel: "warning" });
const files = readdirSync(`${WWW}tv`);
const js = files.find((f) => /^main-.*\.js$/.test(f)), css = files.find((f) => /^styles-.*\.css$/.test(f));
writeFileSync(`${WWW}tv/index.html`, readFileSync("src/tv/index.html", "utf8").replace("__JS__", js).replace("__CSS__", css));

// Compressed copies next to each text file: Home Assistant's file server (aiohttp) sends the .br or .gz one to a browser
// that accepts it, so the TV downloads about a quarter of the bytes.
for (const dir of ["static", "tv"]) {
  for (const f of readdirSync(`${WWW}${dir}`, { recursive: true })) {
    if (!/\.(js|css|html)$/.test(f)) continue;
    const path = `${WWW}${dir}/${f}`, data = readFileSync(path);
    writeFileSync(`${path}.gz`, gzipSync(data, { level: 9 }));
    writeFileSync(`${path}.br`, brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
  }
}
for (const dir of ["static", "tv"]) for (const f of readdirSync(`${WWW}${dir}`, { recursive: true })) console.log(`${dir}/${f}`);
