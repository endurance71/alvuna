// Draws every icon and image the app and its LG Content Store listing need, from art/icon.svg (AppKit loads the SVG,
// no extra tools). Run from tv-apps/webos: swift tools/make_icons.swift
//   app/icon.png          80×80     launcher bar and app list (transparent glyph; the launcher fills the tile with
//   app/largeIcon.png     130×130   appinfo iconColor, like LG's own apps)
//   app/splash.png        1920×1080 shown while the app starts (appinfo splashBackground; must not be black)
//   store/icon-400.png    400×400   Seller Lounge store icon (opaque tile: the store does not draw one)
//   store/icon-130.png    130×130   the same tile, small, for listings that ask for it
import AppKit

guard let art = NSImage(contentsOf: URL(fileURLWithPath: "art/icon.svg")) else { print("cannot load art/icon.svg"); exit(1) }
let tile = NSColor(srgbRed: 0x1A / 255.0, green: 0x66 / 255.0, blue: 0x76 / 255.0, alpha: 1)

func png(_ w: Int, _ h: Int, to out: String, draw: (NSRect) -> Void) {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    draw(NSRect(x: 0, y: 0, width: w, height: h))
    NSGraphicsContext.restoreGraphicsState()
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
    print("\(out) \(w)x\(h)")
}

// The glyph alone, filling the square (the SVG keeps its own margin).
func glyph(_ size: Int, to out: String) {
    png(size, size, to: out) { r in art.draw(in: r) }
}

// The glyph on the teal tile, rounded like the launcher's tiles, with a little extra margin.
func tiled(_ size: Int, to out: String) {
    png(size, size, to: out) { r in
        tile.setFill()
        NSBezierPath(roundedRect: r, xRadius: r.width * 0.22, yRadius: r.width * 0.22).fill()
        art.draw(in: r.insetBy(dx: r.width * 0.08, dy: r.width * 0.08))
    }
}

glyph(80, to: "app/icon.png")
glyph(130, to: "app/largeIcon.png")
tiled(400, to: "store/icon-400.png")
tiled(130, to: "store/icon-130.png")

// Splash: the app's background gradient with the tiled icon and the name in the middle.
png(1920, 1080, to: "app/splash.png") { r in
    let g = NSGradient(colors: [NSColor(srgbRed: 0x16 / 255.0, green: 0x55 / 255.0, blue: 0x66 / 255.0, alpha: 1),
                                NSColor(srgbRed: 0x0B / 255.0, green: 0x26 / 255.0, blue: 0x33 / 255.0, alpha: 1),
                                NSColor(srgbRed: 0x08 / 255.0, green: 0x1A / 255.0, blue: 0x24 / 255.0, alpha: 1)],
                         atLocations: [0, 0.7, 1], colorSpace: .sRGB)!
    g.draw(in: r, angle: -90)
    let s: CGFloat = 220, box = NSRect(x: (r.width - s) / 2, y: r.height / 2 - 40, width: s, height: s)
    tile.setFill()
    NSBezierPath(roundedRect: box, xRadius: s * 0.22, yRadius: s * 0.22).fill()
    art.draw(in: box.insetBy(dx: s * 0.08, dy: s * 0.08))
    let title = NSAttributedString(string: "Alvuna", attributes: [
        .font: NSFont.systemFont(ofSize: 72, weight: .semibold), .foregroundColor: NSColor.white])
    let ts = title.size()
    title.draw(at: NSPoint(x: (r.width - ts.width) / 2, y: box.minY - 60 - ts.height))
}
