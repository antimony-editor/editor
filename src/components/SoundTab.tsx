import { useEffect, useRef, useState, useCallback } from "react";
import {
  useSprites,
  generateMediaSoundId,
  createTextSprite,
  isTextData,
} from "../lib/sprites";
import {
  getAvailableFonts,
  COMMON_FONTS,
  WEB_SAFE_FONTS,
  GOOGLE_FONTS,
  loadGoogleFont,
  buildFontStack,
  detectAvailableFonts,
  requestFontAccess,
  getFontPermissionState,
} from "../lib/fonts";
import {
  AudioLines,
  Play,
  Square,
  Plus,
  Trash2,
  Replace,
  Volume2,
  Scissors,
  Undo2,
  Redo2,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";
import { Menu, Item, useContextMenu } from "react-contexify";
import runtime from "../lib/runtime";

let audioClipboard: { channels: Float32Array[]; sampleRate: number } | null =
  null;

type HistoryEntry = { src: string; buffer: AudioBuffer };

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const numSamples = buffer.length;
  const resultChannels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    resultChannels.push(buffer.getChannelData(i));
  }
  const dataLength = numSamples * numChannels * 2;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, resultChannels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}

function commitBuffer(buffer: AudioBuffer): string {
  const wavBytes = audioBufferToWav(buffer);
  const blob = new Blob([wavBytes], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  runtime.setDecodedAudio(url, buffer);
  return url;
}

function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const m = expanded.match(/.{2}/g);
  if (!m || m.length < 3) return { r: 62, g: 126, b: 245 };
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  return { r, g, b };
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00.000";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

type TranscriptSegment = { text: string; start: number; end: number };
type TranscriptSource = "model" | "browser";
type TranscriptTiming = "phrase" | "word";
type SubtitleFont = string;
type SubtitleStyle = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

type TranscriptionOptions = {
  source: TranscriptSource;
  model: string;
  timing: TranscriptTiming;
  font: SubtitleFont;
  style: SubtitleStyle;
};

const MOONSHINE_MODELS = [
  { id: "onnx-community/moonshine-tiny-ONNX", label: "Moonshine tiny" },
  { id: "onnx-community/moonshine-base-ONNX", label: "Moonshine base" },
];

const DEFAULT_TRANSCRIPTION_OPTIONS: TranscriptionOptions = {
  source: "model",
  model: MOONSHINE_MODELS[0].id,
  timing: "phrase",
  font: "Inter",
  style: 400,
};

const PHRASE_WORD_MAX = 8;
const PHRASE_WORDS_PER_LINE = 4;

function wrapText(text: string): string {
  const tokens = text.split(" ");
  const lines: string[] = [];
  let lineWords: string[] = [];
  let wordCount = 0;
  for (const token of tokens) {
    lineWords.push(token);
    if (/\w/.test(token)) wordCount++;
    if (wordCount >= PHRASE_WORDS_PER_LINE) {
      lines.push(lineWords.join(" "));
      lineWords = [];
      wordCount = 0;
    }
  }
  if (lineWords.length > 0) lines.push(lineWords.join(" "));
  return lines.join("\n");
}

function splitPhrases(text: string): string[] {
  const tokens = text.trim().split(" ");
  const chunks: string[] = [];
  let current: string[] = [];
  let wordCount = 0;

  for (const token of tokens) {
    const isWordToken = /\w/.test(token);
    const endsWithSentence = /[.!?]$/.test(token);

    current.push(token);
    if (isWordToken) wordCount++;

    if (endsWithSentence || wordCount >= PHRASE_WORD_MAX) {
      chunks.push(current.join(" ").trim());
      current = [];
      wordCount = 0;
    }
  }

  if (current.length > 0) chunks.push(current.join(" ").trim());

  return chunks.filter(Boolean);
}

function createSubtitleSegments(
  text: string,
  duration: number,
  timing: TranscriptTiming,
): TranscriptSegment[] {
  const cleaned = text.replace(/[ \t]+/g, " ").trim();
  if (!cleaned) return [];
  const parts =
    timing === "word"
      ? cleaned.split(/[ \t]+/)
      : splitPhrases(cleaned).map(wrapText);
  if (parts.length === 0) return [];
  const weights = parts.map((part) => Math.max(1, part.length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return parts.map((part, idx) => {
    const isLast = idx === parts.length - 1;
    const segmentDuration = isLast
      ? Math.max(0.1, duration - cursor)
      : Math.max(0.1, (duration * weights[idx]) / totalWeight);
    const start = cursor;
    const end = isLast
      ? Math.max(start + 0.1, duration)
      : Math.min(duration, start + segmentDuration);
    cursor = end;
    return { text: part, start, end };
  });
}

function retimeSegments(
  segments: TranscriptSegment[],
  timing: TranscriptTiming,
): TranscriptSegment[] {
  return segments.flatMap((segment) =>
    createSubtitleSegments(
      segment.text,
      Math.max(0.1, segment.end - segment.start),
      timing,
    ).map((chunk) => ({
      text: chunk.text,
      start: segment.start + chunk.start,
      end: segment.start + chunk.end,
    })),
  );
}

function resampleAudioBuffer(
  buffer: AudioBuffer,
  targetSampleRate: number,
): Float32Array {
  const ratio = buffer.sampleRate / targetSampleRate;
  const length = Math.max(1, Math.round(buffer.duration * targetSampleRate));
  const output = new Float32Array(length);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  for (let i = 0; i < length; i++) {
    const sourceIndex = i * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(buffer.length - 1, left + 1);
    const t = sourceIndex - left;
    let sample = 0;
    for (const channel of channels) {
      sample += channel[left] * (1 - t) + channel[right] * t;
    }
    output[i] = sample / channels.length;
  }
  return output;
}

function TranscriptionModal({
  browserAvailable,
  isTranscribing,
  progress,
  options,
  onChange,
  onClose,
  onSubmit,
}: {
  browserAvailable: boolean;
  isTranscribing: boolean;
  progress: string;
  options: TranscriptionOptions;
  onChange: (options: TranscriptionOptions) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const source = browserAvailable ? options.source : "model";
  const [fonts, setFonts] = useState<string[]>([]);
  const [fontPermission, setFontPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  const [requestingFonts, setRequestingFonts] = useState(false);

  useEffect(() => {
    if (!browserAvailable && options.source === "browser") {
      onChange({ ...options, source: "model" });
    }
  }, [browserAvailable, options, onChange]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await getFontPermissionState();
        if (!mounted) return;
        setFontPermission(state);

        const safe = WEB_SAFE_FONTS;
        const google = GOOGLE_FONTS;
        const system = ["system-ui", "sans-serif", "serif", "monospace"];

        if (state === "granted") {
          const found = await detectAvailableFonts(COMMON_FONTS);
          if (!mounted) return;
          setFonts(
            Array.from(new Set([...safe, ...found, ...google, ...system])),
          );
          return;
        }

        const fallback = getAvailableFonts(COMMON_FONTS);
        if (!mounted) return;
        setFonts(
          Array.from(new Set([...safe, ...fallback, ...google, ...system])),
        );
      } catch {
        if (!mounted) return;
        setFonts(
          Array.from(
            new Set([
              ...WEB_SAFE_FONTS,
              "Inter",
              "Arial",
              "Georgia",
              "monospace",
              ...GOOGLE_FONTS,
            ]),
          ),
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUnlockFonts = async () => {
    setRequestingFonts(true);
    try {
      const localFonts = await requestFontAccess();
      if (localFonts && localFonts.length > 0) {
        setFonts(
          Array.from(
            new Set([
              ...WEB_SAFE_FONTS,
              ...localFonts,
              ...GOOGLE_FONTS,
              "system-ui",
              "sans-serif",
              "serif",
              "monospace",
            ]),
          ),
        );
        setFontPermission("granted");
      }
    } finally {
      setRequestingFonts(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={isTranscribing ? undefined : onClose}
    >
      <div
        className="modal-content transcription-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Subtitles</h2>
          <button
            className="close-modal-btn"
            disabled={isTranscribing}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-body transcription-modal-body">
          <p className="transcription-note">
            Moonshine runs locally inside this tab/app. The model may download
            once and then cache in your browser. Your audio is not uploaded for
            model transcription, and the output may be inaccurate.
          </p>
          <label className="transcription-row">
            <span>Method</span>
            <select
              value={source}
              disabled={isTranscribing}
              onChange={(e) =>
                onChange({
                  ...options,
                  source: e.target.value as TranscriptSource,
                })
              }
            >
              <option value="model">Model</option>
              <option value="browser" disabled={!browserAvailable}>
                Browser{browserAvailable ? "" : " unavailable"}
              </option>
            </select>
          </label>
          {source === "model" ? (
            <label className="transcription-row">
              <span>Model</span>
              <select
                value={options.model}
                disabled={isTranscribing}
                onChange={(e) =>
                  onChange({ ...options, model: e.target.value })
                }
              >
                {MOONSHINE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="transcription-row">
            <span>Timing</span>
            <select
              value={options.timing}
              disabled={isTranscribing}
              onChange={(e) =>
                onChange({
                  ...options,
                  timing: e.target.value as TranscriptTiming,
                })
              }
            >
              <option value="phrase">Per phrase</option>
              <option value="word">Per word</option>
            </select>
          </label>
          <label className="transcription-row">
            <span>Font</span>
            <div className="transcription-font-controls">
              <select
                value={options.font}
                disabled={isTranscribing}
                onChange={(e) => {
                  const font = e.target.value;
                  loadGoogleFont(font);
                  onChange({ ...options, font });
                }}
                style={{ fontFamily: buildFontStack(options.font) }}
              >
                {!fonts.includes(options.font) && options.font ? (
                  <option
                    value={options.font}
                    style={{ fontFamily: buildFontStack(options.font) }}
                  >
                    {options.font}
                  </option>
                ) : null}
                {fonts.map((font) => (
                  <option
                    key={font}
                    value={font}
                    style={{ fontFamily: buildFontStack(font) }}
                  >
                    {font}
                  </option>
                ))}
              </select>
              {fontPermission !== "granted" ? (
                <button
                  className="properties-btn"
                  onClick={handleUnlockFonts}
                  disabled={isTranscribing || requestingFonts}
                  title="Request permission to access local fonts"
                >
                  {requestingFonts ? "Unlocking..." : "Use Device Fonts"}
                </button>
              ) : null}
            </div>
          </label>
          <label className="transcription-row">
            <span>Weight</span>
            <select
              value={options.style}
              disabled={isTranscribing}
              onChange={(e) =>
                onChange({
                  ...options,
                  style: Number(e.target.value) as SubtitleStyle,
                })
              }
            >
              <option value={100}>Thin (100)</option>
              <option value={200}>Extra Light (200)</option>
              <option value={300}>Light (300)</option>
              <option value={400}>Regular (400)</option>
              <option value={500}>Medium (500)</option>
              <option value={600}>Semi Bold (600)</option>
              <option value={700}>Bold (700)</option>
              <option value={800}>Extra Bold (800)</option>
              <option value={900}>Black (900)</option>
            </select>
          </label>
          {isTranscribing ? (
            <div className="transcription-progress">
              {progress || "Transcribing..."}
            </div>
          ) : null}
          <button
            className="btn primary transcription-submit"
            disabled={isTranscribing}
            onClick={onSubmit}
          >
            {isTranscribing ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <MessageSquare size={14} />
            )}
            <span>{isTranscribing ? "Transcribing" : "Transcribe"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function WaveformPreview({
  src,
  soundId,
  volume,
  onUpdateSrc,
  onTranscribe,
}: {
  src: string;
  soundId: string;
  volume: number;
  onUpdateSrc: (newSrc: string) => void;
  onTranscribe: (
    segments: TranscriptSegment[],
    options?: TranscriptionOptions,
    soundId?: string,
  ) => void;
}) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const hasSpeechRecognition =
    !!(window as any).SpeechRecognition ||
    !!(window as any).webkitSpeechRecognition;
  const [transcribeProgress, setTranscribeProgress] = useState("");
  const [isTranscribeModalOpen, setIsTranscribeModalOpen] = useState(false);
  const [transcriptionOptions, setTranscriptionOptions] =
    useState<TranscriptionOptions>(DEFAULT_TRANSCRIPTION_OPTIONS);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0, dpr: 1 });
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const cacheRef = useRef<{
    bg: HTMLCanvasElement;
    fg: HTMLCanvasElement;
  } | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const playIdRef = useRef(0);
  const playingRef = useRef(false);
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const transcriptionWorkerRef = useRef<Worker | null>(null);
  const transcriptionRequestRef = useRef<{
    id: number;
    duration: number;
    timing: TranscriptTiming;
    resolve: (segments: TranscriptSegment[]) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const transcriptionRequestIdRef = useRef(0);

  playingRef.current = playing;
  progressRef.current = progress;
  durationRef.current = duration;
  decodedBufferRef.current = decodedBuffer;
  selectionRef.current = selection;

  const previewId = `preview_${soundId}`;
  const BUCKETS = 300;

  const pushHistory = useCallback(
    (entry: HistoryEntry) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, entry];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setCanvasSize({
        width: rect.width,
        height: rect.height,
        dpr: window.devicePixelRatio || 1,
      });
    };
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateSize);
    });
    observer.observe(canvas);
    window.addEventListener("resize", updateSize);
    requestAnimationFrame(updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPeaks([]);
    setProgress(0);
    setSelection(null);
    setHistory([]);
    setHistoryIndex(-1);
    if (!src) {
      setDecodedBuffer(null);
      return;
    }
    runtime.decodeAudio(src).then((buffer) => {
      if (cancelled || !buffer) return;
      setDecodedBuffer(buffer);
      setHistory([{ src, buffer }]);
      setHistoryIndex(0);
      const channelData = buffer.getChannelData(0);
      const worker = new Worker(
        new URL("../workers/waveform.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (e) => {
        if (cancelled) {
          worker.terminate();
          return;
        }
        setPeaks(Array.from(e.data.peaks));
        setDuration(buffer.duration);
        worker.terminate();
      };
      worker.postMessage({
        channelData: new Float32Array(channelData),
        buckets: BUCKETS,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    return () => {
      transcriptionWorkerRef.current?.terminate();
      transcriptionWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const { width, height, dpr } = canvasSize;
    if (width === 0 || height === 0 || peaks.length === 0) return;

    const physicalWidth = width * dpr;
    const physicalHeight = height * dpr;

    if (!cacheRef.current) {
      cacheRef.current = {
        bg: document.createElement("canvas"),
        fg: document.createElement("canvas"),
      };
    }
    const { bg, fg } = cacheRef.current;
    bg.width = physicalWidth;
    bg.height = physicalHeight;
    fg.width = physicalWidth;
    fg.height = physicalHeight;

    const ctxBg = bg.getContext("2d")!;
    const ctxFg = fg.getContext("2d")!;

    const canvas = canvasRef.current!;
    const style = getComputedStyle(canvas);
    const accentColor = style.getPropertyValue("--accent").trim() || "#3e7ef5";
    const surfaceColor =
      style.getPropertyValue("--bg-surface").trim() || "#38383f";

    const accentRgb = hexToRgb(accentColor);

    const maxPeak = Math.max(0.0001, ...peaks);
    const normalize = (v: number) => Math.pow(v / maxPeak, 0.65);
    const barWidth = physicalWidth / peaks.length;
    const gap = Math.max(1 * dpr, barWidth * 0.3);
    const cornerRadius = Math.max(1, (barWidth - gap) / 2);
    const centerY = physicalHeight / 2;

    const playedGradient = ctxFg.createLinearGradient(0, 0, 0, physicalHeight);
    playedGradient.addColorStop(
      0,
      `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.55)`,
    );
    playedGradient.addColorStop(0.5, accentColor);
    playedGradient.addColorStop(
      1,
      `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.55)`,
    );

    const unplayedGradient = ctxBg.createLinearGradient(
      0,
      0,
      0,
      physicalHeight,
    );
    unplayedGradient.addColorStop(0, `${surfaceColor}99`);
    unplayedGradient.addColorStop(0.5, surfaceColor);
    unplayedGradient.addColorStop(1, `${surfaceColor}99`);

    ctxBg.fillStyle = unplayedGradient;
    ctxBg.beginPath();
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const normalizedPeak = normalize(peaks[i]);
      const barHeight = Math.max(
        2 * dpr,
        normalizedPeak * physicalHeight * 0.9,
      );
      const drawX = x + gap / 2;
      const drawW = Math.max(0.5, barWidth - gap);
      const drawY = centerY - barHeight / 2;
      const radius = Math.min(cornerRadius, drawW / 2, barHeight / 2);
      ctxBg.roundRect(drawX, drawY, drawW, barHeight, radius);
    }
    ctxBg.fill();

    ctxFg.shadowColor = accentColor;
    ctxFg.shadowBlur = 4 * dpr;
    ctxFg.fillStyle = playedGradient;
    ctxFg.beginPath();
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const normalizedPeak = normalize(peaks[i]);
      const barHeight = Math.max(
        2 * dpr,
        normalizedPeak * physicalHeight * 0.9,
      );
      const drawX = x + gap / 2;
      const drawW = Math.max(0.5, barWidth - gap);
      const drawY = centerY - barHeight / 2;
      const radius = Math.min(cornerRadius, drawW / 2, barHeight / 2);
      ctxFg.roundRect(drawX, drawY, drawW, barHeight, radius);
    }
    ctxFg.fill();
  }, [peaks, canvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      canvasSize.width === 0 ||
      canvasSize.height === 0 ||
      !cacheRef.current
    )
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, dpr } = canvasSize;
    const physicalWidth = width * dpr;
    const physicalHeight = height * dpr;

    canvas.width = physicalWidth;
    canvas.height = physicalHeight;
    ctx.clearRect(0, 0, physicalWidth, physicalHeight);

    const style = getComputedStyle(canvas);
    const accentColor = style.getPropertyValue("--accent").trim() || "#3e7ef5";
    const surfaceColor =
      style.getPropertyValue("--bg-surface").trim() || "#38383f";
    const centerY = physicalHeight / 2;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = surfaceColor;
    ctx.lineWidth = Math.max(0.5, dpr * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(physicalWidth, centerY);
    ctx.stroke();
    ctx.restore();

    const { bg, fg } = cacheRef.current;
    ctx.drawImage(bg, 0, 0);

    const playedBoundaryX = progress * physicalWidth;
    if (playing && playedBoundaryX > 0) {
      const clipStartX = selection ? selection.start * physicalWidth : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipStartX, 0, playedBoundaryX - clipStartX, physicalHeight);
      ctx.clip();
      ctx.drawImage(fg, 0, 0);
      ctx.restore();
    }

    if (selection) {
      const selectXStart = selection.start * physicalWidth;
      const selectWidth = (selection.end - selection.start) * physicalWidth;
      ctx.save();
      ctx.fillStyle = "rgba(62, 126, 245, 0.25)";
      ctx.fillRect(selectXStart, 0, selectWidth, physicalHeight);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(selectXStart, 0);
      ctx.lineTo(selectXStart, physicalHeight);
      ctx.moveTo(selectXStart + selectWidth, 0);
      ctx.lineTo(selectXStart + selectWidth, physicalHeight);
      ctx.stroke();
      ctx.restore();
    }

    if (playing && progress > 0 && progress < 1) {
      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 6 * dpr;
      ctx.beginPath();
      ctx.moveTo(playedBoundaryX, 0);
      ctx.lineTo(playedBoundaryX, physicalHeight);
      ctx.stroke();
      ctx.restore();
    }
  }, [peaks, progress, playing, canvasSize, selection]);

  useEffect(() => {
    if (playing) runtime.setSoundVolume(previewId, volume);
  }, [volume, playing, previewId]);

  const stop = useCallback(() => {
    playIdRef.current++;
    runtime.stopSound(previewId);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
    setProgress(0);
  }, [previewId]);

  const play = useCallback(() => {
    if (playingRef.current) {
      stop();
      return;
    }
    const buf = decodedBufferRef.current;
    const dur = durationRef.current;
    const sel = selectionRef.current;
    if (!buf || dur === 0) return;

    const currentPlayId = ++playIdRef.current;
    const startPct = sel ? sel.start : 0;
    const endPct = sel ? sel.end : 1;
    const playOffsetSec = startPct * dur;
    const playDurationSec = (endPct - startPct) * dur;

    startRef.current = performance.now() - playOffsetSec * 1000;
    setPlaying(true);

    const tick = () => {
      if (playIdRef.current !== currentPlayId) return;
      const elapsed = (performance.now() - startRef.current) / 1000;
      if (elapsed >= endPct * dur) {
        stop();
        return;
      }
      setProgress(dur > 0 ? Math.min(1, elapsed / dur) : 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    runtime
      .previewSound(src, previewId, volume, playOffsetSec, playDurationSec)
      .then(() => {
        if (playIdRef.current !== currentPlayId) return;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setPlaying(false);
        setProgress(0);
      });
  }, [src, previewId, volume, stop]);

  const skipTo = useCallback(
    (pct: number) => {
      const dur = durationRef.current;
      const targetOffset = pct * dur;
      const sel = selectionRef.current;
      if (playingRef.current) {
        const currentPlayId = ++playIdRef.current;
        runtime.stopSound(previewId);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        startRef.current = performance.now() - targetOffset * 1000;
        setProgress(pct);

        const endPct = sel ? sel.end : 1;
        const playDurationSec = (endPct - pct) * dur;

        const tick = () => {
          if (playIdRef.current !== currentPlayId) return;
          const elapsed = (performance.now() - startRef.current) / 1000;
          if (elapsed >= endPct * dur) {
            stop();
            return;
          }
          setProgress(dur > 0 ? Math.min(1, elapsed / dur) : 0);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        runtime
          .previewSound(src, previewId, volume, targetOffset, playDurationSec)
          .then(() => {
            if (playIdRef.current !== currentPlayId) return;
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            setPlaying(false);
            setProgress(0);
          });
      } else {
        setProgress(pct);
      }
    },
    [src, previewId, volume, stop],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleWindowMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || dragStartRef.current === null || !decodedBufferRef.current)
        return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const start = Math.min(dragStartRef.current, pct);
      const end = Math.max(dragStartRef.current, pct);
      if (end - start > 0.005) {
        setSelection({ start, end });
      } else {
        setSelection(null);
      }
    };
    const handleWindowMouseUp = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        dragStartRef.current === null ||
        !decodedBufferRef.current
      ) {
        setIsDragging(false);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const start = Math.min(dragStartRef.current, pct);
      const end = Math.max(dragStartRef.current, pct);
      if (end - start <= 0.005) {
        setSelection(null);
        skipTo(pct);
      }
      setIsDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging, skipTo]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !decodedBufferRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));

    containerRef.current?.focus();

    if (e.shiftKey && selection) {
      const anchor = selection.start;
      const start = Math.min(anchor, pct);
      const end = Math.max(anchor, pct);
      setSelection({ start, end });
    } else {
      dragStartRef.current = pct;
      setIsDragging(true);
      setSelection(null);
    }
  };

  const applyEdit = useCallback(
    (newBuffer: AudioBuffer) => {
      const url = commitBuffer(newBuffer);
      onUpdateSrc(url);
      setDecodedBuffer(newBuffer);
      setDuration(newBuffer.duration);
      setSelection(null);
      setProgress(0);

      const worker = new Worker(
        new URL("../workers/waveform.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (e) => {
        setPeaks(Array.from(e.data.peaks));
        worker.terminate();
      };
      worker.postMessage({
        channelData: new Float32Array(newBuffer.getChannelData(0)),
        buckets: BUCKETS,
      });

      pushHistory({ src: url, buffer: newBuffer });
    },
    [onUpdateSrc, pushHistory],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setHistoryIndex((i) => i - 1);
    setDecodedBuffer(prev.buffer);
    setDuration(prev.buffer.duration);
    setSelection(null);
    setProgress(0);
    onUpdateSrc(prev.src);

    const worker = new Worker(
      new URL("../workers/waveform.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e) => {
      setPeaks(Array.from(e.data.peaks));
      worker.terminate();
    };
    worker.postMessage({
      channelData: new Float32Array(prev.buffer.getChannelData(0)),
      buckets: BUCKETS,
    });
  }, [history, historyIndex, onUpdateSrc]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex((i) => i + 1);
    setDecodedBuffer(next.buffer);
    setDuration(next.buffer.duration);
    setSelection(null);
    setProgress(0);
    onUpdateSrc(next.src);

    const worker = new Worker(
      new URL("../workers/waveform.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e) => {
      setPeaks(Array.from(e.data.peaks));
      worker.terminate();
    };
    worker.postMessage({
      channelData: new Float32Array(next.buffer.getChannelData(0)),
      buckets: BUCKETS,
    });
  }, [history, historyIndex, onUpdateSrc]);

  const handleTrimToSelection = useCallback(() => {
    const buf = decodedBufferRef.current;
    const sel = selectionRef.current;
    if (!buf || !sel) return;
    const startSample = Math.floor(sel.start * buf.length);
    const endSample = Math.floor(sel.end * buf.length);
    if (startSample >= endSample) return;
    const newLength = endSample - startSample;
    const ctx = createAudioContext();
    const newBuffer = ctx.createBuffer(
      buf.numberOfChannels,
      newLength,
      buf.sampleRate,
    );
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      newBuffer
        .getChannelData(ch)
        .set(buf.getChannelData(ch).subarray(startSample, endSample));
    }
    ctx.close();
    applyEdit(newBuffer);
  }, [applyEdit]);

  useEffect(() => {
    if (!isFocused || !decodedBufferRef.current) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        play();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSelection(null);
        return;
      }

      if (isMod && key === "a") {
        e.preventDefault();
        setSelection({ start: 0, end: 1 });
        return;
      }

      if (isMod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (isMod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      const buf = decodedBufferRef.current!;
      const sel = selectionRef.current;
      const prog = progressRef.current;

      if (isMod && key === "c") {
        if (!sel) return;
        e.preventDefault();
        const startSample = Math.floor(sel.start * buf.length);
        const endSample = Math.floor(sel.end * buf.length);
        if (startSample >= endSample) return;
        const channels: Float32Array[] = [];
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          channels.push(buf.getChannelData(ch).slice(startSample, endSample));
        }
        audioClipboard = { channels, sampleRate: buf.sampleRate };
        return;
      }

      if (isMod && key === "x") {
        if (!sel) return;
        e.preventDefault();
        const startSample = Math.floor(sel.start * buf.length);
        const endSample = Math.floor(sel.end * buf.length);
        if (startSample >= endSample) return;

        const channels: Float32Array[] = [];
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          channels.push(buf.getChannelData(ch).slice(startSample, endSample));
        }
        audioClipboard = { channels, sampleRate: buf.sampleRate };

        const newLength = buf.length - (endSample - startSample);
        if (newLength <= 0) return;
        const ctx = createAudioContext();
        const newBuffer = ctx.createBuffer(
          buf.numberOfChannels,
          newLength,
          buf.sampleRate,
        );
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const newChan = newBuffer.getChannelData(ch);
          const origChan = buf.getChannelData(ch);
          newChan.set(origChan.subarray(0, startSample), 0);
          newChan.set(origChan.subarray(endSample), startSample);
        }
        ctx.close();
        applyEdit(newBuffer);
        return;
      }

      if (isMod && key === "v") {
        if (!audioClipboard) return;
        e.preventDefault();
        const deleteStart = sel
          ? Math.floor(sel.start * buf.length)
          : Math.floor(prog * buf.length);
        const deleteEnd = sel ? Math.floor(sel.end * buf.length) : deleteStart;
        const clipLen = audioClipboard.channels[0].length;
        const newLength = buf.length - (deleteEnd - deleteStart) + clipLen;
        const ctx = createAudioContext();
        const newBuffer = ctx.createBuffer(
          buf.numberOfChannels,
          newLength,
          buf.sampleRate,
        );
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const newChan = newBuffer.getChannelData(ch);
          const origChan = buf.getChannelData(ch);
          const clipChan =
            audioClipboard.channels[ch] ?? audioClipboard.channels[0];
          newChan.set(origChan.subarray(0, deleteStart), 0);
          newChan.set(clipChan, deleteStart);
          newChan.set(origChan.subarray(deleteEnd), deleteStart + clipLen);
        }
        ctx.close();
        applyEdit(newBuffer);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (!sel) return;
        e.preventDefault();
        const deleteStart = Math.floor(sel.start * buf.length);
        const deleteEnd = Math.floor(sel.end * buf.length);
        if (deleteStart >= deleteEnd) return;
        const newLength = buf.length - (deleteEnd - deleteStart);
        if (newLength <= 0) return;
        const ctx = createAudioContext();
        const newBuffer = ctx.createBuffer(
          buf.numberOfChannels,
          newLength,
          buf.sampleRate,
        );
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const newChan = newBuffer.getChannelData(ch);
          const origChan = buf.getChannelData(ch);
          newChan.set(origChan.subarray(0, deleteStart), 0);
          newChan.set(origChan.subarray(deleteEnd), deleteStart);
        }
        ctx.close();
        applyEdit(newBuffer);
        return;
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [isFocused, play, handleUndo, handleRedo, applyEdit]);

  const handleLegacyTranscribe = useCallback(() => {
    const buf = decodedBufferRef.current;
    if (!buf || isTranscribing) return;

    setIsTranscribing(true);
    setTranscribeProgress("Transcribing…");

    const SR =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition;
    const wavBytes = audioBufferToWav(buf);
    const blob = new Blob([wavBytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.muted = true;

    const rec: any = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    const segments: TranscriptSegment[] = [];
    let segmentStart = 0;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          if (text) {
            const now = audio.currentTime;
            segments.push({ text, start: segmentStart, end: now });
            segmentStart = now;
          }
        }
      }
      const pct =
        buf.duration > 0
          ? Math.min(99, Math.round((audio.currentTime / buf.duration) * 100))
          : 0;
      setTranscribeProgress(`Transcribing… ${pct}%`);
    };

    const finish = () => {
      rec.stop();
      audio.pause();
      URL.revokeObjectURL(url);
      if (segments.length > 0) {
        onTranscribe(segments, undefined, soundId);
        setTranscribeProgress("Done!");
        setTimeout(() => setTranscribeProgress(""), 2000);
      } else {
        setTranscribeProgress("No speech detected");
        setTimeout(() => setTranscribeProgress(""), 2000);
      }
      setIsTranscribing(false);
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      finish();
    };

    audio.onended = finish;
    audio.onerror = finish;

    rec.start();
    audio.play().catch(finish);
  }, [decodedBufferRef, isTranscribing, onTranscribe]);

  const runBrowserTranscription = useCallback(
    (buf: AudioBuffer, options: TranscriptionOptions) => {
      return new Promise<TranscriptSegment[]>((resolve, reject) => {
        const SR =
          (window as any).SpeechRecognition ??
          (window as any).webkitSpeechRecognition;
        if (!SR) {
          reject(new Error("Browser speech recognition is not available"));
          return;
        }

        const wavBytes = audioBufferToWav(buf);
        const blob = new Blob([wavBytes], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.muted = true;

        const rec: any = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.maxAlternatives = 1;

        const segments: TranscriptSegment[] = [];
        let segmentStart = 0;
        let finished = false;

        const finish = () => {
          if (finished) return;
          finished = true;
          try {
            rec.stop();
          } catch {}
          audio.pause();
          URL.revokeObjectURL(url);
          resolve(retimeSegments(segments, options.timing));
        };

        rec.onresult = (e: any) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              const text = e.results[i][0].transcript.trim();
              if (text) {
                const now = audio.currentTime;
                segments.push({
                  text,
                  start: segmentStart,
                  end: Math.max(segmentStart + 0.1, now),
                });
                segmentStart = now;
              }
            }
          }
          const pct =
            buf.duration > 0
              ? Math.min(
                  99,
                  Math.round((audio.currentTime / buf.duration) * 100),
                )
              : 0;
          setTranscribeProgress(`Transcribing... ${pct}%`);
        };

        rec.onerror = (e: any) => {
          if (e.error === "no-speech") return;
          finish();
        };

        audio.onended = finish;
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Could not play audio for browser transcription"));
        };

        try {
          rec.start();
          audio.play().catch((error) => {
            URL.revokeObjectURL(url);
            reject(
              error instanceof Error
                ? error
                : new Error("Could not start browser transcription"),
            );
          });
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(
            error instanceof Error
              ? error
              : new Error("Could not start browser transcription"),
          );
        }
      });
    },
    [],
  );

  const runModelTranscription = useCallback(
    (buf: AudioBuffer, options: TranscriptionOptions) => {
      return new Promise<TranscriptSegment[]>((resolve, reject) => {
        let worker = transcriptionWorkerRef.current;
        if (!worker) {
          worker = new Worker(
            new URL("../workers/transcription.worker.ts", import.meta.url),
            { type: "module" },
          );
          worker.onmessage = (e) => {
            const request = transcriptionRequestRef.current;
            if (!request || e.data.id !== request.id) return;
            if (e.data.type === "progress") {
              setTranscribeProgress(e.data.message);
              return;
            }
            transcriptionRequestRef.current = null;
            if (e.data.type === "complete") {
              const segments =
                Array.isArray(e.data.segments) && e.data.segments.length > 0
                  ? retimeSegments(e.data.segments, request.timing)
                  : createSubtitleSegments(
                      String(e.data.text ?? ""),
                      request.duration,
                      request.timing,
                    );
              request.resolve(segments);
              return;
            }
            request.reject(
              new Error(e.data.message || "Moonshine transcription failed"),
            );
          };
          worker.onerror = () => {
            const request = transcriptionRequestRef.current;
            transcriptionRequestRef.current = null;
            request?.reject(new Error("Moonshine worker failed"));
          };
          transcriptionWorkerRef.current = worker;
        }

        const id = ++transcriptionRequestIdRef.current;
        const audio = resampleAudioBuffer(buf, 16000);
        transcriptionRequestRef.current = {
          id,
          duration: buf.duration,
          timing: options.timing,
          resolve,
          reject,
        };
        worker.postMessage({ id, audio, model: options.model }, [audio.buffer]);
      });
    },
    [],
  );

  const handleConfiguredTranscribe = useCallback(async () => {
    const buf = decodedBufferRef.current;
    if (!buf || isTranscribing) return;

    setIsTranscribing(true);
    setTranscribeProgress(
      transcriptionOptions.source === "model"
        ? "Loading Moonshine..."
        : "Starting browser transcription...",
    );

    try {
      const segments =
        transcriptionOptions.source === "model"
          ? await runModelTranscription(buf, transcriptionOptions)
          : await runBrowserTranscription(buf, transcriptionOptions);
      if (segments.length > 0) {
        onTranscribe(segments, transcriptionOptions, soundId);
        setTranscribeProgress("Done!");
        setTimeout(() => setTranscribeProgress(""), 2000);
      } else {
        setTranscribeProgress("No speech detected");
        setTimeout(() => setTranscribeProgress(""), 2000);
      }
      setIsTranscribeModalOpen(false);
    } catch (error) {
      setTranscribeProgress(
        error instanceof Error ? error.message : "Transcription failed",
      );
      setTimeout(() => setTranscribeProgress(""), 3500);
    } finally {
      setIsTranscribing(false);
    }
  }, [
    decodedBufferRef,
    isTranscribing,
    onTranscribe,
    runBrowserTranscription,
    runModelTranscription,
    transcriptionOptions,
  ]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const selectionDuration = selection
    ? (selection.end - selection.start) * duration
    : null;
  const cursorTime = progress * duration;

  return (
    <div className="audio-main-preview">
      <div className="audio-editor-toolbar">
        <button
          className="audio-tool-btn"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={handleUndo}
        >
          <Undo2 size={14} />
        </button>
        <button
          className="audio-tool-btn"
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={handleRedo}
        >
          <Redo2 size={14} />
        </button>
        <div className="audio-toolbar-divider" />
        <button
          className="audio-tool-btn"
          title="Trim to selection"
          disabled={!selection}
          onClick={handleTrimToSelection}
        >
          <Scissors size={14} />
          <span>Trim</span>
        </button>
        <div className="audio-toolbar-divider" />
        <button
          className="audio-tool-btn"
          title="Transcribe audio to subtitles"
          disabled={!decodedBuffer}
          onClick={() => setIsTranscribeModalOpen(true)}
          style={{ color: isTranscribing ? "var(--accent)" : undefined }}
        >
          {isTranscribing ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <MessageSquare size={14} />
          )}
          <span>Transcribe</span>
        </button>
        <div className="audio-toolbar-spacer" />
        <div className="audio-time-display">
          {selection ? (
            <span title="Selection duration">
              {formatTime(selection.start * duration)} -{" "}
              {formatTime(selection.end * duration)}
              <span className="audio-time-secondary">
                {" "}
                ({formatTime(selectionDuration!)})
              </span>
            </span>
          ) : (
            <span title="Playhead position">{formatTime(cursorTime)}</span>
          )}
          <span className="audio-time-total">/ {formatTime(duration)}</span>
        </div>
      </div>
      <div className="audio-controls">
        <button
          className="audio-play-btn"
          title={playing ? "Stop (Space)" : "Play (Space)"}
          onClick={play}
        >
          {playing ? (
            <Square size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </button>
        <div
          ref={containerRef}
          className="audio-waveform-container"
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            outline: "none",
            cursor: "crosshair",
            position: "relative",
            boxShadow: isFocused ? "0 0 0 2px var(--accent)" : "none",
            borderRadius: "4px",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>
      {isTranscribeModalOpen ? (
        <TranscriptionModal
          browserAvailable={hasSpeechRecognition}
          isTranscribing={isTranscribing}
          progress={transcribeProgress}
          options={transcriptionOptions}
          onChange={setTranscriptionOptions}
          onClose={() => {
            if (!isTranscribing) setIsTranscribeModalOpen(false);
          }}
          onSubmit={handleConfiguredTranscribe}
        />
      ) : null}
    </div>
  );
}

const MENU_ID = "sound-menu";

export default function SoundTab() {
  const { state, dispatch } = useSprites();
  const sprite = state.sprites.find((s) => s.id === state.selectedSpriteId);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const activeItem = sprite?.data.sounds[selectedIdx];
  const { show } = useContextMenu({ id: MENU_ID });

  const updateSoundById = (id: string, changes: Record<string, unknown>) => {
    if (!sprite) return;
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          sounds: sprite.data.sounds.map((s) =>
            s.id === id ? { ...s, ...changes } : s,
          ),
        },
      },
    });
  };

  const handleTranscription = useCallback(
    (
      segments: TranscriptSegment[],
      options = DEFAULT_TRANSCRIPTION_OPTIONS,
      soundId?: string,
    ) => {
      if (!sprite || segments.length === 0) return;

      const subtitleData = {
        fontFamily: options.font,
        fontWeight: options.style,
        color: "#f7fbff",
        align: "center" as const,
      };

      const escapeXml = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/\n/g, "&#10;")
          .replace(/\r/g, "");

      const buildSubtitleXml = (segs: TranscriptSegment[]): string => {
        const wordMode = options.timing === "word";
        const transcriptVarId = "subtitle_transcript_var";
        const lineVarId = "subtitle_line_var";
        const entries = (
          wordMode
            ? (() => {
                const out: any[] = [];
                let phraseGap = 0;
                let accum = "";
                let lastEnd = 0;
                segs.forEach((seg, idx) => {
                  const gap =
                    idx === 0
                      ? Math.max(0, seg.start)
                      : Math.max(0, seg.start - lastEnd);
                  if (gap > 0.25) {
                    accum = seg.text;
                    phraseGap = gap;
                  } else accum = accum ? accum + " " + seg.text : seg.text;
                  lastEnd = seg.end;
                  out.push({
                    text: wrapText(accum),
                    gap: phraseGap,
                    duration: Math.max(0.1, seg.end - seg.start),
                  });
                  phraseGap = 0;
                });
                return out;
              })()
            : segs.map((seg, idx) => ({
                text: seg.text,
                gap:
                  idx === 0
                    ? Math.max(0, seg.start)
                    : Math.max(0, seg.start - segs[idx - 1].end),
                duration: Math.max(0.1, seg.end - seg.start),
              }))
        )
          .map((seg, idx) => {
            const gap = seg.gap;
            const duration = seg.duration;
            return `<value name="ADD${idx}">
          <block type="dicts_create_with" id="subtitle_entry_${idx}">
            <mutation items="3"></mutation>
            <value name="KEY0"><shadow type="text"><field name="TEXT">text</field></shadow></value>
            <value name="VALUE0"><shadow type="text"><field name="TEXT">${escapeXml(seg.text)}</field></shadow></value>
            <value name="KEY1"><shadow type="text"><field name="TEXT">gap</field></shadow></value>
            <value name="VALUE1"><shadow type="math_number"><field name="NUM">${gap.toFixed(3)}</field></shadow></value>
            <value name="KEY2"><shadow type="text"><field name="TEXT">duration</field></shadow></value>
            <value name="VALUE2"><shadow type="math_number"><field name="NUM">${duration.toFixed(3)}</field></shadow></value>
          </block>
        </value>`;
          })
          .join("");
        return `<xml xmlns="https:
  <variables>
    <variable id="${transcriptVarId}">transcript</variable>
    <variable id="${lineVarId}">line</variable>
  </variables>
  <block type="on_start" id="on_start_sub" x="20" y="20">
    <statement name="DO">
      ${
        soundId
          ? `<block type="audio_play" id="subtitle_play_sound">
        <field name="SOUND">${soundId}</field>
        <next>`
          : ""
      }
      <block type="variables_set" id="subtitle_set_transcript">
        <field name="VAR" id="${transcriptVarId}">transcript</field>
        <value name="VALUE">
          <block type="lists_create_with" id="subtitle_transcript_list">
            <mutation items="${segs.length}"></mutation>
            ${entries}
          </block>
        </value>
        <next>
          <block type="controls_forEach" id="subtitle_loop">
            <field name="VAR" id="${lineVarId}">line</field>
            <value name="LIST">
              <block type="variables_get" id="subtitle_get_transcript">
                <field name="VAR" id="${transcriptVarId}">transcript</field>
              </block>
            </value>
            <statement name="DO">
              <block type="wait_seconds" id="subtitle_wait_gap">
                <value name="SECONDS">
                  <block type="dicts_get_value" id="subtitle_get_gap">
                    <value name="DICT">
                      <block type="variables_get" id="subtitle_line_for_gap">
                        <field name="VAR" id="${lineVarId}">line</field>
                      </block>
                    </value>
                    <value name="KEY"><shadow type="text"><field name="TEXT">gap</field></shadow></value>
                  </block>
                </value>
                <next>
                  <block type="text_setText" id="subtitle_set_text">
                    <value name="TEXT">
                      <block type="dicts_get_value" id="subtitle_get_text">
                        <value name="DICT">
                          <block type="variables_get" id="subtitle_line_for_text">
                            <field name="VAR" id="${lineVarId}">line</field>
                          </block>
                        </value>
                        <value name="KEY"><shadow type="text"><field name="TEXT">text</field></shadow></value>
                      </block>
                    </value>
                    <next>
                      <block type="wait_seconds" id="subtitle_wait_duration">
                        <value name="SECONDS">
                          <block type="dicts_get_value" id="subtitle_get_duration">
                            <value name="DICT">
                              <block type="variables_get" id="subtitle_line_for_duration">
                                <field name="VAR" id="${lineVarId}">line</field>
                              </block>
                            </value>
                            <value name="KEY"><shadow type="text"><field name="TEXT">duration</field></shadow></value>
                          </block>
                        </value>
                        <next>
                          <block type="text_setText" id="subtitle_clear_text">
                            <value name="TEXT"><shadow type="text"><field name="TEXT"></field></shadow></value>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </next>
      </block>
      ${soundId ? `</next></block>` : ""}
    </statement>
  </block>
</xml>`;
      };

      const xml = buildSubtitleXml(segments);

      if (isTextData(sprite.data)) {
        dispatch({
          type: "UPDATE_SPRITE",
          id: sprite.id,
          changes: {
            blocklyXml: xml,
            data: { ...sprite.data, ...subtitleData },
          },
        });
      } else {
        const count = state.sprites.filter((s) => s.type === "text").length + 1;
        const newSprite = createTextSprite(`Subtitles ${count}`);
        const updatedSprite = {
          ...newSprite,
          blocklyXml: xml,
          data: { ...newSprite.data, ...subtitleData },
        };
        dispatch({ type: "ADD_SPRITE", sprite: updatedSprite });
        dispatch({ type: "SELECT_SPRITE", id: updatedSprite.id });
      }

      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        const ws = (window as any).Blockly?.getMainWorkspace?.();
        if (ws) {
          ws.refresh?.();
          ws.render?.();
          ws.resizeContents?.();
        }
        window.dispatchEvent(new CustomEvent("workspace-refresh"));
      }, 50);
    },
    [sprite, state.sprites, dispatch],
  );

  const readSoundFile = (file: File, replaceId?: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const currentSounds = [...(sprite?.data.sounds || [])];

      if (replaceId) {
        const idx = currentSounds.findIndex((s) => s.id === replaceId);
        if (idx !== -1) {
          currentSounds[idx] = {
            ...currentSounds[idx],
            src,
            name: file.name.replace(/\.[^.]+$/, "") || currentSounds[idx].name,
          };
        }
        dispatch({
          type: "UPDATE_SPRITE",
          id: sprite!.id,
          changes: {
            data: {
              ...sprite!.data,
              sounds: currentSounds,
              currentSoundId: replaceId,
            },
          },
        });
      } else {
        const id = generateMediaSoundId();
        currentSounds.push({
          id,
          name:
            file.name.replace(/\.[^.]+$/, "") ||
            `Sound ${currentSounds.length + 1}`,
          src,
          volume: 1,
        });
        setSelectedIdx(currentSounds.length - 1);
        dispatch({
          type: "UPDATE_SPRITE",
          id: sprite!.id,
          changes: {
            data: {
              ...sprite!.data,
              sounds: currentSounds,
              currentSoundId: id,
            },
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSound = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readSoundFile(file);
    };
    input.click();
  };

  const handleReplaceSound = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readSoundFile(file, id);
    };
    input.click();
  };

  const handleDeleteSound = (id: string) => {
    if (!sprite || sprite.data.sounds.length <= 1) return;
    const sounds = sprite.data.sounds;
    const deletedIdx = sounds.findIndex((s) => s.id === id);
    const nextSounds = sounds.filter((s) => s.id !== id);
    const nextIdx = Math.min(deletedIdx, nextSounds.length - 1);
    const nextId = nextSounds[nextIdx]?.id ?? nextSounds[0].id;
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          sounds: nextSounds,
          currentSoundId:
            sprite.data.currentSoundId === id
              ? nextId
              : sprite.data.currentSoundId,
        },
      },
    });
    setSelectedIdx(nextIdx);
  };

  if (!sprite) return null;

  return (
    <div className="asset-tab">
      <div className="asset-sidebar">
        <div className="asset-list">
          {sprite.data.sounds.map((s, i) => (
            <div
              key={s.id}
              className={`asset-card ${i === selectedIdx ? "selected" : ""}`}
              onClick={() => setSelectedIdx(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                show({ event: e, props: { sound: s } });
              }}
            >
              <div className="asset-card-preview">
                <AudioLines size={24} color="var(--text-secondary)" />
              </div>
              <div className="asset-card-info">
                {editingId === s.id ? (
                  <input
                    autoFocus
                    className="asset-card-name-input"
                    value={s.name}
                    onChange={(e) =>
                      updateSoundById(s.id, { name: e.target.value })
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape")
                        setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="asset-card-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedIdx(i);
                      setEditingId(s.id);
                    }}
                  >
                    {s.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="asset-sidebar-footer">
          <button className="add-sprite-btn" onClick={handleAddSound}>
            <Plus size={14} /> Add Sound
          </button>
        </div>
      </div>

      <div className="asset-editor">
        {activeItem ? (
          <>
            <div className="asset-editor-header">
              <input
                className="asset-editor-name-input"
                type="text"
                value={activeItem.name}
                onChange={(e) =>
                  updateSoundById(activeItem.id, { name: e.target.value })
                }
              />
              <div className="media-actions">
                <button
                  className="properties-btn"
                  onClick={() => handleReplaceSound(activeItem.id)}
                >
                  <Replace size={14} /> Replace
                </button>
                <button
                  className="properties-btn danger"
                  disabled={sprite.data.sounds.length <= 1}
                  onClick={() => handleDeleteSound(activeItem.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
            <div className="asset-editor-body">
              <WaveformPreview
                key={activeItem.id}
                src={activeItem.src}
                soundId={activeItem.id}
                volume={activeItem.volume ?? 1}
                onUpdateSrc={(newSrc) =>
                  updateSoundById(activeItem.id, { src: newSrc })
                }
                onTranscribe={handleTranscription}
              />
              <div className="asset-properties-grid">
                <div className="properties-row">
                  <span className="properties-label" style={{ width: "60px" }}>
                    Volume
                  </span>
                  <Volume2 size={14} color="var(--text-muted)" />
                  <input
                    className="properties-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((activeItem.volume ?? 1) * 100)}
                    onChange={(e) =>
                      updateSoundById(activeItem.id, {
                        volume: Number(e.target.value) / 100,
                      })
                    }
                  />
                  <span
                    className="properties-value"
                    style={{ minWidth: "32px" }}
                  >
                    {Math.round((activeItem.volume ?? 1) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="asset-empty-state">
            <AudioLines size={48} />
            <p>Select a sound to view and edit</p>
          </div>
        )}
      </div>

      <Menu id={MENU_ID}>
        <Item
          onClick={(e) => {
            setSelectedIdx(
              sprite.data.sounds.findIndex((s) => s.id === e.props.sound.id),
            );
            setEditingId(e.props.sound.id);
          }}
        >
          Rename
        </Item>
        <Item onClick={(e) => handleReplaceSound(e.props.sound.id)}>
          Replace
        </Item>
        <Item
          onClick={(e) => handleDeleteSound(e.props.sound.id)}
          style={{ color: "var(--danger)" }}
        >
          Delete
        </Item>
      </Menu>
    </div>
  );
}
