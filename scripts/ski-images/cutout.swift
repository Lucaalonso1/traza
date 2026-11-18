import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: cutout in out"); exit(1) }
let url = URL(fileURLWithPath: args[1])
guard let ci = CIImage(contentsOf: url) else { print("cannot read"); exit(1) }
let handler = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
do {
  try handler.perform([req])
  guard let obs = req.results?.first else { print("no subject"); exit(2) }
  let buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: true)
  let out = CIImage(cvPixelBuffer: buf)
  let ctx = CIContext()
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  try ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: cs)
  print("ok", Int(out.extent.width), Int(out.extent.height), obs.allInstances.count)
} catch { print("error", error); exit(3) }
