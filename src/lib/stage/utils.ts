import type Konva from "konva";
import KonvaCore from "konva";
import { buildFontStack } from "../fonts";

function parseHexColor(color: string): [number, number, number] | null {
  let hex = color.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map(c => c + c)
      .join("");
  }
  if (hex.length !== 6 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
}

function toHexByte(value: number) {
  return Math.round(value).toString(16).padStart(2, "0");
}

export const LINE_HEIGHT = 1.2;

export function createStageCoords(virtualWidth: number, virtualHeight: number) {
  return {
    toCanvasX: (x: number) => x + virtualWidth / 2,
    toCanvasY: (y: number) => virtualHeight / 2 - y,
    fromCanvasX: (cx: number) => cx - virtualWidth / 2,
    fromCanvasY: (cy: number) => virtualHeight / 2 - cy
  };
}

export function snapCanvasCoord(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

export function snapCanvasPoint(x: number, y: number, gridSize: number) {
  return {
    x: snapCanvasCoord(x, gridSize),
    y: snapCanvasCoord(y, gridSize)
  };
}

export function getFpsColor(fps: number, targetFps: number): string {
  if (fps <= 0) return "var(--text-muted)";
  const ratio = fps / targetFps;
  if (ratio >= 0.9) return "var(--success)";
  if (ratio >= 0.5) return "var(--warning)";
  return "var(--danger)";
}

export function getStagePixelRatio() {
  if (typeof window === "undefined") return 2;
  return Math.min(3, Math.max(2, window.devicePixelRatio || 1));
}

export function getFrameMs(fps: number): number {
  return 1000 / Math.max(1, fps);
}

export function getFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getVideoElementFromNode(
  node: Konva.Node | null
): HTMLVideoElement | null {
  if (!node || !(node instanceof KonvaCore.Container)) return null;

  const imageNode = node.findOne("Image") as Konva.Image | undefined;
  const media = imageNode?.image();

  return media instanceof HTMLVideoElement ? media : null;
}

export function getGridColorFromBackground(backgroundColor: string): string {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) return "#2a2a2a";
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const mix = luminance < 0.5 ? 0.18 : 0.14;
  const target = luminance < 0.5 ? 255 : 0;
  return `#${toHexByte(r + (target - r) * mix)}${toHexByte(g + (target - g) * mix)}${toHexByte(b + (target - b) * mix)}`;
}

export function measureTextContentSize(
  content: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: number
): { width: number; height: number } {
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const lines = normalizedContent.split("\n");
  const lineHeight = fontSize * LINE_HEIGHT;

  if (typeof document === "undefined") {
    const widest = Math.max(...lines.map(l => l.length), 1);
    return { width: widest * fontSize * 0.6, height: lines.length * lineHeight };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const widest = Math.max(...lines.map(l => l.length), 1);
    return { width: widest * fontSize * 0.6, height: lines.length * lineHeight };
  }

  const fontStyle = fontWeight >= 600 ? "bold" : "normal";
  ctx.font = `${fontStyle} ${fontSize}px ${buildFontStack(fontFamily)}`;

  const widest = lines.reduce(
    (max, line) => Math.max(max, ctx.measureText(line).width),
    0
  );

  return { width: widest, height: lines.length * lineHeight };
}

export function getCharLayout(
  content: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: number,
  align: "left" | "center" | "right",
  totalWidth: number,
  totalHeight: number
) {
  const normalizedContent = content.replace(/\r\n/g, "\n");

  if (typeof document === "undefined") {
    return normalizedContent.split("").map((char, index) => ({
      char,
      x: index * fontSize * 0.6,
      y: 0
    }));
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return normalizedContent.split("").map((char, index) => ({
      char,
      x: index * fontSize * 0.6,
      y: 0
    }));
  }

  const fontStyle = fontWeight >= 600 ? "bold" : "normal";
  ctx.font = `${fontStyle} ${fontSize}px ${buildFontStack(fontFamily)}`;

  const lines = normalizedContent.split("\n");
  const lineHeight = fontSize * LINE_HEIGHT;
  const totalTextHeight = lines.length * lineHeight;
  const leading = (lineHeight - fontSize) / 2;

  const startY = (totalHeight - totalTextHeight) / 2 + leading;
  let currentY = startY;

  const layout: { char: string; x: number; y: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineChars = line.split("");
    const widths = lineChars.map(c => ctx.measureText(c).width);
    const totalTextWidth = widths.reduce((sum, w) => sum + w, 0);

    let startX = 0;
    if (align === "center") {
      startX = (totalWidth - totalTextWidth) / 2;
    } else if (align === "right") {
      startX = totalWidth - totalTextWidth;
    }

    let currentX = startX;
    for (let j = 0; j < lineChars.length; j++) {
      layout.push({
        char: lineChars[j],
        x: currentX,
        y: currentY
      });
      currentX += widths[j];
    }

    currentY += lineHeight;
  }

  return layout;
}
