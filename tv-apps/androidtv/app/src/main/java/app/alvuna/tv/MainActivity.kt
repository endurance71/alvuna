package app.alvuna.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.roundToInt

/**
 * Alvuna for Android TV / Google TV: one full-screen WebView.
 *
 * It opens the LG app's shell (tv-apps/webos/app, copied into assets/shell at build time), which finds Home Assistant
 * on the local network and then opens http://<home-assistant>/alvuna/tv/, the TV app the Alvuna integration serves.
 * The parts that are webOS-specific there are done here:
 *  - the search (webOS: the app's JS service over luna://) is [Discovery], reached through window.AlvunaNative;
 *  - Back on the remote reaches the page as webOS's Back key (keyCode 461); a page that does not take it goes back
 *    in history, and from the first page the app closes;
 *  - "leave the app" (AlvunaNative.exit) closes the activity;
 *  - the on-screen keyboard opens when OK is pressed on a text field, and its state reaches the page as webOS's
 *    keyboardStateChange event.
 * Both pages are drawn for 1920×1080, so the WebView is scaled to show 1920 CSS pixels across whatever the screen is.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var discovery: Discovery
    private val main = Handler(Looper.getMainLooper())
    @Volatile private var pageUrl = ""
    private var imeVisible = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        discovery = Discovery(this)

        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#0B2633"))
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        setContentView(web)
        hideSystemBars()

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false // cameras start muted, without a click
            useWideViewPort = false
            loadWithOverviewMode = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            allowFileAccess = false
            allowContentAccess = false
            // The pages are laid out for a TV seen from the sofa, tile by tile; the system's larger-text setting (the
            // Chromecast here had 130 %) would overflow the tiles, so text stays at the size the layout was drawn for.
            textZoom = 100
            userAgentString = "$userAgentString AlvunaAndroidTV/${BuildConfig.VERSION_NAME}"
        }
        // 1920 CSS pixels across the screen: initial scale is in physical pixels per CSS pixel, as a percentage.
        web.setInitialScale((resources.displayMetrics.widthPixels * 100f / PAGE_WIDTH).roundToInt().coerceAtLeast(1))
        web.addJavascriptInterface(Bridge(), "AlvunaNative")
        web.webViewClient = Client()
        web.webChromeClient = object : WebChromeClient() {
            // Until a camera's first frame arrives, Android's WebView draws its own poster over a <video>: a grey
            // screen with a huge play icon. Nothing instead, so the camera's still picture underneath shows (webOS
            // and browsers show nothing either).
            override fun getDefaultVideoPoster(): Bitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        }

        window.decorView.setOnApplyWindowInsetsListener { v, insets ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) keyboardShown(insets.isVisible(WindowInsets.Type.ime()))
            v.onApplyWindowInsets(insets)
        }

        web.requestFocus()
        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) web.loadUrl(SHELL)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onResume() { super.onResume(); web.onResume() }
    override fun onPause() { web.onPause(); super.onPause() }
    override fun onStop() { discovery.cancel(); super.onStop() }
    override fun onDestroy() { discovery.cancel(); web.destroy(); super.onDestroy() }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }

    // --- keys ------------------------------------------------------------------------------------
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK || event.keyCode == KeyEvent.KEYCODE_ESCAPE) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) back()
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    /** Back as webOS's Back key (461). If the page does not take it (no preventDefault), go back or close the app. */
    private fun back() {
        web.evaluateJavascript(BACK_JS) { taken ->
            if (taken == "true") return@evaluateJavascript
            if (web.canGoBack()) web.goBack() else finish()
        }
    }

    // --- the on-screen keyboard -------------------------------------------------------------------
    private fun keyboardShown(visible: Boolean) {
        if (visible == imeVisible) return
        imeVisible = visible
        web.evaluateJavascript(
            "window.__alvunaKb=$visible;" + (if (!visible) "window.__alvunaKbClosed=Date.now();" else "") +
                "document.dispatchEvent(new CustomEvent('keyboardStateChange',{detail:{visibility:$visible}}));",
            null,
        )
    }

    private fun showKeyboard() {
        web.requestFocus()
        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(web, 0)
    }

    // --- pages -----------------------------------------------------------------------------------
    private inner class Client : WebViewClient() {
        /** The shell is served from the app's assets at a fixed https origin, so its localStorage keeps the server. */
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            val url = request.url
            if (url.host != ASSET_HOST) return null
            val path = url.path?.trimStart('/') ?: ""
            if (path.isEmpty() || path.contains("..")) return notFound()
            return try {
                WebResourceResponse(mime(path), if (mime(path).startsWith("text/") || path.endsWith(".js")) "utf-8" else null, assets.open(path))
            } catch (e: Exception) { notFound() }
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val scheme = request.url.scheme ?: ""
            return scheme != "http" && scheme != "https" // the pages only ever go to http(s); nothing else opens
        }

        override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) { pageUrl = url }
        override fun onPageCommitVisible(view: WebView, url: String) { view.evaluateJavascript(PAGE_JS, null) }
        override fun onPageFinished(view: WebView, url: String) {
            pageUrl = url
            view.evaluateJavascript(PAGE_JS, null)
            if (imeVisible) view.evaluateJavascript("window.__alvunaKb=true;", null)
        }

        private fun notFound() = WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), "".byteInputStream())
        private fun mime(path: String) = when (path.substringAfterLast('.').lowercase()) {
            "html" -> "text/html"
            "js" -> "application/javascript"
            "css" -> "text/css"
            "png" -> "image/png"
            "svg" -> "image/svg+xml"
            "json" -> "application/json"
            else -> "application/octet-stream"
        }
    }

    // --- window.AlvunaNative ----------------------------------------------------------------------
    /** What the pages can ask of the app. The search runs only for the app's own shell, not for a page from a server. */
    private inner class Bridge {
        private fun shell() = pageUrl.startsWith("https://$ASSET_HOST/")

        /** Like a webOS service call: method "discover" or "probe", params as JSON; answers go to window.alvunaNative(id, json). */
        @JavascriptInterface
        fun call(method: String, params: String, id: String) {
            if (!shell()) return reply(id, JSONObject().put("returnValue", false).put("errorText", "not allowed"))
            when (method) {
                "discover" -> discovery.discover(
                    onStage = { reply(id, JSONObject().put("returnValue", true).put("stage", it)) },
                    onDone = { r ->
                        val list = JSONArray()
                        r.servers.forEach { s ->
                            list.put(JSONObject().put("name", s.name).put("uuid", s.uuid).put("version", s.version).put("url", s.url).put("alvuna", s.alvuna))
                        }
                        reply(id, JSONObject().put("returnValue", true).put("done", true).put("method", r.method).put("servers", list))
                    },
                    onError = { reply(id, JSONObject().put("returnValue", false).put("errorText", it)) },
                )
                "probe" -> {
                    val url = runCatching { JSONObject(params).optString("url") }.getOrDefault("")
                    discovery.probeAsync(url) { p ->
                        reply(id, JSONObject().put("returnValue", true).put("url", p.url).put("ha", p.ha).put("alvuna", p.alvuna))
                    }
                }
                else -> reply(id, JSONObject().put("returnValue", false).put("errorText", "unknown method"))
            }
        }

        @JavascriptInterface fun cancel() = discovery.cancel()
        @JavascriptInterface fun exit() { main.post { finish() } }
        @JavascriptInterface fun showKeyboard() { main.post { this@MainActivity.showKeyboard() } }
        @JavascriptInterface fun platform() = "androidtv"

        private fun reply(id: String, json: JSONObject) {
            val js = "window.alvunaNative&&window.alvunaNative(${JSONObject.quote(id)},${JSONObject.quote(json.toString())})"
            main.post { if (!isDestroyed) web.evaluateJavascript(js, null) }
        }
    }

    companion object {
        private const val PAGE_WIDTH = 1920f
        private const val ASSET_HOST = "appassets.androidplatform.net"
        private const val SHELL = "https://$ASSET_HOST/shell/index.html"

        /** Dispatches webOS's Back key to the focused element; true when the page called preventDefault (took it). */
        private val BACK_JS = """
            (function(){
              var e = new KeyboardEvent('keydown', {key: 'GoBack', code: 'GoBack', bubbles: true, cancelable: true});
              Object.defineProperty(e, 'keyCode', {get: function(){ return 461; }});
              Object.defineProperty(e, 'which', {get: function(){ return 461; }});
              var t = document.activeElement || document.body || document;
              return !t.dispatchEvent(e);
            })()
        """.trimIndent()

        /**
         * Added to every page: OK on a text field opens the on-screen keyboard instead of reaching the page (on webOS the
         * TV's keyboard opens the same way); with the keyboard open, its Enter goes through to the page.
         */
        private val PAGE_JS = """
            (function(){
              if (window.__alvunaGuard) return; window.__alvunaGuard = 1;
              function field(){ var t = document.activeElement; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'); }
              function open(){ return window.__alvunaKb || (window.__alvunaKbClosed && Date.now() - window.__alvunaKbClosed < 800); }
              window.addEventListener('keydown', function(e){
                if (e.keyCode !== 13 || !field() || open()) return;
                e.preventDefault(); e.stopImmediatePropagation();
                if (window.AlvunaNative) window.AlvunaNative.showKeyboard();
              }, true);
              window.addEventListener('keyup', function(e){
                if (e.keyCode === 13 && field() && !open()) { e.preventDefault(); e.stopImmediatePropagation(); }
              }, true);
            })();
        """.trimIndent()
    }
}
