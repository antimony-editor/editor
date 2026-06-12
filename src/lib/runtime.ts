import type { Sprite, SpriteAction } from "./sprites";
import type { Dispatch } from "react";
import {
  applyTweenMode,
  readTweenProperty,
  writeTweenProperty,
  type TweenableProperty,
  type TweenMode,
} from "./tween";

type EventHandler = (_: unknown) => void | Promise<void>;

class StopError extends Error {
  constructor() {
    super("Stopped");
    this.name = "StopError";
  }
}

class PauseError extends Error {
  elapsed: number;

  constructor(elapsed: number) {
    super("Paused");
    this.name = "PauseError";
    this.elapsed = elapsed;
  }
}

interface PendingDelay {
  timeoutId?: ReturnType<typeof setTimeout>;
  start: number;
  reject: (error: StopError | PauseError) => void;
  cleanup: () => void;
}

interface VolumeKeyframe {
  time: number;
  value: number;
}

interface LiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  loop: boolean;
}

interface OfflineVoice {
  id: string;
  src: string;
  startVirtualTime: number;
  loop: boolean;
  rate: number;
  keyframes: VolumeKeyframe[];
}

const AudioCtxClass: typeof AudioContext | undefined =
  typeof window !== "undefined"
    ? (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext)
    : undefined;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function evalKeyframes(
  keyframes: VolumeKeyframe[],
  time: number,
  fallback: number,
): number {
  if (keyframes.length === 0) return fallback;
  const first = keyframes[0];
  if (time <= first.time) return first.value;
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last.value;
  for (let i = 1; i < keyframes.length; i++) {
    const a = keyframes[i - 1];
    const b = keyframes[i];
    if (time <= b.time) {
      const span = b.time - a.time;
      if (span <= 0) return b.value;
      const t = (time - a.time) / span;
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}

interface FrameWaiter {
  resolve: () => void;
  reject: (error: StopError) => void;
}

export interface SpriteContext {
  sprite: {
    x: number;
    y: number;
    rotation: number;
    width: number;
    height: number;
    opacity: number;
    visible: boolean;
    zIndex: number;
    color?: string;
    tweenMode?: TweenMode;
    tweenModes?: Partial<Record<TweenableProperty, TweenMode>>;
    sounds?: { id: string; name: string; src: string }[];
    currentSoundId?: string | null;
  };
  spriteId?: string;
  dispatch?: Dispatch<SpriteAction>;
  getSprites?: () => Sprite[];
  [key: string]: unknown;
}

declare global {
  interface Window {
    RUNTIME?: Runtime;
    __currentSpriteId?: string;
  }
}

class Runtime {
  private spriteHandlers: Map<string, Map<string, EventHandler[]>> = new Map();
  private compiler: (() => string) | null = null;
  private sprites: Map<string, SpriteContext> = new Map();
  private currentSpriteId: string | null = null;
  private stopped = false;
  private epoch = 0;
  private runEpoch = 0;
  private activeTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private pendingDelays = new Set<(error: StopError) => void>();
  private canvasEffects: Map<string, number> = new Map();
  private fps = 60;
  private paused = false;
  private pauseResolvers = new Set<() => void>();
  private pendingDelayEntries = new Set<PendingDelay>();
  private frameWaiters = new Set<FrameWaiter>();
  private frameRafId: number | null = null;
  private frameTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastFrameTime = 0;

  private isStepping = false;
  public virtualTime = 0;
  private virtualDelayWaiters = new Set<{
    targetTime: number;
    resolve: () => void;
    reject: (e: Error) => void;
  }>();
  private virtualFrameWaiters = new Set<{
    resolve: () => void;
    reject: (e: Error) => void;
  }>();

  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private masterVolume = 1;
  private masterVolumeKeyframes: VolumeKeyframe[] = [];
  private soundVolumes: Map<string, number> = new Map();
  private soundRates: Map<string, number> = new Map();
  private liveVoices: Map<string, Set<LiveVoice>> = new Map();
  private activePlayingSounds: Set<OfflineVoice> = new Set();
  private spritesProvider: (() => Sprite[]) | null = null;
  private nextMonitoringTime = 0;

  private getAudioContext() {
    if (!this.audioContext) {
      if (!AudioCtxClass) {
        throw new Error("Web Audio API is not supported in this environment");
      }
      this.audioContext = new AudioCtxClass();
    }
    return this.audioContext;
  }

  private getMasterGain() {
    const ctx = this.getAudioContext();
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  private virtualDelay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.virtualDelayWaiters.add({
        targetTime: this.virtualTime + ms,
        resolve,
        reject,
      });
    });
  }

  async decodeAudio(src: string): Promise<AudioBuffer | null> {
    if (this.audioBufferCache.has(src)) return this.audioBufferCache.get(src)!;

    try {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer =
        await this.getAudioContext().decodeAudioData(arrayBuffer);
      this.audioBufferCache.set(src, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.error("Failed to decode audio:", src, e);
      return null;
    }
  }

  getAudioSamples(durationSec: number, sampleRate: number): Float32Array {
    const numSamples = Math.floor(durationSec * sampleRate);
    const left = new Float32Array(numSamples);
    const right = new Float32Array(numSamples);

    const mix = (
      ch0: Float32Array,
      ch1: Float32Array,
      srcSampleRate: number,
      startOffsetSec: number,
      loop: boolean,
      rate: number,
      gainAt: (sampleIndex: number) => number,
    ) => {
      const len = ch0.length;
      for (let i = 0; i < numSamples; i++) {
        const time = startOffsetSec + i / sampleRate;
        if (time < 0) continue;

        const pos = time * rate * srcSampleRate;
        const idx0 = Math.floor(pos);
        const idx1 = idx0 + 1;
        const t = pos - idx0;

        const i0 = loop ? ((idx0 % len) + len) % len : idx0;
        const i1 = loop ? ((idx1 % len) + len) % len : idx1;

        if (!loop && i0 >= len) continue;
        const gain = gainAt(i);
        if (gain === 0) continue;

        const s0L = ch0[i0];
        const s1L = i1 < len ? ch0[i1] : s0L;
        const s0R = ch1[i0];
        const s1R = i1 < len ? ch1[i1] : s0R;

        left[i] += (s0L + (s1L - s0L) * t) * gain;
        right[i] += (s0R + (s1R - s0R) * t) * gain;
      }
    };

    for (const sound of this.activePlayingSounds) {
      const buffer = this.audioBufferCache.get(sound.src);
      if (!buffer) continue;

      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
      const startOffset = (this.virtualTime - sound.startVirtualTime) / 1000;
      const baseGain = sound.keyframes[0]?.value ?? 1;
      mix(
        ch0,
        ch1,
        buffer.sampleRate,
        startOffset,
        sound.loop,
        sound.rate,
        (i) => {
          const vt = this.virtualTime + (i / sampleRate) * 1000;
          return evalKeyframes(sound.keyframes, vt, baseGain);
        },
      );
    }

    const spritesSnapshot = this.spritesProvider?.() ?? [];
    for (const [id] of this.sprites.entries()) {
      const spriteData = spritesSnapshot.find((s) => s.id === id)?.data as
        | {
            images?: { id: string; src?: string }[];
            currentImageId?: string | null;
          }
        | undefined;
      if (!spriteData || !spriteData.images || !spriteData.currentImageId)
        continue;

      const image = spriteData.images.find(
        (img) => img.id === spriteData.currentImageId,
      );
      if (!image || !image.src) continue;

      if (
        image.src.startsWith("data:video/") ||
        /\.(mp4|webm|ogg|mov)$/i.test(image.src)
      ) {
        const buffer = this.audioBufferCache.get(image.src);
        if (!buffer) {
          this.decodeAudio(image.src);
          continue;
        }

        const ch0 = buffer.getChannelData(0);
        const ch1 =
          buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
        mix(
          ch0,
          ch1,
          buffer.sampleRate,
          this.virtualTime / 1000,
          true,
          1,
          () => 1,
        );
      }
    }

    const stereo = new Float32Array(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const vt = this.virtualTime + (i / sampleRate) * 1000;
      const master = evalKeyframes(
        this.masterVolumeKeyframes,
        vt,
        this.masterVolume,
      );
      stereo[i] = Math.tanh(left[i] * master);
      stereo[numSamples + i] = Math.tanh(right[i] * master);
    }
    return stereo;
  }

  playCapturedSamples(samples: Float32Array, sampleRate: number) {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") ctx.resume();

      const numSamples = samples.length / 2;
      const buffer = ctx.createBuffer(2, numSamples, sampleRate);

      buffer.getChannelData(0).set(samples.subarray(0, numSamples));
      buffer.getChannelData(1).set(samples.subarray(numSamples));

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.getMasterGain());

      const now = ctx.currentTime;
      const lookahead = 0.05;
      const startTime = Math.max(now + lookahead, this.nextMonitoringTime);
      source.start(startTime);

      this.nextMonitoringTime = startTime + numSamples / sampleRate;
    } catch (e) {
      console.error("Failed to play captured samples:", e);
    }
  }

  setFps(fps: number) {
    this.fps = Math.max(1, fps);
  }

  getStepMs() {
    return 1000 / this.fps;
  }

  isPaused() {
    return this.paused;
  }

  now() {
    if (this.isStepping) return this.virtualTime;
    return performance.now();
  }

  enableStepping() {
    this.isStepping = true;
    this.virtualTime = 0;
    this.virtualDelayWaiters.clear();
    this.virtualFrameWaiters.clear();
  }

  disableStepping() {
    this.isStepping = false;
  }

  async step() {
    if (!this.isStepping) return;

    this.virtualTime += this.getStepMs();

    const frameWaiters = Array.from(this.virtualFrameWaiters);
    this.virtualFrameWaiters.clear();
    for (const waiter of frameWaiters) {
      waiter.resolve();
    }

    const delayWaiters = Array.from(this.virtualDelayWaiters);
    for (const waiter of delayWaiters) {
      if (this.virtualTime >= waiter.targetTime) {
        this.virtualDelayWaiters.delete(waiter);
        waiter.resolve();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  pause() {
    if (this.stopped || this.paused) return;
    this.paused = true;
    this.audioContext?.suspend().catch(() => {});
    for (const entry of this.pendingDelayEntries) {
      clearTimeout(entry.timeoutId);
      entry.cleanup();
      entry.reject(new PauseError(performance.now() - entry.start));
    }
    this.pendingDelayEntries.clear();
    this.activeTimeouts.clear();
  }

  resume() {
    if (this.stopped || !this.paused) return;
    this.paused = false;
    this.audioContext?.resume().catch(() => {});
    for (const resolve of this.pauseResolvers) {
      resolve();
    }
    this.pauseResolvers.clear();
  }

  private waitForResume(): Promise<void> {
    if (!this.paused || this.stopped) return Promise.resolve();
    return new Promise((resolve) => {
      this.pauseResolvers.add(resolve);
    });
  }

  registerSprite(spriteId: string, context: SpriteContext) {
    this.sprites.set(spriteId, context);
    if (context.getSprites) {
      this.spritesProvider = context.getSprites;
    }
    if (!this.spriteHandlers.has(spriteId)) {
      this.spriteHandlers.set(spriteId, new Map());
    }
  }

  unregisterSprite(spriteId: string) {
    this.sprites.delete(spriteId);
    this.spriteHandlers.delete(spriteId);
  }

  setCurrentSprite(spriteId: string | null) {
    this.currentSpriteId = spriteId;
    if (typeof window !== "undefined") {
      window.__currentSpriteId = spriteId ?? undefined;
    }
  }

  on(event: string, handler: EventHandler) {
    const spriteId = this.currentSpriteId;
    if (!spriteId) {
      console.warn("Attempted to register handler without current sprite");
      return () => {};
    }

    const spriteEvents = this.spriteHandlers.get(spriteId) ?? new Map();
    const list = spriteEvents.get(event) ?? [];
    list.push(handler);
    spriteEvents.set(event, list);
    this.spriteHandlers.set(spriteId, spriteEvents);

    return () => this.off(event, handler);
  }

  off(event: string, handler?: EventHandler) {
    const spriteId = this.currentSpriteId;
    if (!spriteId) return;

    const spriteEvents = this.spriteHandlers.get(spriteId);
    if (!spriteEvents) return;

    if (!handler) {
      spriteEvents.delete(event);
      return;
    }

    const list = spriteEvents.get(event) ?? [];
    spriteEvents.set(
      event,
      list.filter((h) => h !== handler),
    );
  }

  clearHandlers() {
    this.spriteHandlers.clear();
  }

  isStopped() {
    return this.stopped || this.runEpoch !== this.epoch;
  }

  delay(ms: number): Promise<void> {
    if (this.stopped) {
      return Promise.reject(new StopError());
    }

    if (this.isStepping) {
      return this.virtualDelay(ms);
    }

    return this.delayFor(ms);
  }

  private async delayFor(ms: number): Promise<void> {
    let remaining = ms;
    while (remaining > 0) {
      if (this.isStopped()) {
        throw new StopError();
      }
      while (this.paused) {
        await this.waitForResume();
        if (this.isStopped()) {
          throw new StopError();
        }
      }
      try {
        await this.timedWait(remaining);
        return;
      } catch (error) {
        if (error instanceof PauseError) {
          remaining = Math.max(0, remaining - error.elapsed);
          continue;
        }
        throw error;
      }
    }
  }

  private timedWait(ms: number): Promise<void> {
    if (this.stopped) {
      return Promise.reject(new StopError());
    }

    return new Promise((resolve, reject) => {
      const start = performance.now();
      const entry: PendingDelay = {
        start,
        reject,
        cleanup: () => {
          this.pendingDelayEntries.delete(entry);
          this.pendingDelays.delete(rejectDelay);
          if (entry.timeoutId !== undefined) {
            this.activeTimeouts.delete(entry.timeoutId);
          }
        },
      };

      const rejectDelay = (error: StopError) => {
        entry.cleanup();
        reject(error);
      };

      this.pendingDelays.add(rejectDelay);
      entry.timeoutId = setTimeout(() => {
        entry.cleanup();
        if (this.stopped) {
          reject(new StopError());
        } else {
          resolve();
        }
      }, ms);
      this.activeTimeouts.add(entry.timeoutId);
      this.pendingDelayEntries.add(entry);
    });
  }

  stop() {
    this.stopped = true;
    this.paused = false;
    this.epoch++;
    for (const id of this.activeTimeouts) {
      clearTimeout(id);
    }
    this.activeTimeouts.clear();
    this.stopAllSounds();
    this.activePlayingSounds.clear();
    this.resetAudioState();
    this.nextMonitoringTime = 0;
    this.cancelFrameTick();
    for (const waiter of this.frameWaiters) {
      waiter.reject(new StopError());
    }
    this.frameWaiters.clear();
    for (const waiter of this.virtualFrameWaiters) {
      waiter.reject(new StopError());
    }
    this.virtualFrameWaiters.clear();
    for (const waiter of this.virtualDelayWaiters) {
      waiter.reject(new StopError());
    }
    this.virtualDelayWaiters.clear();
    this.lastFrameTime = 0;
    this.pendingDelayEntries.clear();
    for (const reject of this.pendingDelays) {
      reject(new StopError());
    }
    this.pendingDelays.clear();
    for (const resolve of this.pauseResolvers) {
      resolve();
    }
    this.pauseResolvers.clear();
    this.clearHandlers();
  }

  private resetAudioState() {
    this.soundVolumes.clear();
    this.soundRates.clear();
    this.masterVolume = 1;
    this.masterVolumeKeyframes = [];
    if (this.masterGain && this.audioContext) {
      try {
        this.masterGain.gain.cancelScheduledValues(
          this.audioContext.currentTime,
        );
        this.masterGain.gain.value = 1;
      } catch {
        // ignore
      }
    }
  }

  async playSound(
    src: string,
    loop: boolean = false,
    id: string,
    baseVolume: number = 1,
  ): Promise<void> {
    if (this.stopped || !src) return;

    const volume = this.soundVolumes.get(id) ?? clamp01(baseVolume);
    const rate = this.soundRates.get(id) ?? 1;

    if (this.isStepping) {
      const buffer = await this.decodeAudio(src);
      if (this.stopped) return;
      const voice: OfflineVoice = {
        id,
        src,
        startVirtualTime: this.virtualTime,
        loop,
        rate,
        keyframes: [{ time: this.virtualTime, value: volume }],
      };
      this.activePlayingSounds.add(voice);

      if (loop || !buffer) return;
      const durationMs = (buffer.duration / Math.max(0.01, rate)) * 1000;
      await this.virtualDelay(durationMs);
      this.activePlayingSounds.delete(voice);
      return;
    }

    return this.playLive(src, id, loop, volume, rate);
  }

  /** Play a sound in the editor independent of the run lifecycle (e.g. previews). */
  async previewSound(
    src: string,
    id: string,
    volume: number = 1,
  ): Promise<void> {
    if (!src) return;
    return this.playLive(src, id, false, clamp01(volume), 1);
  }

  private async playLive(
    src: string,
    id: string,
    loop: boolean,
    volume: number,
    rate: number,
  ): Promise<void> {
    const buffer = await this.decodeAudio(src);
    if (!buffer) return;

    let ctx: AudioContext;
    let master: GainNode;
    try {
      ctx = this.getAudioContext();
      master = this.getMasterGain();
    } catch (e) {
      console.warn("audio playback unavailable:", e);
      return;
    }

    if (ctx.state === "suspended" && !this.paused) {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;

    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(master);

    const voice: LiveVoice = { source, gain, loop };
    const set = this.liveVoices.get(id) ?? new Set<LiveVoice>();
    set.add(voice);
    this.liveVoices.set(id, set);

    return new Promise((resolve) => {
      const cleanup = () => {
        set.delete(voice);
        if (set.size === 0) this.liveVoices.delete(id);
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      };

      source.onended = () => {
        cleanup();
        resolve();
      };

      try {
        source.start();
      } catch {
        cleanup();
        resolve();
      }
    });
  }

  stopSound(id: string) {
    if (this.isStepping) {
      for (const voice of Array.from(this.activePlayingSounds)) {
        if (voice.id === id) this.activePlayingSounds.delete(voice);
      }
      return;
    }
    const set = this.liveVoices.get(id);
    if (!set) return;
    for (const voice of Array.from(set)) {
      try {
        voice.source.stop();
        voice.source.disconnect();
        voice.gain.disconnect();
      } catch {
        // ignore
      }
    }
    this.liveVoices.delete(id);
  }

  stopAllSounds() {
    this.activePlayingSounds.clear();
    for (const set of this.liveVoices.values()) {
      for (const voice of set) {
        try {
          voice.source.stop();
          voice.source.disconnect();
          voice.gain.disconnect();
        } catch {
          // ignore
        }
      }
    }
    this.liveVoices.clear();
  }

  isSoundPlaying(id: string) {
    if (this.isStepping) {
      for (const voice of this.activePlayingSounds) {
        if (voice.id === id) return true;
      }
      return false;
    }
    const set = this.liveVoices.get(id);
    return !!set && set.size > 0;
  }

  setMasterVolume(value: number) {
    const v = clamp01(value);
    this.masterVolume = v;
    if (this.isStepping) {
      this.masterVolumeKeyframes.push({ time: this.virtualTime, value: v });
      return;
    }
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(v, now, 0.01);
    }
  }

  changeMasterVolume(delta: number) {
    this.setMasterVolume(this.masterVolume + delta);
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  setSoundVolume(id: string, value: number) {
    const v = clamp01(value);
    this.soundVolumes.set(id, v);
    if (this.isStepping) {
      for (const voice of this.activePlayingSounds) {
        if (voice.id === id)
          voice.keyframes.push({ time: this.virtualTime, value: v });
      }
      return;
    }
    const set = this.liveVoices.get(id);
    if (set && this.audioContext) {
      const now = this.audioContext.currentTime;
      for (const voice of set) {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(v, now, 0.01);
      }
    }
  }

  changeSoundVolume(id: string, delta: number) {
    const current = this.soundVolumes.get(id) ?? 1;
    this.setSoundVolume(id, current + delta);
  }

  getSoundVolume(id: string) {
    return this.soundVolumes.get(id) ?? 1;
  }

  setSoundPitch(id: string, rate: number) {
    const r = Math.max(0.01, Number.isNaN(rate) ? 1 : rate);
    this.soundRates.set(id, r);
    if (!this.isStepping) {
      const set = this.liveVoices.get(id);
      if (set && this.audioContext) {
        const now = this.audioContext.currentTime;
        for (const voice of set) {
          voice.source.playbackRate.cancelScheduledValues(now);
          voice.source.playbackRate.setTargetAtTime(r, now, 0.01);
        }
      }
    }
  }

  fadeSound(id: string, targetValue: number, durationSec: number) {
    const v = clamp01(targetValue);
    const duration = Math.max(0, durationSec);
    this.soundVolumes.set(id, v);

    if (this.isStepping) {
      const endTime = this.virtualTime + duration * 1000;
      for (const voice of this.activePlayingSounds) {
        if (voice.id !== id) continue;
        const current = evalKeyframes(
          voice.keyframes,
          this.virtualTime,
          voice.keyframes[0]?.value ?? 1,
        );
        voice.keyframes.push({ time: this.virtualTime, value: current });
        voice.keyframes.push({ time: endTime, value: v });
      }
      return;
    }

    const set = this.liveVoices.get(id);
    if (set && this.audioContext) {
      const now = this.audioContext.currentTime;
      for (const voice of set) {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(v, now + duration);
      }
    }
  }

  setCanvasEffect(effect: string, value: number) {
    this.canvasEffects.set(effect, value);
  }

  getCanvasEffect(effect: string) {
    return this.canvasEffects.get(effect) ?? 0;
  }

  changeCanvasEffect(effect: string, delta: number) {
    const current = this.getCanvasEffect(effect);
    this.canvasEffects.set(effect, current + delta);
  }

  clearCanvasEffects() {
    this.canvasEffects.clear();
  }

  async tween(
    context: SpriteContext,
    property: TweenableProperty,
    targetValue: number,
    durationSec: number,
  ) {
    await this.tweenMany(context, { [property]: targetValue }, durationSec);
  }

  async tweenMany(
    context: SpriteContext,
    targets: Partial<Record<TweenableProperty, number>>,
    durationSec: number,
  ) {
    const entries = Object.entries(targets) as [TweenableProperty, number][];
    if (entries.length === 0) return;

    const sprite = context.sprite as Record<string, unknown>;
    const starts = Object.fromEntries(
      entries.map(([property]) => [
        property,
        readTweenProperty(sprite, property),
      ]),
    ) as Record<TweenableProperty, number>;
    const modes = Object.fromEntries(
      entries.map(([property]) => {
        const tweenModes = sprite.tweenModes as
          | Partial<Record<TweenableProperty, TweenMode>>
          | undefined;
        return [
          property,
          tweenModes?.[property] ??
            (sprite.tweenMode as TweenMode | undefined) ??
            "linear",
        ];
      }),
    ) as Record<TweenableProperty, TweenMode>;

    const durationMs = Math.max(0, durationSec) * 1000;
    let startTime = this.now();

    if (durationMs === 0) {
      for (const [property, targetValue] of entries) {
        writeTweenProperty(sprite, property, targetValue);
      }
      return;
    }

    while (true) {
      if (this.isStopped()) return;

      while (this.paused) {
        const pauseStart = performance.now();
        await this.waitForResume();
        startTime += performance.now() - pauseStart;
        if (this.isStopped()) return;
      }

      const linearT = Math.min(1, (this.now() - startTime) / durationMs);
      for (const [property, targetValue] of entries) {
        const easedT = applyTweenMode(linearT, modes[property]);
        const startValue = starts[property];
        const value = startValue + (targetValue - startValue) * easedT;
        writeTweenProperty(sprite, property, value);
      }

      if (linearT >= 1) break;

      await this.nextFrame();
    }

    if (this.isStopped()) return;

    for (const [property, targetValue] of entries) {
      writeTweenProperty(sprite, property, targetValue);
    }
  }

  private nextFrame(): Promise<void> {
    if (this.stopped) {
      return Promise.reject(new StopError());
    }

    if (this.isStepping) {
      return new Promise((resolve, reject) => {
        this.virtualFrameWaiters.add({ resolve, reject });
      });
    }

    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject };
      this.frameWaiters.add(waiter);
      this.scheduleFrameTick();
    });
  }

  private scheduleFrameTick() {
    if (
      this.frameWaiters.size === 0 ||
      this.frameRafId !== null ||
      this.frameTimeoutId !== null
    )
      return;

    const now = performance.now();
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
    }

    const delay = this.lastFrameTime + this.getStepMs() - now;
    if (delay > 4) {
      this.frameTimeoutId = setTimeout(
        () => {
          this.frameTimeoutId = null;
          this.requestFrameTick();
        },
        Math.max(0, delay - 2),
      );
      return;
    }

    this.requestFrameTick();
  }

  private requestFrameTick() {
    if (this.frameWaiters.size === 0 || this.frameRafId !== null) return;

    this.frameRafId = requestAnimationFrame((timestamp) => {
      this.frameRafId = null;

      if (this.stopped) {
        const waiters = Array.from(this.frameWaiters);
        this.frameWaiters.clear();
        for (const waiter of waiters) {
          waiter.reject(new StopError());
        }
        return;
      }

      const stepMs = this.getStepMs();
      if (timestamp + 0.25 < this.lastFrameTime + stepMs) {
        this.scheduleFrameTick();
        return;
      }

      this.lastFrameTime =
        timestamp - this.lastFrameTime > stepMs * 2
          ? timestamp
          : this.lastFrameTime + stepMs;

      const waiters = Array.from(this.frameWaiters);
      this.frameWaiters.clear();
      for (const waiter of waiters) {
        waiter.resolve();
      }
    });
  }

  private cancelFrameTick() {
    if (this.frameRafId !== null) {
      cancelAnimationFrame(this.frameRafId);
      this.frameRafId = null;
    }
    if (this.frameTimeoutId !== null) {
      clearTimeout(this.frameTimeoutId);
      this.frameTimeoutId = null;
    }
  }

  onStart(handler: EventHandler) {
    return this.on("start", handler);
  }

  async emit(event: string, spriteId: string, context: unknown) {
    if (this.isStopped()) return;

    const spriteEvents = this.spriteHandlers.get(spriteId);
    if (!spriteEvents) return;

    const list = spriteEvents.get(event) ?? [];
    await Promise.all(
      list.map(async (h) => {
        if (this.isStopped()) return;
        try {
          await h(context);
        } catch (e) {
          if (e instanceof StopError) return;
          console.error(
            `Runtime handler error for ${event} on sprite ${spriteId}:`,
            e,
          );
        }
      }),
    );
  }

  setCompiler(compiler: (() => string) | null) {
    this.compiler = compiler;
  }

  compile() {
    return this.compiler?.() ?? "";
  }

  async start() {
    this.stop();
    this.runEpoch = this.epoch;
    this.stopped = false;
    this.paused = false;
    if (!this.isStepping) {
      this.audioContext?.resume().catch(() => {});
    }
    this.lastFrameTime = performance.now();
    const myEpoch = this.runEpoch;
    const compiled = this.compile();
    this.clearHandlers();

    try {
      if (compiled.trim()) {
        const spritesArray = Array.from(this.sprites.entries());
        const spriteContextMap = Object.fromEntries(this.sprites);

        const fn = new Function(
          "sprites",
          "spriteContextMap",
          `
                    const runtimeRef = window.RUNTIME;
                    let context = spriteContextMap[window.__currentSpriteId] || Object.values(spriteContextMap)[0] || { sprite: {}, spriteId: undefined };
                    return (async () => {
                        ${compiled}
                    })();
                `,
        );
        await fn(spritesArray, spriteContextMap);
        if (this.stopped || myEpoch !== this.epoch) return;
      }

      for (const [spriteId, context] of this.sprites.entries()) {
        if (this.stopped || myEpoch !== this.epoch) return;
        await this.emit("start", spriteId, context);
        if (this.stopped || myEpoch !== this.epoch) return;
      }
    } catch (e) {
      if (e instanceof StopError) return;
      throw e;
    }
  }
}

const runtime = new Runtime();

window.RUNTIME = window.RUNTIME ?? runtime;

export default runtime;
