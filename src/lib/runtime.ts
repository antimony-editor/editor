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

    setFps(fps: number) {
        this.fps = Math.max(1, fps);
    }

    getStepMs() {
        return 1000 / this.fps;
    }

    isPaused() {
        return this.paused;
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
        this.cancelFrameTick();
        for (const waiter of this.frameWaiters) {
            waiter.reject(new StopError());
        }
        this.frameWaiters.clear();
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
        let startTime = performance.now();

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

            const linearT = Math.min(1, (performance.now() - startTime) / durationMs);
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
