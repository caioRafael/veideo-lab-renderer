import AppKit
import CoreText
import Foundation

guard CommandLine.arguments.count >= 10 else {
  fputs("usage: render-text output width height text fontPath fontSize color x y\n", stderr)
  exit(1)
}

let outputPath = CommandLine.arguments[1]
let canvasWidth = Int(CommandLine.arguments[2]) ?? 0
let canvasHeight = Int(CommandLine.arguments[3]) ?? 0
let text = CommandLine.arguments[4]
let fontPath = CommandLine.arguments[5]
let fontSize = CGFloat(Double(CommandLine.arguments[6]) ?? 48)
let colorHex = CommandLine.arguments[7]
let xArg = CommandLine.arguments[8]
let yArg = CommandLine.arguments[9]

func parseColor(_ hex: String) -> NSColor {
  var value = hex
  if value.hasPrefix("#") {
    value.removeFirst()
  }
  guard value.count == 6, let int = Int(value, radix: 16) else {
    return NSColor.white
  }
  let red = CGFloat((int >> 16) & 0xFF) / 255
  let green = CGFloat((int >> 8) & 0xFF) / 255
  let blue = CGFloat(int & 0xFF) / 255
  return NSColor(srgbRed: red, green: green, blue: blue, alpha: 1)
}

let fontURL = URL(fileURLWithPath: fontPath) as CFURL
CTFontManagerRegisterFontsForURL(fontURL, .process, nil)

let font: NSFont
if let provider = CGDataProvider(url: fontURL), let cgFont = CGFont(provider) {
  let ctFont = CTFontCreateWithGraphicsFont(cgFont, fontSize, nil, nil)
  font = ctFont as NSFont
} else {
  font = NSFont.systemFont(ofSize: fontSize)
}

let attributes: [NSAttributedString.Key: Any] = [
  .font: font,
  .foregroundColor: parseColor(colorHex),
]
let attributed = NSAttributedString(string: text, attributes: attributes)
let textSize = attributed.size()

func resolve(_ value: String, canvas: Int, size: CGFloat) -> CGFloat {
  if value == "center" {
    return (CGFloat(canvas) - size) / 2
  }
  return CGFloat(Double(value) ?? 0)
}

let x = resolve(xArg, canvas: canvasWidth, size: textSize.width)
let ffmpegY = resolve(yArg, canvas: canvasHeight, size: textSize.height)
let drawY = CGFloat(canvasHeight) - ffmpegY - textSize.height

let image = NSImage(size: NSSize(width: canvasWidth, height: canvasHeight))
image.lockFocus()
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight).fill()
attributed.draw(at: NSPoint(x: x, y: drawY))
image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:])
else {
  fputs("failed to encode png\n", stderr)
  exit(1)
}

do {
  try png.write(to: URL(fileURLWithPath: outputPath))
} catch {
  fputs("failed to write png: \(error)\n", stderr)
  exit(1)
}
