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

function buildAudioPayload(
  audioSamples: unknown[],
): { data: Float32Array } | null {
  const validSamples = audioSamples.filter(
    (sample): sample is Float32Array =>
      sample instanceof Float32Array &&
      sample.length >= 2 &&
      sample.length % 2 === 0,
  );

  if (validSamples.length === 0) return null;

  let totalSampleCount = 0;
  for (const sample of validSamples) {
    totalSampleCount += sample.length / 2;
  }

  if (totalSampleCount <= 0) return null;

  const data = new Float32Array(totalSampleCount * 2);
  let offset = 0;

  for (const sample of validSamples) {
    const half = sample.length / 2;
    data.set(sample.subarray(0, half), offset);
    data.set(sample.subarray(half), totalSampleCount + offset);
    offset += half;
  }

  return { data };
}

let config: any;
let target: BufferTarget | null = null;
let output: Output | null = null;
let videoSource: VideoSampleSource | null = null;
let audioSource: AudioSampleSource | null = null;
let audioChunks: Float32Array[] = [];
let gifEncoder: any = null;
let gifCtx: OffscreenCanvasRenderingContext2D | null = null;
let frameCounter = 0;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    if (type === "init") {
      config = payload;
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

        videoSource = new VideoSampleSource({
          codec: isMP4 ? "avc" : "vp9",
          bitrate: config.options.bitrate,
          latencyMode: "realtime",
          keyFrameInterval: Math.max(1, Math.round(config.fps)),
          colorSpace: {
            primaries: "bt709",
            transfer: "bt709",
            matrix: "bt709",
            fullRange: true,
          },
        } as any);

        audioSource = new AudioSampleSource({
          codec: isMP4 && config.isChromium ? "aac" : "opus",
          sampleRate: config.sampleRate,
          numberOfChannels: 2,
          bitrate: 192000,
        } as any);

        output.addVideoTrack(videoSource);
        output.addAudioTrack(audioSource);
        await output.start();
      }
      (self as any).postMessage({ type: "ready" });
    } else if (type === "frame") {
      const { bitmap, audio } = payload;
      if (audio && Array.isArray(audio)) {
        audioChunks.push(...audio);
      }

      if (config.options.format === "gif") {
        gifCtx!.clearRect(0, 0, config.width, config.height);
        gifCtx!.drawImage(bitmap, 0, 0, config.width, config.height);
        bitmap.close();

        const imageData = gifCtx!.getImageData(0, 0, config.width, config.height);
        const palette = quantize(imageData.data, 256);
        const index = applyPalette(imageData.data, palette);

        gifEncoder.writeFrame(index, config.width, config.height, {
          palette,
          delay: 1000 / config.fps,
        });
      } else {
        const frameDuration = 1 / config.fps;
        const timestamp = frameCounter * frameDuration;
        const sample = new VideoSample(bitmap, {
          timestamp,
          duration: frameDuration,
          colorSpace: {
            primaries: "bt709",
            transfer: "bt709",
            matrix: "bt709",
            fullRange: true,
          },
        } as any);

        await videoSource!.add(sample, {
          keyFrame: frameCounter === 0 || frameCounter % Math.max(1, Math.round(config.fps)) === 0,
        });
        sample.close();
        bitmap.close();
      }

      frameCounter++;
      (self as any).postMessage({ type: "frameDone", progress: frameCounter });
    } else if (type === "finalize") {
      if (config.options.format === "gif") {
        gifEncoder.finish();
        const buffer = gifEncoder.bytes().buffer;
        (self as any).postMessage({ type: "done", buffer }, [buffer]);
      } else {
        let audioPayload = buildAudioPayload(audioChunks);
        if (!audioPayload) {
          const samples = Math.ceil((frameCounter / config.fps) * config.sampleRate);
          audioPayload = { data: new Float32Array(samples * 2) };
        }

        const audioSample = new AudioSample({
          format: "f32-planar",
          sampleRate: config.sampleRate,
          numberOfChannels: 2,
          timestamp: 0,
          data: audioPayload.data.buffer,
        });

        try {
          await audioSource!.add(audioSample);
        } finally {
          audioSample.close();
        }

        await videoSource!.close();
        await audioSource!.close();
        await output!.finalize();

        const buffer = target!.buffer as ArrayBuffer;
        (self as any).postMessage({ type: "done", buffer }, [buffer]);
      }
    }
  } catch (err: any) {
    (self as any).postMessage({ type: "error", error: err?.message ?? String(err) });
  }
};