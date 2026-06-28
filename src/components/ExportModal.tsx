import { X, Gauge, FileVideo, Loader2, HardDrive, Video, Lightbulb, Square, Film } from "lucide-react";
import { useState, useEffect, useRef, useContext } from "react";
import { SpriteContext } from "../lib/sprites";
import { ProjectSettingsContext } from "../lib/settings";
import { TWEEN_MODE_OPTIONS } from "../lib/tween";
import { activeExtensions } from "../lib/extensions/manager";
import { extensions as builtinExtensions } from "../lib/extensions/builtinExtensions";
import * as Blockly from "blockly";

let cachedStaticFacts: string[] | null = null;

async function loadStaticFacts(): Promise<string[]> {
  if (cachedStaticFacts) return cachedStaticFacts;
  try {
    const res = await fetch("/fun-facts.json");
    cachedStaticFacts = await res.json();
    return cachedStaticFacts!;
  } catch {
    return [];
  }
}

function buildDynamicFacts(
  spriteCount: number,
  blockCount: number,
  projectWidth: number,
  projectHeight: number,
  projectFps: number,
  loadedExtensionCount: number,
  spriteNames: string[],
  spriteTypes: Record<string, number>
): string[] {
  const facts: string[] = [];

  facts.push(`There are ${TWEEN_MODE_OPTIONS.length} different tween modes available in Antimony.`);
  facts.push(`Antimony has ${builtinExtensions.length} built-in extensions ready to use.`);
  facts.push(`Antimony is built on top of ${Object.keys(Blockly.Blocks).length} registered block types.`);

  if (spriteCount === 1) {
    facts.push(`Your project has only 1 source. More the merrier!`);
  } else if (spriteCount > 1) {
    facts.push(`Your project has ${spriteCount} sources in it!`);
  }

  if (blockCount > 0) {
    facts.push(`Your project contains ${blockCount} block${blockCount === 1 ? "" : "s"} of code across all sources.`);
  } else {
    facts.push(`Your project has no blocks yet. There's a whole toolbox waiting for you!`);
  }

  if (spriteNames.length > 0) {
    const nameList = spriteNames.length === 1
      ? `"${spriteNames[0]}"`
      : spriteNames.slice(0, -1).map(n => `"${n}"`).join(", ") + ` and "${spriteNames[spriteNames.length - 1]}"`;
    facts.push(`The source${spriteNames.length === 1 ? "" : "s"} in your project ${spriteNames.length === 1 ? "is" : "are"} ${nameList}.`);
  }

  if (spriteTypes.text > 0 && spriteTypes.media === 0 && spriteTypes.video === 0) {
    facts.push(`Your project is text-only. Sometimes, words are all you need.`);
  }
  if (spriteTypes.video > 0) {
    facts.push(`Your project has ${spriteTypes.video} video source${spriteTypes.video === 1 ? "" : "s"}. Lights, camera, Antimony!`);
  }
  if (spriteTypes.media > 0) {
    facts.push(`Your project uses ${spriteTypes.media} image source${spriteTypes.media === 1 ? "" : "s"}.`);
  }

  const totalPixels = projectWidth * projectHeight;
  facts.push(`Your canvas is ${projectWidth}×${projectHeight}; that's exactly ${totalPixels.toLocaleString()} pixels to fill!`);

  if (projectFps === 60) {
    facts.push(`Your project runs at 60 FPS. Buttery smooth!`);
  } else if (projectFps >= 30) {
    facts.push(`Your project targets ${projectFps} FPS. Solid and smooth.`);
  } else {
    facts.push(`Your project runs at ${projectFps} FPS. Going for that cinematic feel?`);
  }

  if (loadedExtensionCount === 0) {
    facts.push(`You have no extensions loaded. Did you know Antimony has a Camera extension?`);
  } else if (loadedExtensionCount === 1) {
    facts.push(`You're using 1 extension. Extensions can add a lot of power to your project!`);
  } else {
    facts.push(`You have ${loadedExtensionCount} extensions loaded. You're really going all out here!`);
  }

  return facts;
}

function buildFunFacts(
  staticFacts: string[],
  spriteCount: number,
  blockCount: number,
  projectWidth: number,
  projectHeight: number,
  projectFps: number,
  loadedExtensionCount: number,
  spriteNames: string[],
  spriteTypes: Record<string, number>
): string[] {
  const dynamic = buildDynamicFacts(
    spriteCount,
    blockCount,
    projectWidth,
    projectHeight,
    projectFps,
    loadedExtensionCount,
    spriteNames,
    spriteTypes
  );

  const all = [...staticFacts, ...dynamic];
  all.push(`There are ${all.length + 1} different fun facts.`);

  if (new Date().getMonth() === 5) {
    all.push("Happy Pride Month!");
  }

  return all;
}

const RARE_FACT_MARKER = "Hey, wow! Uhh...";

function shuffleIndices(facts: string[], rareIndex: number) {
  const indices = Array.from({ length: facts.length }, (_, i) => i);

  if (rareIndex !== -1) {
    indices.splice(rareIndex, 1);
  }

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices;
}

function useFunFact(active: boolean, facts: string[]) {
  const [visible, setVisible] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rareIndex = facts.findIndex((f) => f.startsWith(RARE_FACT_MARKER));
  const shuffleRef = useRef<number[]>(shuffleIndices(facts, rareIndex));
  const positionRef = useRef(0);
  const [index, setIndex] = useState(shuffleRef.current[0] ?? 0);

  useEffect(() => {
    if (!active) return;

    const scheduleNext = (factIndex: number) => {
      const fact = facts[factIndex] ?? "";
      const delay = Math.min(12000, Math.max(4000, fact.length * 50));

      timerRef.current = setTimeout(() => {
        setVisible(false);

        setTimeout(() => {
          let next: number;

          if (
            rareIndex !== -1 &&
            Math.random() < 0.01 &&
            factIndex !== rareIndex
          ) {
            next = rareIndex;
          } else {
            positionRef.current++;

            if (positionRef.current >= shuffleRef.current.length) {
              shuffleRef.current = shuffleIndices(facts, rareIndex);
              positionRef.current = 0;
            }

            next = shuffleRef.current[positionRef.current];
          }

          setIndex(next);
          setVisible(true);
          scheduleNext(next);
        }, 400);
      }, delay);
    };

    scheduleNext(index);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return { fact: facts[index] ?? "", visible };
}

interface ExportModalProps {
  defaultFps: number;
  isClosing?: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  onAbortRecording?: () => void;
  onStopAndExport?: () => void;
  isExporting: boolean;
  isPreparing: boolean;
  isEncoding: boolean;
  progress: number | null;
  frameCount?: number;
}

export interface ExportOptions {
  fps: number;
  format: "mp4" | "webm" | "gif";
  bitrate: number;
  quality: "balanced" | "quality" | "realtime";
}

export default function ExportModal({
  defaultFps,
  isClosing = false,
  onClose,
  onExport,
  onAbortRecording,
  onStopAndExport,
  isExporting,
  isPreparing,
  isEncoding,
  progress,
  frameCount = 0,
}: ExportModalProps) {
  const [fps, setFps] = useState(defaultFps);
  const [format, setFormat] = useState<"mp4" | "webm" | "gif">("mp4");
  const [bitrate, setBitrate] = useState(10);
  const [quality, setQuality] = useState<"balanced" | "quality" | "realtime">(
    "quality",
  );
  const [staticFacts, setStaticFacts] = useState<string[]>([]);

  useEffect(() => {
    loadStaticFacts().then(setStaticFacts);
  }, []);

  const spriteCtx = useContext(SpriteContext);
  const settingsCtx = useContext(ProjectSettingsContext);

  const sprites = spriteCtx?.state.sprites ?? [];
  const settings = settingsCtx?.settings;

  const spriteNames = sprites.map((s) => s.name);
  const spriteTypes = sprites.reduce(
    (acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + 1 }),
    {} as Record<string, number>
  );
  const blockCount = sprites.reduce((total, s) => {
    if (!s.blocklyXml) return total;
    const matches = s.blocklyXml.match(/<block\b/g);
    return total + (matches?.length ?? 0);
  }, 0);

  const funFacts = buildFunFacts(
    staticFacts,
    sprites.length,
    blockCount,
    settings?.width ?? 1280,
    settings?.height ?? 720,
    settings?.fps ?? 60,
    activeExtensions.length,
    spriteNames,
    spriteTypes
  );

  const isActive = isExporting || isPreparing || isEncoding;
  const isRecording = isExporting && !isEncoding && !isPreparing;
  const { fact: funFact, visible: funFactVisible } = useFunFact(isActive, funFacts);

  return (
    <div
      className={`modal-overlay ${isClosing ? "is-closing" : ""}`}
      onClick={isActive ? undefined : onClose}
    >
      <div
        className="modal-content export-modal"
        style={{ width: "400px", maxWidth: "400px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            {isPreparing ? "Preparing..." : isRecording ? "Processing Video..." : isEncoding ? "Finalizing..." : "Export Video"}
          </h2>
          {!isActive && (
            <button className="close-modal-btn" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body settings-modal-body">
          {!isActive && (
            <>
              <div className="export-warning">
                The exporting process is highly unstable at the moment. Please report any bugs you find to us through Discord!
              </div>
              <section className="settings-section">
                <div className="settings-section-title">
                  <Gauge size={16} />
                  <span>Capture Settings</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Frame Rate (FPS)</span>
                  <input
                    className="settings-input"
                    type="number"
                    min={1}
                    max={60}
                    value={fps}
                    onChange={(e) =>
                      setFps(parseInt(e.target.value, 10) || defaultFps)
                    }
                  />
                </div>
                <div className="settings-row">
                  <span className="settings-label">Format</span>
                  <select
                    className="settings-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                  >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="webm">WebM (VP9)</option>
                    <option value="gif">GIF (Animated)</option>
                  </select>
                </div>
              </section>

              <section className="settings-section">
                <div className="settings-section-title">
                  <HardDrive size={16} />
                  <span>Quality Settings</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Bitrate (Mbps)</span>
                  <input
                    className="settings-input"
                    type="number"
                    min={1}
                    max={50}
                    value={bitrate}
                    disabled={format === "gif"}
                    onChange={(e) =>
                      setBitrate(parseInt(e.target.value, 10) || 10)
                    }
                  />
                </div>
                <div className="settings-row">
                  <span className="settings-label">Strategy</span>
                  <select
                    className="settings-select"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                  >
                    <option value="quality">High Quality</option>
                    <option value="balanced">Balanced</option>
                    <option value="realtime">Fast Encoding</option>
                  </select>
                </div>
              </section>
            </>
          )}

          {isPreparing && (
            <div className="export-encoding-body">
              <div className="export-encoding-icon">
                <Film className="animate-spin-slow" size={28} />
              </div>
              <div className="export-encoding-label">
                Preparing video sources...
              </div>
              <div className="export-encoding-sublabel">
                Pre-decoding video frames for fast export. This may take a moment.
              </div>
              <div className="export-fun-fact" style={{ opacity: funFactVisible ? 1 : 0 }}>
                <span className="export-fun-fact-label"><Lightbulb size={11} />Did you know?</span>
                {funFact}
              </div>
            </div>
          )}

          {isRecording && (
            <div className="export-encoding-body">
              <div className="export-encoding-icon">
                <Video size={28} />
              </div>
              <div className="export-encoding-label">
                {frameCount > 0 ? `${frameCount} frame${frameCount === 1 ? "" : "s"} captured` : "Starting up..."}
              </div>
              <div className="export-encoding-sublabel">
                Capturing and encoding on the fly. Do not close this window...
              </div>
              <div className="export-fun-fact" style={{ opacity: funFactVisible ? 1 : 0 }}>
                <span className="export-fun-fact-label"><Lightbulb size={11} />Did you know?</span>
                {funFact}
              </div>
              {(onStopAndExport || onAbortRecording) && (
                <div className="export-action-row">
                  {onStopAndExport && (
                    <button
                      className="primary-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={onStopAndExport}
                    >
                      <FileVideo size={15} />
                      Stop & Finalize
                    </button>
                  )}
                  {onAbortRecording && (
                    <button
                      className="danger-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={onAbortRecording}
                    >
                      <Square size={15} />
                      Abort Export
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isEncoding && (
            <div className="export-encoding-body">
              <div className="export-encoding-icon">
                <Loader2 className="animate-spin-slow" size={28} />
              </div>
              <div className="export-encoding-label">
                Finalizing File...
              </div>
              <div className="export-encoding-sublabel">
                Writing video headers and metadata. Just a moment!
              </div>
              <div className="export-progress-container">
                <div className="export-progress-bar">
                  <div
                    className="export-progress-fill"
                    style={{ width: `100%`, transition: "none" }}
                  />
                </div>
              </div>
              <div className="export-fun-fact" style={{ opacity: funFactVisible ? 1 : 0 }}>
                <span className="export-fun-fact-label"><Lightbulb size={11} />Did you know?</span>
                {funFact}
              </div>
            </div>
          )}

          <div className="modal-footer">
            {!isActive && (
              <button
                className="primary-btn"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                onClick={() =>
                  onExport({
                    fps,
                    format,
                    bitrate: bitrate * 1_000_000,
                    quality,
                  })
                }
              >
                <FileVideo size={18} />
                Export
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
