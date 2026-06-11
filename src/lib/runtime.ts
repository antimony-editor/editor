import type { Sprite, SpriteAction } from './sprites';
import type { Dispatch } from 'react';
import {
	applyTweenMode,
	readTweenProperty,
	writeTweenProperty,
	type TweenableProperty,
	type TweenMode,
} from './tween';

type EventHandler = (_: unknown) => void | Promise<void>;

class StopError extends Error {
    constructor() {
        super('Stopped');
        this.name = 'StopError';
    }
}

class PauseError extends Error {
    elapsed: number;

    constructor(elapsed: number) {
        super('Paused');
        this.name = 'PauseError';
        this.elapsed = elapsed;
    }
}

interface PendingDelay {
    timeoutId?: ReturnType<typeof setTimeout>;
    start: number;
    reject: (error: StopError | PauseError) => void;
    cleanup: () => void;
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
    private activeAudio = new Map<string, HTMLAudioElement>();

    private isStepping = false;
    public virtualTime = 0;
    private virtualDelayWaiters = new Set<{ targetTime: number; resolve: () => void; reject: (e: Error) => void }>();
    private virtualFrameWaiters = new Set<{ resolve: () => void; reject: (e: Error) => void }>();

    private audioContext: AudioContext | null = null;
    private audioBufferCache: Map<string, AudioBuffer> = new Map();
    private activePlayingSounds: Set<{ src: string; startVirtualTime: number; loop: boolean }> = new Set();
    private activeSteppingNodes = new Set<AudioBufferSourceNode>();

    private getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    async decodeAudio(src: string): Promise<AudioBuffer | null> {
        if (this.audioBufferCache.has(src)) return this.audioBufferCache.get(src)!;

        try {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.getAudioContext().decodeAudioData(arrayBuffer);
            this.audioBufferCache.set(src, audioBuffer);
            return audioBuffer;
        } catch (e) {
            console.error('Failed to decode audio:', src, e);
            return null;
        }
    }

    getAudioSamples(durationSec: number, sampleRate: number): Float32Array {
        const numSamples = Math.floor(durationSec * sampleRate);
        const left = new Float32Array(numSamples);
        const right = new Float32Array(numSamples);

        const mix = (ch0: Float32Array, ch1: Float32Array, srcSampleRate: number, startOffset: number, loop: boolean) => {
            for (let i = 0; i < numSamples; i++) {
                const time = startOffset + i / sampleRate;
                if (time < 0) continue;

                const pos = time * srcSampleRate;
                const idx0 = Math.floor(pos);
                const idx1 = idx0 + 1;
                const t = pos - idx0;

                const len = ch0.length;
                const i0 = loop ? idx0 % len : idx0;
                const i1 = loop ? idx1 % len : idx1;

                if (i0 >= len) continue;
                const s0L = ch0[i0];
                const s1L = i1 < len ? ch0[i1] : s0L;
                const s0R = ch1[i0];
                const s1R = i1 < len ? ch1[i1] : s0R;

                left[i] += s0L + (s1L - s0L) * t;
                right[i] += s0R + (s1R - s0R) * t;
            }
        };

        for (const sound of this.activePlayingSounds) {
            const buffer = this.audioBufferCache.get(sound.src);
            if (!buffer) continue;

            const ch0 = buffer.getChannelData(0);
            const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
            const startOffset = (this.virtualTime - sound.startVirtualTime) / 1000;
            mix(ch0, ch1, buffer.sampleRate, startOffset, sound.loop);
        }

        const spritesSnapshot = this.getSprites?.() ?? [];
        for (const [id] of this.sprites.entries()) {
            const spriteData = (spritesSnapshot.find(s => s.id === id)?.data) as any;
            if (!spriteData || !spriteData.images || !spriteData.currentImageId) continue;

            const image = spriteData.images.find((img: any) => img.id === spriteData.currentImageId);
            if (!image || !image.src) continue;

            if (image.src.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)$/i.test(image.src)) {
                const buffer = this.audioBufferCache.get(image.src);
                if (!buffer) {
                    this.decodeAudio(image.src);
                    continue;
                }

                const ch0 = buffer.getChannelData(0);
                const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
                mix(ch0, ch1, buffer.sampleRate, this.virtualTime / 1000, true);
            }
        }

        const stereo = new Float32Array(numSamples * 2);
        stereo.set(left, 0);
        stereo.set(right, numSamples);
        return stereo;
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

        await new Promise(resolve => setTimeout(resolve, 0));
    }

    pause() {
        if (this.stopped || this.paused) return;
        this.paused = true;
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
        if (typeof window !== 'undefined') {
            window.__currentSpriteId = spriteId ?? undefined;
        }
    }

    on(event: string, handler: EventHandler) {
        const spriteId = this.currentSpriteId;
        if (!spriteId) {
            console.warn('Attempted to register handler without current sprite');
            return () => { };
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
        spriteEvents.set(event, list.filter(h => h !== handler));
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
            return new Promise((resolve, reject) => {
                this.virtualDelayWaiters.add({
                    targetTime: this.virtualTime + ms,
                    resolve,
                    reject
                });
            });
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

    async playSound(src: string, loop: boolean = false, id: string): Promise<void> {
        if (this.stopped || !src) return;

        if (this.isStepping) {
            const buffer = await this.decodeAudio(src);
            const soundEntry = { src, startVirtualTime: this.virtualTime, loop };
            this.activePlayingSounds.add(soundEntry);

            if (buffer) {
                const ctx = this.getAudioContext();
                const node = ctx.createBufferSource();
                node.buffer = buffer;
                node.loop = loop;
                node.connect(ctx.destination);
                node.start();
                this.activeSteppingNodes.add(node);
                node.onended = () => this.activeSteppingNodes.delete(node);
            }
            return;
        }

        const audio = new Audio(src);
        audio.loop = loop;
        this.activeAudio.set(id, audio);

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                this.activeAudio.delete(id);
                audio.removeEventListener('ended', onEnded);
                audio.removeEventListener('error', onError);
            };

            const onEnded = () => {
                cleanup();
                resolve();
            };

            const onError = (e: Event) => {
                cleanup();
                console.error(`audio playback error for sound "${id || 'unknown'}" (src: ${src}):`, e);
                resolve();
            };

            audio.addEventListener('ended', onEnded);
            audio.addEventListener('error', onError);

            audio.play().catch(e => {
                cleanup();
                if (e.name === 'NotAllowedError') {
                    console.warn('audio play failed (blocked by browser): click on the site first');
                } else {
                    console.warn(`audio play failed for sound "${id || 'unknown'}" (src: ${src}):`, e);
                }
                resolve();
            });

            if (this.stopped) {
                audio.pause();
                cleanup();
                reject(new StopError());
            }
        });
    }

    stopAllSounds() {
        this.activePlayingSounds.clear();
        for (const audio of this.activeAudio.values()) {
            try {
                audio.pause();
                audio.dispatchEvent(new Event('ended'));
            } catch (e) {
                // ignore
            }
        }
        this.activeAudio.clear();
        const nodes = Array.from(this.activeSteppingNodes);
        this.activeSteppingNodes.clear();
        for (const node of nodes) {
            try {
                node.stop();
                node.disconnect();
            } catch (e) {
                // ignore
            }
        }
    }

    isSoundPlaying(id: string) {
        return this.activeAudio.has(id);
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
            entries.map(([property]) => [property, readTweenProperty(sprite, property)]),
        ) as Record<TweenableProperty, number>;
        const modes = Object.fromEntries(
            entries.map(([property]) => {
                const tweenModes = sprite.tweenModes as Partial<Record<TweenableProperty, TweenMode>> | undefined;
                return [property, tweenModes?.[property] ?? (sprite.tweenMode as TweenMode | undefined) ?? 'linear'];
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
        if (this.frameWaiters.size === 0 || this.frameRafId !== null || this.frameTimeoutId !== null) return;

        const now = performance.now();
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = now;
        }

        const delay = this.lastFrameTime + this.getStepMs() - now;
        if (delay > 4) {
            this.frameTimeoutId = setTimeout(() => {
                this.frameTimeoutId = null;
                this.requestFrameTick();
            }, Math.max(0, delay - 2));
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

            this.lastFrameTime = timestamp - this.lastFrameTime > stepMs * 2
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
        return this.on('start', handler);
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
                    console.error(`Runtime handler error for ${event} on sprite ${spriteId}:`, e);
                }
            })
        );
    }

    setCompiler(compiler: (() => string) | null) {
        this.compiler = compiler;
    }

    compile() {
        return this.compiler?.() ?? '';
    }

    async start() {
        this.stop();
        this.runEpoch = this.epoch;
        this.stopped = false;
        this.paused = false;
        this.lastFrameTime = performance.now();
        const myEpoch = this.runEpoch;
        const compiled = this.compile();
        this.clearHandlers();

        try {
            if (compiled.trim()) {
                const spritesArray = Array.from(this.sprites.entries());
                const spriteContextMap = Object.fromEntries(this.sprites);

                const fn = new Function(
                    'sprites',
                    'spriteContextMap',
                    `
                    const runtimeRef = window.RUNTIME;
                    let context = spriteContextMap[window.__currentSpriteId] || Object.values(spriteContextMap)[0] || { sprite: {}, spriteId: undefined };
                    return (async () => {
                        ${compiled}
                    })();
                `
                );
                await fn(spritesArray, spriteContextMap);
                if (this.stopped || myEpoch !== this.epoch) return;
            }

            for (const [spriteId, context] of this.sprites.entries()) {
                if (this.stopped || myEpoch !== this.epoch) return;
                await this.emit('start', spriteId, context);
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