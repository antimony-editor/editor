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

let wroteAudio = false;

type PendingFrame = { bitmap: ImageBitmap; run: () => Promise<void> };

let pendingFrames: PendingFrame[] = [];
let drainPromise: Promise<void> | null = null;
let fatalError: Error | null = null;

function closeBitmap(bitmap: ImageBitmap) {
  try {
    bitmap.close();
  } catch {
    // already closed
  }
}

function discardPendingFrames() {
  for (const pending of pendingFrames) closeBitmap(pending.bitmap);
  pendingFrames = [];
}

function postError(error: Error) {
  (self as any).postMessage({ type: "error", error: error.message });
}

function fail(error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  if (!fatalError) fatalError = err;
  discardPendingFrames();
  postError(err);
}

async function runDrain() {
  while (pendingFrames.length > 0) {
    const pending = pendingFrames.shift()!;
    await pending.run();
    (self as any).postMessage({ type: "frameDone" });
  }
}

function drainFrames(): Promise<void> {
  if (!drainPromise) {
    drainPromise = runDrain().finally(() => {
      drainPromise = null;
    });
  }
  return drainPromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    if (type === "init") {
      config = payload;
      frameCounter = 0;
      audioTimestampSec = 0;
      wroteAudio = false;
      pendingFrames = [];
      drainPromise = null;
      fatalError = null;

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
          latencyMode:
            config.options.quality === "realtime" ? "realtime" : "quality",
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
      const { bitmap, audio } = payload as {
        bitmap: ImageBitmap;
        audio: Float32Array | null;
      };

      if (fatalError) {
        closeBitmap(bitmap);
        return;
      }

      const timestampSec = frameCounter / config.fps;
      const durationSec = 1 / config.fps;
      frameCounter++;

      if (config.options.format === "gif") {
        gifCtx!.clearRect(0, 0, config.width, config.height);
        gifCtx!.drawImage(bitmap, 0, 0, config.width, config.height);
        bitmap.close();
        const imageData = gifCtx!.getImageData(
          0,
          0,
          config.width,
          config.height,
        );
        const palette = quantize(imageData.data, 256);
        const index = applyPalette(imageData.data, palette);
        gifEncoder.writeFrame(index, config.width, config.height, {
          palette,
          delay: 1000 / config.fps,
        });
        // GIF frames never enter pendingFrames, so acknowledge here instead.
        (self as any).postMessage({ type: "frameDone" });
        return;
      }

      const capturedAudio = audio;
      const capturedAudioTimestamp = audioTimestampSec;
      if (capturedAudio) {
        audioTimestampSec += capturedAudio.length / 2 / config.sampleRate;
      } else {
        audioTimestampSec += durationSec;
      }

      pendingFrames.push({
        bitmap,
        run: async () => {
          try {
            const videoSample = new VideoSample(bitmap, {
              timestamp: timestampSec,
              duration: durationSec,
            });
            try {
              await videoSource!.add(videoSample);
            } finally {
              videoSample.close();
            }

            if (
              capturedAudio &&
              capturedAudio.length >= 2 &&
              capturedAudio.length % 2 === 0
            ) {
              const audioSample = new AudioSample({
                format: "f32-planar",
                sampleRate: config.sampleRate,
                numberOfChannels: 2,
                timestamp: capturedAudioTimestamp,
                data: capturedAudio.buffer,
              });
              try {
                await audioSource!.add(audioSample);
                wroteAudio = true;
              } finally {
                audioSample.close();
              }
            }
          } finally {
            closeBitmap(bitmap);
          }
        },
      });

      void drainFrames().catch(fail);
    } else if (type === "finalize") {
      await drainFrames();
      if (fatalError) throw fatalError;

      if (config.options.format === "gif") {
        gifEncoder.finish();
        const buffer = gifEncoder.bytes().buffer;
        (self as any).postMessage({ type: "done", buffer }, [buffer]);
        return;
      }

      if (!wroteAudio) {
        const silentFrames = Math.ceil(
          (frameCounter / config.fps) * config.sampleRate,
        );
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
  } catch (err: unknown) {
    fail(err);
  }
};
