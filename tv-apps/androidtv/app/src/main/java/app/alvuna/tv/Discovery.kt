package app.alvuna.tv

import android.content.Context
import android.net.wifi.WifiManager
import java.io.ByteArrayOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.MulticastSocket
import java.net.NetworkInterface
import java.net.Socket
import java.net.SocketTimeoutException
import java.net.URL
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import org.json.JSONObject

/**
 * Finds Home Assistant on the local network, the same way as the LG app's service (tv-apps/webos/service/discovery.js):
 *  1. mDNS: a PTR query for _home-assistant._tcp.local (Home Assistant's zeroconf announces itself there);
 *  2. homeassistant.local (an mDNS A query, then the system resolver);
 *  3. a TCP scan of port 8123 on the TV's own /24, each open port then checked over HTTP.
 * Every candidate is checked over HTTP: /manifest.json must be Home Assistant's, and /alvuna/tv/ tells whether the
 * Alvuna integration is installed. Nothing leaves the local network and nothing is stored here.
 */
class Discovery(private val context: Context) {

    data class Server(val name: String, val uuid: String, val version: String, val url: String, val alvuna: Boolean)
    data class Probe(val url: String, val ha: Boolean, val alvuna: Boolean)
    data class Result(val method: String, val servers: List<Server>)

    private class Record(val name: String, val type: Int, val data: Any)
    private class Candidate(val name: String, val uuid: String, val version: String, val urls: List<String>)

    private val pool = Executors.newCachedThreadPool()
    private val generation = AtomicInteger()

    /** Stops a search that is running: its callbacks are not called any more. */
    fun cancel() { generation.incrementAndGet() }

    fun discover(onStage: (String) -> Unit, onDone: (Result) -> Unit, onError: (String) -> Unit) {
        val gen = generation.incrementAndGet()
        val live = { generation.get() == gen }
        pool.execute {
            try {
                val r = search { if (live()) onStage(it) }
                if (live()) onDone(r)
            } catch (e: Exception) {
                if (live()) onError(e.message ?: e.toString())
            }
        }
    }

    fun probeAsync(url: String, onDone: (Probe) -> Unit) {
        pool.execute { onDone(probe(url, 4000)) }
    }

    private fun search(note: (String) -> Unit): Result {
        note("mdns")
        val records = mdnsAsk(listOf(SERVICE to T_PTR, HA_HOST to T_A), 1600)
        val announced = check(mdnsServers(records))
        if (announced.isNotEmpty()) return Result("mdns", announced)

        note("local")
        val ip = records.firstOrNull { it.type == T_A && it.name == HA_HOST }?.data as String? ?: lookup(HA_HOST, 2500)
        val urls = listOfNotNull(ip?.let { "http://$it:$HA_PORT" }) + "http://$HA_HOST:$HA_PORT"
        val local = check(listOf(Candidate(HA_HOST, "", "", urls)))
        if (local.isNotEmpty()) return Result("local", local)

        note("scan")
        val scanned = check(scan(600).map { Candidate(it, "", "", listOf("http://$it:$HA_PORT")) })
        return Result(if (scanned.isEmpty()) "" else "scan", scanned)
    }

    private fun check(cands: List<Candidate>): List<Server> {
        val futures = cands.map { c -> pool.submit(Callable { firstHa(c.urls)?.let { Server(c.name, c.uuid, c.version, it.url, it.alvuna) } }) }
        val seen = HashSet<String>()
        return futures.mapNotNull { runCatching { it.get(10, TimeUnit.SECONDS) }.getOrNull() }
            .filter { seen.add(it.uuid.ifEmpty { it.url }) }
    }

    /** The first of urls that is Home Assistant, preferring one where Alvuna answers. */
    private fun firstHa(urls: List<String>): Probe? {
        val rs = urls.map { u -> pool.submit(Callable { probe(u, 3000) }) }.mapNotNull { runCatching { it.get(8, TimeUnit.SECONDS) }.getOrNull() }
        val ha = rs.filter { it.ha }
        return ha.firstOrNull { it.alvuna } ?: ha.firstOrNull()
    }

    // --- HTTP checks -----------------------------------------------------------------------------
    /** { url, ha, alvuna } for one base URL; ha is false when nothing answers or it is not Home Assistant. */
    fun probe(input: String, ms: Int): Probe {
        val base = normalize(input)
        if (base.isEmpty()) return Probe("", false, false)
        val manifest = get("$base/manifest.json", ms)
        val ha = manifest?.first == 200 && runCatching {
            JSONObject(manifest.second).optString("name").contains("home assistant", ignoreCase = true)
        }.getOrDefault(false)
        if (!ha) return Probe(base, false, false)
        val tv = get("$base/alvuna/tv/", ms)
        return Probe(base, true, tv?.first == 200)
    }

    private fun get(url: String, ms: Int): Pair<Int, String>? = try {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = ms
        c.readTimeout = ms
        c.instanceFollowRedirects = false
        c.setRequestProperty("Accept", "*/*")
        try {
            val code = c.responseCode
            val stream = if (code in 200..299) c.inputStream else c.errorStream
            val body = stream?.use { s ->
                val out = ByteArrayOutputStream()
                val buf = ByteArray(8192)
                while (out.size() < 65536) { val n = s.read(buf); if (n < 0) break; out.write(buf, 0, n) }
                out.toString("UTF-8")
            } ?: ""
            code to body
        } finally { c.disconnect() }
    } catch (e: Exception) { null }

    // --- mDNS ------------------------------------------------------------------------------------
    /**
     * Asks once (and again after 400 ms, multicast is lossy) and collects every record heard for ms. Answers come back
     * to our own port (the unicast bit, and "legacy unicast" for a query not sent from 5353); a second socket on 5353
     * also hears multicast answers when the system lets the app share that port. Android drops multicast unless the
     * app holds a multicast lock.
     */
    private fun mdnsAsk(questions: List<Pair<String, Int>>, ms: Long): List<Record> {
        val records = java.util.Collections.synchronizedList(ArrayList<Record>())
        val packet = query(questions)
        val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager?
        val lock = wifi?.createMulticastLock("alvuna-mdns")?.apply { setReferenceCounted(false); runCatching { acquire() } }
        val group = InetAddress.getByName(MDNS_ADDR)
        val deadline = System.currentTimeMillis() + ms
        val sockets = ArrayList<DatagramSocket>()
        try {
            runCatching { DatagramSocket(0) }.getOrNull()?.let { s ->
                sockets += s
                val dp = DatagramPacket(packet, packet.size, group, MDNS_PORT)
                runCatching { s.send(dp) }
                pool.execute { Thread.sleep(400); runCatching { s.send(dp) } }
            }
            runCatching {
                MulticastSocket(null as java.net.SocketAddress?).apply {
                    reuseAddress = true
                    bind(InetSocketAddress(MDNS_PORT))
                    @Suppress("DEPRECATION") joinGroup(group)
                }
            }.getOrNull()?.let { sockets += it }
            val readers = sockets.map { s ->
                pool.submit {
                    val buf = ByteArray(9000)
                    while (System.currentTimeMillis() < deadline) {
                        s.soTimeout = (deadline - System.currentTimeMillis()).coerceAtLeast(1).toInt()
                        val dp = DatagramPacket(buf, buf.size)
                        try { s.receive(dp) } catch (e: SocketTimeoutException) { break } catch (e: Exception) { break }
                        runCatching { records.addAll(parse(dp.data.copyOf(dp.length))) }
                    }
                }
            }
            readers.forEach { runCatching { it.get(ms + 1000, TimeUnit.MILLISECONDS) } }
        } finally {
            sockets.forEach { runCatching { it.close() } }
            runCatching { lock?.release() }
        }
        return ArrayList(records)
    }

    private fun query(questions: List<Pair<String, Int>>): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(byteArrayOf(0, 0, 0, 0, 0, questions.size.toByte(), 0, 0, 0, 0, 0, 0))
        for ((name, type) in questions) {
            for (label in name.split('.').filter { it.isNotEmpty() }) {
                val b = label.toByteArray(Charsets.UTF_8)
                out.write(b.size); out.write(b)
            }
            out.write(0)
            out.write(type shr 8); out.write(type and 0xff)
            out.write(0x80); out.write(0x01) // class IN with the "unicast response" bit: answer us directly
        }
        return out.toByteArray()
    }

    private fun u16(b: ByteArray, at: Int) = ((b[at].toInt() and 0xff) shl 8) or (b[at + 1].toInt() and 0xff)

    /** A name at off and the offset just after it (compression pointers followed). */
    private fun readName(b: ByteArray, start: Int): Pair<String, Int> {
        val labels = ArrayList<String>()
        var off = start
        var end = -1
        var guard = 0
        while (guard++ < 128) {
            val len = b[off].toInt() and 0xff
            if (len == 0) { if (end < 0) end = off + 1; break }
            if (len and 0xc0 == 0xc0) {
                if (end < 0) end = off + 2
                off = ((len and 0x3f) shl 8) or (b[off + 1].toInt() and 0xff)
                continue
            }
            labels += String(b, off + 1, len, Charsets.UTF_8)
            off += 1 + len
        }
        return labels.joinToString(".") to end
    }

    /** Every record of a response (answers and additionals alike). */
    private fun parse(b: ByteArray): List<Record> {
        val out = ArrayList<Record>()
        val qd = u16(b, 4)
        val rr = u16(b, 6) + u16(b, 8) + u16(b, 10)
        var off = 12
        repeat(qd) { off = readName(b, off).second + 4 }
        repeat(rr) {
            val (name, end) = readName(b, off)
            off = end
            val type = u16(b, off)
            val len = u16(b, off + 8)
            val at = off + 10
            off = at + len
            val data: Any? = when (type) {
                T_A -> if (len == 4) (0 until 4).joinToString(".") { (b[at + it].toInt() and 0xff).toString() } else null
                T_PTR -> readName(b, at).first
                T_SRV -> u16(b, at + 4) to readName(b, at + 6).first
                T_TXT -> {
                    val m = HashMap<String, String>()
                    var p = at
                    while (p < at + len) {
                        val l = b[p].toInt() and 0xff
                        val s = String(b, p + 1, l, Charsets.UTF_8)
                        val eq = s.indexOf('=')
                        if (eq > 0) m[s.substring(0, eq).lowercase()] = s.substring(eq + 1)
                        p += 1 + l
                    }
                    m
                }
                else -> null
            }
            if (data != null) out += Record(name.lowercase(), type, data)
        }
        return out
    }

    /** Home Assistant instances announced over mDNS, with URLs from the A record and SRV port (an IP works anywhere). */
    @Suppress("UNCHECKED_CAST")
    private fun mdnsServers(records: List<Record>): List<Candidate> {
        fun of(name: String, type: Int) = records.filter { it.name == name && it.type == type }
        val instances = records.filter { it.type == T_PTR && it.name == SERVICE }.map { (it.data as String).lowercase() }.toSet()
        return instances.mapNotNull { inst ->
            val srv = of(inst, T_SRV).firstOrNull()?.data as Pair<Int, String>?
            val txt = (of(inst, T_TXT).firstOrNull()?.data as Map<String, String>?) ?: emptyMap()
            val urls = ArrayList<String>()
            if (srv != null) of(srv.second.lowercase(), T_A).forEach { urls += "http://${it.data}:${srv.first}" }
            listOfNotNull(txt["internal_url"], txt["base_url"]).filter { it.matches(Regex("^https?://.*")) }
                .forEach { urls += it.trimEnd('/') }
            if (urls.isEmpty()) null
            else Candidate(txt["location_name"] ?: inst.removeSuffix(".$SERVICE"), txt["uuid"] ?: "", txt["version"] ?: "", urls)
        }
    }

    // --- homeassistant.local and the subnet scan --------------------------------------------------
    private fun lookup(host: String, ms: Long): String? = runCatching {
        pool.submit(Callable { InetAddress.getAllByName(host).firstOrNull { it is Inet4Address }?.hostAddress }).get(ms, TimeUnit.MILLISECONDS)
    }.getOrNull()

    /** The /24 around each of the TV's own IPv4 addresses (a bigger subnet would take minutes), 64 at a time. */
    private fun scan(ms: Int): List<String> {
        val own = runCatching { NetworkInterface.getNetworkInterfaces().toList() }.getOrDefault(emptyList())
            .filter { runCatching { it.isUp && !it.isLoopback }.getOrDefault(false) }
            .flatMap { it.inetAddresses.toList() }
            .filterIsInstance<Inet4Address>()
            .map { it.hostAddress ?: "" }
            .filter { it.isNotEmpty() && !it.startsWith("169.254.") }
        val hosts = own.flatMap { a -> val p = a.substringBeforeLast('.'); (1..254).map { "$p.$it" }.filter { it != a } }.distinct()
        val workers = Executors.newFixedThreadPool(64)
        try {
            val found = hosts.map { h ->
                workers.submit(Callable {
                    runCatching { Socket().use { s -> s.connect(InetSocketAddress(h, HA_PORT), ms); h } }.getOrNull()
                })
            }.mapNotNull { runCatching { it.get(30, TimeUnit.SECONDS) }.getOrNull() }
            return found.sortedBy { ip -> ip.split('.').fold(0L) { n, x -> n * 256 + x.toLong() } }
        } finally { workers.shutdownNow() }
    }

    companion object {
        private const val MDNS_ADDR = "224.0.0.251"
        private const val MDNS_PORT = 5353
        private const val SERVICE = "_home-assistant._tcp.local"
        private const val HA_HOST = "homeassistant.local"
        private const val HA_PORT = 8123
        private const val T_A = 1
        private const val T_PTR = 12
        private const val T_TXT = 16
        private const val T_SRV = 33

        /** "192.168.1.5" becomes that host over http on port 8123; a scheme or port the user gave is kept. */
        fun normalize(input: String): String {
            var s = input.trim().trimEnd('/')
            if (s.isEmpty()) return ""
            if (!s.matches(Regex("^https?://.*", RegexOption.IGNORE_CASE))) s = "http://$s"
            val m = Regex("^(https?)://([^/:?#\\s]+)(:\\d+)?(/.*)?$", RegexOption.IGNORE_CASE).find(s) ?: return ""
            val scheme = m.groupValues[1].lowercase()
            val port = m.groupValues[3].ifEmpty { if (scheme == "http") ":$HA_PORT" else "" }
            return "$scheme://${m.groupValues[2].lowercase()}$port${m.groupValues[4]}"
        }
    }
}
