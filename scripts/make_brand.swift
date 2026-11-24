// Draws the integration's brand icons (shown by Home Assistant and HACS) from art/icon.svg with AppKit, no extra tools.
// Run from the repo root on a Mac: swift scripts/make_brand.swift
import AppKit

guard let art = NSImage(contentsOf: URL(fileURLWithPath: "art/icon.svg")) else { print("cannot load art/icon.svg"); exit(1) }

func render(_ size: Int, to out: String) {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    art.draw(in: NSRect(x: 0, y: 0, width: size, height: size))
    NSGraphicsContext.restoreGraphicsState()
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
    print("\(out) \(size)x\(size)")
}
render(256, to: "custom_components/alvuna/brand/icon.png")
render(512, to: "custom_components/alvuna/brand/icon@2x.png")
