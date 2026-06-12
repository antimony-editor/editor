import type { Sprite } from "./sprites";

export type TweenMode =
  | "linear"
  | "easeInSine"
  | "easeOutSine"
  | "easeInOutSine"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInQuint"
  | "easeOutQuint"
  | "easeInOutQuint"
  | "easeInExpo"
  | "easeOutExpo"
  | "easeInOutExpo"
  | "easeInCirc"
  | "easeOutCirc"
  | "easeInOutCirc"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeInElastic"
  | "easeOutElastic"
  | "easeInOutElastic"
  | "easeInBounce"
  | "easeOutBounce"
  | "easeInOutBounce";

export const DEFAULT_TWEEN_MODE: TweenMode = "linear";

export const TWEEN_MODE_OPTIONS: [string, TweenMode][] = [
  ["linear", "linear"],
  ["ease in sine", "easeInSine"],
  ["ease out sine", "easeOutSine"],
  ["ease in-out sine", "easeInOutSine"],
  ["ease in quad", "easeInQuad"],
  ["ease out quad", "easeOutQuad"],
  ["ease in-out quad", "easeInOutQuad"],
  ["ease in cubic", "easeInCubic"],
  ["ease out cubic", "easeOutCubic"],
  ["ease in-out cubic", "easeInOutCubic"],
  ["ease in quart", "easeInQuart"],
  ["ease out quart", "easeOutQuart"],
  ["ease in-out quart", "easeInOutQuart"],
  ["ease in quint", "easeInQuint"],
  ["ease out quint", "easeOutQuint"],
  ["ease in-out quint", "easeInOutQuint"],
  ["ease in expo", "easeInExpo"],
  ["ease out expo", "easeOutExpo"],
  ["ease in-out expo", "easeInOutExpo"],
  ["ease in circ", "easeInCirc"],
  ["ease out circ", "easeOutCirc"],
  ["ease in-out circ", "easeInOutCirc"],
  ["ease in back", "easeInBack"],
  ["ease out back", "easeOutBack"],
  ["ease in-out back", "easeInOutBack"],
  ["ease in elastic", "easeInElastic"],
  ["ease out elastic", "easeOutElastic"],
  ["ease in-out elastic", "easeInOutElastic"],
  ["ease in bounce", "easeInBounce"],
  ["ease out bounce", "easeOutBounce"],
  ["ease in-out bounce", "easeInOutBounce"],
];

export type TweenableProperty =
  | "x"
  | "y"
  | "width"
  | "height"
  | "rotation"
  | "opacity"
  | "zIndex";

export const TWEENABLE_PROPERTY_OPTIONS: [string, TweenableProperty][] = [
  ["x", "x"],
  ["y", "y"],
  ["width", "width"],
  ["height", "height"],
  ["rotation", "rotation"],
  ["opacity %", "opacity"],
  ["layer", "zIndex"],
];

const TWEEN_MODES = new Set<string>(TWEEN_MODE_OPTIONS.map(([, mode]) => mode));

export function isTweenMode(value: string): value is TweenMode {
  return TWEEN_MODES.has(value);
}

export function normalizeTweenMode(value: string | undefined): TweenMode {
  return value && isTweenMode(value) ? value : DEFAULT_TWEEN_MODE;
}

export function getTweenMode(
  sprite: Pick<Sprite, "tweenMode" | "tweenModes">,
  property: TweenableProperty,
): TweenMode {
  return sprite.tweenModes[property] ?? sprite.tweenMode;
}

const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;

function easeOutBounceRaw(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

const easingFunctions: Record<TweenMode, (t: number) => number> = {
  linear: (t) => t,
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
  easeInOutQuint: (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  easeInCirc: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeInOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  easeInBack: (t) => c3 * t * t * t - c1 * t * t,
  easeOutBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  easeInOutBack: (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
  easeInElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  easeInBounce: (t) => 1 - easeOutBounceRaw(1 - t),
  easeOutBounce: easeOutBounceRaw,
  easeInOutBounce: (t) =>
    t < 0.5
      ? (1 - easeOutBounceRaw(1 - 2 * t)) / 2
      : (1 + easeOutBounceRaw(2 * t - 1)) / 2,
};

export function applyTweenMode(t: number, mode: TweenMode): number {
  const clamped = Math.max(0, Math.min(1, t));
  return easingFunctions[mode](clamped);
}

export function readTweenProperty(
  sprite: Record<string, unknown>,
  property: TweenableProperty,
): number {
  if (property === "opacity") {
    return Number(sprite.opacity ?? 0) * 100;
  }
  return Number(sprite[property] ?? 0);
}

export function writeTweenProperty(
  sprite: Record<string, unknown>,
  property: TweenableProperty,
  value: number,
): void {
  if (property === "opacity") {
    sprite.opacity = value / 100;
    return;
  }
  sprite[property] = property === "zIndex" ? Math.round(value) : value;
}
