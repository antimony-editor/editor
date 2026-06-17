import { useEffect, useRef, useState } from "react";
import "../styles/editor.css";
import { useSprites, generateMediaSoundId } from "../lib/sprites";
import { AudioLines, Play, Square, Plus, Trash2, Replace, Volume2 } from "lucide-react";
import { Menu, Item, useContextMenu } from "react-contexify";
import runtime from "../lib/runtime";

let audioClipboard: { channels: Float32Array[]; sampleRate: number } | null = null;

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const resultChannels = [];
  let numSamples = buffer.length;
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
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}

function WaveformPreview({
  src,
  soundId,
  volume,
  onUpdateSrc,
}: {
  src: string;
  soundId: string;
  volume: number;
  onUpdateSrc: (newSrc: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0, dpr: 1 });
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const cacheRef = useRef<{ bg: HTMLCanvasElement; fg: HTMLCanvasElement } | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const playIdRef = useRef(0);

  const previewId = `preview_${soundId}`;
  const BUCKETS = 300;

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
    if (!src) {
      setDecodedBuffer(null);
      return;
    }
    runtime.decodeAudio(src).then((buffer) => {
      if (cancelled || !buffer) return;
      setDecodedBuffer(buffer);
      const channelData = buffer.getChannelData(0);
      const worker = new Worker(new URL("../workers/waveform.worker.ts", import.meta.url), { type: "module" });
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
    const surfaceColor = style.getPropertyValue("--bg-surface").trim() || "#38383f";

    const hexToRgb = (hex: string) => {
      const m = hex.replace("#", "").match(/.{1,2}/g);
      if (!m) return { r: 62, g: 126, b: 245 };
      const [r, g, b] = m.map((h) => parseInt(h, 16));
      return { r, g, b };
    };
    const accentRgb = hexToRgb(accentColor);

    const maxPeak = Math.max(0.0001, ...peaks);
    const normalize = (v: number) => Math.pow(v / maxPeak, 0.65);
    const barWidth = physicalWidth / peaks.length;
    const gap = Math.max(1 * dpr, barWidth * 0.3);
    const cornerRadius = Math.max(1, (barWidth - gap) / 2);
    const centerY = physicalHeight / 2;

    const playedGradient = ctxFg.createLinearGradient(0, 0, 0, physicalHeight);
    playedGradient.addColorStop(0, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.55)`);
    playedGradient.addColorStop(0.5, accentColor);
    playedGradient.addColorStop(1, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.55)`);

    const unplayedGradient = ctxBg.createLinearGradient(0, 0, 0, physicalHeight);
    unplayedGradient.addColorStop(0, `${surfaceColor}99`);
    unplayedGradient.addColorStop(0.5, surfaceColor);
    unplayedGradient.addColorStop(1, `${surfaceColor}99`);

    ctxBg.fillStyle = unplayedGradient;
    ctxBg.beginPath();
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const normalizedPeak = normalize(peaks[i]);
      const barHeight = Math.max(2 * dpr, normalizedPeak * physicalHeight * 0.9);
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
      const barHeight = Math.max(2 * dpr, normalizedPeak * physicalHeight * 0.9);
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
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0 || !cacheRef.current) return;
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
    const surfaceColor = style.getPropertyValue("--bg-surface").trim() || "#38383f";
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
    if (playedBoundaryX > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, playedBoundaryX, physicalHeight);
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

    if (progress > 0 && progress < 1) {
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
  }, [peaks, progress, canvasSize, selection]);

  useEffect(() => {
    if (playing) runtime.setSoundVolume(previewId, volume);
  }, [volume, playing, previewId]);

  const stop = () => {
    playIdRef.current++;
    runtime.stopSound(previewId);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
    setProgress(0);
  };

  const play = () => {
    if (playing) {
      stop();
      return;
    }
    const currentPlayId = ++playIdRef.current;
    const startPct = selection ? selection.start : 0;
    const endPct = selection ? selection.end : 1;
    const playOffsetSec = startPct * duration;
    const playDurationSec = (endPct - startPct) * duration;

    startRef.current = performance.now() - playOffsetSec * 1000;
    setPlaying(true);

    const tick = () => {
      if (playIdRef.current !== currentPlayId) return;
      const elapsed = (performance.now() - startRef.current) / 1000;
      if (elapsed >= endPct * duration) {
        stop();
        return;
      }
      setProgress(duration > 0 ? Math.min(1, elapsed / duration) : 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    runtime.previewSound(src, previewId, volume, playOffsetSec, playDurationSec).then(() => {
      if (playIdRef.current !== currentPlayId) return;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setPlaying(false);
      setProgress(0);
    });
  };

  const skipTo = (pct: number) => {
    const targetOffset = pct * duration;
    if (playing) {
      const currentPlayId = ++playIdRef.current;
      runtime.stopSound(previewId);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startRef.current = performance.now() - targetOffset * 1000;
      setProgress(pct);
      const tick = () => {
        if (playIdRef.current !== currentPlayId) return;
        const elapsed = (performance.now() - startRef.current) / 1000;
        setProgress(duration > 0 ? Math.min(1, elapsed / duration) : 0);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      runtime.previewSound(src, previewId, volume, targetOffset).then(() => {
        if (playIdRef.current !== currentPlayId) return;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setPlaying(false);
        setProgress(0);
      });
    } else {
      setProgress(pct);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleWindowMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || dragStartRef.current === null || !decodedBuffer) return;
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
      if (!canvas || dragStartRef.current === null || !decodedBuffer) {
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
  }, [isDragging, decodedBuffer]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !decodedBuffer) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));

    containerRef.current?.focus();

    if (e.shiftKey && selection) {
      const start = Math.min(selection.start, pct);
      const end = Math.max(selection.start, pct);
      setSelection({ start, end });
    } else {
      dragStartRef.current = pct;
      setIsDragging(true);
      setSelection(null);
    }
  };

  useEffect(() => {
    if (!isFocused || !decodedBuffer) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isMod && (key === "c" || e.code === "KeyC")) {
        if (!selection) return;
        e.preventDefault();
        const startSample = Math.floor(selection.start * decodedBuffer.length);
        const endSample = Math.floor(selection.end * decodedBuffer.length);
        if (startSample >= endSample) return;

        const channels = [];
        for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
          channels.push(decodedBuffer.getChannelData(channel).slice(startSample, endSample));
        }
        audioClipboard = {
          channels,
          sampleRate: decodedBuffer.sampleRate,
        };
      } else if (isMod && (key === "x" || e.code === "KeyX")) {
        if (!selection) return;
        e.preventDefault();
        const startSample = Math.floor(selection.start * decodedBuffer.length);
        const endSample = Math.floor(selection.end * decodedBuffer.length);
        if (startSample >= endSample) return;

        const channels = [];
        for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
          channels.push(decodedBuffer.getChannelData(channel).slice(startSample, endSample));
        }
        audioClipboard = {
          channels,
          sampleRate: decodedBuffer.sampleRate,
        };

        const newLength = decodedBuffer.length - (endSample - startSample);
        if (newLength <= 0) return;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const newBuffer = ctx.createBuffer(decodedBuffer.numberOfChannels, newLength, decodedBuffer.sampleRate);
        for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
          const newChan = newBuffer.getChannelData(channel);
          const origChan = decodedBuffer.getChannelData(channel);
          newChan.set(origChan.subarray(0, startSample), 0);
          newChan.set(origChan.subarray(endSample), startSample);
        }
        ctx.close();

        const wavBytes = audioBufferToWav(newBuffer);
        const blob = new Blob([wavBytes], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        runtime.setDecodedAudio(url, newBuffer);
        onUpdateSrc(url);
        setSelection(null);
      } else if (isMod && (key === "v" || e.code === "KeyV")) {
        if (!audioClipboard) return;
        e.preventDefault();
        const deleteStart = selection ? Math.floor(selection.start * decodedBuffer.length) : Math.floor(progress * decodedBuffer.length);
        const deleteEnd = selection ? Math.floor(selection.end * decodedBuffer.length) : deleteStart;
        const clipLen = audioClipboard.channels[0].length;
        const newLength = decodedBuffer.length - (deleteEnd - deleteStart) + clipLen;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const newBuffer = ctx.createBuffer(decodedBuffer.numberOfChannels, newLength, decodedBuffer.sampleRate);
        for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
          const newChan = newBuffer.getChannelData(channel);
          const origChan = decodedBuffer.getChannelData(channel);
          const clipChan = audioClipboard.channels[channel] || audioClipboard.channels[0];
          newChan.set(origChan.subarray(0, deleteStart), 0);
          newChan.set(clipChan, deleteStart);
          newChan.set(origChan.subarray(deleteEnd), deleteStart + clipLen);
        }
        ctx.close();

        const wavBytes = audioBufferToWav(newBuffer);
        const blob = new Blob([wavBytes], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        runtime.setDecodedAudio(url, newBuffer);
        onUpdateSrc(url);
        setSelection(null);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (!selection) return;
        e.preventDefault();
        const deleteStart = Math.floor(selection.start * decodedBuffer.length);
        const deleteEnd = Math.floor(selection.end * decodedBuffer.length);
        if (deleteStart >= deleteEnd) return;
        const newLength = decodedBuffer.length - (deleteEnd - deleteStart);
        if (newLength <= 0) return;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const newBuffer = ctx.createBuffer(decodedBuffer.numberOfChannels, newLength, decodedBuffer.sampleRate);
        for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
          const newChan = newBuffer.getChannelData(channel);
          const origChan = decodedBuffer.getChannelData(channel);
          newChan.set(origChan.subarray(0, deleteStart), 0);
          newChan.set(origChan.subarray(deleteEnd), deleteStart);
        }
        ctx.close();

        const wavBytes = audioBufferToWav(newBuffer);
        const blob = new Blob([wavBytes], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        runtime.setDecodedAudio(url, newBuffer);
        onUpdateSrc(url);
        setSelection(null);
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [isFocused, decodedBuffer, selection, progress]);

  return (
    <div className="audio-main-preview">
      <div className="audio-controls">
        <button className="audio-play-btn" onClick={play}>
          {playing ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <div
          ref={containerRef}
          className="audio-waveform-container"
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ outline: "none", cursor: "crosshair", position: "relative", boxShadow: isFocused ? "0 0 0 2px var(--accent)" : "none", borderRadius: "4px" }}
        >
          <canvas ref={canvasRef} onMouseDown={handleMouseDown} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>
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

  const updateSound = (id: string, changes: Record<string, unknown>) => {
    if (!sprite) return;
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          sounds: sprite.data.sounds.map((s, j) =>
            j === selectedIdx ? { ...s, ...changes } : s,
          ),
        },
      },
    });
  };

  const readSoundFile = (file: File, replace?: boolean, iId?: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const id = (replace && iId) ? iId : generateMediaSoundId();
      const currentSounds = [...(sprite?.data.sounds || [])];
      
      if (!replace && !iId) {
        currentSounds.push({
          id,
          name: file.name.replace(/\.[^.]+$/, "") || "Sound " + (currentSounds.length + 1),
          src,
          volume: 1,
        });
        setSelectedIdx(currentSounds.length - 1);
      } else {
        const idx = currentSounds.findIndex(s => s.id === id);
        if (idx !== -1) {
          currentSounds[idx] = { ...currentSounds[idx], src, name: file.name.replace(/\.[^.]+$/, "") };
        }
      }

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
      if (file) readSoundFile(file, true, id);
    };
    input.click();
  };

  const handleDeleteSound = (id: string) => {
    if (!sprite || sprite.data.sounds.length <= 1) return;
    const nextSounds = sprite.data.sounds.filter((s) => s.id !== id);
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          sounds: nextSounds,
          currentSoundId: sprite.data.currentSoundId === id ? nextSounds[0].id : sprite.data.currentSoundId
        }
      }
    });
    setSelectedIdx(0);
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
                    onChange={(e) => updateSound(s.id, { name: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingId(null);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="asset-card-name"
                    onClick={(e) => {
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
                onChange={(e) => updateSound(activeItem.id, { name: e.target.value })}
              />
              <div className="media-actions">
                <button className="properties-btn" onClick={() => handleReplaceSound(activeItem.id)}>
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
                onUpdateSrc={(newSrc) => updateSound(activeItem.id, { src: newSrc })}
              />
              <div className="asset-properties-grid">
                <div className="properties-row">
                  <span className="properties-label" style={{ width: '60px' }}>Volume</span>
                  <Volume2 size={14} color="var(--text-muted)" />
                  <input
                    className="properties-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((activeItem.volume ?? 1) * 100)}
                    onChange={(e) => updateSound(activeItem.id, { volume: Number(e.target.value) / 100 })}
                  />
                  <span className="properties-value" style={{ minWidth: '32px' }}>
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
        <Item onClick={(e) => {
          const newName = prompt("New name?", e.props.sound.name);
          if (newName) updateSound(e.props.sound.id, { name: newName });
        }}>Rename</Item>
        <Item onClick={(e) => handleReplaceSound(e.props.sound.id)}>Replace</Item>
        <Item onClick={(e) => handleDeleteSound(e.props.sound.id)} style={{ color: "var(--danger)" }}>Delete</Item>
      </Menu>
    </div>
  );
}