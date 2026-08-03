const DEFAULT_COLOR = "#afafaf";
const DEFAULT_SIZE = 10;
interface PenState {
  down: boolean;
  color: string;
  size: number;
  lastX: number | null;
  lastY: number | null;
  pendingX: number;
  pendingY: number;
  touched: Set<string>;
  flushQueued: boolean;
}

function clampByte(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, n));
}

export function toPenColor(...parts: unknown[]): string {
  if (parts.length >= 3) {
    return `rgb(${clampByte(parts[0])}, ${clampByte(parts[1])}, ${clampByte(parts[2])})`;
  }

  const value = parts[0];
  if (typeof value === "number" && Number.isFinite(value)) {
    const packed = Math.max(0, Math.floor(value)) & 0xffffff;
    return `#${packed.toString(16).padStart(6, "0")}`;
  }

  const text = String(value ?? "").trim();
  if (!text) return DEFAULT_COLOR;
  if (/^[0-9a-f]{3}$/i.test(text) || /^[0-9a-f]{6}$/i.test(text)) {
    return `#${text}`;
  }

  const triple = text.split(",");
  if (triple.length === 3 && triple.every((p) => p.trim() !== "" && Number.isFinite(Number(p)))) {
    return `rgb(${clampByte(triple[0])}, ${clampByte(triple[1])}, ${clampByte(triple[2])})`;
  }

  return text;
}

class PenSurface {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private states = new Map<string, PenState>();
  private onChange: (() => void) | null = null;

  attach(canvas: HTMLCanvasElement, onChange: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onChange = onChange;
  }

  detach() {
    this.canvas = null;
    this.ctx = null;
    this.onChange = null;
  }

  resize(width: number, height: number) {
    if (!this.canvas) return;
    if (!(width > 0) || !(height > 0)) return;
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.onChange?.();
  }

  reset() {
    this.states.clear();
    this.clear();
  }

  clear() {
    this.ctx?.clearRect(0, 0, this.width, this.height);
    this.onChange?.();
  }

  private stateFor(spriteId: string): PenState {
    let state = this.states.get(spriteId);
    if (!state) {
      state = {
        down: false,
        color: DEFAULT_COLOR,
        size: DEFAULT_SIZE,
        lastX: null,
        lastY: null,
        pendingX: 0,
        pendingY: 0,
        touched: new Set(),
        flushQueued: false,
      };
      this.states.set(spriteId, state);
    }
    return state;
  }

  private toCanvasX(x: number): number {
    return x + this.width / 2;
  }

  private toCanvasY(y: number): number {
    return this.height / 2 - y;
  }

  private flush(spriteId: string) {
    const state = this.stateFor(spriteId);
    state.flushQueued = false;
    state.touched.clear();

    const { pendingX, pendingY } = state;
    const moved = pendingX !== state.lastX || pendingY !== state.lastY;

    if (this.ctx && state.down && state.lastX !== null && state.lastY !== null && moved) {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = state.color;
      ctx.lineWidth = Math.max(0.1, state.size);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(this.toCanvasX(state.lastX), this.toCanvasY(state.lastY));
      ctx.lineTo(this.toCanvasX(pendingX), this.toCanvasY(pendingY));
      ctx.stroke();
      ctx.restore();
      this.onChange?.();
    }

    state.lastX = pendingX;
    state.lastY = pendingY;
  }

  moveAxis(spriteId: string, axis: string, x: number, y: number) {
    // stay free until a pen is down
    const state = this.states.get(spriteId);
    if (!state || !state.down) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (state.touched.has(axis)) this.flush(spriteId);

    state.touched.add(axis);
    state.pendingX = x;
    state.pendingY = y;

    if (!state.flushQueued) {
      state.flushQueued = true;
      queueMicrotask(() => {
        if (this.states.get(spriteId)?.flushQueued) this.flush(spriteId);
      });
    }
  }

  setDown(spriteId: string, down: boolean, x: number, y: number) {
    this.flush(spriteId);
    const state = this.stateFor(spriteId);
    state.down = Boolean(down);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      state.lastX = x;
      state.lastY = y;
      state.pendingX = x;
      state.pendingY = y;
    }
  }

  setColor(spriteId: string, ...parts: unknown[]) {
    this.stateFor(spriteId).color = toPenColor(...parts);
  }

  setSize(spriteId: string, size: unknown) {
    const n = Number(size);
    if (Number.isFinite(n)) this.stateFor(spriteId).size = Math.max(0.1, n);
  }

}

const penSurface = new PenSurface();

export default penSurface;
