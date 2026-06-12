import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Play,
  Square,
  Pause,
  Video,
  Maximize,
  X,
  Download,
} from "lucide-react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Transformer,
  Line,
  Image as KonvaImage,
  Group,
} from "react-konva";
import KonvaCore from "konva";
import type Konva from "konva";
import {
  useSprites,
  isTextData,
  isMediaData,
  type Sprite,
} from "../lib/sprites";
import { buildFontStack } from "../lib/fonts";
import { useProjectSettings } from "../lib/settings";
import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import runtime, { type SpriteContext } from "../lib/runtime";
import ExportModal, { type ExportOptions } from "./ExportModal";
import { Plyr } from "plyr-react";
import "plyr/dist/plyr.css";

function createStageCoords(virtualWidth: number, virtualHeight: number) {
  return {
    toCanvasX: (x: number) => x + virtualWidth / 2,
    toCanvasY: (y: number) => virtualHeight / 2 - y,
    fromCanvasX: (cx: number) => cx - virtualWidth / 2,
    fromCanvasY: (cy: number) => virtualHeight / 2 - cy,
  };
}

function snapCanvasCoord(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

function snapCanvasPoint(x: number, y: number, gridSize: number) {
  return {
    x: snapCanvasCoord(x, gridSize),
    y: snapCanvasCoord(y, gridSize),
  };
}

function snapTopLeftToGrid(
  topLeftX: number,
  topLeftY: number,
  width: number,
  height: number,
  gridSize: number,
) {
  const centerX = topLeftX + width / 2;
  const centerY = topLeftY + height / 2;
  const snapped = snapCanvasPoint(centerX, centerY, gridSize);
  return {
    x: snapped.x - width / 2,
    y: snapped.y - height / 2,
  };
}

function getFpsColor(fps: number, targetFps: number): string {
  if (fps <= 0) return "var(--text-muted)";
  const ratio = fps / targetFps;
  if (ratio >= 0.9) return "var(--success)";
  if (ratio >= 0.7) return "#84cc16";
  if (ratio >= 0.5) return "var(--warning)";
  if (ratio >= 0.3) return "#f97316";
  return "var(--danger)";
}

function getStagePixelRatio() {
  if (typeof window === "undefined") return 2;
  return Math.min(3, Math.max(2, window.devicePixelRatio || 1));
}

KonvaCore.pixelRatio = getStagePixelRatio();

function getFrameMs(fps: number): number {
  return 1000 / Math.max(1, fps);
}

function parseHexColor(color: string): [number, number, number] | null {
  let hex = color.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function toHexByte(value: number) {
  return Math.round(value).toString(16).padStart(2, "0");
}

function getGridColorFromBackground(backgroundColor: string): string {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) return "#2a2a2a";
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const mix = luminance < 0.5 ? 0.18 : 0.14;
  const target = luminance < 0.5 ? 255 : 0;
  return `#${toHexByte(r + (target - r) * mix)}${toHexByte(g + (target - g) * mix)}${toHexByte(b + (target - b) * mix)}`;
}

function StageGrid({
  width,
  height,
  gridSize,
  stroke,
}: {
  width: number;
  height: number;
  gridSize: number;
  stroke: string;
}) {
  const lines = useMemo(() => {
    const elements: React.ReactNode[] = [];
    for (let x = 0; x <= width; x += gridSize) {
      elements.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke={stroke}
          strokeWidth={1}
          listening={false}
        />,
      );
    }
    for (let y = 0; y <= height; y += gridSize) {
      elements.push(
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke={stroke}
          strokeWidth={1}
          listening={false}
        />,
      );
    }
    return elements;
  }, [width, height, gridSize, stroke]);

  return <>{lines}</>;
}

function StageROT({ width, height }: { width: number; height: number }) {
  // maybe?
  const lines = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const Wthird = width / 3;
    const Hthird = height / 3;
    const rotColor = "rgba(41, 248, 34, 0.56)";
    // X
    for (let x = 1; x <= 2; x++) {
      elements.push(
        <Line
          key={`v-${x}`}
          points={[x * Wthird, 0, x * Wthird, height]}
          stroke={rotColor}
          strokeWidth={2}
          listening={false}
        />,
      );
    }
    // Y
    for (let y = 1; y <= 2; y++) {
      elements.push(
        <Line
          key={`h-${y}`}
          points={[0, y * Hthird, width, y * Hthird]}
          stroke={rotColor}
          strokeWidth={2}
          listening={false}
        />,
      );
    }

    return elements;
  }, [width, height]);

  return <>{lines}</>;
}

function SpriteRenderer({
  sprite,
  isSelected,
  showTransformer,
  onSelect,
  onNodeReady,
  stageCoords,
  snapToGrid,
  gridSize,
  isPlaying,
}: {
  sprite: Sprite;
  isSelected: boolean;
  showTransformer: boolean;
  onSelect: () => void;
  onNodeReady: (id: string, node: Konva.Node | null) => void;
  stageCoords: ReturnType<typeof createStageCoords>;
  snapToGrid: boolean;
  gridSize: number;
  isPlaying: boolean;
}) {
  const { toCanvasX, toCanvasY, fromCanvasX, fromCanvasY } = stageCoords;
  const nodeRef = useRef<Konva.Node | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const { dispatch } = useSprites();
  const mediaData = isMediaData(sprite.data) ? sprite.data : null;
  const activeImage = mediaData
    ? (mediaData.images.find(
        (image) => image.id === mediaData.currentImageId,
      ) ?? mediaData.images[0])
    : null;
  const mediaSrc = activeImage?.src ?? "";
  const [mediaElement, setMediaElement] = useState<
    HTMLImageElement | HTMLVideoElement | null
  >(null);

  const isVideo = useMemo(() => {
    if (!mediaSrc) return false;
    if (mediaSrc.startsWith("data:video/")) return true;
    return /\.(mp4|webm|ogg|mov)$/i.test(mediaSrc);
  }, [mediaSrc]);

  useEffect(() => {
    if (!mediaSrc) {
      setMediaElement(null);
      return;
    }

    let mounted = true;

    if (isVideo) {
      const video = document.createElement("video");
      video.src = mediaSrc;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const onCanPlay = () => {
        if (mounted) {
          setMediaElement(video);
        }
      };
      video.addEventListener("canplay", onCanPlay);
      video.load();

      return () => {
        mounted = false;
        video.removeEventListener("canplay", onCanPlay);
        video.pause();
        video.src = "";
        video.load();
      };
    } else {
      const image = new window.Image();
      image.onload = () => {
        if (mounted) setMediaElement(image);
      };
      image.onerror = () => {
        if (mounted) setMediaElement(null);
      };
      image.src = mediaSrc;
      return () => {
        mounted = false;
      };
    }
  }, [mediaSrc, isVideo]);

  useEffect(() => {
    if (isVideo && mediaElement instanceof HTMLVideoElement) {
      if (isPlaying) {
        const updateVideo = () => {
          if (!isPlaying) return;

          const rt = (window as any).RUNTIME;
          if (rt && rt.isStepping) {
            mediaElement.currentTime = rt.virtualTime / 1000;
          } else {
            if (mediaElement.paused) mediaElement.play().catch(() => {});
          }

          const layer = nodeRef.current?.getLayer();
          if (layer) layer.batchDraw();

          if (isPlaying && !rt.isStepping) {
            requestAnimationFrame(updateVideo);
          }
        };

        const rt = (window as any).RUNTIME;
        if (rt && rt.isStepping) {
          mediaElement.currentTime = rt.virtualTime / 1000;
        } else {
          requestAnimationFrame(updateVideo);
        }
      } else {
        mediaElement.pause();
        mediaElement.currentTime = 0;
      }
    }
  }, [isPlaying, mediaElement, isVideo]);

  useEffect(() => {
    onNodeReady(sprite.id, nodeRef.current);
    return () => onNodeReady(sprite.id, null);
  }, [onNodeReady, sprite.id]);

  useEffect(() => {
    if (isSelected && showTransformer && trRef.current && nodeRef.current) {
      trRef.current.nodes([nodeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, showTransformer]);

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!snapToGrid || sprite.locked) return;
    const node = e.target;
    const snapped = snapTopLeftToGrid(
      node.x(),
      node.y(),
      node.width(),
      node.height(),
      gridSize,
    );
    node.x(snapped.x);
    node.y(snapped.y);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (sprite.locked) return;
    const node = e.target;
    const width = node.width();
    const height = node.height();
    const topLeft = snapToGrid
      ? snapTopLeftToGrid(node.x(), node.y(), width, height, gridSize)
      : { x: node.x(), y: node.y() };
    if (snapToGrid) {
      node.x(topLeft.x);
      node.y(topLeft.y);
    }
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        x: fromCanvasX(topLeft.x + width / 2),
        y: fromCanvasY(topLeft.y + height / 2),
      },
    });
  };

  const handleTransformEnd = () => {
    const node = nodeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const updatedWidth = Math.max(
      5,
      Number((node.width() * scaleX).toFixed(2)),
    );
    const updatedHeight = Math.max(
      5,
      Number((node.height() * scaleY).toFixed(2)),
    );
    const updatedRotation = node.rotation();
    const changes: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      data?: typeof sprite.data;
    } = {
      x: 0,
      y: 0,
      width: updatedWidth,
      height: updatedHeight,
      rotation: updatedRotation,
    };

    const topLeft = snapToGrid
      ? snapTopLeftToGrid(
          node.x(),
          node.y(),
          updatedWidth,
          updatedHeight,
          gridSize,
        )
      : { x: node.x(), y: node.y() };
    changes.x = fromCanvasX(topLeft.x + updatedWidth / 2);
    changes.y = fromCanvasY(topLeft.y + updatedHeight / 2);
    if (snapToGrid) {
      node.x(topLeft.x);
      node.y(topLeft.y);
    }

    if (isTextSprite && isTextData(sprite.data)) {
      const fontScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
      changes.data = {
        ...sprite.data,
        fontSize: Math.max(
          8,
          Number((sprite.data.fontSize * fontScale).toFixed(2)),
        ),
      };
    }

    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes,
    });
  };

  const isTextSprite = sprite.type === "text";
  const canvasCenterX = toCanvasX(sprite.x);
  const canvasCenterY = toCanvasY(sprite.y);
  const canvasTopLeftX = canvasCenterX - sprite.width / 2;
  const canvasTopLeftY = canvasCenterY - sprite.height / 2;
  const commonProps = {
    x: canvasTopLeftX,
    y: canvasTopLeftY,
    width: sprite.width,
    height: sprite.height,
    rotation: sprite.rotation,
    opacity: sprite.opacity,
    draggable: !sprite.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
  };

  if (!sprite.visible) return null;

  let element: React.ReactNode = null;

  if (isTextData(sprite.data)) {
    const d = sprite.data;
    element = (
      <Text
        {...commonProps}
        ref={nodeRef as React.RefObject<Konva.Text | null>}
        text={d.content}
        fontFamily={buildFontStack(d.fontFamily)}
        fontSize={d.fontSize}
        fontStyle={d.fontWeight >= 600 ? "bold" : "normal"}
        fill={d.color}
        align={d.align}
        verticalAlign="middle"
        wrap="word"
      />
    );
  } else if (isMediaData(sprite.data)) {
    element = (
      <Group
        {...commonProps}
        ref={nodeRef as React.RefObject<Konva.Group | null>}
      >
        <Rect
          x={0}
          y={0}
          width={sprite.width}
          height={sprite.height}
          fill={mediaElement ? "transparent" : "rgba(255,255,255,0.01)"}
          stroke={
            mediaElement
              ? undefined
              : isSelected
                ? "#a63ef5"
                : "rgba(255,255,255,0.16)"
          }
          strokeWidth={mediaElement ? 0 : 1}
          dash={mediaElement ? undefined : [8, 5]}
          cornerRadius={4}
        />
        {mediaElement && (
          <KonvaImage
            x={0}
            y={0}
            width={sprite.width}
            height={sprite.height}
            image={mediaElement}
            listening={false}
          />
        )}
      </Group>
    );
  }

  return (
    <>
      {element}
      {isSelected && showTransformer && (
        <Transformer
          ref={trRef}
          borderStroke="#a63ef5"
          borderStrokeWidth={1.5}
          anchorFill="#a63ef5"
          anchorStroke="#fff"
          anchorSize={8}
          anchorCornerRadius={2}
          rotateEnabled={!sprite.locked}
          flipEnabled={false}
          enabledAnchors={
            sprite.locked
              ? []
              : isTextSprite
                ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                : undefined
          }
          borderDash={isTextSprite ? [6, 4] : undefined}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5)
              return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

export default function StageView() {
  const parentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const fullScreenFpsRef = useRef<HTMLDivElement>(null);
  const spriteNodeRefs = useRef(new Map<string, Konva.Node>());
  const [normalStageSize, setNormalStageSize] = useState({
    width: 0,
    height: 0,
  });
  const [fullScreenStageSize, setFullScreenStageSize] = useState({
    width: 0,
    height: 0,
  });
  const [stagePixelRatio, setStagePixelRatio] = useState(getStagePixelRatio);
  const { state, dispatch } = useSprites();
  const { settings } = useProjectSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const playGenerationRef = useRef(0);
  const spritesRef = useRef(state.sprites);
  const pendingPlaybackChangesRef = useRef(
    new Map<string, Partial<Omit<Sprite, "id" | "type">>>(),
  );
  spritesRef.current = state.sprites;

  const setIsPlayingWithRef = useCallback((val: boolean) => {
    setIsPlaying(val);
    isPlayingRef.current = val;
  }, []);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const fullScreenParentRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportedVideo, setExportedVideo] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const virtualWidth = settings.width;
  const virtualHeight = settings.height;
  const stageSize = isFullScreen ? fullScreenStageSize : normalStageSize;
  const stageCoords = useMemo(
    () => createStageCoords(virtualWidth, virtualHeight),
    [virtualWidth, virtualHeight],
  );
  const scale = stageSize.width / virtualWidth;

  const hasBlocks = useMemo(() => {
    return state.sprites.some(
      (sprite) => sprite.blocklyXml && sprite.blocklyXml.includes("<block"),
    );
  }, [state.sprites]);

  const [canvasEffects, setCanvasEffects] = useState<Record<string, number>>(
    {},
  );

  const plyrSource = useMemo(() => {
    if (!exportedVideo) return undefined;
    return {
      type: "video" as const,
      sources: [
        {
          src: exportedVideo.url,
          type: exportedVideo.name.endsWith(".mp4")
            ? "video/mp4"
            : "video/webm",
        },
      ],
    };
  }, [exportedVideo?.url, exportedVideo?.name]);

  const plyrOptions = useMemo(
    () => ({
      autoplay: true,
      hideControls: false,
      resetOnEnd: true,
    }),
    [],
  );

  const resetRecordingState = useCallback(() => {
    setIsRecording(false);
    setIsEncoding(false);
    setExportProgress(null);
    setIsRecordModalOpen(false);
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
  }, []);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (options: ExportOptions) => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;

    const canvas = layer.getCanvas()._canvas;
    if (!canvas) return;

    const physicalWidth = Math.floor(canvas.width / 2) * 2;
    const physicalHeight = Math.floor(canvas.height / 2) * 2;
    const fps = options.fps;

    setIsRecordModalOpen(false);
    setIsRecording(true);
    setIsEncoding(false);
    setExportProgress(0);

    let videoFrames: ImageBitmap[] = [];
    let audioSamples: Float32Array[] = [];
    let frameCounter = 0;
    const sampleRate = 44100;

    try {
      const captureFrame = async () => {
        try {
          const bitmap = await createImageBitmap(canvas);
          videoFrames.push(bitmap);

          const samples = runtime.getAudioSamples(1 / fps, sampleRate);
          runtime.playCapturedSamples(samples, sampleRate);
          audioSamples.push(samples);

          frameCounter++;
        } catch (e) {
          console.error(e);
        }
      };

      let finished = false;
      const playPromise = handlePlay({ stepping: true });
      playPromise.then(() => {
        finished = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      const exportStartTime = performance.now();
      while (true) {
        layer.draw();
        await captureFrame();
        if (finished) break;

        await runtime.step();

        const expectedMs = (frameCounter / fps) * 1000;
        const actualMs = performance.now() - exportStartTime;
        if (actualMs < expectedMs) {
          await new Promise((resolve) =>
            setTimeout(resolve, expectedMs - actualMs),
          );
        }

        if (frameCounter > fps * 300) break;
      }

      runtime.disableStepping();

      setIsEncoding(true);
      setIsRecordModalOpen(true);
      setExportProgress(0);

      const worker = new Worker(
        new URL("../lib/export.worker.ts", import.meta.url),
        { type: "module" },
      );

      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.type === "progress") setExportProgress(e.data.progress);
          else if (e.data.type === "done") resolve(e.data.buffer);
          else if (e.data.type === "error") reject(new Error(e.data.error));
        };
        worker.onerror = reject;
        worker.postMessage(
          {
            options,
            frames: videoFrames,
            audioSamples,
            sampleRate,
            width: physicalWidth,
            height: physicalHeight,
            fps,
          },
          [...videoFrames, ...audioSamples.map((a) => a.buffer)],
        );
      });

      worker.terminate();
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      const fileName = `export_${ts}.${options.format}`;
      const blob = new Blob([buffer], {
        type:
          options.format === "gif"
            ? "image/gif"
            : options.format === "mp4"
              ? "video/mp4"
              : "video/webm",
      });
      const url = URL.createObjectURL(blob);
      setExportedVideo({ url, name: fileName });
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      runtime.disableStepping();
      resetRecordingState();
    }
  };

  useEffect(() => {
    let mounted = true;
    const effectKeys = [
      "blur",
      "contrast",
      "saturation",
      "color_shift",
      "brightness",
      "invert",
      "sepia",
      "transparency",
    ];

    const readEffects = () => {
      if (!mounted) return;
      const effects: Record<string, number> = {};
      for (const k of effectKeys) {
        effects[k] =
          (window.RUNTIME &&
            window.RUNTIME.getCanvasEffect &&
            window.RUNTIME.getCanvasEffect(k)) ||
          0;
      }
      setCanvasEffects(effects);
    };

    readEffects();
    const id = window.setInterval(readEffects, getFrameMs(settings.fps));
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [settings.fps]);

  const computeFilterAndOpacity = () => {
    const e = canvasEffects;
    const parts: string[] = [];
    if ((e.blur ?? 0) !== 0) parts.push(`blur(${e.blur}px)`);
    if ((e.contrast ?? 0) !== 0) parts.push(`contrast(${100 + e.contrast}%)`);
    if ((e.saturation ?? 0) !== 0)
      parts.push(`saturate(${100 + e.saturation}%)`);
    if ((e["color_shift"] ?? 0) !== 0)
      parts.push(`hue-rotate(${e["color_shift"]}deg)`);
    if ((e.brightness ?? 0) !== 0)
      parts.push(`brightness(${100 + e.brightness}%)`);
    if ((e.invert ?? 0) !== 0) parts.push(`invert(${e.invert}%)`);
    if ((e.sepia ?? 0) !== 0) parts.push(`sepia(${e.sepia}%)`);
    const opacity = 1 - (e.transparency ?? 0) / 100;
    return {
      filter: parts.join(" "),
      opacity: Math.max(0, Math.min(1, opacity)),
    };
  };

  const { filter: stageFilter, opacity: stageOpacity } =
    computeFilterAndOpacity();

  useEffect(() => {
    const updatePixelRatio = () => setStagePixelRatio(getStagePixelRatio());
    updatePixelRatio();
    window.addEventListener("resize", updatePixelRatio);
    return () => window.removeEventListener("resize", updatePixelRatio);
  }, []);

  useEffect(() => {
    KonvaCore.pixelRatio = stagePixelRatio;
    const stage = stageRef.current;
    if (!stage) return;
    stage.bufferCanvas.setPixelRatio(stagePixelRatio);
    stage.bufferHitCanvas.setPixelRatio(stagePixelRatio);
    stage.getLayers().forEach((layer) => {
      layer.getCanvas().setPixelRatio(stagePixelRatio);
      layer.getHitCanvas().setPixelRatio(stagePixelRatio);
      layer.batchDraw();
    });
  }, [stagePixelRatio, stageSize.width, stageSize.height]);

  useEffect(() => {
    runtime.setCompiler(() => {
      const parts: string[] = [];
      state.sprites.forEach((sprite) => {
        if (!sprite.blocklyXml) return;
        const tempWorkspace = new Blockly.Workspace();
        (tempWorkspace as any).sprites = state.sprites;
        (tempWorkspace as any).spriteId = sprite.id;
        try {
          const dom = Blockly.utils.xml.textToDom(sprite.blocklyXml);
          Blockly.Xml.domToWorkspace(dom, tempWorkspace);

          const hatBlocks = tempWorkspace
            .getTopBlocks(true)
            .filter(
              (block: Blockly.Block) =>
                block.previousConnection === null &&
                block.outputConnection === null,
            );

          javascriptGenerator.init(tempWorkspace);
          const code = hatBlocks
            .map((block: Blockly.Block) =>
              javascriptGenerator.blockToCode(block),
            )
            .join("");
          javascriptGenerator.finish(code);

          if (code.trim()) {
            parts.push(
              `window.RUNTIME?.setCurrentSprite(${JSON.stringify(sprite.id)});\ncontext = spriteContextMap[${JSON.stringify(sprite.id)}];\n${code.trim()}`,
            );
          }
        } catch (e) {
          console.error(e);
        } finally {
          tempWorkspace.dispose();
        }
      });

      return parts.join("\n");
    });
    return () => {
      runtime.setCompiler(null);
    };
  }, [state.sprites]);

  useEffect(() => {
    runtime.setFps(settings.fps);
  }, [settings.fps]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const drawTimes: number[] = [];
    const windowMs = 500;
    const onDraw = () => {
      drawTimes.push(performance.now());
    };

    let rafId = 0;
    const tick = () => {
      const now = performance.now();
      while (drawTimes.length > 0 && now - drawTimes[0] > windowMs) {
        drawTimes.shift();
      }

      let fps = 0;
      if (drawTimes.length >= 2) {
        fps = Math.round(
          ((drawTimes.length - 1) / (now - drawTimes[0])) * 1000,
        );
      }

      const fpsNode = fpsRef.current;
      if (fpsNode) {
        fpsNode.textContent = `${fps} FPS`;
        fpsNode.style.color = getFpsColor(fps, settings.fps);
      }

      const fsFpsNode = fullScreenFpsRef.current;
      if (fsFpsNode) {
        fsFpsNode.textContent = `${fps} FPS`;
        fsFpsNode.style.color = getFpsColor(fps, settings.fps);
      }
      rafId = requestAnimationFrame(tick);
    };

    layer.on("draw", onDraw);
    rafId = requestAnimationFrame(tick);

    return () => {
      layer.off("draw", onDraw);
      cancelAnimationFrame(rafId);
    };
  }, [stageSize.width, stageSize.height, settings.fps]);

  useEffect(() => {
    if (!parentRef.current) return;
    const ratio = virtualWidth / virtualHeight;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: pw, height: ph } = entry.contentRect;
        if (pw === 0 || ph === 0) continue;
        let w = pw - 16;
        let h = w / ratio;
        if (h > ph - 16) {
          h = ph - 16;
          w = h * ratio;
        }
        setNormalStageSize({ width: Math.floor(w), height: Math.floor(h) });
      }
    });
    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, [virtualWidth, virtualHeight]);

  useEffect(() => {
    if (!isFullScreen || !fullScreenParentRef.current) return;
    const ratio = virtualWidth / virtualHeight;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: pw, height: ph } = entry.contentRect;
        if (pw === 0 || ph === 0) continue;
        let w = pw - 16;
        let h = w / ratio;
        if (h > ph - 16) {
          h = ph - 16;
          w = h * ratio;
        }
        setFullScreenStageSize({ width: Math.floor(w), height: Math.floor(h) });
      }
    });
    observer.observe(fullScreenParentRef.current);
    return () => observer.disconnect();
  }, [virtualWidth, virtualHeight, isFullScreen]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const target = e.target;
      const isEmptyStageClick =
        target === target.getStage() || target.name() === "background";
      if (isEmptyStageClick) {
        dispatch({ type: "SELECT_SPRITE", id: null });
      }
    },
    [dispatch],
  );

  const handleSpriteNodeReady = useCallback(
    (id: string, node: Konva.Node | null) => {
      if (node) {
        spriteNodeRefs.current.set(id, node);
      } else {
        spriteNodeRefs.current.delete(id);
      }
    },
    [],
  );

  const queuePlaybackStateUpdate = useCallback(
    (id: string, changes: Partial<Omit<Sprite, "id" | "type">>) => {
      const pending = pendingPlaybackChangesRef.current.get(id) ?? {};
      pendingPlaybackChangesRef.current.set(id, { ...pending, ...changes });
    },
    [],
  );

  const flushPlaybackStateUpdates = useCallback(() => {
    const pending = pendingPlaybackChangesRef.current;
    if (pending.size === 0) return;
    pendingPlaybackChangesRef.current = new Map();
    for (const [id, changes] of pending) {
      if (Object.keys(changes).length === 0) continue;
      dispatch({
        type: "UPDATE_SPRITE",
        id,
        changes,
      });
    }
  }, [dispatch]);

  const handlePlay = async (options?: { stepping?: boolean }) => {
    const generation = ++playGenerationRef.current;
    runtime.stop();

    if (options?.stepping) runtime.enableStepping();
    else runtime.disableStepping();

    runtime.setFps(settings.fps);
    pendingPlaybackChangesRef.current.clear();
    setIsPlayingWithRef(true);
    setIsPaused(false);

    state.sprites.forEach((sprite) => {
      const applyLiveSprite = () => {
        const node = spriteNodeRefs.current.get(sprite.id);
        if (!node) return;
        const x = Number(spriteData.x ?? sprite.x);
        const y = Number(spriteData.y ?? sprite.y);
        const width = Number(spriteData.width ?? sprite.width);
        const height = Number(spriteData.height ?? sprite.height);
        const rotation = Number(spriteData.rotation ?? sprite.rotation);
        const opacity = Number(spriteData.opacity ?? sprite.opacity);
        const visible = Boolean(spriteData.visible ?? sprite.visible);
        node.setAttrs({
          x: stageCoords.toCanvasX(x) - width / 2,
          y: stageCoords.toCanvasY(y) - height / 2,
          width,
          height,
          rotation,
          opacity,
          visible,
        });
        if (sprite.type === "text") {
          if (typeof spriteData.color === "string")
            node.setAttr("fill", spriteData.color);
          if (typeof spriteData.text === "string")
            node.setAttr("text", spriteData.text);
        }
        node.getLayer()?.batchDraw();
      };

      const spriteData: Record<string, unknown> = {
        x: sprite.x,
        y: sprite.y,
        rotation: sprite.rotation,
        width: sprite.width,
        height: sprite.height,
        opacity: sprite.opacity,
        visible: sprite.visible,
        zIndex: sprite.zIndex,
        tweenMode: sprite.tweenMode,
        tweenModes: { ...sprite.tweenModes },
      };

      if (sprite.type === "text" && isTextData(sprite.data)) {
        spriteData.color = sprite.data.color;
        spriteData.text = sprite.data.content;
      }
      if (sprite.type === "media" && isMediaData(sprite.data)) {
        const media = sprite.data;
        const imageIndex = Math.max(
          0,
          media.images.findIndex((image) => image.id === media.currentImageId),
        );
        spriteData.imageIndex = imageIndex + 1;
        spriteData.imageName = media.images[imageIndex]?.name ?? "";
        spriteData.imageCount = media.images.length;
      }

      const spriteProxy = new Proxy(spriteData, {
        get: (target, property) => {
          const current = spritesRef.current.find((s) => s.id === sprite.id);
          if (property === "zIndex") {
            return target.zIndex ?? current?.zIndex;
          }
          if (property === "tweenMode") {
            return target.tweenMode ?? current?.tweenMode;
          }
          if (property === "tweenModes") {
            return {
              ...((target.tweenModes as Record<string, unknown>) ??
                current?.tweenModes),
            };
          }
          if (property === "color") {
            return target.color;
          }
          if (property === "text") {
            return target.text;
          }
          if (property === "imageCount") {
            return current && isMediaData(current.data)
              ? current.data.images.length
              : 0;
          }
          if (property === "imageIndex") {
            if (!current || !isMediaData(current.data)) return 0;
            const media = current.data;
            const index = media.images.findIndex(
              (image) => image.id === media.currentImageId,
            );
            return Math.max(0, index) + 1;
          }
          if (property === "imageName") {
            if (!current || !isMediaData(current.data)) return "";
            const media = current.data;
            const image =
              media.images.find((entry) => entry.id === media.currentImageId) ??
              media.images[0];
            return image?.name ?? "";
          }
          if (property === "sounds") {
            return current?.data.sounds ?? [];
          }
          return target[property as keyof typeof target];
        },
        set: (target, property, value) => {
          const current = spritesRef.current.find((s) => s.id === sprite.id);
          if (property === "tweenMode") {
            target.tweenMode = value;
            dispatch({
              type: "UPDATE_SPRITE",
              id: sprite.id,
              changes: { tweenMode: value as typeof sprite.tweenMode },
            });
            return true;
          }
          if (property === "tweenModes") {
            target.tweenModes = value;
            dispatch({
              type: "UPDATE_SPRITE",
              id: sprite.id,
              changes: { tweenModes: value as typeof sprite.tweenModes },
            });
            return true;
          }
          if (property === "color") {
            if (current && isTextData(current.data)) {
              target.color = value;
              applyLiveSprite();
              queuePlaybackStateUpdate(sprite.id, {
                data: { ...current.data, color: value as string },
              });
            }
            return true;
          }
          if (property === "text") {
            if (current && isTextData(current.data)) {
              target.text = value;
              applyLiveSprite();
              queuePlaybackStateUpdate(sprite.id, {
                data: { ...current.data, content: value as string },
              });
            }
            return true;
          }
          if (property === "imageIndex") {
            if (
              current &&
              isMediaData(current.data) &&
              current.data.images.length > 0
            ) {
              const media = current.data;
              const index = Math.max(
                0,
                Math.min(
                  media.images.length - 1,
                  Math.round(Number(value) || 1) - 1,
                ),
              );
              const nextData = {
                ...media,
                currentImageId: media.images[index].id,
              };
              target.imageIndex = index + 1;
              target.imageName = media.images[index].name;
              target.imageCount = media.images.length;
              dispatch({
                type: "UPDATE_SPRITE",
                id: sprite.id,
                changes: { data: nextData },
              });
              queuePlaybackStateUpdate(sprite.id, { data: nextData });
            }
            return true;
          }
          if (property === "imageName") {
            if (
              current &&
              isMediaData(current.data) &&
              current.data.images.length > 0
            ) {
              const media = current.data;
              const requested = String(value);
              const index = media.images.findIndex(
                (image) => image.name === requested,
              );
              if (index !== -1) {
                const nextData = {
                  ...media,
                  currentImageId: media.images[index].id,
                };
                target.imageIndex = index + 1;
                target.imageName = media.images[index].name;
                target.imageCount = media.images.length;
                dispatch({
                  type: "UPDATE_SPRITE",
                  id: sprite.id,
                  changes: { data: nextData },
                });
                queuePlaybackStateUpdate(sprite.id, { data: nextData });
              }
            }
            return true;
          }
          if (typeof property === "string" && property in target) {
            target[property] = value;
            applyLiveSprite();
            queuePlaybackStateUpdate(sprite.id, { [property]: value });
          }
          return true;
        },
      });

      runtime.registerSprite(sprite.id, {
        sprite: spriteProxy as SpriteContext["sprite"],
        spriteId: sprite.id,
        dispatch,
        getSprites: () => spritesRef.current,
      });
    });

    await runtime.start();
    if (generation === playGenerationRef.current) {
      flushPlaybackStateUpdates();
      setIsPlayingWithRef(false);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (!isPlaying) return;
    if (isPaused) {
      runtime.resume();
      setIsPaused(false);
      return;
    }
    runtime.pause();
    flushPlaybackStateUpdates();
    setIsPaused(true);
  };

  const handleStop = () => {
    playGenerationRef.current++;
    setIsPlayingWithRef(false);
    setIsPaused(false);
    runtime.stop();
    flushPlaybackStateUpdates();
  };

  const sorted = [...state.sprites].sort((a, b) => a.zIndex - b.zIndex);
  const gridColor = useMemo(
    () => getGridColorFromBackground(settings.backgroundColor),
    [settings.backgroundColor],
  );
  const showGrid =
    settings.showGrid && !(isPlaying && !isPaused) && !isRecording;
  const showROT = settings.showROT && !(isPlaying && !isPaused) && !isRecording; // rule of thirds
  //const showROT = true; // tmp dev
  const showTransformers = (!isPlaying || isPaused) && !isRecording;

  const stageElement = (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      scaleX={scale}
      scaleY={scale}
      onClick={handleStageClick}
      style={{
        borderRadius: "4px",
        overflow: "hidden",
        filter: stageFilter || undefined,
        opacity: stageOpacity,
      }}
    >
      <Layer ref={layerRef}>
        <Rect
          x={0}
          y={0}
          width={virtualWidth}
          height={virtualHeight}
          name="background"
          fill={settings.backgroundColor}
        />
        {showGrid && (
          <StageGrid
            width={virtualWidth}
            height={virtualHeight}
            gridSize={settings.gridSize}
            stroke={gridColor}
          />
        )}
        {showROT && <StageROT width={virtualWidth} height={virtualHeight} />}
        {sorted.map((sprite) => (
          <SpriteRenderer
            key={sprite.id}
            sprite={sprite}
            isSelected={state.selectedSpriteId === sprite.id}
            showTransformer={showTransformers}
            onSelect={() => dispatch({ type: "SELECT_SPRITE", id: sprite.id })}
            onNodeReady={handleSpriteNodeReady}
            stageCoords={stageCoords}
            snapToGrid={settings.snapToGrid}
            gridSize={settings.gridSize}
            isPlaying={isPlaying}
          />
        ))}
      </Layer>
    </Stage>
  );

  return (
    <div className="stage-area panel">
      <div className="panel-header stage-panel-header">
        <div
          className="transport-controls"
          style={{ background: "transparent", border: "none", padding: 0 }}
        >
          <button
            className={`transport-btn ${isPlaying && !isPaused ? "active" : ""}`}
            title={isPaused ? "Resume" : "Play"}
            onClick={() => handlePlay()}
            disabled={isRecording}
          >
            <Play size={18} />
          </button>
          <button
            className={`transport-btn ${isPaused ? "active" : ""}`}
            title="Pause"
            onClick={handlePause}
            disabled={!isPlaying || isRecording}
          >
            <Pause size={18} />
          </button>
          <button
            className="transport-btn"
            title="Stop"
            onClick={handleStop}
            disabled={isRecording && !isPlaying}
          >
            <Square size={18} />
          </button>
          <button
            className={`transport-btn ${isRecording ? "active" : ""}`}
            title="Export"
            onClick={() => setIsRecordModalOpen(true)}
            disabled={isRecording || !hasBlocks}
          >
            <Video size={20} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <button
            className="transport-btn"
            title="Full Screen"
            onClick={() => setIsFullScreen(true)}
            disabled={isRecording}
          >
            <Maximize size={18} />
          </button>
          <div
            ref={fpsRef}
            className="stage-fps-counter"
            style={{ color: getFpsColor(0, settings.fps) }}
            title={`Target: ${settings.fps} FPS`}
          >
            0 FPS
          </div>
        </div>
      </div>
      <div className="panel-body" ref={parentRef}>
        <div className="stage-container">{!isFullScreen && stageElement}</div>
      </div>

      {isFullScreen && (
        <div className="modal-overlay" onClick={() => setIsFullScreen(false)}>
          <div
            className="modal-content stage-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{ position: "relative", justifyContent: "center" }}
            >
              <div
                ref={fullScreenFpsRef}
                className="stage-fps-counter"
                style={{
                  position: "absolute",
                  left: "var(--space-lg)",
                  color: getFpsColor(0, settings.fps),
                }}
                title={`Target: ${settings.fps} FPS`}
              >
                0 FPS
              </div>
              <div
                className="transport-controls"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
              >
                <button
                  className={`transport-btn ${isPlaying && !isPaused ? "active" : ""}`}
                  title={isPaused ? "Resume" : "Play"}
                  onClick={() => handlePlay()}
                  disabled={isRecording}
                >
                  <Play size={18} />
                </button>
                <button
                  className={`transport-btn ${isPaused ? "active" : ""}`}
                  title="Pause"
                  onClick={handlePause}
                  disabled={!isPlaying || isRecording}
                >
                  <Pause size={18} />
                </button>
                <button
                  className="transport-btn"
                  title="Stop"
                  onClick={handleStop}
                  disabled={isRecording && !isPlaying}
                >
                  <Square size={18} />
                </button>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setIsFullScreen(false)}
                style={{ position: "absolute", right: "var(--space-lg)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              className="modal-body stage-modal-body"
              ref={fullScreenParentRef}
            >
              {stageElement}
            </div>
          </div>
        </div>
      )}

      {isRecordModalOpen && (
        <ExportModal
          defaultFps={settings.fps}
          isClosing={false}
          onClose={() => setIsRecordModalOpen(false)}
          onExport={handleExport}
          isExporting={isRecording}
          isEncoding={isEncoding}
          progress={exportProgress}
        />
      )}

      {exportedVideo && (
        <div className="modal-overlay" onClick={() => setExportedVideo(null)}>
          <div
            className="modal-content stage-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{ position: "relative", justifyContent: "center" }}
            >
              <h2 style={{ position: "absolute", left: "var(--space-lg)" }}>
                Export Complete
              </h2>
              <button
                className="primary-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0 1rem",
                }}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = exportedVideo.url;
                  a.download = exportedVideo.name;
                  a.click();
                }}
              >
                <Download size={18} />
                Download
              </button>
              <button
                className="close-modal-btn"
                onClick={() => setExportedVideo(null)}
                style={{ position: "absolute", right: "var(--space-lg)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              className="modal-body stage-modal-body"
              style={{
                background: "#000",
                minHeight: "400px",
                display: "block",
              }}
            >
              {exportedVideo.name.endsWith(".gif") ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={exportedVideo.url}
                    alt="Exported GIF"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "80%",
                      height: "80%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ width: "100%", maxWidth: virtualWidth }}>
                      <Plyr source={plyrSource!} options={plyrOptions} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
