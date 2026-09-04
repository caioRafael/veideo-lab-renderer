import AppKit
import CoreText
import Foundation

struct TextBoxConfig: Decodable {
  let width: Double
  let height: Double?
}

struct StrokeConfig: Decodable {
  let width: Double
  let color: String
}

struct ShadowConfig: Decodable {
  let x: Double
  let y: Double
  let color: String
}

struct BackgroundConfig: Decodable {
  let color: String
  let opacity: Double
  let padding: Double
}

struct TextConfig: Decodable {
  let canvasWidth: Int
  let canvasHeight: Int
  let content: String
  let fontPath: String
  let fontSize: Double
  let color: String
  let x: String
  let y: String
  let align: String
  let verticalAlign: String
  let lineSpacing: Double
  let box: TextBoxConfig?
  let stroke: StrokeConfig?
  let shadow: ShadowConfig?
  let background: BackgroundConfig?
}

func loadConfig() -> (outputPath: String, config: TextConfig) {
  if CommandLine.arguments.count == 3 {
    let outputPath = CommandLine.arguments[1]
    let data = try! Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[2]))
    let config = try! JSONDecoder().decode(TextConfig.self, from: data)
    return (outputPath, config)
  }

  guard CommandLine.arguments.count >= 10 else {
    fputs("usage: render-text output config.json\n", stderr)
    exit(1)
  }

  let legacy = TextConfig(
    canvasWidth: Int(CommandLine.arguments[2]) ?? 0,
    canvasHeight: Int(CommandLine.arguments[3]) ?? 0,
    content: CommandLine.arguments[4],
    fontPath: CommandLine.arguments[5],
    fontSize: Double(CommandLine.arguments[6]) ?? 48,
    color: CommandLine.arguments[7],
    x: CommandLine.arguments[8],
    y: CommandLine.arguments[9],
    align: CommandLine.arguments[8] == "center" ? "center" : "left",
    verticalAlign: CommandLine.arguments[9] == "center" ? "middle" : "top",
    lineSpacing: 1,
    box: nil,
    stroke: nil,
    shadow: nil,
    background: nil
  )
  return (CommandLine.arguments[1], legacy)
}

func parseColor(_ hex: String, alpha: Double = 1) -> NSColor {
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
  return NSColor(srgbRed: red, green: green, blue: blue, alpha: CGFloat(alpha))
}

func reference(_ value: String, canvas: CGFloat) -> CGFloat {
  if value == "center" {
    return canvas / 2
  }
  return CGFloat(Double(value) ?? 0)
}

func loadFont(path: String, size: CGFloat) -> NSFont {
  let fontURL = URL(fileURLWithPath: path) as CFURL
  CTFontManagerRegisterFontsForURL(fontURL, .process, nil)
  if let provider = CGDataProvider(url: fontURL), let cgFont = CGFont(provider) {
    return CTFontCreateWithGraphicsFont(cgFont, size, nil, nil) as NSFont
  }
  return NSFont.systemFont(ofSize: size)
}

func attributes(
  font: NSFont,
  color: NSColor,
  stroke: StrokeConfig?
) -> [NSAttributedString.Key: Any] {
  var attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color,
  ]
  if let stroke, stroke.width > 0 {
    attrs[.strokeColor] = parseColor(stroke.color)
    attrs[.strokeWidth] = -(stroke.width / Double(font.pointSize) * 100)
  }
  return attrs
}

let loaded = loadConfig()
let config = loaded.config
let canvasWidth = CGFloat(config.canvasWidth)
let canvasHeight = CGFloat(config.canvasHeight)
let fontSize = CGFloat(config.fontSize)
let font = loadFont(path: config.fontPath, size: fontSize)
let textColor = parseColor(config.color)
let attrs = attributes(font: font, color: textColor, stroke: config.stroke)
let lines = config.content.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
let lineSizes = lines.map { NSAttributedString(string: $0, attributes: attrs).size() }
let blockWidth = lineSizes.map(\.width).max() ?? 0
let lineStep = fontSize * CGFloat(config.lineSpacing)
let blockHeight = lines.isEmpty
  ? 0
  : fontSize + CGFloat(max(lines.count - 1, 0)) * lineStep
let layoutWidth = CGFloat(config.box?.width ?? Double(blockWidth))
let layoutHeight = CGFloat(config.box?.height ?? Double(blockHeight))

let refX = reference(config.x, canvas: canvasWidth)
let refY = reference(config.y, canvas: canvasHeight)

let boxLeft: CGFloat
switch config.align {
case "right":
  boxLeft = refX - layoutWidth
case "center":
  boxLeft = refX - layoutWidth / 2
default:
  boxLeft = refX
}

let boxTop: CGFloat
switch config.verticalAlign {
case "bottom":
  boxTop = refY - layoutHeight
case "middle":
  boxTop = refY - layoutHeight / 2
default:
  boxTop = refY
}

let textTop: CGFloat
switch config.verticalAlign {
case "bottom":
  textTop = boxTop + layoutHeight - blockHeight
case "middle":
  textTop = boxTop + (layoutHeight - blockHeight) / 2
default:
  textTop = boxTop
}

let image = NSImage(size: NSSize(width: canvasWidth, height: canvasHeight))
image.lockFocus()
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight).fill()

if let background = config.background {
  let padding = CGFloat(background.padding)
  let contentLeft: CGFloat
  switch config.align {
  case "right":
    contentLeft = boxLeft + layoutWidth - blockWidth
  case "center":
    contentLeft = boxLeft + (layoutWidth - blockWidth) / 2
  default:
    contentLeft = boxLeft
  }
  let bgRect = NSRect(
    x: contentLeft - padding,
    y: canvasHeight - textTop - blockHeight - padding,
    width: blockWidth + padding * 2,
    height: blockHeight + padding * 2
  )
  parseColor(background.color, alpha: background.opacity).setFill()
  bgRect.fill()
}

func drawLine(text: String, origin: NSPoint, color: NSColor) {
  var lineAttrs = attrs
  lineAttrs[.foregroundColor] = color
  NSAttributedString(string: text, attributes: lineAttrs).draw(at: origin)
}

for (index, line) in lines.enumerated() {
  let lineWidth = lineSizes[index].width
  let lineX: CGFloat
  switch config.align {
  case "right":
    lineX = boxLeft + layoutWidth - lineWidth
  case "center":
    lineX = boxLeft + (layoutWidth - lineWidth) / 2
  default:
    lineX = boxLeft
  }
  let lineTop = textTop + CGFloat(index) * lineStep
  let drawY = canvasHeight - lineTop - fontSize
  let origin = NSPoint(x: lineX, y: drawY)

  if let shadow = config.shadow {
    let shadowOrigin = NSPoint(
      x: origin.x + CGFloat(shadow.x),
      y: origin.y - CGFloat(shadow.y)
    )
    drawLine(text: line, origin: shadowOrigin, color: parseColor(shadow.color))
  }

  drawLine(text: line, origin: origin, color: textColor)
}

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:])
else {
  fputs("failed to encode png\n", stderr)
  exit(1)
}

do {
  try png.write(to: URL(fileURLWithPath: loaded.outputPath))
} catch {
  fputs("failed to write png: \(error)\n", stderr)
  exit(1)
}
