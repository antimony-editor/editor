import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  VideoSampleSource,
  VideoSample,
  AudioSampleSource,
  AudioSample,
} from "mediabunny";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

let config: any;
let output: Output | null = null;
let target: BufferTarget | null = null;
let videoSource: VideoSampleSource | null = null;
let audioSource: AudioSampleSource | null = null;
let gifEncoder: any = null;
let gifCtx: OffscreenCanvasRenderingContext2D | null = null;
let frameCounter = 0;
let audioTimestampSec = 0;

let pendingFrames: Array<() => Promise<void>> = [];
let draining = false;

async function drainFrames() {
  if (draining) return;
  draining = true;
  while (pendingFrames.length > 0) {
    const task = pendingFrames.shift()!;
    await task();
  }
  draining = false;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    if (type === "init") {
      config = payload;
      frameCounter = 0;
      audioTimestampSec = 0;
      pendingFrames = [];
      draining = false;

      if (config.options.format === "gif") {
        gifEncoder = GIFEncoder();
        const canvas = new OffscreenCanvas(config.width, config.height);
        gifCtx = canvas.getContext("2d", { willReadFrequently: true });
        if (!gifCtx) throw new Error("Could not initialize 2D context");
      } else {
        const isMP4 = config.options.format === "mp4";
        target = new BufferTarget();
        output = new Output({
          format: isMP4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
          target,
        });

        videoSource = new VideoSampleSource({
          codec: isMP4 ? "avc" : "vp9",
          bitrate: config.options.bitrate,
          latencyMode: config.options.quality === "realtime" ? "realtime" : "quality",
          keyFrameInterval: Math.max(1, Math.round(config.fps)),
        });

        audioSource = new AudioSampleSource({
          codec: isMP4 && config.isChromium ? "aac" : "opus",
          sampleRate: config.sampleRate,
          numberOfChannels: 2,
          bitrate: 192000,
        } as any);

        output.addVideoTrack(videoSource);
        output.addAudioTrack(audioSource);

        const now = new Date();
        const timestamp = new Intl.DateTimeFormat("sv-SE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          fractionalSecondDigits: 3,
          timeZoneName: "longOffset",
          hour12: false,
        }).format(now);
        output.setMetadataTags({
          comment: `Edited using Antimony (https://editor.antimony.cc) on ${timestamp}`,
        });

        await output.start();
      }

      (self as any).postMessage({ type: "ready" });

    } else if (type === "frame") {
      const { bitmap, audio } = payload as { bitmap: ImageBitmap; audio: Float32Array | null };
      const timestampSec = frameCounter / config.fps;
      const durationSec = 1 / config.fps;
      frameCounter++;

      if (config.options.format === "gif") {
        gifCtx!.clearRect(0, 0, config.width, config.height);
        gifCtx!.drawImage(bitmap, 0, 0, config.width, config.height);
        bitmap.close();
        const imageData = gifCtx!.getImageData(0, 0, config.width, config.height);
        const palette = quantize(imageData.data, 256);
        const index = applyPalette(imageData.data, palette);
        gifEncoder.writeFrame(index, config.width, config.height, { palette, delay: 1000 / config.fps });
        return;
      }

      const capturedAudio = audio;
      const capturedAudioTimestamp = audioTimestampSec;
      if (capturedAudio) {
        audioTimestampSec += capturedAudio.length / 2 / config.sampleRate;
      }

      pendingFrames.push(async () => {
        const videoSample = new VideoSample(bitmap, { timestamp: timestampSec, duration: durationSec });
        await videoSource!.add(videoSample);
        videoSample.close();
        bitmap.close();

        if (capturedAudio && capturedAudio.length >= 2 && capturedAudio.length % 2 === 0) {
          const audioSample = new AudioSample({
            format: "f32-planar",
            sampleRate: config.sampleRate,
            numberOfChannels: 2,
            timestamp: capturedAudioTimestamp,
            data: capturedAudio.buffer,
          });
          await audioSource!.add(audioSample);
          audioSample.close();
        }
      });

      drainFrames();

    } else if (type === "finalize") {
      while (draining || pendingFrames.length > 0) {
        await new Promise<void>((r) => setTimeout(r, 10));
      }

      if (config.options.format === "gif") {
        gifEncoder.finish();
        const buffer = gifEncoder.bytes().buffer;
        (self as any).postMessage({ type: "done", buffer }, [buffer]);
        return;
      }

      if (audioTimestampSec === 0) {
        const silentFrames = Math.ceil((frameCounter / config.fps) * config.sampleRate);
        const silentSample = new AudioSample({
          format: "f32-planar",
          sampleRate: config.sampleRate,
          numberOfChannels: 2,
          timestamp: 0,
          data: new Float32Array(silentFrames * 2).buffer,
        });
        await audioSource!.add(silentSample);
        silentSample.close();
      }

      await videoSource!.close();
      await audioSource!.close();
      await output!.finalize();

      const buffer = target!.buffer as ArrayBuffer;
      (self as any).postMessage({ type: "done", buffer }, [buffer]);
    }
  } catch (err: any) {
    (self as any).postMessage({ type: "error", error: err?.message ?? String(err) });
  }
};