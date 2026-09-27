// Re-encode a splash/hero clip for the CDN with AVFoundation (built into macOS,
// so no ffmpeg install is needed).
//
//   swiftc -O scripts/encode-video.swift -o /tmp/encode-video
//   /tmp/encode-video <in.mp4> <out.mp4> [videoKbps=3000] [audioKbps=128]
//
// Output: H.264 High (plays on every Android and iOS device, unlike HEVC),
// the source's size and frame rate, a keyframe every 2 s, AAC stereo, and the
// `moov` atom up front ("fast start") so it can start playing while it streams.

import AVFoundation

let args = CommandLine.arguments
guard args.count >= 3 else {
  FileHandle.standardError.write("usage: encode-video <in> <out> [videoKbps] [audioKbps]\n".data(using: .utf8)!)
  exit(2)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let videoKbps = args.count > 3 ? Int(args[3])! : 3000
let audioKbps = args.count > 4 ? Int(args[4])! : 128
try? FileManager.default.removeItem(at: output)

let asset = AVURLAsset(url: input)
let reader = try AVAssetReader(asset: asset)
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true

guard let vTrack = asset.tracks(withMediaType: .video).first else { fatalError("no video track") }
let size = vTrack.naturalSize.applying(vTrack.preferredTransform)
let width = Int(abs(size.width)), height = Int(abs(size.height))
let fps = vTrack.nominalFrameRate > 0 ? vTrack.nominalFrameRate : 30

let vOut = AVAssetReaderTrackOutput(track: vTrack, outputSettings: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
])
reader.add(vOut)
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: videoKbps * 1000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoMaxKeyFrameIntervalKey: Int((fps * 2).rounded()),
    AVVideoExpectedSourceFrameRateKey: Int(fps.rounded()),
    AVVideoAllowFrameReorderingKey: true,
    AVVideoH264EntropyModeKey: AVVideoH264EntropyModeCABAC,
  ],
])
vIn.transform = vTrack.preferredTransform
vIn.expectsMediaDataInRealTime = false
writer.add(vIn)

var aOut: AVAssetReaderTrackOutput?
var aIn: AVAssetWriterInput?
if let aTrack = asset.tracks(withMediaType: .audio).first {
  let o = AVAssetReaderTrackOutput(track: aTrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
  reader.add(o)
  let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
    AVFormatIDKey: kAudioFormatMPEG4AAC,
    AVNumberOfChannelsKey: 2,
    AVSampleRateKey: 44_100,
    AVEncoderBitRateKey: audioKbps * 1000,
  ])
  i.expectsMediaDataInRealTime = false
  writer.add(i)
  aOut = o; aIn = i
}

reader.startReading()
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let group = DispatchGroup()
func pump(_ output: AVAssetReaderTrackOutput, into input: AVAssetWriterInput, label: String) {
  group.enter()
  input.requestMediaDataWhenReady(on: DispatchQueue(label: label)) {
    while input.isReadyForMoreMediaData {
      if let buf = output.copyNextSampleBuffer() {
        input.append(buf)
      } else {
        input.markAsFinished()
        group.leave()
        return
      }
    }
  }
}
pump(vOut, into: vIn, label: "video")
if let aOut, let aIn { pump(aOut, into: aIn, label: "audio") }
group.wait()

let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed {
  FileHandle.standardError.write("failed: \(String(describing: writer.error)) reader: \(String(describing: reader.error))\n".data(using: .utf8)!)
  exit(1)
}
let bytes = (try? FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
print("wrote \(output.path) \(width)x\(height)@\(fps) \(bytes) bytes")
