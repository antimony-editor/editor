import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

type TranscriptSegment = { text: string; start: number; end: number };

type WorkerRequest = {
  id: number;
  audio: Float32Array;
  model: string;
};

type PipelineResult = {
  text?: string;
  chunks?: Array<{
    text?: string;
    timestamp?: [number | null, number | null];
    timestamps?: [number | null, number | null];
  }>;
};

let transcriber: any = null;
let loadedModel = "";
let currentDevice = "";
const progressByRequest = new Map<number, number>();

function postProgress(id: number, message: string) {
  self.postMessage({ id, type: "progress", message });
}

function normalizeProgress(data: any): string | null {
  if (data?.status === "progress" && typeof data.progress === "number") {
    return `Loading Moonshine... ${Math.round(Math.min(100, Math.max(0, data.progress)))}%`;
  }
  if (data?.status === "download") return "Downloading Moonshine...";
  if (data?.status === "ready") return "Moonshine ready";
  if (data?.file) return `Loading ${String(data.file).split("/").pop()}`;
  return null;
}

async function disposeTranscriber() {
  if (!transcriber) return;
  try {
    if (typeof transcriber.dispose === "function") {
      await transcriber.dispose();
    }
  } catch (e) {
    console.warn("Failed to dispose transcriber:", e);
  } finally {
    transcriber = null;
    loadedModel = "";
    currentDevice = "";
  }
}

async function getTranscriber(
  id: number,
  model: string,
  device: "webgpu" | "wasm",
) {
  if (transcriber && loadedModel === model && currentDevice === device)
    return transcriber;

  await disposeTranscriber();

  loadedModel = model;
  currentDevice = device;

  const progress_callback = (data: any) => {
    let message = normalizeProgress(data);
    if (message?.startsWith("Loading Moonshine... ") && message.endsWith("%")) {
      const value = Number.parseInt(message.replace(/\D+/g, ""), 10);
      const previous = progressByRequest.get(id) ?? 0;
      const next = Number.isFinite(value)
        ? Math.max(previous, Math.min(100, value))
        : previous;
      progressByRequest.set(id, next);
      message = `Loading Moonshine... ${next}%`;
    }
    if (message) postProgress(id, message);
  };

  const options: any = {
    device,
    progress_callback,
  };

  if (device === "webgpu") {
    options.dtype = {
      encoder_model: "fp32",
      decoder_model_merged: "q4",
    };
  } else {
    options.dtype = "q8";
  }

  transcriber = await pipeline("automatic-speech-recognition", model, options);
  return transcriber;
}

function normalizeChunks(
  chunks: PipelineResult["chunks"],
): TranscriptSegment[] {
  if (!Array.isArray(chunks)) return [];
  return chunks.flatMap((chunk) => {
    const timestamp = chunk.timestamp ?? chunk.timestamps;
    const text = chunk.text?.trim();
    if (!text || !timestamp) return [];
    const start = timestamp[0];
    let end = timestamp[1];
    if (typeof start !== "number") return [];
    if (typeof end !== "number") end = start + 1;
    return [{ text, start, end }];
  });
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, audio, model } = event.data;
  try {
    progressByRequest.set(id, 0);
    postProgress(id, "Loading Moonshine...");

    let finalResult: { text: string; segments: TranscriptSegment[] } | null =
      null;

    const runChunkedGeneration = async (transcriberInstance: any) => {
      const SAMPLE_RATE = 16000;
      const CHUNK_SEC = 30;
      const CHUNK_SIZE = CHUNK_SEC * SAMPLE_RATE;

      let allSegments: TranscriptSegment[] = [];
      let fullText = "";

      for (let i = 0; i < audio.length; i += CHUNK_SIZE) {
        const chunkAudio = audio.slice(i, i + CHUNK_SIZE);
        const chunkStartSec = i / SAMPLE_RATE;
        const progressPct = Math.round((i / audio.length) * 100);

        postProgress(id, `Transcribing... ${progressPct}%`);

        let output;
        try {
          output = await transcriberInstance(chunkAudio, {
            return_timestamps: true,
          });
        } catch {
          output = await transcriberInstance(chunkAudio);
        }

        const res = Array.isArray(output) ? output[0] : output;

        if (res?.text) {
          fullText += (fullText ? " " : "") + res.text.trim();
        }

        const chunkSegments = normalizeChunks(res?.chunks);
        if (chunkSegments.length === 0 && res?.text) {
          allSegments.push({
            text: res.text.trim(),
            start: chunkStartSec,
            end: chunkStartSec + chunkAudio.length / SAMPLE_RATE,
          });
        } else {
          for (const seg of chunkSegments) {
            allSegments.push({
              text: seg.text,
              start: seg.start + chunkStartSec,
              end: seg.end + chunkStartSec,
            });
          }
        }
      }
      return { text: fullText.trim(), segments: allSegments };
    };

    try {
      const pipe = await getTranscriber(id, model, "webgpu");
      postProgress(id, "Transcribing with Moonshine...");
      finalResult = await runChunkedGeneration(pipe);
    } catch (gpuError) {
      console.warn("WebGPU execution failed, falling back to WASM:", gpuError);
      postProgress(id, "WebGPU failed. Retrying safely with WASM...");

      const pipeWasm = await getTranscriber(id, model, "wasm");
      postProgress(id, "Transcribing with Moonshine (WASM)...");
      finalResult = await runChunkedGeneration(pipeWasm);
    }

    self.postMessage({
      id,
      type: "complete",
      text: finalResult?.text ?? "",
      segments: finalResult?.segments ?? [],
    });
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Moonshine transcription failed",
    });
  } finally {
    progressByRequest.delete(id);
    await disposeTranscriber();
  }
};
