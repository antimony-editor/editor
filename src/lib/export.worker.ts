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

self.onmessage = async (e: MessageEvent) => {
  const { options, frames, audioSamples, sampleRate, fps, width, height } =
    e.data;

  try {
    if (options.format === "gif") {
      const encoder = GIFEncoder();
      const frameDuration = 1000 / fps;

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        throw new Error("couldn't get 2d context for GIF encoding");
      }

      for (let i = 0; i < frames.length; i++) {
        const bitmap = frames[i] as ImageBitmap;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const imageData = ctx.getImageData(0, 0, width, height);
        const { data } = imageData;
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);

        encoder.writeFrame(index, width, height, {
          palette,
          delay: frameDuration,
        });

        if (i % 5 === 0) {
          self.postMessage({
            type: "progress",
            progress: (i / frames.length) * 100,
          });
        }
      }

      encoder.finish();
      const buffer = encoder.bytes().buffer;
      (self as any).postMessage({ type: "done", buffer }, [buffer]);
      return;
    }

    const isMP4 = options.format === "mp4";
    const frameDuration = 1 / fps;

    const target = new BufferTarget();
    const output = new Output({
      format: isMP4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target,
    });

    const videoSource = new VideoSampleSource({
      codec: isMP4 ? "avc" : "vp9",
      bitrate: options.bitrate,
      latencyMode: options.quality,
    });

    const hasAudio = Array.isArray(audioSamples) && audioSamples.length > 0;

    const audioSource = hasAudio
      ? new AudioSampleSource({
          codec: isMP4 ? "aac" : "opus",
          sampleRate,
          numberOfChannels: 2,
          bitrate: 192000,
        })
      : null;

    output.addVideoTrack(videoSource);
    if (audioSource) output.addAudioTrack(audioSource);
    await output.start();

    for (let i = 0; i < frames.length; i++) {
      const bitmap = frames[i] as ImageBitmap;
      const timestamp = i * frameDuration;
      const sample = new VideoSample(bitmap, {
        timestamp,
        duration: frameDuration,
      });

      await videoSource.add(sample, { keyFrame: i % 60 === 0 });
      sample.close();
      bitmap.close();
      if (audioSource && audioSamples[i]) {
        const pcm = audioSamples[i] as Float32Array;
        const audioSample = new AudioSample({
          format: "f32-planar",
          sampleRate,
          numberOfChannels: 2,
          timestamp,
          data: pcm.buffer,
        });
        await audioSource.add(audioSample);
        audioSample.close();
      }

      if (i % 10 === 0) {
        self.postMessage({
          type: "progress",
          progress: (i / frames.length) * 100,
        });
      }
    }

    videoSource.close();
    if (audioSource) audioSource.close();
    await output.finalize();

    const buffer = target.buffer as ArrayBuffer;
    (self as any).postMessage({ type: "done", buffer }, [buffer]);
  } catch (err: any) {
    (self as any).postMessage({ type: "error", error: err.message });
  }
};
