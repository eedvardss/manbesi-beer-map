import AppKit

let destination = CommandLine.arguments[1]
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
NSColor(calibratedRed: 0.97, green: 0.93, blue: 0.85, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1024, height: 1024)).fill()

// A simple location pin with a glass cutout. Native vector geometry; no
// external imagery, competitor assets, or runtime icon dependency.
let pin = NSBezierPath()
pin.move(to: NSPoint(x: 512, y: 146))
pin.curve(to: NSPoint(x: 232, y: 610), controlPoint1: NSPoint(x: 414, y: 300), controlPoint2: NSPoint(x: 232, y: 435))
pin.curve(to: NSPoint(x: 512, y: 874), controlPoint1: NSPoint(x: 232, y: 770), controlPoint2: NSPoint(x: 357, y: 874))
pin.curve(to: NSPoint(x: 792, y: 610), controlPoint1: NSPoint(x: 667, y: 874), controlPoint2: NSPoint(x: 792, y: 770))
pin.curve(to: NSPoint(x: 512, y: 146), controlPoint1: NSPoint(x: 792, y: 435), controlPoint2: NSPoint(x: 610, y: 300))
pin.close()
NSColor(calibratedRed: 0.80, green: 0.46, blue: 0.12, alpha: 1).setFill()
pin.fill()
NSColor(calibratedRed: 0.99, green: 0.97, blue: 0.92, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 420, y: 470, width: 176, height: 218), xRadius: 28, yRadius: 28).fill()
let handle = NSBezierPath(roundedRect: NSRect(x: 558, y: 519, width: 113, height: 137), xRadius: 38, yRadius: 38)
handle.lineWidth = 31
NSColor(calibratedRed: 0.99, green: 0.97, blue: 0.92, alpha: 1).setStroke()
handle.stroke()
NSBezierPath(roundedRect: NSRect(x: 397, y: 676, width: 218, height: 43), xRadius: 21, yRadius: 21).fill()
image.unlockFocus()
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
image.draw(in: NSRect(x: 0, y: 0, width: 1024, height: 1024))
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: destination))
